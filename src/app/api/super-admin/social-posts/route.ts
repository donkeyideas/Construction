import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import {
  getSocialPosts,
  createSocialPost,
  type SocialPlatform,
  type SocialPostStatus,
} from "@/lib/queries/social-posts";
import { PLATFORM_LIMITS } from "@/lib/utils/social-ai";

const VALID_PLATFORMS = ["twitter", "linkedin", "facebook", "instagram", "tiktok"];
const VALID_STATUSES = ["draft", "scheduled", "published", "failed", "cancelled"];

// ---------------------------------------------------------------------------
// GET /api/super-admin/social-posts — List posts with optional filters
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as SocialPostStatus | null;
    const platform = searchParams.get("platform") as SocialPlatform | null;

    const filters: { status?: SocialPostStatus; platform?: SocialPlatform } = {};
    if (status && VALID_STATUSES.includes(status)) filters.status = status;
    if (platform && VALID_PLATFORMS.includes(platform)) filters.platform = platform;

    const data = await getSocialPosts(filters);

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/super-admin/social-posts — Create a post
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
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
    const { platform, content, hashtags, image_prompt, tone, scheduled_at, status } =
      body;

    if (!platform || !VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { error: "Valid platform is required." },
        { status: 400 }
      );
    }

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Content is required." },
        { status: 400 }
      );
    }

    const limit = PLATFORM_LIMITS[platform];
    if (limit && content.length > limit * 1.5) {
      return NextResponse.json(
        { error: `Content exceeds ${platform} limit of ${limit} characters.` },
        { status: 400 }
      );
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status." },
        { status: 400 }
      );
    }

    const { data, error } = await createSocialPost({
      platform,
      content: content.trim(),
      hashtags: hashtags ?? [],
      image_prompt: image_prompt ?? undefined,
      tone: tone ?? "professional",
      scheduled_at: scheduled_at ?? undefined,
      status: status ?? "draft",
      created_by: user?.id,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ data, message: "Post created." }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
