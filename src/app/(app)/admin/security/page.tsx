import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getSecuritySettings } from "@/lib/queries/security";
import SecurityClient from "./SecurityClient";

export const metadata = { title: "Security & Audit - ConstructionERP" };

export default async function SecurityPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);
  if (!userCompany) redirect("/register");

  const { companyId, role } = userCompany;

  const [settings, auditResult] = await Promise.all([
    getSecuritySettings(supabase, companyId),
    supabase
      .from("audit_log")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <SecurityClient
      settings={settings}
      auditLogs={auditResult.data ?? []}
      currentUserRole={role}
    />
  );
}
