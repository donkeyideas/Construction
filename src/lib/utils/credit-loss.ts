/**
 * credit-loss.ts
 * GAAP accounts receivable aging analysis and allowance for doubtful accounts.
 *
 * Standard aging-based reserve method (ASC 450 / ASC 310):
 *   DR 6810 Bad Debt Expense          $X
 *     CR 1230 Allowance for Doubtful Accounts  $X
 *
 * Reference format per JE: allowance:period-adj:{YYYY}-{MM}
 * Idempotent — the same period's JE is deleted and re-created on each run.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { findOrCreateCOAAccount } from "./invoice-accounting";
import { createPostedJournalEntry } from "@/lib/queries/financial";

// ---------------------------------------------------------------------------
// Aging buckets
// ---------------------------------------------------------------------------

export interface AgingBucket {
  label: string;
  minDays: number;
  maxDays: number | null; // null = unbounded (121+ days)
  rate: number;           // e.g. 0.10 = 10%
}

export const AGING_BUCKETS: AgingBucket[] = [
  { label: "Current",     minDays: 0,   maxDays: 0,   rate: 0.00 },
  { label: "1–30 Days",   minDays: 1,   maxDays: 30,  rate: 0.02 },
  { label: "31–60 Days",  minDays: 31,  maxDays: 60,  rate: 0.10 },
  { label: "61–90 Days",  minDays: 61,  maxDays: 90,  rate: 0.25 },
  { label: "91–120 Days", minDays: 91,  maxDays: 120, rate: 0.50 },
  { label: "121+ Days",   minDays: 121, maxDays: null, rate: 0.90 },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeaseAgingDetail {
  leaseId: string;
  tenantName: string;
  propertyName: string;
  bucketAmounts: number[]; // face value of past-due rent per bucket
  bucketReserves: number[]; // required reserve per bucket
  totalReceivable: number;
  requiredReserve: number;
}

export interface AgingAnalysis {
  asOfDate: string;         // ISO date (YYYY-MM-DD)
  bucketTotals: number[];   // sum of face values per bucket across all leases
  bucketReserves: number[]; // sum of reserves per bucket
  totalReceivable: number;
  requiredAllowance: number;
  currentAllowance: number; // existing 1230 credit balance from posted JEs
  adjustmentNeeded: number; // requiredAllowance - currentAllowance
  leases: LeaseAgingDetail[];
}

export interface PostAllowanceResult {
  posted: boolean;
  jeId: string | null;
  adjustmentAmount: number;
  reference: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Days from the 1st of a rent month to today (0 if month is current or future). */
