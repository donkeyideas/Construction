import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getSecuritySettings, upsertSecuritySettings } from "@/lib/queries/security";

// ---------------------------------------------------------------------------
// GET /api/admin/security/settings - Get security settings for company
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getSecuritySettings(supabase, userCtx.companyId);
    return NextResponse.json(settings);
  } catch (err) {
    console.error("GET /api/admin/security/settings error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/security/settings - Update security settings
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (userCtx.role !== "owner" && userCtx.role !== "admin") {
      return NextResponse.json(
        { error: "Insufficient permissions. Only owners and admins can manage security settings." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const { settings, error } = await upsertSecuritySettings(
      supabase,
      userCtx.companyId,
      userCtx.userId,
      body
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(settings);
  } catch (err) {
    console.error("PATCH /api/admin/security/settings error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
