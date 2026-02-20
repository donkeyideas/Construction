import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { redirect } from "next/navigation";
import LedgerClient from "./LedgerClient";

export const metadata = {
  title: "General Ledger - Buildwrk",
};

export default async function GeneralLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; account?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);
  if (!userCompany) redirect("/login");

  const params = await searchParams;
  const now = new Date();
  const startDate = params.start || new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
  const endDate = params.end || now.toISOString().split("T")[0];
  const accountFilter = params.account || undefined;
  const currentPage = parseInt(params.page || "1", 10);
  const pageSize = 50;

  // Fetch chart of accounts
  const { data: accounts } = await supabase
    .from("chart_of_accounts")
    .select("id, account_number, name, account_type, sub_type, normal_balance")
    .eq("company_id", userCompany.companyId)
    .eq("is_active", true)
    .order("account_number");

  // Build query for journal entry lines
  let linesQuery = supabase
    .from("journal_entry_lines")
    .select("id, account_id, debit, credit, description, journal_entries!inner(id, entry_number, entry_date, description, reference, status)", { count: "exact" })
    .eq("company_id", userCompany.companyId)
    .eq("journal_entries.status", "posted")
    .gte("journal_entries.entry_date", startDate)
    .lte("journal_entries.entry_date", endDate)
    .order("journal_entries(entry_date)", { ascending: true });

  if (accountFilter) {
    linesQuery = linesQuery.eq("account_id", accountFilter);
  }

  // Paginate
  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;
  linesQuery = linesQuery.range(from, to);

  const { data: lines, count: totalLines } = await linesQuery;

  // Also get total debits/credits for summary
  const { data: summaryLines } = await supabase
    .from("journal_entry_lines")
    .select("debit, credit, journal_entries!inner(status, entry_date)")
    .eq("company_id", userCompany.companyId)
    .eq("journal_entries.status", "posted")
    .gte("journal_entries.entry_date", startDate)
    .lte("journal_entries.entry_date", endDate);

  const totalDebits = (summaryLines ?? []).reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredits = (summaryLines ?? []).reduce((sum, l) => sum + (Number(l.credit) || 0), 0);

  // Build account map for display
  const accountMap: Record<string, { number: string; name: string; type: string }> = {};
  for (const a of accounts ?? []) {
    accountMap[a.id] = { number: a.account_number, name: a.name, type: a.account_type };
  }

  return (
    <LedgerClient
      lines={(lines ?? []) as any[]}
      accounts={(accounts ?? []) as any[]}
      accountMap={accountMap}
      totalLines={totalLines ?? 0}
      totalDebits={totalDebits}
      totalCredits={totalCredits}
      currentPage={currentPage}
      pageSize={pageSize}
      startDate={startDate}
      endDate={endDate}
      accountFilter={accountFilter}
    />
  );
}
