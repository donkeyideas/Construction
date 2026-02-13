import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// POST /api/projects/change-orders — Create a new change order
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.project_id) {
      return NextResponse.json(
        { error: "Project is required." },
        { status: 400 }
      );
    }

    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "Title is required." },
        { status: 400 }
      );
    }

    // Auto-generate CO number: count existing COs for this project + 1
    const { count } = await supabase
      .from("change_orders")
      .select("id", { count: "exact", head: true })
      .eq("company_id", userCtx.companyId)
      .eq("project_id", body.project_id);

    const coNum = (count ?? 0) + 1;
    const co_number = `CO-${String(coNum).padStart(3, "0")}`;

    const { data: changeOrder, error } = await supabase
      .from("change_orders")
      .insert({
        company_id: userCtx.companyId,
        project_id: body.project_id,
        co_number,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        reason: body.reason || null,
        amount: body.amount != null ? Number(body.amount) : 0,
        schedule_impact_days: body.schedule_impact_days != null ? Number(body.schedule_impact_days) : 0,
        requested_by: userCtx.userId,
        status: "draft",
      })
      .select("*")
      .single();

    if (error) {
      console.error("Insert change_order error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(changeOrder, { status: 201 });
  } catch (err) {
    console.error("POST /api/projects/change-orders error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/projects/change-orders — Update an existing change order
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Change order id is required." },
        { status: 400 }
      );
    }

    // Build update payload from allowed fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.reason !== undefined) updateData.reason = body.reason;
    if (body.amount !== undefined) updateData.amount = Number(body.amount);
    if (body.schedule_impact_days !== undefined) updateData.schedule_impact_days = Number(body.schedule_impact_days);
    if (body.assigned_to !== undefined) updateData.assigned_to = body.assigned_to;
    if (body.line_items !== undefined) updateData.line_items = body.line_items;

    // If approved or rejected, record who and when
    if (body.status === "approved" || body.status === "rejected") {
      updateData.approved_by = userCtx.userId;
      updateData.approved_at = new Date().toISOString();
    }

    const { data: changeOrder, error } = await supabase
      .from("change_orders")
      .update(updateData)
      .eq("id", body.id)
      .select("*")
      .single();

    if (error) {
      console.error("Update change_order error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(changeOrder);
  } catch (err) {
    console.error("PATCH /api/projects/change-orders error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/projects/change-orders — Delete an existing change order
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Change order id is required." },
        { status: 400 }
      );
    }

    // Verify the change order belongs to the user's company
    const { data: existing } = await supabase
      .from("change_orders")
      .select("id")
      .eq("id", body.id)
      .eq("company_id", userCtx.companyId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Change order not found" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("change_orders")
      .delete()
      .eq("id", body.id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/projects/change-orders error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
