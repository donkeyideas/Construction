import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// DELETE /api/admin/security/sessions/[id] - Force logout / revoke session
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

    if (userCtx.role !== "owner" && userCtx.role !== "admin") {
      return NextResponse.json(
        { error: "Insufficient permissions." },
        { status: 403 }
      );
    }

    // Verify session belongs to company
    const { data: session } = await supabase
      .from("active_sessions")
      .select("id, company_id")
      .eq("id", id)
      .single();

    if (!session || session.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("active_sessions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("DELETE session error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/security/sessions/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
