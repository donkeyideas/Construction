import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import {
  getAllPlatformSettings,
  setPlatformSetting,
} from "@/lib/queries/platform-settings";
import { NextResponse } from "next/server";

const PLATFORM_SETTINGS_KEYS = [
  "site_name",
  "support_email",
  "platform_url",
  "google_service_account_json",
  "maintenance_mode",
  "default_timezone",
  "company_registration_enabled",
];

const ENCRYPTED_KEYS = ["google_service_account_json"];

const SETTING_DESCRIPTIONS: Record<string, string> = {
  site_name: "Platform display name",
  support_email: "Support contact email address",
  platform_url: "Public URL of the platform",
  google_service_account_json: "Google Cloud service account credentials (JSON)",
  maintenance_mode: "Enable or disable maintenance mode",
  default_timezone: "Default timezone for the platform",
  company_registration_enabled: "Allow new company registrations",
};

/**
 * GET: Return current general platform settings (masked values for encrypted keys).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const allSettings = await getAllPlatformSettings();

    const settings: Record<string, { value: string; is_encrypted: boolean }> =
      {};
    for (const s of allSettings) {
      if (PLATFORM_SETTINGS_KEYS.includes(s.key)) {
        settings[s.key] = {
          value: s.value,
          is_encrypted: s.is_encrypted,
        };
      }
    }

    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

/**
 * POST: Update general platform settings.
 * Body: Record<string, string> of key-value pairs to update.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();

    for (const [key, value] of Object.entries(body)) {
      if (!PLATFORM_SETTINGS_KEYS.includes(key)) {
        continue;
      }

      const isEncrypted = ENCRYPTED_KEYS.includes(key);
      const description = SETTING_DESCRIPTIONS[key] ?? key;

      await setPlatformSetting(
        key,
        String(value),
        isEncrypted,
        description,
        user?.id
      );
    }

    return NextResponse.json({ message: "Platform settings saved." });
  } catch (err) {
    console.error("Platform settings save error:", err);
    return NextResponse.json(
      { error: "Failed to save settings." },
      { status: 500 }
    );
  }
}
