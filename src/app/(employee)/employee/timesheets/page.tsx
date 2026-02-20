import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getEmployeeTimesheets } from "@/lib/queries/employee-portal";
import TimesheetsClient from "./TimesheetsClient";

export const metadata = { title: "My Timesheets - Buildwrk" };

export default async function EmployeeTimesheetsPage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);
  if (!userCtx) {
    redirect("/login");
  }

  const timesheets = await getEmployeeTimesheets(
    supabase,
    userCtx.userId,
    userCtx.companyId
  );

  return <TimesheetsClient timesheets={timesheets} />;
}
