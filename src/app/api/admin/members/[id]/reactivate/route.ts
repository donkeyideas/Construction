import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// POST /api/admin/members/[id]/reactivate
// ---------------------------------------------------------------------------

export async function POST(
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

    if (userCtx.role !== "owner" && userCtx.role !== "admin") {
      return NextResponse.json(
        { error: "Insufficient permissions." },
        { status: 403 }
      );
    }

    const { data: member } = await supabase
      .from("company_members")
      .select("id, company_id, is_active")
      .eq("id", id)
      .single();

    if (!member || member.company_id !== userCtx.companyId) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    if (member.is_active) {
      return NextResponse.json(
        { error: "Member is already active." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("company_members")
      .update({ is_active: true })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/admin/members/[id]/reactivate error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
