import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { buildCompanyAccountMap, generateInvoiceJournalEntry } from "@/lib/utils/invoice-accounting";
import { createPostedJournalEntry } from "@/lib/queries/financial";

/**
 * POST /api/financial/audit/fix-invoices
 * Fixes two audit warnings:
 *   1. Invoice GL Mappings — assigns default GL account to unmapped invoices
 *   2. Invoice JE Coverage — creates missing journal entries for active invoices
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId, userId } = ctx;
    const accountMap = await buildCompanyAccountMap(supabase, companyId);

    let glMapped = 0;
    let jesCreated = 0;

    // --- Step 1: Fix missing GL account mappings ---
    const { data: unmapped } = await supabase
      .from("invoices")
      .select("id, invoice_type")
      .eq("company_id", companyId)
      .is("gl_account_id", null)
      .not("status", "in", '("draft","voided")');

    if (unmapped && unmapped.length > 0) {
      // Find default revenue and expense accounts
      let defaultRevenueId: string | null = null;
      for (const num of ["4000", "4010", "4100", "4200"]) {
        if (accountMap.byNumber[num]) { defaultRevenueId = accountMap.byNumber[num]; break; }
      }
      let defaultExpenseId: string | null = null;
      for (const num of ["5000", "5010", "6000", "6100", "6200", "6900"]) {
        if (accountMap.byNumber[num]) { defaultExpenseId = accountMap.byNumber[num]; break; }
      }

      for (const inv of unmapped) {
        const glId = inv.invoice_type === "receivable" ? defaultRevenueId : defaultExpenseId;
        if (!glId) continue;

        const { error } = await supabase
          .from("invoices")
          .update({ gl_account_id: glId })
          .eq("id", inv.id);
        if (!error) glMapped++;
      }
    }

    // --- Step 2: Create missing journal entries ---
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, invoice_number, invoice_type, invoice_date, total_amount, tax_amount, retainage_held, gl_account_id, vendor_name, client_name, project_id, property_id, status, notes")
      .eq("company_id", companyId)
      .not("status", "in", '("draft","voided")')
      .not("total_amount", "is", null);

    if (invoices && invoices.length > 0) {
      // Find which already have JEs
      const invRefs = invoices.map((i) => `invoice:${i.id}`);
      const { data: existingJEs } = await supabase
        .from("journal_entries")
        .select("reference")
        .eq("company_id", companyId)
        .in("reference", invRefs);
      const existingRefs = new Set((existingJEs ?? []).map((j) => j.reference));

      for (const inv of invoices) {
        if (existingRefs.has(`invoice:${inv.id}`)) continue;
        if (!inv.total_amount || Number(inv.total_amount) === 0) continue;
        // Skip auto-generated invoices that use batch JE accounting
        const notes = inv.notes ?? "";
        if (notes.startsWith("auto-rent-") || notes.startsWith("auto-maint-") || notes.startsWith("csv-import:")) continue;

        try {
          const r = await generateInvoiceJournalEntry(supabase, companyId, userId, {
            id: inv.id,
            invoice_number: inv.invoice_number,
            invoice_type: inv.invoice_type,
            invoice_date: inv.invoice_date,
            total_amount: Number(inv.total_amount),
            tax_amount: Number(inv.tax_amount) || 0,
            retainage_held: Number(inv.retainage_held) || 0,
            gl_account_id: inv.gl_account_id,
            project_id: inv.project_id,
            property_id: inv.property_id,
          }, accountMap);
          if (r) jesCreated++;
        } catch (err) {
          console.warn("Fix invoice JE failed:", inv.id, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      glMapped,
      jesCreated,
    });
  } catch (err) {
    console.error("Fix invoices error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
