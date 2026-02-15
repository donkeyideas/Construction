import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { slug } = await params;
    const { data, error } = await supabase
      .from("cms_pages")
      .select("*")
      .eq("page_slug", slug)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

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

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.meta_title !== undefined) updateData.meta_title = body.meta_title;
    if (body.meta_description !== undefined) updateData.meta_description = body.meta_description;
    if (body.sections !== undefined) updateData.sections = body.sections;

    if (body.status && ["published", "draft"].includes(body.status)) {
      updateData.status = body.status;
      if (body.status === "published") {
        updateData.published_at = new Date().toISOString();
      }
    }

    const { error } = await supabase
      .from("cms_pages")
      .update(updateData)
      .eq("page_slug", slug);

    if (error) {
      return NextResponse.json(
        { error: "Failed to update page." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Page updated successfully." });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
