import { SupabaseClient } from "@supabase/supabase-js";
import { createPostedJournalEntry } from "@/lib/queries/financial";

// ---------------------------------------------------------------------------
// Rate Lookup — employee_pay_rates (primary) → contacts.hourly_rate (fallback)
// ---------------------------------------------------------------------------

export async function getEmployeeRateMap(
  supabase: SupabaseClient,
  companyId: string
): Promise<Map<string, number>> {
  const [payRatesRes, contactsRes] = await Promise.all([
    supabase
      .from("employee_pay_rates")
      .select("user_id, hourly_rate")
      .eq("company_id", companyId)
      .is("end_date", null)
      .not("hourly_rate", "is", null)
      .order("effective_date", { ascending: false }),
    supabase
      .from("contacts")
      .select("user_id, hourly_rate")
      .eq("company_id", companyId)
      .eq("contact_type", "employee")
      .not("user_id", "is", null)
      .not("hourly_rate", "is", null),
  ]);

  const map = new Map<string, number>();

  // Contacts first (lower priority — will be overwritten by pay rates)
  for (const c of contactsRes.data ?? []) {
    if (c.user_id && c.hourly_rate != null) {
      map.set(c.user_id, Number(c.hourly_rate));
    }
  }

  // employee_pay_rates second (higher priority — overwrites contacts)
  // Sorted by effective_date DESC, so first occurrence per user_id wins
  const seen = new Set<string>();
  for (const r of payRatesRes.data ?? []) {
    if (r.user_id && r.hourly_rate != null && !seen.has(r.user_id)) {
      map.set(r.user_id, Number(r.hourly_rate));
      seen.add(r.user_id);
    }
  }

  return map;
}

// ---------------------------------------------------------------------------
// Serialize to plain object for passing as a Next.js prop
// ---------------------------------------------------------------------------

export function rateMapToRecord(map: Map<string, number>): Record<string, number> {
  const obj: Record<string, number> = {};
  for (const [k, v] of map) obj[k] = v;
  return obj;
}

// ---------------------------------------------------------------------------
// Labor Accrual JE — created on clock-out
// ---------------------------------------------------------------------------

/**
 * Find the Wages Expense (DR) and Wages Payable (CR) accounts for a company.
 * Uses name pattern matching similar to buildCompanyAccountMap().
 */
async function findLaborAccounts(
  supabase: SupabaseClient,
  companyId: string
): Promise<{ wagesExpenseId: string | null; wagesPayableId: string | null }> {
  const { data: accounts } = await supabase
    .from("chart_of_accounts")
    .select("id, name, account_type")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .or(
      "name.ilike.%wage%,name.ilike.%labor%,name.ilike.%payroll%,name.ilike.%salary%"
    )
    .order("account_number", { ascending: true });

  let wagesExpenseId: string | null = null;
  let wagesPayableId: string | null = null;

  for (const a of accounts ?? []) {
    const n = a.name.toLowerCase();

    // DR account: expense with "wage" or "labor" or "salary" in name
    if (
      !wagesExpenseId &&
      a.account_type === "expense" &&
      (n.includes("wage") || n.includes("labor") || n.includes("salary"))
    ) {
      wagesExpenseId = a.id;
    }

    // CR account: liability with "wage" and "payable", or "payroll" and "payable"
    if (
      !wagesPayableId &&
      a.account_type === "liability" &&
      (n.includes("payable") || n.includes("accrued")) &&
      (n.includes("wage") || n.includes("payroll") || n.includes("labor") || n.includes("salary"))
    ) {
      wagesPayableId = a.id;
    }
  }

  return { wagesExpenseId, wagesPayableId };
}

/**
 * Create (or replace) a labor accrual JE for a single user on a given date.
 *
 * Reference pattern: `labor:{userId}:{date}` — ensures one JE per user per day.
 * If a JE with the same reference already exists, it is deleted and recreated
 * with updated hours (handles multiple clock-out events on the same day).
 */
export async function createLaborAccrualJE(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  employeeName: string,
  hours: number,
  rate: number,
  date: string,
  projectId?: string
): Promise<void> {
  if (hours <= 0 || rate <= 0) return;

  const reference = `labor:${userId}:${date}`;
  const amount = Math.round(hours * rate * 100) / 100;

  // Find wage accounts
  const { wagesExpenseId, wagesPayableId } = await findLaborAccounts(
    supabase,
    companyId
  );

  if (!wagesExpenseId || !wagesPayableId) {
    console.warn(
      `[labor-cost] Missing Wages Expense or Wages Payable account for company ${companyId}. Skipping labor JE.`
    );
    return;
  }

  // Check for existing JE with same reference — delete if found (replace pattern)
  const { data: existing } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("company_id", companyId)
    .eq("reference", reference)
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Delete lines first, then header
    await supabase
      .from("journal_entry_lines")
      .delete()
      .eq("journal_entry_id", existing.id);
    await supabase.from("journal_entries").delete().eq("id", existing.id);
  }

  // Generate entry number: LAB-YYYYMMDD-XXXX
  const datePart = date.replace(/-/g, "");
  const shortId = crypto.randomUUID().slice(0, 4).toUpperCase();
  const entryNumber = `LAB-${datePart}-${shortId}`;

  await createPostedJournalEntry(supabase, companyId, userId, {
    entry_number: entryNumber,
    entry_date: date,
    description: `Labor accrual — ${employeeName} — ${hours}h @ $${rate}/h`,
    reference,
    project_id: projectId,
    lines: [
      {
        account_id: wagesExpenseId,
        debit: amount,
        credit: 0,
        description: `Wages — ${employeeName}`,
        project_id: projectId,
      },
      {
        account_id: wagesPayableId,
        debit: 0,
        credit: amount,
        description: `Wages payable — ${employeeName}`,
        project_id: projectId,
      },
    ],
  });
}
