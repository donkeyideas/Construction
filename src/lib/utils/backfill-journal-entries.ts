import { SupabaseClient } from "@supabase/supabase-js";
import {
  buildCompanyAccountMap,
  generateChangeOrderJournalEntry,
  generateInvoiceJournalEntry,
  generateLeaseRevenueSchedule,
  generateRentPaymentJournalEntry,
  generateEquipmentPurchaseJournalEntry,
  generateDepreciationJournalEntries,
  generateMaintenanceCostJournalEntry,
  generatePayrollRunJournalEntry,
} from "@/lib/utils/invoice-accounting";

export interface BackfillResult {
  coGenerated: number;
  invGenerated: number;
  leaseScheduled: number;
  rentPaymentGenerated: number;
  equipPurchaseGenerated: number;
  depreciationGenerated: number;
  payrollGenerated: number;
  maintenanceGenerated: number;
}

/**
 * Ensure required GL accounts exist for JE generation.
 * Creates any missing accounts that the backfill depends on.
 */
async function ensureRequiredAccounts(
  supabase: SupabaseClient,
  companyId: string
): Promise<void> {
  const { count } = await supabase
    .from("chart_of_accounts")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);
  if (!count || count === 0) return;

  const required = [
    { number: "1500", name: "Equipment", type: "asset", sub: "fixed_asset", balance: "debit", desc: "Equipment and machinery" },
    { number: "1540", name: "Accumulated Depreciation", type: "asset", sub: "fixed_asset", balance: "credit", desc: "Cumulative depreciation of fixed assets" },
    { number: "6250", name: "Repairs & Maintenance", type: "expense", sub: "operating_expense", balance: "debit", desc: "Property and equipment repair costs" },
    { number: "6700", name: "Depreciation Expense", type: "expense", sub: "operating_expense", balance: "debit", desc: "Periodic depreciation of fixed assets" },
  ];

  for (const acct of required) {
    const nameLower = acct.name.toLowerCase();
    const { data: existing } = await supabase
      .from("chart_of_accounts")
      .select("id")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .ilike("name", `%${nameLower}%`)
      .limit(1);

    if (!existing || existing.length === 0) {
      await supabase.from("chart_of_accounts").insert({
        company_id: companyId,
        account_number: acct.number,
        name: acct.name,
        account_type: acct.type,
        sub_type: acct.sub,
        normal_balance: acct.balance,
        description: acct.desc,
        is_active: true,
      });
    }
  }
}

/**
 * Backfill missing journal entries for all entity types.
 * Safe to call multiple times — skips entities that already have JEs.
 * Auto-seeds required GL accounts if missing.
 */
