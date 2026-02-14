import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { redirect } from "next/navigation";
import OnboardingClient from "./OnboardingClient";

export const metadata = {
  title: "Welcome to Buildwrk - Setup Wizard",
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/login");
  }

  // If already completed onboarding, go to dashboard
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, onboarding_complete, industry_type")
    .eq("id", userCompany.companyId)
    .single();

  if (company?.onboarding_complete) {
    redirect("/dashboard");
  }

  // Get existing team members count
  const { count: memberCount } = await supabase
    .from("company_members")
    .select("id", { count: "exact", head: true })
    .eq("company_id", userCompany.companyId)
    .eq("is_active", true);

  return (
    <OnboardingClient
      companyId={userCompany.companyId}
      companyName={company?.name || ""}
      industryType={company?.industry_type || ""}
      memberCount={memberCount || 1}
      userRole={userCompany.role}
    />
  );
}
