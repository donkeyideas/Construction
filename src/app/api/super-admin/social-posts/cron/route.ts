import { NextRequest, NextResponse } from "next/server";
import { getScheduledPostsDue } from "@/lib/queries/social-posts";
import { updateSocialPost, createSocialPost } from "@/lib/queries/social-posts";
import { publishPost } from "@/lib/utils/social-publish";
import { generateSocialPost } from "@/lib/utils/social-ai";
import { getPlatformSetting } from "@/lib/queries/platform-settings";

// ---------------------------------------------------------------------------
// GET /api/super-admin/social-posts/cron — Vercel cron handler
// Protected by CRON_SECRET, not isPlatformAdmin
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let published = 0;
  let generated = 0;
  const errors: string[] = [];

  // -----------------------------------------------------------------------
  // 1. Publish scheduled posts that are due
  // -----------------------------------------------------------------------
  try {
    const duePosts = await getScheduledPostsDue();

    for (const post of duePosts) {
      const result = await publishPost(post.platform, post.content, post.hashtags);

      if (result.success) {
        await updateSocialPost(post.id, {
          status: "published",
          published_at: new Date().toISOString(),
          external_post_id: result.externalPostId || null,
          error_message: null,
        });
        published++;
      } else {
        await updateSocialPost(post.id, {
          status: "failed",
          error_message: result.error || "Publish failed",
        });
        errors.push(`${post.platform}:${post.id} - ${result.error}`);
      }
    }
  } catch (err) {
    errors.push(
      `Publish step: ${err instanceof Error ? err.message : "Unknown error"}`
    );
  }

  // -----------------------------------------------------------------------
  // 2. Auto-generate posts if enabled and current hour matches
  // -----------------------------------------------------------------------
  try {
    const autoEnabled = await getPlatformSetting("social_auto_enabled");

    if (autoEnabled === "true") {
      const autoHour = await getPlatformSetting("social_auto_hour");
      const currentHour = new Date().getUTCHours();

      // Only generate at the configured hour (or hour 9 by default)
      const targetHour = autoHour ? parseInt(autoHour, 10) : 9;

      if (currentHour === targetHour) {
        const autoPlatformsRaw = await getPlatformSetting("social_auto_platforms");
        const autoTopicsRaw = await getPlatformSetting("social_auto_topics");

        const platforms: string[] = autoPlatformsRaw
          ? JSON.parse(autoPlatformsRaw)
          : ["twitter", "linkedin"];

        const topics: string[] = autoTopicsRaw
          ? JSON.parse(autoTopicsRaw)
          : ["construction technology"];

        // Pick a random topic
        const topic = topics[Math.floor(Math.random() * topics.length)];

        for (const platform of platforms) {
          try {
            const result = await generateSocialPost({
              platform,
              topic,
              tone: "professional",
            });

            await createSocialPost({
              platform: platform as "twitter" | "linkedin" | "facebook" | "instagram" | "tiktok",
              content: result.content,
              hashtags: result.hashtags,
              image_prompt: result.imagePrompt || undefined,
              tone: "professional",
              status: "draft",
            });

            generated++;
          } catch (err) {
            errors.push(
              `Auto-gen ${platform}: ${err instanceof Error ? err.message : "Failed"}`
            );
          }
        }
      }
    }
  } catch (err) {
    errors.push(
      `Auto-gen step: ${err instanceof Error ? err.message : "Unknown error"}`
    );
  }

  return NextResponse.json({
    published,
    generated,
    errors: errors.length > 0 ? errors : undefined,
  });
}
