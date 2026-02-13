import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// POST /api/people/time - Create a new time entry
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.entry_date) {
      return NextResponse.json(
        { error: "Entry date is required." },
        { status: 400 }
      );
    }

    if (body.hours == null || Number(body.hours) <= 0) {
      return NextResponse.json(
        { error: "Hours are required and must be greater than 0." },
        { status: 400 }
      );
    }

    const { data: entry, error } = await supabase
      .from("time_entries")
      .insert({
        company_id: userCtx.companyId,
        user_id: userCtx.userId,
        project_id: body.project_id || null,
        entry_date: body.entry_date,
        hours: Number(body.hours),
        work_type: body.work_type === "overtime" || Number(body.hours) > 8 ? "overtime" : "regular",
        cost_code: body.cost_code?.trim() || null,
        notes: body.description?.trim() || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Create time entry error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error("POST /api/people/time error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
