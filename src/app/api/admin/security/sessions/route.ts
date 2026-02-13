import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getActiveSessions } from "@/lib/queries/security";

// ---------------------------------------------------------------------------
// GET /api/admin/security/sessions - Get active sessions for company
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessions = await getActiveSessions(supabase, userCtx.companyId);
    return NextResponse.json(sessions);
  } catch (err) {
    console.error("GET /api/admin/security/sessions error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
