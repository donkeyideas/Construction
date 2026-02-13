import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { toggleRule } from "@/lib/queries/automation";

// ---------------------------------------------------------------------------
// POST /api/admin/automation/[id]/toggle - Toggle automation rule enabled
// ---------------------------------------------------------------------------

export async function POST(
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

    if (userCtx.role !== "owner" && userCtx.role !== "admin") {
      return NextResponse.json(
        { error: "Insufficient permissions." },
        { status: 403 }
      );
    }

    // Verify the rule belongs to the same company
    const { data: existing } = await supabase
      .from("automation_rules")
      .select("id, company_id, is_enabled")
      .eq("id", id)
      .single();

    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Rule not found." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const enabled = typeof body.enabled === "boolean" ? body.enabled : !existing.is_enabled;

    const { error } = await toggleRule(supabase, id, enabled);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true, is_enabled: enabled });
  } catch (err) {
    console.error("POST /api/admin/automation/[id]/toggle error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
