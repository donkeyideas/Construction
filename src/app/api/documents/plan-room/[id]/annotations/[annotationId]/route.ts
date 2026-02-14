import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

/* ------------------------------------------------------------------
   PUT /api/documents/plan-room/[id]/annotations/[annotationId] — Update
   DELETE /api/documents/plan-room/[id]/annotations/[annotationId] — Delete
   ------------------------------------------------------------------ */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; annotationId: string }> }
) {
  try {
    const { annotationId } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.geometry !== undefined) updates.geometry = body.geometry;
    if (body.text_content !== undefined) updates.text_content = body.text_content;
    if (body.color !== undefined) updates.color = body.color;
    if (body.stroke_width !== undefined) updates.stroke_width = body.stroke_width;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("markup_annotations")
      .update(updates)
      .eq("id", annotationId)
      .eq("company_id", userCtx.companyId)
      .select()
      .single();

    if (error) {
      console.error("PUT annotation error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ annotation: data });
  } catch (err) {
    console.error("PUT annotation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; annotationId: string }> }
) {
  try {
    const { annotationId } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("markup_annotations")
      .delete()
      .eq("id", annotationId)
      .eq("company_id", userCtx.companyId);

    if (error) {
      console.error("DELETE annotation error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE annotation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
