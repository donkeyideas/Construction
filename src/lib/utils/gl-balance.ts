import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Compute the GL balance for accounts matching a given type and name pattern.
 * Uses paginated queries to avoid Supabase's 1000-row limit.
 *
 * For asset accounts (AR): balance = sum(debit) - sum(credit)
 * For liability accounts (AP): balance = sum(credit) - sum(debit)
 */
export async function getGLBalanceForAccountType(
  supabase: SupabaseClient,
  companyId: string,
  accountType: string,
  namePattern: string,
  mode: "debit-credit" | "credit-debit" = "debit-credit"
): Promise<number> {
  // 1. Find matching GL accounts
  const { data: accounts } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("company_id", companyId)
    .eq("account_type", accountType)
    .ilike("name", namePattern);

  if (!accounts || accounts.length === 0) return 0;

  const accountIds = accounts.map((a) => a.id);

  // 2. Get posted journal entry IDs
  const { data: postedJEs } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("company_id", companyId)
    .eq("status", "posted");

  if (!postedJEs || postedJEs.length === 0) return 0;

  const jeIds = postedJEs.map((j) => j.id);

  // 3. Sum JE lines with pagination (Supabase 1000-row limit)
  const PAGE_SIZE = 1000;
  let totalDebit = 0;
  let totalCredit = 0;
  let from = 0;

  for (;;) {
    const { data: lines, error } = await supabase
      .from("journal_entry_lines")
      .select("debit, credit")
      .in("account_id", accountIds)
      .in("journal_entry_id", jeIds)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("GL balance query error:", error.message);
      break;
    }
    if (!lines || lines.length === 0) break;

    for (const line of lines) {
      totalDebit += line.debit ?? 0;
      totalCredit += line.credit ?? 0;
    }

    if (lines.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return mode === "debit-credit"
    ? totalDebit - totalCredit
    : totalCredit - totalDebit;
}
