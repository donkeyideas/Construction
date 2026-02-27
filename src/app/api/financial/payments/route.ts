import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { recordPayment, getPayments } from "@/lib/queries/financial";
import type { PaymentCreateData } from "@/lib/queries/financial";
import { buildCompanyAccountMap, generatePaymentJournalEntry, generateInvoiceJournalEntry } from "@/lib/utils/invoice-accounting";
import { createNotifications } from "@/lib/utils/notifications";
import { checkSubscriptionAccess } from "@/lib/guards/subscription-guard";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters: { invoiceId?: string; startDate?: string; endDate?: string } = {};

    const invoiceId = searchParams.get("invoiceId");
    if (invoiceId) filters.invoiceId = invoiceId;

    const startDate = searchParams.get("startDate");
    if (startDate) filters.startDate = startDate;

    const endDate = searchParams.get("endDate");
    if (endDate) filters.endDate = endDate;

    const payments = await getPayments(supabase, userCompany.companyId, filters);
    return NextResponse.json({ payments });
  } catch (error) {
    console.error("GET /api/financial/payments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subBlock = await checkSubscriptionAccess(userCompany.companyId, "POST");
    if (subBlock) return subBlock;

    const body = await request.json();

    if (!body.invoice_id || !body.payment_date || !body.amount || !body.method) {
      return NextResponse.json(
        { error: "Missing required fields: invoice_id, payment_date, amount, method" },
        { status: 400 }
      );
    }

    if (body.amount <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be positive" },
        { status: 400 }
      );
    }

    // Validate payment doesn't exceed invoice balance due
    const { data: targetInvoice } = await supabase
      .from("invoices")
      .select("total_amount, amount_paid")
      .eq("id", body.invoice_id)
      .eq("company_id", userCompany.companyId)
      .single();

    if (!targetInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const balanceDue = (targetInvoice.total_amount ?? 0) - (targetInvoice.amount_paid ?? 0);
    if (body.amount > balanceDue + 0.01) {
      return NextResponse.json(
        { error: `Payment amount ($${Number(body.amount).toFixed(2)}) exceeds balance due ($${balanceDue.toFixed(2)})` },
        { status: 400 }
      );
    }

    // Resolve bank_account_id: use provided value, or fall back to default bank account
    let bankAccountId = body.bank_account_id || null;
    if (!bankAccountId) {
      const { data: defaultBank } = await supabase
        .from("bank_accounts")
        .select("id")
        .eq("company_id", userCompany.companyId)
        .eq("is_default", true)
        .limit(1)
        .single();
      bankAccountId = defaultBank?.id || null;
    }

    const data: PaymentCreateData = {
      invoice_id: body.invoice_id,
      payment_date: body.payment_date,
      amount: body.amount,
      method: body.method,
      reference_number: body.reference_number,
      bank_account_id: bankAccountId,
      notes: body.notes,
    };

    const result = await recordPayment(supabase, userCompany.companyId, data);

    if (!result) {
      return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
    }

    // Auto-generate journal entries for the payment (non-blocking)
    try {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("id, invoice_number, invoice_type, total_amount, subtotal, tax_amount, invoice_date, status, project_id, property_id, vendor_name, client_name, gl_account_id, retainage_pct, retainage_held")
        .eq("id", data.invoice_id)
        .single();

      if (invoice) {
        const accountMap = await buildCompanyAccountMap(supabase, userCompany.companyId);

        // If admin selected a GL account during payment, update the invoice
        const glAccountId = body.gl_account_id || null;
        if (glAccountId && !invoice.gl_account_id) {
          await supabase
            .from("invoices")
            .update({ gl_account_id: glAccountId })
            .eq("id", invoice.id);
          invoice.gl_account_id = glAccountId;
        }

        // Ensure invoice JE exists (DR Expense/CR AP for payable, DR AR/CR Revenue for receivable)
        // Without this, the expense never hits the P&L
        const { data: existingInvJE } = await supabase
          .from("journal_entries")
          .select("id, status")
          .eq("company_id", userCompany.companyId)
          .eq("reference", `invoice:${invoice.id}`)
          .limit(1)
          .single();

        if (!existingInvJE && invoice.gl_account_id) {
          await generateInvoiceJournalEntry(
            supabase,
            userCompany.companyId,
            userCompany.userId,
            invoice,
            accountMap
          );
        } else if (existingInvJE && existingInvJE.status === "voided") {
          // Reactivate voided invoice JE when a payment is recorded against it
          await supabase
            .from("journal_entries")
            .update({ status: "posted" })
            .eq("id", existingInvJE.id);
        }

        // Generate payment JE (DR AP/CR Cash for payable, DR Cash/CR AR for receivable)
        await generatePaymentJournalEntry(
          supabase,
          userCompany.companyId,
          userCompany.userId,
          {
            id: result.id,
            amount: data.amount,
            payment_date: data.payment_date,
            method: data.method,
            bank_account_id: data.bank_account_id,
          },
          {
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            invoice_type: invoice.invoice_type,
            project_id: invoice.project_id,
            property_id: invoice.property_id,
            vendor_name: invoice.vendor_name,
            client_name: invoice.client_name,
          },
          accountMap
        );
      }
    } catch (jeErr) {
      console.warn("Journal entry generation failed for payment:", result.id, jeErr);
    }

    // Sync bank account balance (Phase 4: CRITICAL-6 fix)
    try {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("invoice_type")
        .eq("id", data.invoice_id)
        .single();

      // Determine bank account to update
      let bankAccountId = data.bank_account_id;
      if (!bankAccountId) {
        // Use default bank account
        const { data: defaultBank } = await supabase
          .from("bank_accounts")
          .select("id")
          .eq("company_id", userCompany.companyId)
          .eq("is_default", true)
          .single();
        bankAccountId = defaultBank?.id;
      }

      if (bankAccountId && invoice) {
        // Payable payment: cash goes out (subtract). Receivable payment: cash comes in (add).
        // Uses atomic RPC to prevent race conditions from concurrent payments.
        const adjustment = invoice.invoice_type === "payable" ? -data.amount : data.amount;
        await supabase.rpc("adjust_bank_balance", {
          p_bank_id: bankAccountId,
          p_adjustment: adjustment,
        });
      }
    } catch (bankErr) {
      console.warn("Bank balance sync failed for payment:", result.id, bankErr);
    }

    try {
      const amount = Number(data.amount).toLocaleString("en-US", { style: "currency", currency: "USD" });
      await createNotifications(supabase, {
        companyId: userCompany.companyId,
        actorUserId: userCompany.userId,
        title: `Payment of ${amount} recorded`,
        message: `A payment of ${amount} has been recorded.`,
        notificationType: "info",
        entityType: "payment",
        entityId: result.id,
      });
    } catch (e) { console.warn("Notification failed:", e); }

    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/financial/payments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
