import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { getAllPlatformSettings } from "@/lib/queries/platform-settings";
import PlatformSettingsClient from "./PlatformSettingsClient";

export const metadata = {
  title: "Platform Settings - Super Admin - Buildwrk",
};

export default async function SuperAdminSettingsPage() {
  const supabase = await createClient();
  const isAdmin = await isPlatformAdmin(supabase);
  if (!isAdmin) redirect("/dashboard");

  const allSettings = await getAllPlatformSettings();

  // Build settings map for general platform settings
  const generalKeys = [
    "site_name",
    "support_email",
    "platform_url",
    "google_service_account_json",
    "maintenance_mode",
    "default_timezone",
    "company_registration_enabled",
  ];

  const settings: Record<string, { value: string; is_encrypted: boolean }> = {};
  for (const s of allSettings) {
    if (generalKeys.includes(s.key)) {
      settings[s.key] = { value: s.value, is_encrypted: s.is_encrypted };
    }
  }

  return <PlatformSettingsClient settings={settings} />;
}
