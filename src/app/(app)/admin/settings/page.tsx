import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getCompanyDetails, getCompanyMembers } from "@/lib/queries/admin";
import SettingsClient from "./SettingsClient";

export const metadata = {
  title: "Company Settings - Buildwrk",
};

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const { companyId, role: currentUserRole } = userCompany;

  const [company, members] = await Promise.all([
    getCompanyDetails(supabase, companyId),
    getCompanyMembers(supabase, companyId),
  ]);

  if (!company) {
    redirect("/register");
  }

  return (
    <Suspense>
      <SettingsClient
        company={company}
        memberCount={members.filter((m) => m.is_active).length}
        currentUserRole={currentUserRole}
      />
    </Suspense>
  );
}