export async function backfillMissingJournalEntries(
  supabase: SupabaseClient,
  companyId: string,
  userId: string
): Promise<BackfillResult> {
  const result: BackfillResult = {
    coGenerated: 0,
    invGenerated: 0,
    leaseScheduled: 0,
    rentPaymentGenerated: 0,
    equipPurchaseGenerated: 0,
    depreciationGenerated: 0,
    payrollGenerated: 0,
    maintenanceGenerated: 0,
  };

  // Auto-seed required GL accounts before building the map
  await ensureRequiredAccounts(supabase, companyId);

  const accountMap = await buildCompanyAccountMap(supabase, companyId);
  if (!accountMap.cashId && !accountMap.arId && !accountMap.apId) {
    return result;
  }

  // --- Change Orders ---
  const { data: changeOrders } = await supabase
    .from("change_orders")
    .select("id, co_number, amount, reason, project_id, title, status")
    .eq("company_id", companyId)
    .in("status", ["approved", "draft", "submitted"])
    .not("amount", "is", null);

  if (changeOrders && changeOrders.length > 0) {
    const coRefs = changeOrders.map((co) => `change_order:${co.id}`);
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
        const r = await generateChangeOrderJournalEntry(supabase, companyId, userId, {
          id: co.id, co_number: co.co_number, amount: co.amount,
          reason: co.reason || "design_change", project_id: co.project_id, title: co.title,
        }, accountMap);
        if (r) result.coGenerated++;
      } catch (err) { console.warn("Backfill CO JE failed:", co.id, err); }
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
      try {
        const r = await generateInvoiceJournalEntry(supabase, companyId, userId, {
          id: inv.id, invoice_number: inv.invoice_number, invoice_type: inv.invoice_type,
          invoice_date: inv.invoice_date, total_amount: Number(inv.total_amount),
          tax_amount: Number(inv.tax_amount) || 0, retainage_held: Number(inv.retainage_held) || 0,
          gl_account_id: inv.gl_account_id, project_id: inv.project_id, property_id: inv.property_id,
        }, accountMap);
        if (r) result.invGenerated++;
      } catch (err) { console.warn("Backfill invoice JE failed:", inv.id, err); }
    }
  }

  // --- Lease Revenue Schedules ---
  if (accountMap.rentReceivableId && accountMap.deferredRentalRevenueId) {
    const { data: leases } = await supabase
      .from("leases")
      .select("id, property_id, tenant_name, monthly_rent, lease_start, lease_end, status")
      .eq("company_id", companyId)
      .in("status", ["active", "renewed"])
      .not("monthly_rent", "is", null)
      .gt("monthly_rent", 0);

    for (const lease of leases ?? []) {
      if (!lease.lease_start || !lease.lease_end) continue;
      try {
        const r = await generateLeaseRevenueSchedule(supabase, companyId, userId, {
          id: lease.id, property_id: lease.property_id,
          tenant_name: lease.tenant_name ?? "Tenant",
          monthly_rent: Number(lease.monthly_rent),
          lease_start: lease.lease_start, lease_end: lease.lease_end,
        }, accountMap);
        result.leaseScheduled += r.scheduledCount;
      } catch (err) { console.warn("Backfill lease schedule failed:", lease.id, err); }
    }
  }

  // --- Rent Payments ---
  if (accountMap.cashId && accountMap.rentReceivableId) {
    const { data: rentPayments } = await supabase
      .from("rent_payments")
      .select("id, amount, payment_date, late_fee, lease_id, property_id, leases(tenant_name), journal_entry_id")
      .eq("company_id", companyId)
      .is("journal_entry_id", null)
      .not("amount", "is", null)
      .gt("amount", 0);

    for (const pmt of rentPayments ?? []) {
      const tenantName = (pmt.leases as unknown as { tenant_name: string } | null)?.tenant_name ?? "Tenant";
      try {
        const r = await generateRentPaymentJournalEntry(supabase, companyId, userId, {
          id: pmt.id, amount: Number(pmt.amount), payment_date: pmt.payment_date,
          late_fee: Number(pmt.late_fee) || 0, lease_id: pmt.lease_id,
          property_id: pmt.property_id, tenant_name: tenantName,
        }, accountMap);
        if (r) result.rentPaymentGenerated++;
      } catch (err) { console.warn("Backfill rent payment JE failed:", pmt.id, err); }
    }
  }

  // --- Equipment Purchases ---
  if (accountMap.cashId && accountMap.equipmentAssetId) {
    const { data: equipment } = await supabase
      .from("equipment")
      .select("id, name, purchase_cost, purchase_date")
      .eq("company_id", companyId)
      .not("purchase_cost", "is", null)
      .gt("purchase_cost", 0);

    if (equipment && equipment.length > 0) {
      const eqRefs = equipment.map((e) => `equipment_purchase:${e.id}`);
      const { data: existingJEs } = await supabase
        .from("journal_entries")
        .select("reference")
        .eq("company_id", companyId)
        .in("reference", eqRefs);
      const existingRefs = new Set((existingJEs ?? []).map((j) => j.reference));

      for (const eq of equipment) {
        if (existingRefs.has(`equipment_purchase:${eq.id}`)) continue;
        try {
          const r = await generateEquipmentPurchaseJournalEntry(supabase, companyId, userId, {
            id: eq.id, name: eq.name, purchase_cost: Number(eq.purchase_cost),
            purchase_date: eq.purchase_date ?? new Date().toISOString().split("T")[0],
          }, accountMap);
          if (r) result.equipPurchaseGenerated++;
        } catch (err) { console.warn("Backfill equipment purchase JE failed:", eq.id, err); }
      }
    }
  }

  // --- Equipment Depreciation ---
  if (accountMap.depreciationExpenseId && accountMap.accumulatedDepreciationId) {
    const { data: depreciableEquip } = await supabase
      .from("equipment")
      .select("id, name, purchase_cost, salvage_value, useful_life_months, depreciation_start_date")
      .eq("company_id", companyId)
      .not("useful_life_months", "is", null)
      .gt("useful_life_months", 0)
      .not("depreciation_start_date", "is", null);

    for (const eq of depreciableEquip ?? []) {
      try {
        const r = await generateDepreciationJournalEntries(supabase, companyId, userId, {
          id: eq.id, name: eq.name, purchase_cost: Number(eq.purchase_cost) || 0,
          salvage_value: Number(eq.salvage_value) || 0,
          useful_life_months: eq.useful_life_months,
          depreciation_start_date: eq.depreciation_start_date,
        }, accountMap);
        result.depreciationGenerated += r.generatedCount;
      } catch (err) { console.warn("Backfill depreciation JE failed:", eq.id, err); }
    }
  }

  // --- Payroll Runs ---
  const { data: payrollRuns } = await supabase
    .from("payroll_runs")
    .select("id, pay_date, period_start, period_end, total_gross, total_net, total_employer_taxes, employee_count, journal_entry_id, status")
    .eq("company_id", companyId)
    .in("status", ["approved", "paid"])
    .is("journal_entry_id", null);

  for (const run of payrollRuns ?? []) {
    // Fetch items for this run
    const { data: items } = await supabase
      .from("payroll_items")
      .select("federal_income_tax, state_income_tax, social_security_employee, medicare_employee, social_security_employer, medicare_employer, futa_employer, suta_employer")
      .eq("payroll_run_id", run.id);

    if (!items || items.length === 0) continue;

    try {
      const r = await generatePayrollRunJournalEntry(supabase, companyId, userId, {
        id: run.id, pay_date: run.pay_date, period_start: run.period_start,
        period_end: run.period_end, total_gross: Number(run.total_gross) || 0,
        total_net: Number(run.total_net) || 0, total_employer_taxes: Number(run.total_employer_taxes) || 0,
        employee_count: run.employee_count || 0, items,
      }, accountMap);

      if (r) {
        // Link JE back to payroll run
        await supabase.from("payroll_runs").update({ journal_entry_id: r.journalEntryId }).eq("id", run.id);
        result.payrollGenerated++;
      }
    } catch (err) { console.warn("Backfill payroll JE failed:", run.id, err); }
  }

  // --- Property Maintenance ---
  if (accountMap.repairsMaintenanceId) {
    const { data: maintenance } = await supabase
      .from("maintenance_requests")
      .select("id, title, actual_cost, created_at, property_id, journal_entry_id")
      .eq("company_id", companyId)
      .is("journal_entry_id", null)
      .not("actual_cost", "is", null)
      .gt("actual_cost", 0);

    for (const m of maintenance ?? []) {
      try {
        const r = await generateMaintenanceCostJournalEntry(supabase, companyId, userId, {
          id: m.id, source: "property", description: m.title ?? "Property maintenance",
          cost: Number(m.actual_cost), date: m.created_at?.split("T")[0] ?? new Date().toISOString().split("T")[0],
          property_id: m.property_id,
        }, accountMap);
        if (r) result.maintenanceGenerated++;
      } catch (err) { console.warn("Backfill property maintenance JE failed:", m.id, err); }
    }

    // Equipment maintenance logs
    const { data: equipMaint } = await supabase
      .from("equipment_maintenance_logs")
      .select("id, description, cost, maintenance_date, journal_entry_id")
      .eq("company_id", companyId)
      .is("journal_entry_id", null)
      .not("cost", "is", null)
      .gt("cost", 0);

    for (const m of equipMaint ?? []) {
      try {
        const r = await generateMaintenanceCostJournalEntry(supabase, companyId, userId, {
          id: m.id, source: "equipment", description: m.description ?? "Equipment maintenance",
          cost: Number(m.cost), date: m.maintenance_date ?? new Date().toISOString().split("T")[0],
        }, accountMap);
        if (r) result.maintenanceGenerated++;
      } catch (err) { console.warn("Backfill equipment maintenance JE failed:", m.id, err); }
    }
  }

  return result;
}
