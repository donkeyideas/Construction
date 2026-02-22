import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getSecuritySettings } from "@/lib/queries/security";
import { getAuditLog } from "@/lib/queries/admin";
import SecurityClient from "./SecurityClient";

export const metadata = { title: "Security & Audit - Buildwrk" };

export default async function SecurityPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);
  if (!userCompany) redirect("/register");

  const { companyId, role } = userCompany;

  const [settings, auditLogs] = await Promise.all([
    getSecuritySettings(supabase, companyId),
    getAuditLog(supabase, companyId, 50),
  ]);

  return (
    <SecurityClient
      settings={settings}
      auditLogs={auditLogs}
      currentUserRole={role}
    />
  );
}
