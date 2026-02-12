import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// POST /api/mobile/clock - Clock in (create time entry with clock_in)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const now = new Date();
    const entryDate = now.toISOString().slice(0, 10);
    const clockIn = now.toISOString();

    // Check if user already has an open entry today (no clock_out)
    const { data: existing } = await supabase
      .from("time_entries")
      .select("id")
      .eq("company_id", userCtx.companyId)
      .eq("user_id", userCtx.userId)
      .eq("entry_date", entryDate)
      .is("clock_out", null)
      .not("clock_in", "is", null)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "You already have an open time entry. Please clock out first." },
        { status: 400 }
      );
    }

    const { data: entry, error } = await supabase
      .from("time_entries")
      .insert({
        company_id: userCtx.companyId,
        user_id: userCtx.userId,
        project_id: body.project_id || null,
        entry_date: entryDate,
        clock_in: clockIn,
        clock_out: null,
        hours: null,
        gps_lat: body.gps_lat ?? null,
        gps_lng: body.gps_lng ?? null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("POST /api/mobile/clock error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error("POST /api/mobile/clock error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/mobile/clock - Clock out (update entry with clock_out, hours)
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const entryId = body.entry_id;

    if (!entryId) {
      return NextResponse.json(
        { error: "entry_id is required" },
        { status: 400 }
      );
    }

    // Fetch the existing entry
    const { data: existing, error: fetchError } = await supabase
      .from("time_entries")
      .select("id, clock_in, user_id, company_id")
      .eq("id", entryId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Time entry not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (
      existing.user_id !== userCtx.userId ||
      existing.company_id !== userCtx.companyId
    ) {
      return NextResponse.json(
        { error: "Unauthorized to modify this entry" },
        { status: 403 }
      );
    }

    if (!existing.clock_in) {
      return NextResponse.json(
        { error: "This entry has no clock-in time" },
        { status: 400 }
      );
    }

    const now = new Date();
    const clockOut = now.toISOString();
    const clockInDate = new Date(existing.clock_in);
    const diffMs = now.getTime() - clockInDate.getTime();
    const hours = Math.max(0, diffMs / 3600000);

    const updateData: Record<string, unknown> = {
      clock_out: clockOut,
      hours: Math.round(hours * 100) / 100, // round to 2 decimals
    };

    // Optionally update GPS on clock-out
    if (body.gps_lat != null) {
      updateData.gps_lat = body.gps_lat;
    }
    if (body.gps_lng != null) {
      updateData.gps_lng = body.gps_lng;
    }

    const { data: updated, error: updateError } = await supabase
      .from("time_entries")
      .update(updateData)
      .eq("id", entryId)
      .select()
      .single();

    if (updateError) {
      console.error("PATCH /api/mobile/clock error:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/mobile/clock error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
