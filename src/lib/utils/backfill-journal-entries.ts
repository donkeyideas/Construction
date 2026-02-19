import { SupabaseClient } from "@supabase/supabase-js";
import {
  buildCompanyAccountMap,
  generateChangeOrderJournalEntry,
  generateInvoiceJournalEntry,
} from "@/lib/utils/invoice-accounting";

/**
 * Backfill missing journal entries for approved change orders and invoices.
 * Safe to call multiple times — skips entities that already have JEs.
 */
export async function backfillMissingJournalEntries(
  supabase: SupabaseClient,
  companyId: string,
  userId: string
): Promise<{ coGenerated: number; invGenerated: number }> {
  let coGenerated = 0;
  let invGenerated = 0;

  const accountMap = await buildCompanyAccountMap(supabase, companyId);
  if (!accountMap.cashId && !accountMap.arId && !accountMap.apId) {
    return { coGenerated, invGenerated };
  }

  // --- Change Orders ---
  const { data: changeOrders } = await supabase
    .from("change_orders")
    .select("id, co_number, amount, reason, project_id, title, status")
    .eq("company_id", companyId)
    .eq("status", "approved")
    .not("amount", "is", null);

  if (changeOrders && changeOrders.length > 0) {
    const coIds = changeOrders.map((co) => co.id);
    const coRefs = coIds.map((id) => `change_order:${id}`);

    const { data: existingJEs } = await supabase
      .from("journal_entries")
      .select("reference")
      .eq("company_id", companyId)
      .in("reference", coRefs);

    const existingRefs = new Set((existingJEs ?? []).map((j) => j.reference));

    for (const co of changeOrders) {
      if (existingRefs.has(`change_order:${co.id}`)) continue;
      if (co.amount === 0) continue;

      try {
        const result = await generateChangeOrderJournalEntry(
          supabase,
          companyId,
          userId,
          {
            id: co.id,
            co_number: co.co_number,
            amount: co.amount,
            reason: co.reason || "design_change",
            project_id: co.project_id,
            title: co.title,
          },
          accountMap
        );
        if (result) coGenerated++;
      } catch (err) {
        console.warn("Backfill CO JE failed:", co.id, err);
      }
    }
  }

  // --- Invoices ---
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, invoice_type, invoice_date, total_amount, tax_amount, retainage_held, gl_account_id, vendor_name, client_name, project_id, property_id, status")
    .eq("company_id", companyId)
    .neq("status", "voided")
    .not("total_amount", "is", null);

  if (invoices && invoices.length > 0) {
    const invIds = invoices.map((i) => i.id);
    const invRefs = invIds.map((id) => `invoice:${id}`);

    const { data: existingJEs } = await supabase
      .from("journal_entries")
      .select("reference")
      .eq("company_id", companyId)
      .in("reference", invRefs);

    const existingRefs = new Set((existingJEs ?? []).map((j) => j.reference));

    for (const inv of invoices) {
      if (existingRefs.has(`invoice:${inv.id}`)) continue;
      if (!inv.total_amount || Number(inv.total_amount) === 0) continue;

      try {
        const result = await generateInvoiceJournalEntry(
          supabase,
          companyId,
          userId,
          {
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
          },
          accountMap
        );
        if (result) invGenerated++;
      } catch (err) {
        console.warn("Backfill invoice JE failed:", inv.id, err);
      }
    }
  }

  return { coGenerated, invGenerated };
}
