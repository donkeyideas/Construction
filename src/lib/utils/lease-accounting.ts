/**
 * lease-accounting.ts
 * GAAP accrual-basis rent recognition helpers.
 *
 * Monthly accrual (when rent is earned each month):
 *   DR 1220 Rent Receivable   $X/month
 *   CR 4100 Rental Income     $X/month
 *
 * Reference format per JE: rent:accrual:{leaseId}:{YYYY}-{MM}
 * This makes every JE idempotent — safe to re-run without duplicates.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildCompanyAccountMap, findOrCreateCOAAccount } from "./invoice-accounting";
import { createPostedJournalEntry } from "@/lib/queries/financial";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RentAccrualResult {
  leaseId: string;
  tenantName: string;
  created: number;
  skipped: number;
  monthlyAmount: number;
  months: number;
}

export interface GenerateAllRentAccrualsResult {
  totalCreated: number;
  totalSkipped: number;
  leases: RentAccrualResult[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a YYYY-MM-DD string as local integers (avoids UTC timezone offset issues) */
function parseLocalDate(dateStr: string): { year: number; month: number } {
  const [y, m] = dateStr.split("-").map(Number);
  return { year: y, month: m - 1 }; // month is 0-based
}

// ---------------------------------------------------------------------------
// JE generation
// ---------------------------------------------------------------------------

/**
 * Calculate the JE generation end date for a lease.
 * - Regular lease: use lease_end as-is.
 * - Auto-renew lease: extend by one additional full term (same duration),
 *   so JEs exist for the next renewal cycle without any manual action.
 *   Capped at 15 years from lease_start to avoid runaway JE counts.
 */
function getAccrualEndDate(leaseStart: string, leaseEnd: string, autoRenew: boolean): string {
  if (!autoRenew) return leaseEnd;

  const { year: startYr, month: startMo } = parseLocalDate(leaseStart);
  const { year: endYr, month: endMo } = parseLocalDate(leaseEnd);

  // Term length in months (0-based months)
  const termMonths = (endYr - startYr) * 12 + (endMo - startMo);
  if (termMonths <= 0) return leaseEnd;

  // Cap at 15 years from start
  const maxMo = startMo + 15 * 12; // 0-based
  const maxYr = startYr + Math.floor(maxMo / 12);
  const maxMonth = maxMo % 12;

  // Extend by another full term
  const extTotalMo = endMo + termMonths; // 0-based
  const extYr = endYr + Math.floor(extTotalMo / 12);
  const extMo = extTotalMo % 12; // 0-based

  // Apply cap
  if (extYr > maxYr || (extYr === maxYr && extMo > maxMonth)) {
    return `${maxYr}-${String(maxMonth + 1).padStart(2, "0")}-01`;
  }
  return `${extYr}-${String(extMo + 1).padStart(2, "0")}-01`;
}

/**
 * Generate monthly rent accrual JEs for a list of leases.
 * For each lease: DR Rent Receivable / CR Rental Income for every month
 * from lease_start through lease_end (full term, including future months).
 * Auto-renew leases get an extra cycle pre-generated automatically.
 *
 * Idempotent: skips any month where the reference JE already exists.
 */
