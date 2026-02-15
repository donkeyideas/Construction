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
    if (typeof body.is_platform_admin === "boolean") {
      updateData.is_platform_admin = body.is_platform_admin;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("user_profiles")
      .update(updateData)
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to update user." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "User updated." });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
