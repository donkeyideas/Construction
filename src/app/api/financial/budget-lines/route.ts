import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// POST /api/financial/budget-lines — Create a new budget line
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.project_id || !body.csi_code || !body.description) {
      return NextResponse.json(
        { error: "project_id, csi_code, and description are required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("project_budget_lines")
      .insert({
        company_id: userCtx.companyId,
        project_id: body.project_id,
        csi_code: body.csi_code.trim(),
        description: body.description.trim(),
        budgeted_amount: Number(body.budgeted_amount) || 0,
        committed_amount: Number(body.committed_amount) || 0,
        actual_amount: Number(body.actual_amount) || 0,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/financial/budget-lines error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
