/**
 * property-depreciation.ts
 * GAAP straight-line depreciation helpers for properties.
 *
 * Key accounting:
 *   DR 6700 Depreciation Expense        $X/month
 *   CR 1540 Accumulated Depreciation    $X/month
 *
 * Reference format per JE: depreciation:{propertyId}:{YYYY}-{MM}
 * This makes every JE idempotent — safe to re-run without duplicates.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildCompanyAccountMap, findOrCreateCOAAccount } from "./invoice-accounting";
import { createPostedJournalEntry } from "@/lib/queries/financial";

// ---------------------------------------------------------------------------
// Calculation helpers
// ---------------------------------------------------------------------------

/** GAAP default useful life in years by property type */
export function getDefaultUsefulLife(propertyType: string): number {
  switch (propertyType) {
    case "residential": return 27.5;
    case "commercial":  return 39;
    case "industrial":  return 39;
    case "mixed_use":   return 30;
    default:            return 39;
  }
}

/**
 * Depreciable basis = purchase price minus land value.
 * If land_value is not set, auto-estimate 20% as land (80% building).
 */
export function getDepreciableBasis(
  purchasePrice: number,
  landValue: number | null | undefined
): number {
  if (landValue !== null && landValue !== undefined && landValue >= 0) {
    return Math.max(0, purchasePrice - landValue);
  }
  return purchasePrice * 0.8;
}

/** Monthly straight-line depreciation amount */
export function getMonthlyDepreciation(
  depreciableBasis: number,
  usefulLifeYears: number
): number {
  if (usefulLifeYears <= 0) return 0;
  return depreciableBasis / (usefulLifeYears * 12);
}

/**
 * Returns the estimated land value given a purchase price.
 * Used for display when land_value is null (20% auto-estimate).
 */
export function getEstimatedLandValue(purchasePrice: number): number {
  return purchasePrice * 0.2;
}

// ---------------------------------------------------------------------------
// Year-by-year schedule (client-safe — pure calculation, no DB)
// ---------------------------------------------------------------------------

export interface DepreciationScheduleRow {
  year: number;
  annualAmount: number;
  cumulative: number;
  bookValue: number;
}

/** Parse a YYYY-MM-DD string as a local date (avoids UTC timezone offset shifting the month) */
function parseLocalDate(dateStr: string): { year: number; month: number } {
  const [y, m] = dateStr.split("-").map(Number);
  return { year: y, month: m - 1 }; // month is 0-based
}

