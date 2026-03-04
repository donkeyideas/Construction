import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { getSocialPostById, updateSocialPost } from "@/lib/queries/social-posts";
import { publishPost } from "@/lib/utils/social-publish";

// ---------------------------------------------------------------------------
// POST /api/super-admin/social-posts/[id]/publish — Publish a post immediately
// ---------------------------------------------------------------------------

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const post = await getSocialPostById(id);
    if (!post) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    if (post.status === "published") {
      return NextResponse.json(
        { error: "Post is already published." },
        { status: 400 }
      );
    }

    if (post.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot publish a cancelled post." },
        { status: 400 }
      );
    }

    const result = await publishPost(post.platform, post.content, post.hashtags);

    if (result.success) {
      await updateSocialPost(id, {
        status: "published",
        published_at: new Date().toISOString(),
        external_post_id: result.externalPostId || null,
        error_message: null,
      });

      return NextResponse.json({
        success: true,
        external_post_id: result.externalPostId,
      });
    } else {
      await updateSocialPost(id, {
        status: "failed",
        error_message: result.error || "Unknown error",
      });

      return NextResponse.json(
        { success: false, error: result.error },
        { status: 502 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