export async function generateAllRentAccrualJEs(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  leases: Array<{
    id: string;
    tenant_name: string;
    monthly_rent: number;
    lease_start: string;  // YYYY-MM-DD
    lease_end: string;    // YYYY-MM-DD
    property_id: string;
    auto_renew?: boolean;
  }>
): Promise<GenerateAllRentAccrualsResult> {
  if (leases.length === 0) {
    return { totalCreated: 0, totalSkipped: 0, leases: [] };
  }

  // Resolve accounts once for all leases
  const accountMap = await buildCompanyAccountMap(supabase, companyId);

  // Rent Receivable (debit): prefer named "Rent Receivable", fall back to AR, else auto-create
  let arAccountId = accountMap.rentReceivableId || accountMap.arId;
  if (!arAccountId) {
    arAccountId = await findOrCreateCOAAccount(
      supabase, companyId,
      "1220", "Rent Receivable", "asset", "current_asset", "debit",
      "Accrued rent earned but not yet collected from tenants"
    );
  }

  // Rental Income (credit): prefer named "Rental Income", else auto-create
  let revenueAccountId = accountMap.rentalIncomeId;
  if (!revenueAccountId) {
    revenueAccountId = await findOrCreateCOAAccount(
      supabase, companyId,
      "4100", "Rental Income", "revenue", "operating_revenue", "credit",
      "Revenue from tenant rent payments"
    );
  }

  if (!arAccountId || !revenueAccountId) {
    throw new Error("Could not resolve Rent Receivable or Rental Income accounts.");
  }

  const results: RentAccrualResult[] = [];
  let totalCreated = 0;
  let totalSkipped = 0;

  for (const lease of leases) {
    const monthlyAmount = Math.round(lease.monthly_rent * 100) / 100;
    if (monthlyAmount <= 0) {
      results.push({ leaseId: lease.id, tenantName: lease.tenant_name, created: 0, skipped: 0, monthlyAmount: 0, months: 0 });
      continue;
    }

    // Generate for the full term. Auto-renew leases get an extra cycle.
    const endStr = getAccrualEndDate(lease.lease_start, lease.lease_end, lease.auto_renew ?? false);

    const { year: startYr, month: startMo } = parseLocalDate(lease.lease_start);
    const { year: endYr, month: endMo } = parseLocalDate(endStr);

    // Build month list
    const months: { year: number; month: number; entryDate: string }[] = [];
    let yr = startYr;
    let mo = startMo; // 0-based
    while (yr < endYr || (yr === endYr && mo <= endMo)) {
      const month1Based = mo + 1;
      const entryDate = `${yr}-${String(month1Based).padStart(2, "0")}-01`;
      months.push({ year: yr, month: month1Based, entryDate });
      mo++;
      if (mo === 12) { mo = 0; yr++; }
    }

    if (months.length === 0) {
      results.push({ leaseId: lease.id, tenantName: lease.tenant_name, created: 0, skipped: 0, monthlyAmount, months: 0 });
      continue;
    }

    // Pre-fetch all existing references for this lease in batches of 500
    const allRefs = months.map(
      (m) => `rent:accrual:${lease.id}:${m.year}-${String(m.month).padStart(2, "0")}`
    );
    const existingRefs = new Set<string>();
    const BATCH_SIZE = 500;
    for (let i = 0; i < allRefs.length; i += BATCH_SIZE) {
      const { data } = await supabase
        .from("journal_entries")
        .select("reference")
        .eq("company_id", companyId)
        .in("reference", allRefs.slice(i, i + BATCH_SIZE));
      for (const row of data ?? []) {
        if (row.reference) existingRefs.add(row.reference);
      }
    }

    let created = 0;
    let skipped = 0;

    // Insert in batches of 50 to avoid request timeouts
    const JE_BATCH = 50;
    for (let i = 0; i < months.length; i += JE_BATCH) {
      const batch = months.slice(i, i + JE_BATCH);
      await Promise.all(
        batch.map(async ({ year, month, entryDate }) => {
          const monthStr = String(month).padStart(2, "0");
          const reference = `rent:accrual:${lease.id}:${year}-${monthStr}`;
          if (existingRefs.has(reference)) { skipped++; return; }

          const result = await createPostedJournalEntry(supabase, companyId, userId, {
            entry_number: `RENT-${lease.id.slice(0, 8).toUpperCase()}-${year}${monthStr}`,
            entry_date: entryDate,
            description: `Rent accrual: ${lease.tenant_name} (${year}-${monthStr})`,
            reference,
            lines: [
              {
                account_id: arAccountId!,
                debit: monthlyAmount,
                credit: 0,
                description: `Rent receivable — ${lease.tenant_name}`,
                property_id: lease.property_id,
              },
              {
                account_id: revenueAccountId!,
                debit: 0,
                credit: monthlyAmount,
                description: `Rental income — ${lease.tenant_name}`,
                property_id: lease.property_id,
              },
            ],
          });

          if (result) created++;
          else skipped++;
        })
      );
    }

    results.push({ leaseId: lease.id, tenantName: lease.tenant_name, created, skipped, monthlyAmount, months: months.length });
    totalCreated += created;
    totalSkipped += skipped;
  }

  return { totalCreated, totalSkipped, leases: results };
}
