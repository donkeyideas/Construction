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

    // --- Step 3: Clean up orphaned invoice JEs ---
    let jesDeleted = 0;

    async function deleteJE(jeId: string) {
      await supabase.from("journal_entry_lines").delete().eq("journal_entry_id", jeId);
      const { error: delErr } = await supabase.from("journal_entries").delete().eq("id", jeId);
      if (!delErr) jesDeleted++;
    }

    // 3a. Invoice JEs whose invoice no longer exists or is voided
    const { data: allInvoiceJEs } = await supabase
      .from("journal_entries")
      .select("id, reference")
      .eq("company_id", companyId)
      .like("reference", "invoice:%")
      .neq("status", "voided");

    if (allInvoiceJEs && allInvoiceJEs.length > 0) {
      const jeInvoiceIds = allInvoiceJEs
        .map((je) => je.reference.replace("invoice:", ""))
        .filter((id) => id.length > 0);

      if (jeInvoiceIds.length > 0) {
        const { data: existingInvoices } = await supabase
          .from("invoices")
          .select("id, status")
          .eq("company_id", companyId)
          .in("id", jeInvoiceIds);

        const activeInvoiceIds = new Set(
          (existingInvoices ?? [])
            .filter((inv) => inv.status !== "voided")
            .map((inv) => inv.id)
        );

        for (const je of allInvoiceJEs) {
          const invId = je.reference.replace("invoice:", "");
          if (!activeInvoiceIds.has(invId)) {
            await deleteJE(je.id);
          }
        }
      }
    }

    // 3b. Payment JEs whose payment or parent invoice no longer exists
    const { data: allPaymentJEs } = await supabase
      .from("journal_entries")
      .select("id, reference")
      .eq("company_id", companyId)
      .like("reference", "payment:%")
      .neq("status", "voided");

    if (allPaymentJEs && allPaymentJEs.length > 0) {
      const paymentIds = allPaymentJEs
        .map((je) => je.reference.replace("payment:", ""))
        .filter((id) => id.length > 0);

      if (paymentIds.length > 0) {
        const { data: existingPayments } = await supabase
          .from("payments")
          .select("id")
          .eq("company_id", companyId)
          .in("id", paymentIds);

        const activePaymentIds = new Set((existingPayments ?? []).map((p) => p.id));

        for (const je of allPaymentJEs) {
          const pId = je.reference.replace("payment:", "");
          if (!activePaymentIds.has(pId)) {
            await deleteJE(je.id);
          }
        }
      }
    }

    // 3c. Nuclear cleanup: find ALL posted JEs hitting AP accounts.
    // Delete any JE whose referenced entity no longer exists, is voided,
    // or has no reference at all (orphaned manual/import entries).
    const { data: apAccounts } = await supabase
      .from("chart_of_accounts")
      .select("id")
      .eq("company_id", companyId)
      .eq("account_type", "liability")
      .or("name.ilike.%accounts payable%,name.ilike.%accts payable%,name.ilike.%a/p%,name.ilike.%trade payable%,name.ilike.%retainage payable%");

    if (apAccounts && apAccounts.length > 0) {
      const apAccountIds = apAccounts.map((a) => a.id);

      // Find distinct JE IDs with lines on AP accounts
      const { data: apJELines } = await supabase
        .from("journal_entry_lines")
        .select("journal_entry_id")
        .eq("company_id", companyId)
        .in("account_id", apAccountIds);

      if (apJELines && apJELines.length > 0) {
        const apJEIds = [...new Set(apJELines.map((l) => l.journal_entry_id))];

        // Get ALL active payable invoice IDs for cross-reference
        const { data: activePayableInvoices } = await supabase
          .from("invoices")
          .select("id")
          .eq("company_id", companyId)
          .eq("invoice_type", "payable")
          .not("status", "in", '("voided","draft")');
        const activeInvSet = new Set((activePayableInvoices ?? []).map((i) => i.id));

        // Get ALL active payment IDs
        const { data: activePayments } = await supabase
          .from("payments")
          .select("id")
          .eq("company_id", companyId);
        const activePaySet = new Set((activePayments ?? []).map((p) => p.id));

        // Get ALL active change order IDs
        const { data: activeCOs } = await supabase
          .from("change_orders")
          .select("id")
          .eq("company_id", companyId)
          .neq("status", "voided");
        const activeCOSet = new Set((activeCOs ?? []).map((c) => c.id));

        const CHUNK = 200;
        for (let i = 0; i < apJEIds.length; i += CHUNK) {
          const chunk = apJEIds.slice(i, i + CHUNK);
          const { data: jes } = await supabase
            .from("journal_entries")
            .select("id, reference, status")
            .eq("company_id", companyId)
            .in("id", chunk)
            .neq("status", "voided");

          for (const je of jes ?? []) {
            const ref = je.reference || "";
            let orphaned = false;

            if (!ref) {
              // No reference = orphaned manual/import entry hitting AP
              orphaned = true;
            } else if (ref.startsWith("invoice:")) {
              orphaned = !activeInvSet.has(ref.replace("invoice:", ""));
            } else if (ref.startsWith("payment:")) {
              orphaned = !activePaySet.has(ref.replace("payment:", ""));
            } else if (ref.startsWith("deferral:")) {
              const invId = ref.split(":")[1] || "";
              orphaned = !invId || !activeInvSet.has(invId);
            } else if (ref.startsWith("change_order:")) {
              orphaned = !activeCOSet.has(ref.replace("change_order:", ""));
            } else {
              // Unknown reference pattern hitting AP = orphaned
              orphaned = true;
            }

            if (orphaned) {
              await deleteJE(je.id);
            }
          }
        }
      }
    }

    console.log(`[financial] fix-invoices: glMapped=${glMapped}, jesCreated=${jesCreated}, jesDeleted=${jesDeleted}`);

    return NextResponse.json({
      success: true,
      glMapped,
      jesCreated,
      jesDeleted,
    });
  } catch (err) {
    console.error("Fix invoices error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
