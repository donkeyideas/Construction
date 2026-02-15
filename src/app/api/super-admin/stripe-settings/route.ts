import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import {
  getAllPlatformSettings,
  getPlatformSetting,
  setPlatformSetting,
} from "@/lib/queries/platform-settings";
import { NextResponse } from "next/server";

/**
 * GET: Return current Stripe settings (masked values for keys, plain for mode).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const allSettings = await getAllPlatformSettings();

    // Filter to only Stripe-related settings
    const stripeKeys = [
      "stripe_mode",
      "stripe_secret_key_test",
      "stripe_secret_key_live",
      "stripe_publishable_key_test",
      "stripe_publishable_key_live",
      "stripe_webhook_secret_test",
      "stripe_webhook_secret_live",
    ];

    const settings: Record<string, { value: string; is_encrypted: boolean }> =
      {};
    for (const s of allSettings) {
      if (stripeKeys.includes(s.key)) {
        settings[s.key] = {
          value: s.value,
          is_encrypted: s.is_encrypted,
        };
      }
    }

    // Also get the plain stripe_mode value
    const mode = (await getPlatformSetting("stripe_mode")) ?? "test";

    return NextResponse.json({ settings, mode });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

/**
 * POST: Update Stripe settings. Only updates fields that are provided and non-empty.
 * Body: { stripe_mode?, secret_key?, publishable_key?, webhook_secret? }
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
    const { stripe_mode, secret_key, publishable_key, webhook_secret } = body;

    // Determine the current mode for key suffixes
    const currentMode =
      stripe_mode || (await getPlatformSetting("stripe_mode")) || "test";

    // Update mode if provided
    if (stripe_mode && (stripe_mode === "test" || stripe_mode === "live")) {
      await setPlatformSetting(
        "stripe_mode",
        stripe_mode,
        false,
        "Current Stripe mode: test or live",
        user?.id
      );
    }

    const suffix = currentMode === "live" ? "live" : "test";

    // Update secret key if provided
    if (secret_key && secret_key.trim()) {
      await setPlatformSetting(
        `stripe_secret_key_${suffix}`,
        secret_key.trim(),
        true,
        `Stripe secret key (${suffix})`,
        user?.id
      );
    }

    // Update publishable key if provided
    if (publishable_key && publishable_key.trim()) {
      await setPlatformSetting(
        `stripe_publishable_key_${suffix}`,
        publishable_key.trim(),
        true,
        `Stripe publishable key (${suffix})`,
        user?.id
      );
    }

    // Update webhook secret if provided
    if (webhook_secret && webhook_secret.trim()) {
      await setPlatformSetting(
        `stripe_webhook_secret_${suffix}`,
        webhook_secret.trim(),
        true,
        `Stripe webhook secret (${suffix})`,
        user?.id
      );
    }

    return NextResponse.json({ message: "Settings saved." });
  } catch (err) {
    console.error("Stripe settings save error:", err);
    return NextResponse.json(
      { error: "Failed to save settings." },
      { status: 500 }
    );
  }
}
