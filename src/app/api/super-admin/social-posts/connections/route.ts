import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import {
  getAllPlatformSettings,
  setPlatformSetting,
} from "@/lib/queries/platform-settings";
import { testConnection } from "@/lib/utils/social-publish";

// Social-related platform setting keys
const SOCIAL_KEYS = [
  // Twitter
  "social_twitter_api_key",
  "social_twitter_api_secret",
  "social_twitter_access_token",
  "social_twitter_access_token_secret",
  // LinkedIn
  "social_linkedin_access_token",
  // Facebook
  "social_facebook_access_token",
  "social_facebook_page_id",
  // AI provider
  "social_ai_provider",
  "social_ai_api_key",
  "social_ai_model",
  // Automation
  "social_auto_enabled",
  "social_auto_platforms",
  "social_auto_topics",
  "social_auto_hour",
];

const ENCRYPTED_KEYS = [
  "social_twitter_api_key",
  "social_twitter_api_secret",
  "social_twitter_access_token",
  "social_twitter_access_token_secret",
  "social_linkedin_access_token",
  "social_facebook_access_token",
  "social_ai_api_key",
];

// ---------------------------------------------------------------------------
// GET — Return current social settings (masked where encrypted)
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const all = await getAllPlatformSettings();
    const social = all.filter((s) => s.key.startsWith("social_"));

    // Build a map of key -> value (already masked for encrypted)
    const settings: Record<string, string> = {};
    for (const s of social) {
      settings[s.key] = s.value;
    }

    // Determine connection status per platform
    const connections = {
      twitter: !!(
        settings.social_twitter_api_key &&
        !settings.social_twitter_api_key.startsWith("••••••••")
      ),
      linkedin: !!(
        settings.social_linkedin_access_token &&
        !settings.social_linkedin_access_token.startsWith("••••••••")
      ),
      facebook: !!(
        settings.social_facebook_access_token &&
        !settings.social_facebook_access_token.startsWith("••••••••")
      ),
      ai: !!(
        settings.social_ai_provider && settings.social_ai_model
      ),
    };

    return NextResponse.json({ settings, connections });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST — Save social settings
// ---------------------------------------------------------------------------

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

    // Handle test-connection request
    if (body._action === "test") {
      const platform = body.platform;
      if (!platform) {
        return NextResponse.json(
          { error: "Platform is required for testing." },
          { status: 400 }
        );
      }
      const result = await testConnection(platform);
      return NextResponse.json(result);
    }

    // Save settings
    for (const [key, value] of Object.entries(body)) {
      if (!SOCIAL_KEYS.includes(key)) continue;
      if (typeof value !== "string") continue;

      // Skip masked values (not actually changed)
      if (value.startsWith("••••")) continue;
      // Skip empty values
      if (!value.trim()) continue;

      const isEncrypted = ENCRYPTED_KEYS.includes(key);
      await setPlatformSetting(key, value, isEncrypted, undefined, user?.id);
    }

    return NextResponse.json({ message: "Settings saved." });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