export function buildYearlySchedule(
  depreciableBasis: number,
  usefulLifeYears: number,
  startDate: string,   // YYYY-MM-DD
): DepreciationScheduleRow[] {
  const monthly = getMonthlyDepreciation(depreciableBasis, usefulLifeYears);
  const totalMonths = Math.round(usefulLifeYears * 12);

  // Parse start as local date to avoid UTC offset shifting month
  const { year: startYear, month: startMonth } = parseLocalDate(startDate);

  // Compute end year/month by advancing totalMonths
  let endYear = startYear;
  let endMonth = startMonth + totalMonths;
  endYear += Math.floor(endMonth / 12);
  endMonth = endMonth % 12;

  const rows: DepreciationScheduleRow[] = [];
  let cumulative = 0;

  for (let yr = startYear; yr <= endYear; yr++) {
    let monthsInYear = 0;
    for (let mo = 0; mo < 12; mo++) {
      // Is this month >= start and < end?
      const afterStart = yr > startYear || (yr === startYear && mo >= startMonth);
      const beforeEnd  = yr < endYear  || (yr === endYear  && mo < endMonth);
      if (afterStart && beforeEnd) monthsInYear++;
    }
    if (monthsInYear === 0) continue;
    const annualAmount = Math.round(monthly * monthsInYear * 100) / 100;
    cumulative = Math.round((cumulative + annualAmount) * 100) / 100;
    const bookValue = Math.max(0, Math.round((depreciableBasis - cumulative) * 100) / 100);
    rows.push({ year: yr, annualAmount, cumulative, bookValue });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// JE generation
// ---------------------------------------------------------------------------

export interface GenerateDepreciationResult {
  created: number;
  skipped: number;
  monthlyAmount: number;
  totalMonths: number;
}

export async function generateAllDepreciationJEs(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  property: {
    id: string;
    name: string;
    purchase_price: number;
    land_value: number | null;
    useful_life_years: number;
    depreciation_start_date: string; // YYYY-MM-DD
    property_type: string;
  }
): Promise<GenerateDepreciationResult> {
  const depreciableBasis = getDepreciableBasis(property.purchase_price, property.land_value);
  const monthlyAmount = Math.round(
    getMonthlyDepreciation(depreciableBasis, property.useful_life_years) * 100
  ) / 100;
  const totalMonths = Math.round(property.useful_life_years * 12);

  if (monthlyAmount <= 0) {
    return { created: 0, skipped: 0, monthlyAmount: 0, totalMonths };
  }

  // Resolve accounts
  const accountMap = await buildCompanyAccountMap(supabase, companyId);
  let depExpenseId = accountMap.depreciationExpenseId;
  let accumDepId   = accountMap.accumulatedDepreciationId;

  if (!depExpenseId) {
    depExpenseId = await findOrCreateCOAAccount(
      supabase, companyId,
      "6700", "Depreciation Expense", "expense", "operating_expense", "debit",
      "Periodic allocation of fixed asset costs over their useful lives"
    );
  }
  if (!accumDepId) {
    accumDepId = await findOrCreateCOAAccount(
      supabase, companyId,
      "1540", "Accumulated Depreciation", "asset", "contra_asset", "credit",
      "Accumulated depreciation on all fixed assets"
    );
  }

  if (!depExpenseId || !accumDepId) {
    throw new Error("Could not resolve Depreciation Expense or Accumulated Depreciation accounts.");
  }

  // Build list of months — parse as local date to avoid UTC offset shifting month
  const months: { year: number; month: number; entryDate: string }[] = [];
  const { year: startYr, month: startMo } = parseLocalDate(property.depreciation_start_date);
  // Use a plain counter to avoid Date rolling issues
  for (let i = 0; i < totalMonths; i++) {
    const totalMonth = startMo + i;
    const year  = startYr + Math.floor(totalMonth / 12);
    const month = (totalMonth % 12) + 1; // 1-based
    const entryDate = `${year}-${String(month).padStart(2, "0")}-01`;
    months.push({ year, month, entryDate });
  }

  // Fetch all existing references for this property in one query
  const allRefs = months.map(
    (m) => `depreciation:${property.id}:${m.year}-${String(m.month).padStart(2, "0")}`
  );

  // Supabase .in() supports up to 500 values; batch if needed
  const BATCH_SIZE = 500;
  const existingRefs = new Set<string>();
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
        const reference = `depreciation:${property.id}:${year}-${monthStr}`;
        if (existingRefs.has(reference)) {
          skipped++;
          return;
        }
        const result = await createPostedJournalEntry(supabase, companyId, userId, {
          entry_number: `DEP-${property.id.slice(0, 8).toUpperCase()}-${year}${monthStr}`,
          entry_date: entryDate,
          description: `Depreciation: ${property.name} (${year}-${monthStr})`,
          reference,
          lines: [
            {
              account_id: depExpenseId!,
              debit: monthlyAmount,
              credit: 0,
              description: `Monthly depreciation — ${property.name}`,
              property_id: property.id,
            },
            {
              account_id: accumDepId!,
              debit: 0,
              credit: monthlyAmount,
              description: `Accumulated depreciation — ${property.name}`,
              property_id: property.id,
            },
          ],
        });
        if (result) created++;
        else skipped++;
      })
    );
  }

  return { created, skipped, monthlyAmount, totalMonths };
}
