import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import {
  getSocialPostById,
  updateSocialPost,
  deleteSocialPost,
} from "@/lib/queries/social-posts";

// ---------------------------------------------------------------------------
// PATCH /api/super-admin/social-posts/[id] — Update a post
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const existing = await getSocialPostById(id);
    if (!existing) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.content === "string") updates.content = body.content;
    if (Array.isArray(body.hashtags)) updates.hashtags = body.hashtags;
    if (typeof body.image_prompt === "string") updates.image_prompt = body.image_prompt;
    if (typeof body.tone === "string") updates.tone = body.tone;
    if (body.scheduled_at !== undefined) updates.scheduled_at = body.scheduled_at;
    if (typeof body.status === "string") {
      const valid = ["draft", "scheduled", "published", "failed", "cancelled"];
      if (!valid.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status." }, { status: 400 });
      }
      updates.status = body.status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 }
      );
    }

    const { error } = await updateSocialPost(id, updates);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/super-admin/social-posts/[id] — Delete a post
// ---------------------------------------------------------------------------

export async function DELETE(
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

    const existing = await getSocialPostById(id);
    if (!existing) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    if (existing.status === "published") {
      return NextResponse.json(
        { error: "Cannot delete a published post." },
        { status: 400 }
      );
    }

    const { error } = await deleteSocialPost(id);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