function getDaysPastDue(rentMonthYYYYMM: string, todayISO: string): number {
  const dueDate = new Date(`${rentMonthYYYYMM}-01T00:00:00`);
  const today = new Date(`${todayISO}T00:00:00`);
  const diffMs = today.getTime() - dueDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/** Assign days-past-due to the appropriate aging bucket index. */
function getBucketIndex(daysPastDue: number): number {
  for (let i = AGING_BUCKETS.length - 1; i >= 0; i--) {
    if (daysPastDue >= AGING_BUCKETS[i].minDays) return i;
  }
  return 0;
}

/** Round to 2 decimal places. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Core calculation
// ---------------------------------------------------------------------------

export function calculateAgingAnalysis(
  leases: Array<{
    id: string;
    tenant_name: string | null;
    property_name: string;
    monthly_rent: number | null;
    lease_start: string | null;
    lease_end: string | null;
    status: string;
  }>,
  payments: Array<{
    lease_id: string;
    payment_date: string | null;
    due_date?: string | null;
  }>,
  currentAllowanceBalance: number,
  todayISO?: string
): AgingAnalysis {
  const today = todayISO ?? new Date().toISOString().slice(0, 10);
  const [todayYr, todayMo] = today.split("-").map(Number);

  const bucketCount = AGING_BUCKETS.length;
  const bucketTotals = new Array<number>(bucketCount).fill(0);
  const bucketReserves = new Array<number>(bucketCount).fill(0);
  const leaseDetails: LeaseAgingDetail[] = [];

  for (const lease of leases) {
    if (!lease.lease_start || !lease.monthly_rent || lease.monthly_rent <= 0) continue;

    const monthlyRent = lease.monthly_rent;
    const [startYr, startMo] = lease.lease_start.split("-").map(Number);

    // Determine end: min(lease_end, last-month-before-today)
    let endYr: number;
    let endMo: number;
    if (lease.lease_end) {
      const [leYr, leMo] = lease.lease_end.split("-").map(Number);
      // Cap to the month before today (rent for today's month is "Due Now", not past due)
      const prevMo = todayMo === 1 ? 12 : todayMo - 1;
      const prevYr = todayMo === 1 ? todayYr - 1 : todayYr;
      if (leYr < prevYr || (leYr === prevYr && leMo <= prevMo)) {
        endYr = leYr;
        endMo = leMo;
      } else {
        endYr = prevYr;
        endMo = prevMo;
      }
    } else {
      endMo = todayMo === 1 ? 12 : todayMo - 1;
      endYr = todayMo === 1 ? todayYr - 1 : todayYr;
    }

    // Build set of months that have a payment recorded
    const paidMonths = new Set<string>();
    for (const p of payments) {
      if (p.lease_id !== lease.id) continue;
      const ref = p.payment_date ?? p.due_date;
      if (ref) paidMonths.add(ref.slice(0, 7)); // "YYYY-MM"
    }

    const leaseBucketAmounts = new Array<number>(bucketCount).fill(0);
    const leaseBucketReserves = new Array<number>(bucketCount).fill(0);

    let yr = startYr;
    let mo = startMo;

    while (yr < endYr || (yr === endYr && mo <= endMo)) {
      const monthKey = `${yr}-${String(mo).padStart(2, "0")}`;
      if (!paidMonths.has(monthKey)) {
        const daysPastDue = getDaysPastDue(monthKey, today);
        const bucketIdx = getBucketIndex(daysPastDue);
        leaseBucketAmounts[bucketIdx] += monthlyRent;
        leaseBucketReserves[bucketIdx] += round2(monthlyRent * AGING_BUCKETS[bucketIdx].rate);
      }
      mo++;
      if (mo > 12) { mo = 1; yr++; }
    }

    const totalReceivable = leaseBucketAmounts.reduce((s, v) => s + v, 0);
    const requiredReserve = leaseBucketReserves.reduce((s, v) => s + v, 0);

    if (totalReceivable > 0 || requiredReserve > 0) {
      leaseDetails.push({
        leaseId: lease.id,
        tenantName: lease.tenant_name ?? "Unknown",
        propertyName: lease.property_name,
        bucketAmounts: leaseBucketAmounts,
        bucketReserves: leaseBucketReserves,
        totalReceivable,
        requiredReserve,
      });
    }

    for (let i = 0; i < bucketCount; i++) {
      bucketTotals[i] += leaseBucketAmounts[i];
      bucketReserves[i] += leaseBucketReserves[i];
    }
  }

  const totalReceivable = bucketTotals.reduce((s, v) => s + v, 0);
  const requiredAllowance = round2(bucketReserves.reduce((s, v) => s + v, 0));
  const currentAllowance = round2(currentAllowanceBalance);
  const adjustmentNeeded = round2(requiredAllowance - currentAllowance);

  return {
    asOfDate: today,
    bucketTotals,
    bucketReserves,
    totalReceivable,
    requiredAllowance,
    currentAllowance,
    adjustmentNeeded,
    leases: leaseDetails,
  };
}

// ---------------------------------------------------------------------------
// JE posting
// ---------------------------------------------------------------------------

/**
 * Post (or update) the allowance adjustment JE for the current period.
 * Reference: allowance:period-adj:{YYYY-MM}
 * Idempotent — deletes any existing JE with the same reference before inserting.
 */
export async function postAllowanceAdjustment(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  analysis: AgingAnalysis
): Promise<PostAllowanceResult> {
  const now = new Date();
  const periodYYYYMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const reference = `allowance:period-adj:${periodYYYYMM}`;
  const entryDate = analysis.asOfDate;

  const adjustment = round2(Math.abs(analysis.adjustmentNeeded));
  if (adjustment < 0.01) {
    return { posted: false, jeId: null, adjustmentAmount: 0, reference };
  }

  // Auto-create accounts if missing
  const allowanceId = await findOrCreateCOAAccount(
    supabase, companyId,
    "1230", "Allowance for Doubtful Accounts", "asset", "contra_asset", "credit",
    "Contra-asset reducing rent receivable to net realizable value"
  );
  const badDebtId = await findOrCreateCOAAccount(
    supabase, companyId,
    "6810", "Bad Debt Expense", "expense", "operating_expense", "debit",
    "Estimated uncollectible rent receivable"
  );

  if (!allowanceId || !badDebtId) {
    throw new Error("Could not resolve Allowance for Doubtful Accounts or Bad Debt Expense accounts.");
  }

  // Delete existing JE for this period (idempotent)
  const { data: existing } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("company_id", companyId)
    .eq("reference", reference)
    .maybeSingle();

  if (existing?.id) {
    await supabase.from("journal_entries").delete().eq("id", existing.id);
  }

  // Determine direction
  const isIncrease = analysis.adjustmentNeeded > 0;
  const lines = isIncrease
    ? [
        { account_id: badDebtId,   debit: adjustment, credit: 0,          description: "Bad debt expense — rent receivable reserve" },
        { account_id: allowanceId, debit: 0,           credit: adjustment, description: "Allowance for doubtful accounts — increase" },
      ]
    : [
        { account_id: allowanceId, debit: adjustment, credit: 0,          description: "Allowance for doubtful accounts — recovery" },
        { account_id: badDebtId,   debit: 0,           credit: adjustment, description: "Bad debt recovery — rent receivable" },
      ];

  const result = await createPostedJournalEntry(supabase, companyId, userId, {
    entry_number: `ALLOW-${periodYYYYMM}`,
    entry_date: entryDate,
    description: `Allowance for doubtful accounts — period adjustment ${periodYYYYMM}`,
    reference,
    lines,
  });

  return {
    posted: !!result,
    jeId: result?.id ?? null,
    adjustmentAmount: isIncrease ? adjustment : -adjustment,
    reference,
  };
}
