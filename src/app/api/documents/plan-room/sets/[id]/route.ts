import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

/* ------------------------------------------------------------------
   PUT /api/documents/plan-room/sets/[id] — Update a drawing set
   ------------------------------------------------------------------ */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description || null;
    if (body.discipline !== undefined) updates.discipline = body.discipline || null;
    if (body.status !== undefined) updates.status = body.status;
    if (body.project_id !== undefined) updates.project_id = body.project_id || null;

    const { data, error } = await supabase
      .from("drawing_sets")
      .update(updates)
      .eq("id", id)
      .eq("company_id", userCtx.companyId)
      .select()
      .single();

    if (error) {
      console.error("PUT /api/documents/plan-room/sets/[id] error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PUT /api/documents/plan-room/sets/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------
   DELETE /api/documents/plan-room/sets/[id] — Delete a drawing set
   ------------------------------------------------------------------ */

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("drawing_sets")
      .delete()
      .eq("id", id)
      .eq("company_id", userCtx.companyId);

    if (error) {
      console.error("DELETE /api/documents/plan-room/sets/[id] error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/documents/plan-room/sets/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
