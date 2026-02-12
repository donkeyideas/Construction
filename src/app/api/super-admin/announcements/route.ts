import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, target_audience } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required." },
        { status: 400 }
      );
    }

    const validAudiences = ["all", "enterprise", "professional", "starter"];
    if (target_audience && !validAudiences.includes(target_audience)) {
      return NextResponse.json(
        { error: "Invalid target audience." },
        { status: 400 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("platform_announcements").insert({
      title,
      content,
      target_audience: target_audience || "all",
      is_active: true,
      published_at: new Date().toISOString(),
      created_by: user?.id,
    });

    if (error) {
      return NextResponse.json(
        { error: "Failed to create announcement." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Announcement created." },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
