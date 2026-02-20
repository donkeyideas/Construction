import { TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getCashFlowStatement } from "@/lib/queries/financial";
import CashFlowClient from "./CashFlowClient";

export const metadata = {
  title: "Cash Flow - Buildwrk",
};

export default async function CashFlowPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><TrendingUp size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access cash flow.</div>
      </div>
    );
  }

  const params = await searchParams;
  const now = new Date();

  // Use searchParams dates or default to current month
  const cfStartDate = params.start || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const cfEndDate = params.end || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const startD = new Date(cfStartDate + "T00:00:00");
  const endD = new Date(cfEndDate + "T00:00:00");
  const cfDateLabel = startD.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    + " — " + endD.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const [cashFlowStatement, bankAccountsRes] = await Promise.all([
    getCashFlowStatement(supabase, userCompany.companyId, cfStartDate, cfEndDate),
    supabase
      .from("bank_accounts")
      .select("id, name, bank_name, account_number_last4, account_type, current_balance, is_default")
      .eq("company_id", userCompany.companyId)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true }),
  ]);

  const bankAccounts = (bankAccountsRes.data ?? []) as {
    id: string; name: string; bank_name: string; account_number_last4: string | null;
    account_type: string; current_balance: number; is_default: boolean;
  }[];
  const totalCashPosition = bankAccounts.reduce((sum, a) => sum + (a.current_balance ?? 0), 0);

  const monthlyFlows: { label: string; inflows: number; outflows: number; net: number; runningBalance: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const label = monthDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });

    const [inflowRes, outflowRes] = await Promise.all([
      supabase.from("invoices").select("total_amount").eq("company_id", userCompany.companyId)
        .eq("invoice_type", "receivable").neq("status", "voided")
        .gte("invoice_date", monthDate.toISOString()).lte("invoice_date", monthEnd.toISOString()),
      supabase.from("invoices").select("total_amount").eq("company_id", userCompany.companyId)
        .eq("invoice_type", "payable").neq("status", "voided")
        .gte("invoice_date", monthDate.toISOString()).lte("invoice_date", monthEnd.toISOString()),
    ]);

    const inflows = (inflowRes.data ?? []).reduce((sum, r) => sum + (r.total_amount ?? 0), 0);
    const outflows = (outflowRes.data ?? []).reduce((sum, r) => sum + (r.total_amount ?? 0), 0);
    monthlyFlows.push({ label, inflows, outflows, net: inflows - outflows, runningBalance: 0 });
  }

  const totalNetAllMonths = monthlyFlows.reduce((sum, m) => sum + m.net, 0);
  let runningBal = totalCashPosition - totalNetAllMonths;
  for (const month of monthlyFlows) {
    runningBal += month.net;
    month.runningBalance = runningBal;
  }

  const maxBarValue = Math.max(...monthlyFlows.map((m) => Math.max(m.inflows, m.outflows)), 1);

  return (
    <CashFlowClient
      companyName={userCompany.companyName}
      cfMonthLabel={cfDateLabel}
      cashFlowStatement={cashFlowStatement}
      bankAccounts={bankAccounts}
      totalCashPosition={totalCashPosition}
      monthlyFlows={monthlyFlows}
      maxBarValue={maxBarValue}
      cfStartDate={cfStartDate}
      cfEndDate={cfEndDate}
    />
  );
}
