import { NextResponse } from "next/server";
import { getPlatformSetting } from "@/lib/queries/platform-settings";

// ---------------------------------------------------------------------------
// GET /api/stripe/publishable-key
// Returns the Stripe publishable key for the current mode (test/live).
// This is safe to expose — publishable keys are meant to be public.
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const mode = (await getPlatformSetting("stripe_mode")) ?? "test";
    const settingKey = mode === "live"
      ? "stripe_publishable_key_live"
      : "stripe_publishable_key_test";

    const publishableKey = await getPlatformSetting(settingKey);

    if (!publishableKey) {
      return NextResponse.json(
        { error: "Stripe publishable key not configured" },
        { status: 503 }
      );
    }

    return NextResponse.json({ publishableKey });
  } catch {
    return NextResponse.json(
      { error: "Failed to retrieve Stripe key" },
      { status: 500 }
    );
  }
}
