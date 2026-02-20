import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getEmployeePayslips } from "@/lib/queries/employee-portal";
import PayslipsClient from "./PayslipsClient";

export const metadata = { title: "Payslips - Buildwrk" };

export default async function EmployeePayslipsPage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);
  if (!userCtx) {
    redirect("/login");
  }

  const payslips = await getEmployeePayslips(supabase, userCtx.userId);

  return <PayslipsClient payslips={payslips} />;
}
