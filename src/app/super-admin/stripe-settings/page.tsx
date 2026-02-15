import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { getAllPlatformSettings } from "@/lib/queries/platform-settings";
import StripeSettingsClient from "./StripeSettingsClient";

export const metadata = {
  title: "Stripe Settings - Super Admin - Buildwrk",
};

export default async function SuperAdminStripeSettingsPage() {
  const supabase = await createClient();

  const isAdmin = await isPlatformAdmin(supabase);
  if (!isAdmin) {
    redirect("/dashboard");
  }

  // Fetch all platform settings (values are already masked for encrypted ones)
  const allSettings = await getAllPlatformSettings();

  // Filter to Stripe-related keys and build a map
  const stripeKeys = [
    "stripe_mode",
    "stripe_secret_key_test",
    "stripe_secret_key_live",
    "stripe_publishable_key_test",
    "stripe_publishable_key_live",
    "stripe_webhook_secret_test",
    "stripe_webhook_secret_live",
  ];

  const settings: Record<string, { value: string; is_encrypted: boolean }> = {};
  for (const s of allSettings) {
    if (stripeKeys.includes(s.key)) {
      settings[s.key] = {
        value: s.value,
        is_encrypted: s.is_encrypted,
      };
    }
  }

  const mode = settings.stripe_mode?.value ?? "test";

  return <StripeSettingsClient settings={settings} initialMode={mode} />;
}
