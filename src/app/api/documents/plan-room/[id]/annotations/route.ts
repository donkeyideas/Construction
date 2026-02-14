import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

/* ------------------------------------------------------------------
   GET /api/documents/plan-room/[id]/annotations — List annotations
   POST /api/documents/plan-room/[id]/annotations — Create annotation
   ------------------------------------------------------------------ */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify document belongs to user's company
    const { data: doc } = await supabase
      .from("documents")
      .select("id, company_id")
      .eq("id", documentId)
      .single();

    if (!doc || doc.company_id !== userCtx.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const page = request.nextUrl.searchParams.get("page");

    let query = supabase
      .from("markup_annotations")
      .select(
        `
        *,
        creator:user_profiles!markup_annotations_created_by_fkey(full_name)
      `
      )
      .eq("document_id", documentId)
      .order("created_at", { ascending: true });

    if (page) {
      query = query.eq("page_number", parseInt(page, 10));
    }

    const { data, error } = await query;

    if (error) {
      console.error("GET annotations error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const annotations = (data ?? []).map((a: Record<string, unknown>) => ({
      ...a,
      created_by_name: (a.creator as { full_name: string } | null)?.full_name ?? null,
      creator: undefined,
    }));

    return NextResponse.json({ annotations });
  } catch (err) {
    console.error("GET annotations error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify document belongs to user's company
    const { data: doc } = await supabase
      .from("documents")
      .select("id, company_id")
      .eq("id", documentId)
      .single();

    if (!doc || doc.company_id !== userCtx.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const { page_number, annotation_type, color, stroke_width, geometry, text_content } = body;

    if (!annotation_type || !geometry) {
      return NextResponse.json(
        { error: "annotation_type and geometry are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("markup_annotations")
      .insert({
        company_id: userCtx.companyId,
        document_id: documentId,
        page_number: page_number ?? 1,
        annotation_type,
        color: color ?? "#dc2626",
        stroke_width: stroke_width ?? 2.0,
        geometry,
        text_content: text_content ?? null,
        created_by: userCtx.userId,
      })
      .select()
      .single();

    if (error) {
      console.error("POST annotation error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ annotation: data }, { status: 201 });
  } catch (err) {
    console.error("POST annotation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
