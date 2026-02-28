import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getInvoiceById, updateInvoice } from "@/lib/queries/financial";
import { createNotifications } from "@/lib/utils/notifications";
import { checkSubscriptionAccess } from "@/lib/guards/subscription-guard";
import {
  buildCompanyAccountMap,
  generateInvoiceJournalEntry,
  generateInvoiceDeferralSchedule,
} from "@/lib/utils/invoice-accounting";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const invoice = await getInvoiceById(supabase, id);

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error("GET /api/financial/invoices/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const subBlock = await checkSubscriptionAccess(userCompany.companyId, "PATCH");
    if (subBlock) return subBlock;

    // Verify the invoice belongs to this company
    const existing = await getInvoiceById(supabase, id);
    if (!existing) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Note: balance_due is a Postgres GENERATED COLUMN (total_amount - amount_paid)
    // It auto-recomputes when total_amount or amount_paid change. Do NOT set it directly.
    delete body.balance_due;

    const result = await updateInvoice(supabase, id, body);

    if (result !== true) {
      return NextResponse.json(
        { error: typeof result === "string" ? `Failed to update invoice: ${result}` : "Failed to update invoice" },
        { status: 500 }
      );
    }

    if (body.status) {
      try {
        await createNotifications(supabase, {
          companyId: userCompany.companyId,
          actorUserId: userCompany.userId,
          title: `Invoice ${existing.invoice_number || id.slice(0, 8)} updated`,
          message: `Invoice status changed to "${body.status}".`,
          notificationType: body.status === "paid" ? "approval" : "info",
          entityType: "invoice",
          entityId: id,
        });
      } catch (e) { console.warn("Notification failed:", e); }
    }

    // Re-generate invoice JE on every edit (forceRegenerate deletes old + creates new).
    // Passes updated values (gl_account_id, amounts, deferral dates) from the PATCH body.
    const warnings: string[] = [];
    let accountMap: Awaited<ReturnType<typeof buildCompanyAccountMap>> | null = null;

    // Fetch the updated invoice so JE uses the new field values just written
    const updatedInvoice = await getInvoiceById(supabase, id);
    const rawUpdated = updatedInvoice as unknown as Record<string, unknown>;
    const defStart = (body.deferral_start_date ?? rawUpdated?.deferral_start_date) as string | undefined;
    const defEnd = (body.deferral_end_date ?? rawUpdated?.deferral_end_date) as string | undefined;

    const newTotalAmount = body.total_amount ? Number(body.total_amount) : Number(existing.total_amount);
    if (newTotalAmount > 0 && (body.status ?? existing.status) !== "voided") {
      try {
        const raw = existing as unknown as Record<string, unknown>;
        accountMap = await buildCompanyAccountMap(supabase, userCompany.companyId);
        // Use forceRegenerate so edits (GL account change, amount change, deferral toggle) take effect
        const jeResult = await generateInvoiceJournalEntry(supabase, userCompany.companyId, userCompany.userId, {
          id,
          invoice_number: existing.invoice_number ?? "",
          invoice_type: existing.invoice_type ?? "payable",
          total_amount: body.total_amount ? Number(body.total_amount) : Number(existing.total_amount),
          subtotal: body.subtotal ? Number(body.subtotal) : (existing.subtotal ? Number(existing.subtotal) : undefined),
          tax_amount: body.tax_amount !== undefined ? Number(body.tax_amount) : (existing.tax_amount ? Number(existing.tax_amount) : undefined),
          invoice_date: body.invoice_date ?? existing.invoice_date ?? new Date().toISOString().split("T")[0],
          status: body.status ?? existing.status,
          project_id: body.project_id !== undefined ? body.project_id : existing.project_id,
          property_id: raw.property_id as string | null | undefined,
          vendor_name: body.vendor_name !== undefined ? body.vendor_name : existing.vendor_name,
          client_name: body.client_name !== undefined ? body.client_name : existing.client_name,
          gl_account_id: body.gl_account_id !== undefined ? body.gl_account_id : (raw.gl_account_id as string | null | undefined),
          retainage_pct: raw.retainage_pct ? Number(raw.retainage_pct) : undefined,
          retainage_held: raw.retainage_held ? Number(raw.retainage_held) : undefined,
          deferral_start_date: defStart || null,
          deferral_end_date: defEnd || null,
        }, accountMap, { forceRegenerate: true });
        if (!jeResult) {
          const invType = existing.invoice_type ?? "payable";
          const missing = invType === "payable"
            ? (!accountMap.apId ? "AP account" : "expense account")
            : (!accountMap.arId ? "AR account" : "revenue account");
          warnings.push(`Journal entry not created: no ${missing} found in Chart of Accounts.`);
        }
      } catch (jeErr) {
        console.warn("Invoice JE generation failed (non-blocking):", jeErr);
        warnings.push("Journal entry generation failed. Check Chart of Accounts setup.");
      }
    }
    if (defStart && defEnd && updatedInvoice) {
      try {
        const defAccountMap = accountMap || await buildCompanyAccountMap(supabase, userCompany.companyId);
        const defResult = await generateInvoiceDeferralSchedule(supabase, userCompany.companyId, userCompany.userId, {
          id,
          invoice_type: updatedInvoice.invoice_type as "payable" | "receivable",
          total_amount: Number(updatedInvoice.total_amount),
          deferral_start_date: defStart,
          deferral_end_date: defEnd,
          project_id: updatedInvoice.project_id,
          gl_account_id: rawUpdated?.gl_account_id as string | undefined,
        }, defAccountMap, { forceRegenerate: true });
        if (defResult.insertErrors > 0) {
          warnings.push(`Deferral schedule: ${defResult.insertErrors} month(s) failed to save. Check that migration 065 has been run in Supabase (invoice_deferral_schedule table).`);
        }
      } catch (defErr) {
        console.warn("Deferral schedule generation failed:", defErr);
        warnings.push("Deferral schedule generation failed.");
      }
    }

    return NextResponse.json({ success: true, warnings });
  } catch (error) {
    console.error("PATCH /api/financial/invoices/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const subBlock2 = await checkSubscriptionAccess(userCompany.companyId, "DELETE");
    if (subBlock2) return subBlock2;

    const { searchParams } = new URL(request.url);
    const hard = searchParams.get("hard") === "true";

    // Fetch payments and invoice type to reverse bank balances
    const { data: payments } = await supabase
      .from("payments")
      .select("id, amount, bank_account_id")
      .eq("invoice_id", id);

    const { data: invoiceInfo } = await supabase
      .from("invoices")
      .select("invoice_type")
      .eq("id", id)
      .single();

    // Reverse bank balances for all payments
    if (payments && payments.length > 0 && invoiceInfo) {
      for (const pmt of payments) {
        if (pmt.bank_account_id) {
          // Payable payment subtracted cash → add back. Receivable added → subtract.
          const reversal = invoiceInfo.invoice_type === "payable" ? pmt.amount : -pmt.amount;
          await supabase.rpc("adjust_bank_balance", {
            p_bank_id: pmt.bank_account_id,
            p_adjustment: reversal,
          });
        }

        // Delete payment JE lines + JEs
        const { data: pmtJEs } = await supabase
          .from("journal_entries")
          .select("id")
          .eq("company_id", userCompany.companyId)
          .eq("reference", `payment:${pmt.id}`);
        if (pmtJEs && pmtJEs.length > 0) {
          const jeIds = pmtJEs.map((je) => je.id);
          await supabase.from("journal_entry_lines").delete().in("journal_entry_id", jeIds);
          await supabase.from("journal_entries").delete().in("id", jeIds);
        }
      }
    }

    // Helper: collect deferral recognition JEs for this invoice
    const { data: deferralJEs } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("company_id", userCompany.companyId)
      .like("reference", `deferral:${id}:%`);
    const deferralJEIds = (deferralJEs ?? []).map((je) => je.id);

    if (hard) {
      // Hard delete: remove invoice JE, deferral JEs, payments, and the invoice row

      // Delete main invoice JE
      const { data: invJEs } = await supabase
        .from("journal_entries")
        .select("id")
        .eq("company_id", userCompany.companyId)
        .eq("reference", `invoice:${id}`);
      if (invJEs && invJEs.length > 0) {
        const jeIds = invJEs.map((je) => je.id);
        await supabase.from("journal_entry_lines").delete().in("journal_entry_id", jeIds);
        await supabase.from("journal_entries").delete().in("id", jeIds);
      }

      // Delete all deferral recognition JEs
      if (deferralJEIds.length > 0) {
        await supabase.from("journal_entry_lines").delete().in("journal_entry_id", deferralJEIds);
        await supabase.from("journal_entries").delete().in("id", deferralJEIds);
      }

      // Delete payments
      await supabase.from("payments").delete().eq("invoice_id", id);

      // Delete the invoice itself (cascades invoice_deferral_schedule rows)
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", id)
        .eq("company_id", userCompany.companyId);
      if (error) {
        return NextResponse.json(
          { error: "Failed to delete invoice" },
          { status: 500 }
        );
      }
    } else {
      // Soft void: reset amount_paid, void invoice + all linked JEs
      // Delete payments (already reversed bank balances above)
      if (payments && payments.length > 0) {
        await supabase.from("payments").delete().eq("invoice_id", id);
      }

      // Reset amount_paid to 0 and set status to voided
      await supabase
        .from("invoices")
        .update({ amount_paid: 0, status: "voided" })
        .eq("id", id);

      // Void main invoice journal entry
      await supabase
        .from("journal_entries")
        .update({ status: "voided" })
        .eq("company_id", userCompany.companyId)
        .eq("reference", `invoice:${id}`);

      // Void all deferral recognition JEs
      if (deferralJEIds.length > 0) {
        await supabase
          .from("journal_entries")
          .update({ status: "voided" })
          .in("id", deferralJEIds);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/financial/invoices/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
