import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { getFeatureFlags } from "@/lib/queries/feature-flags";
import FeatureFlagsClient from "./FeatureFlagsClient";

export const metadata = {
  title: "Feature Flags - Super Admin - Buildwrk",
};

export default async function SuperAdminFeatureFlagsPage() {
  const supabase = await createClient();
  const isAdmin = await isPlatformAdmin(supabase);
  if (!isAdmin) redirect("/dashboard");

  const flags = await getFeatureFlags();

  return <FeatureFlagsClient flags={flags} />;
}
