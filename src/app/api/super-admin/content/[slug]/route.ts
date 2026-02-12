import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { slug } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !["published", "draft"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'published' or 'draft'." },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "published") {
      updateData.published_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("cms_pages")
      .update(updateData)
      .eq("page_slug", slug);

    if (error) {
      return NextResponse.json(
        { error: "Failed to update page status." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Page status updated." });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
