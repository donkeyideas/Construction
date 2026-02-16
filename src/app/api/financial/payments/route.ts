import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { recordPayment, getPayments } from "@/lib/queries/financial";
import type { PaymentCreateData } from "@/lib/queries/financial";
import { buildCompanyAccountMap, generatePaymentJournalEntry } from "@/lib/utils/invoice-accounting";

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

    const data: PaymentCreateData = {
      invoice_id: body.invoice_id,
      payment_date: body.payment_date,
      amount: body.amount,
      method: body.method,
      reference_number: body.reference_number,
      bank_account_id: body.bank_account_id,
      notes: body.notes,
    };

    const result = await recordPayment(supabase, userCompany.companyId, data);

    if (!result) {
      return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
    }

    // Auto-generate journal entry for the payment (non-blocking)
    try {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("id, invoice_number, invoice_type, project_id, vendor_name, client_name")
        .eq("id", data.invoice_id)
        .single();

      if (invoice) {
        const accountMap = await buildCompanyAccountMap(supabase, userCompany.companyId);
        await generatePaymentJournalEntry(
          supabase,
          userCompany.companyId,
          userCompany.userId,
          {
            id: result.id,
            amount: data.amount,
            payment_date: data.payment_date,
            method: data.method,
          },
          {
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            invoice_type: invoice.invoice_type,
            project_id: invoice.project_id,
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
        const adjustment = invoice.invoice_type === "payable" ? -data.amount : data.amount;
        const { data: bank } = await supabase
          .from("bank_accounts")
          .select("current_balance")
          .eq("id", bankAccountId)
          .single();

        if (bank) {
          await supabase
            .from("bank_accounts")
            .update({ current_balance: bank.current_balance + adjustment })
            .eq("id", bankAccountId);
        }
      }
    } catch (bankErr) {
      console.warn("Bank balance sync failed for payment:", result.id, bankErr);
    }

    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/financial/payments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
