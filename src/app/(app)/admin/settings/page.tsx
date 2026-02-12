import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getCompanyDetails, getAuditLog, getCompanyMembers } from "@/lib/queries/admin";
import SettingsClient from "./SettingsClient";

export const metadata = {
  title: "Company Settings - ConstructionERP",
};

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const { companyId, role: currentUserRole } = userCompany;

  const [company, auditLog, members] = await Promise.all([
    getCompanyDetails(supabase, companyId),
    getAuditLog(supabase, companyId, 50),
    getCompanyMembers(supabase, companyId),
  ]);

  if (!company) {
    redirect("/register");
  }

  return (
    <SettingsClient
      company={company}
      auditLog={auditLog}
      memberCount={members.filter((m) => m.is_active).length}
      currentUserRole={currentUserRole}
    />
  );
}
