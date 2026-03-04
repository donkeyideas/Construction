import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { createSocialPost } from "@/lib/queries/social-posts";
import { generateSocialPost } from "@/lib/utils/social-ai";

const VALID_PLATFORMS = ["twitter", "linkedin", "facebook", "instagram", "tiktok"];

// ---------------------------------------------------------------------------
// POST /api/super-admin/social-posts/generate — AI-generate posts
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
    const { platforms, topic, tone, context } = body;

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: "At least one platform is required." },
        { status: 400 }
      );
    }

    const validPlatforms = platforms.filter((p: string) =>
      VALID_PLATFORMS.includes(p)
    );

    if (validPlatforms.length === 0) {
      return NextResponse.json(
        { error: "No valid platforms provided." },
        { status: 400 }
      );
    }

    // Generate in parallel — partial failures tolerated
    const results = await Promise.allSettled(
      validPlatforms.map(async (platform: string) => {
        const generated = await generateSocialPost({
          platform,
          topic,
          tone,
          context,
        });

        const { data, error } = await createSocialPost({
          platform: platform as "twitter" | "linkedin" | "facebook" | "instagram" | "tiktok",
          content: generated.content,
          hashtags: generated.hashtags,
          image_prompt: generated.imagePrompt || undefined,
          tone: tone || "professional",
          status: "draft",
          created_by: user?.id,
        });

        if (error) throw new Error(error);

        return {
          platform,
          post: data,
          generated,
        };
      })
    );

    const succeeded: { platform: string; post: unknown; generated: unknown }[] = [];
    const failed: { platform: string; error: string }[] = [];

    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        succeeded.push(r.value);
      } else {
        failed.push({
          platform: validPlatforms[i],
          error: r.reason?.message || "Generation failed",
        });
      }
    });

    return NextResponse.json({
      data: succeeded,
      errors: failed,
      message: `Generated ${succeeded.length} of ${validPlatforms.length} posts.`,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
