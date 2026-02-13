import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// PUT /api/financial/budget-lines/[id] — Update a budget line
// ---------------------------------------------------------------------------

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

    // Verify it belongs to the company
    const { data: existing } = await supabase
      .from("project_budget_lines")
      .select("id")
      .eq("id", id)
      .eq("company_id", userCtx.companyId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Budget line not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.csi_code !== undefined) updateData.csi_code = body.csi_code.trim();
    if (body.description !== undefined)
      updateData.description = body.description.trim();
    if (body.budgeted_amount !== undefined)
      updateData.budgeted_amount = Number(body.budgeted_amount);
    if (body.committed_amount !== undefined)
      updateData.committed_amount = Number(body.committed_amount);
    if (body.actual_amount !== undefined)
      updateData.actual_amount = Number(body.actual_amount);

    const { data, error } = await supabase
      .from("project_budget_lines")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("PUT /api/financial/budget-lines/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/financial/budget-lines/[id] — Delete a budget line
// ---------------------------------------------------------------------------

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

    const { data: existing } = await supabase
      .from("project_budget_lines")
      .select("id")
      .eq("id", id)
      .eq("company_id", userCtx.companyId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Budget line not found" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("project_budget_lines")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/financial/budget-lines/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
