import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getPayrollRuns,
  getEmployeePayRates,
  getPayrollDeductions,
  getPayrollTaxConfig,
} from "@/lib/queries/payroll";
import PayrollClient from "./PayrollClient";

export const metadata = {
  title: "Payroll - Buildwrk",
};

export default async function PayrollPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const { companyId, role } = userCompany;

  // Fetch all payroll data in parallel
  const [payrollRuns, payRates, deductions, taxConfig] = await Promise.all([
    getPayrollRuns(supabase, companyId),
    getEmployeePayRates(supabase, companyId),
    getPayrollDeductions(supabase, companyId),
    getPayrollTaxConfig(supabase, companyId),
  ]);

  // Fetch user profiles for employees who have pay rates
  const userIds = payRates.map((pr) => pr.user_id);
  let userProfiles: { id: string; full_name: string | null; email: string | null }[] = [];
  if (userIds.length > 0) {
    const { data } = await supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    userProfiles = (data ?? []) as { id: string; full_name: string | null; email: string | null }[];
  }

  // Compute overview stats
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const paidRuns = payrollRuns.filter(
    (r) => (r.status === "paid" || r.status === "approved") && r.pay_date >= yearStart
  );
  const ytdTotalPayroll = paidRuns.reduce((sum, r) => sum + (r.total_gross ?? 0), 0);
  const lastRunDate = payrollRuns.length > 0 ? payrollRuns[0].pay_date : null;

  // Pending approved hours
  const { data: approvedHoursData } = await supabase
    .from("time_entries")
    .select("hours")
    .eq("company_id", companyId)
    .eq("status", "approved");

  const pendingApprovedHours = (approvedHoursData ?? []).reduce(
    (sum: number, r: { hours: number }) => sum + (r.hours ?? 0),
    0
  );

  const overview = {
    ytdTotalPayroll,
    lastRunDate,
    pendingApprovedHours,
    activeEmployees: payRates.length,
  };

  return (
    <PayrollClient
      payrollRuns={payrollRuns}
      payRates={payRates}
      deductions={deductions}
      taxConfig={taxConfig}
      userProfiles={userProfiles}
      overview={overview}
      companyId={companyId}
      userRole={role}
    />
  );
}
