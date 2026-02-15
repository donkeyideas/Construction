import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import AutomationClient from "./AutomationClient";

export const metadata = { title: "Automation - Buildwrk" };

export default async function AutomationPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);
  if (!userCompany) redirect("/register");

  const { companyId } = userCompany;

  const [{ data: rules }, { data: logs }] = await Promise.all([
    supabase
      .from("automation_rules")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("automation_logs")
      .select("*, automation_rules(name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return <AutomationClient rules={rules ?? []} logs={logs ?? []} />;
}
