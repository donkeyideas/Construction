import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEmployeeDashboard } from "@/lib/queries/employee-portal";
import EmployeeDashboardClient from "./EmployeeDashboardClient";

export const metadata = {
  title: "Employee Dashboard - Buildwrk",
};

export default async function EmployeeDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get the user's company_id from company_members
  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/login");
  }

  const dashboard = await getEmployeeDashboard(
    supabase,
    user.id,
    membership.company_id
  );

  return <EmployeeDashboardClient dashboard={dashboard} />;
}
