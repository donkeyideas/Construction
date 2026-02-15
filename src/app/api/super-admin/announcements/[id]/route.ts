import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (typeof body.is_active === "boolean") updateData.is_active = body.is_active;
    if (body.title) updateData.title = body.title;
    if (body.content) updateData.content = body.content;
    if (body.target_audience) updateData.target_audience = body.target_audience;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("platform_announcements")
      .update(updateData)
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to update announcement." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Announcement updated." });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const { error } = await supabase
      .from("platform_announcements")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete announcement." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Announcement deleted." });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
