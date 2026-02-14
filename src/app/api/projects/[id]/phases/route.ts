import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// POST /api/projects/[id]/phases — Create a new phase
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await request.json();

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Phase name is required." }, { status: 400 });
    }

    // Auto sort_order: count existing phases + 1
    const { count } = await supabase
      .from("project_phases")
      .select("id", { count: "exact", head: true })
      .eq("company_id", userCtx.companyId)
      .eq("project_id", projectId);

    const { data: phase, error } = await supabase
      .from("project_phases")
      .insert({
        company_id: userCtx.companyId,
        project_id: projectId,
        name: body.name.trim(),
        color: body.color || null,
        start_date: body.start_date || null,
        end_date: body.end_date || null,
        sort_order: (count ?? 0) + 1,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Insert phase error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(phase, { status: 201 });
  } catch (err) {
    console.error("POST /api/projects/[id]/phases error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/projects/[id]/phases — Delete a phase
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "Phase id is required." }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("project_phases")
      .select("id")
      .eq("id", body.id)
      .eq("company_id", userCtx.companyId)
      .eq("project_id", projectId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("project_phases")
      .delete()
      .eq("id", body.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/projects/[id]/phases error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
