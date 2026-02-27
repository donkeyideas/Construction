import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { syncBudgetActualsFromInvoices } from "@/lib/queries/financial";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const projectId = body.project_id;

    if (!projectId) {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }

    const result = await syncBudgetActualsFromInvoices(
      supabase,
      userCtx.companyId,
      projectId
    );

    return NextResponse.json({
      message: `Updated ${result.updatedCount} budget lines with invoice actuals`,
      updatedCount: result.updatedCount,
    });
  } catch (err) {
    console.error("POST /api/financial/budget-lines/sync error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
