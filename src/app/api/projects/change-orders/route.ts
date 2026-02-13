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
