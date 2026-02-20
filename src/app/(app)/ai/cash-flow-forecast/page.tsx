import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import CashFlowForecastClient from "./CashFlowForecastClient";

export const metadata = { title: "Cash Flow Forecast - Buildwrk" };

export default async function CashFlowForecastPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const companyId = userCompany.companyId;
  const today = new Date();
  const todayISO = today.toISOString().split("T")[0];
  const days30Ago = new Date(today.getTime() - 30 * 86400000).toISOString().split("T")[0];
  const days60Ago = new Date(today.getTime() - 60 * 86400000).toISOString().split("T")[0];
  const days90Ago = new Date(today.getTime() - 90 * 86400000).toISOString().split("T")[0];

  // ---------------------------------------------------------------------------
  // Fetch all data in parallel
  // ---------------------------------------------------------------------------
  const [
    bankAccountsRes,
    arCurrentRes,
    arDays30Res,
    arDays60Res,
    arDays90PlusRes,
    apCurrentRes,
    apDays30Res,
    apDays60Res,
    apDays90PlusRes,
    expenseMonth1Res,
    expenseMonth2Res,
    expenseMonth3Res,
  ] = await Promise.all([
    // --- Total Cash: sum of bank_accounts.current_balance ---
    supabase
      .from("bank_accounts")
      .select("current_balance")
      .eq("company_id", companyId),

    // --- AR aging buckets ---
    // Current: due_date >= today (not yet overdue)
    supabase
      .from("invoices")
      .select("balance_due")
      .eq("company_id", companyId)
      .eq("invoice_type", "receivable")
      .in("status", ["pending", "approved", "sent", "overdue", "partial"])
      .gte("due_date", todayISO),

    // 30 days: due_date between today-30 and today
    supabase
      .from("invoices")
      .select("balance_due")
      .eq("company_id", companyId)
      .eq("invoice_type", "receivable")
      .in("status", ["pending", "approved", "sent", "overdue", "partial"])
      .gte("due_date", days30Ago)
      .lt("due_date", todayISO),

    // 60 days: due_date between today-60 and today-30
    supabase
      .from("invoices")
      .select("balance_due")
      .eq("company_id", companyId)
      .eq("invoice_type", "receivable")
      .in("status", ["pending", "approved", "sent", "overdue", "partial"])
      .gte("due_date", days60Ago)
      .lt("due_date", days30Ago),

    // 90+ days: due_date < today-60
    supabase
      .from("invoices")
      .select("balance_due")
      .eq("company_id", companyId)
      .eq("invoice_type", "receivable")
      .in("status", ["pending", "approved", "sent", "overdue", "partial"])
      .lt("due_date", days60Ago),

    // --- AP aging buckets ---
    // Current: due_date >= today
    supabase
      .from("invoices")
      .select("balance_due")
      .eq("company_id", companyId)
      .eq("invoice_type", "payable")
      .in("status", ["pending", "approved", "received", "overdue", "partial"])
      .gte("due_date", todayISO),

    // 30 days: due_date between today-30 and today
    supabase
      .from("invoices")
      .select("balance_due")
      .eq("company_id", companyId)
      .eq("invoice_type", "payable")
      .in("status", ["pending", "approved", "received", "overdue", "partial"])
      .gte("due_date", days30Ago)
      .lt("due_date", todayISO),

    // 60 days: due_date between today-60 and today-30
    supabase
      .from("invoices")
      .select("balance_due")
      .eq("company_id", companyId)
      .eq("invoice_type", "payable")
      .in("status", ["pending", "approved", "received", "overdue", "partial"])
      .gte("due_date", days60Ago)
      .lt("due_date", days30Ago),

    // 90+ days: due_date < today-60
    supabase
      .from("invoices")
      .select("balance_due")
      .eq("company_id", companyId)
      .eq("invoice_type", "payable")
      .in("status", ["pending", "approved", "received", "overdue", "partial"])
      .lt("due_date", days60Ago),

    // --- Monthly burn rate: last 3 months of expense (payable) invoices ---
    // Month 1 (most recent full month)
    (() => {
      const m1Start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const m1End = new Date(today.getFullYear(), today.getMonth(), 0);
      return supabase
        .from("invoices")
        .select("total_amount")
        .eq("company_id", companyId)
        .eq("invoice_type", "payable")
        .neq("status", "voided")
        .gte("invoice_date", m1Start.toISOString().split("T")[0])
        .lte("invoice_date", m1End.toISOString().split("T")[0]);
    })(),

    // Month 2
    (() => {
      const m2Start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      const m2End = new Date(today.getFullYear(), today.getMonth() - 1, 0);
      return supabase
        .from("invoices")
        .select("total_amount")
        .eq("company_id", companyId)
        .eq("invoice_type", "payable")
        .neq("status", "voided")
        .gte("invoice_date", m2Start.toISOString().split("T")[0])
        .lte("invoice_date", m2End.toISOString().split("T")[0]);
    })(),

    // Month 3
    (() => {
      const m3Start = new Date(today.getFullYear(), today.getMonth() - 3, 1);
      const m3End = new Date(today.getFullYear(), today.getMonth() - 2, 0);
      return supabase
        .from("invoices")
        .select("total_amount")
        .eq("company_id", companyId)
        .eq("invoice_type", "payable")
        .neq("status", "voided")
        .gte("invoice_date", m3Start.toISOString().split("T")[0])
        .lte("invoice_date", m3End.toISOString().split("T")[0]);
    })(),
  ]);

  // ---------------------------------------------------------------------------
  // Aggregate results
  // ---------------------------------------------------------------------------

  const sumField = (rows: { balance_due: number }[] | null) =>
    (rows ?? []).reduce((s, r) => s + (r.balance_due ?? 0), 0);

  const sumAmount = (rows: { total_amount: number }[] | null) =>
    (rows ?? []).reduce((s, r) => s + (r.total_amount ?? 0), 0);

  const totalCash = (bankAccountsRes.data ?? []).reduce(
    (s, r) => s + ((r as { current_balance: number }).current_balance ?? 0),
    0
  );

  const arAging = {
    current: sumField(arCurrentRes.data as { balance_due: number }[] | null),
    days30: sumField(arDays30Res.data as { balance_due: number }[] | null),
    days60: sumField(arDays60Res.data as { balance_due: number }[] | null),
    days90plus: sumField(arDays90PlusRes.data as { balance_due: number }[] | null),
  };

  const apAging = {
    current: sumField(apCurrentRes.data as { balance_due: number }[] | null),
    days30: sumField(apDays30Res.data as { balance_due: number }[] | null),
    days60: sumField(apDays60Res.data as { balance_due: number }[] | null),
    days90plus: sumField(apDays90PlusRes.data as { balance_due: number }[] | null),
  };

  const month1Total = sumAmount(expenseMonth1Res.data as { total_amount: number }[] | null);
  const month2Total = sumAmount(expenseMonth2Res.data as { total_amount: number }[] | null);
  const month3Total = sumAmount(expenseMonth3Res.data as { total_amount: number }[] | null);

  const monthsWithData = [month1Total, month2Total, month3Total].filter((v) => v > 0);
  const monthlyBurnRate =
    monthsWithData.length > 0
      ? monthsWithData.reduce((s, v) => s + v, 0) / monthsWithData.length
      : 0;

  return (
    <CashFlowForecastClient
      totalCash={totalCash}
      arAging={arAging}
      apAging={apAging}
      monthlyBurnRate={monthlyBurnRate}
    />
  );
}
