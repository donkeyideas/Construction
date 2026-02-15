import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { getCompanyOnboardingStatus } from "@/lib/queries/onboarding";
import OnboardingClient from "./OnboardingClient";

export const metadata = {
  title: "Onboarding Checklist - Super Admin - Buildwrk",
};

export default async function SuperAdminOnboardingPage() {
  const supabase = await createClient();

  const isAdmin = await isPlatformAdmin(supabase);
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const statuses = await getCompanyOnboardingStatus();

  return <OnboardingClient statuses={statuses} />;
}
