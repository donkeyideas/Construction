import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// POST /api/people/time/approve-all - Batch approve pending time entries
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin or owner can approve
    if (!["owner", "admin"].includes(userCtx.role)) {
      return NextResponse.json(
        { error: "Only admins can approve time entries" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const entryIds: string[] = body.entryIds;

    if (!Array.isArray(entryIds) || entryIds.length === 0) {
      return NextResponse.json(
        { error: "No entry IDs provided" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("time_entries")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("company_id", userCtx.companyId)
      .eq("status", "pending")
      .in("id", entryIds)
      .select("id");

    if (error) {
      console.error("Approve all time entries error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      approved: (data ?? []).length,
    });
  } catch (err) {
    console.error("POST /api/people/time/approve-all error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
