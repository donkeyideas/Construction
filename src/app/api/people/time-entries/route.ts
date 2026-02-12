import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getTimeEntries,
  createTimeEntry,
  type TimeEntryStatus,
} from "@/lib/queries/people";

// ---------------------------------------------------------------------------
// GET /api/people/time-entries - List time entries
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id") ?? undefined;
    const projectId = searchParams.get("project_id") ?? undefined;
    const status = searchParams.get("status") as TimeEntryStatus | null;
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    const dateRange =
      startDate && endDate ? { start: startDate, end: endDate } : undefined;

    const entries = await getTimeEntries(supabase, userCtx.companyId, {
      userId,
      projectId,
      status: status ?? undefined,
      dateRange,
    });

    return NextResponse.json(entries);
  } catch (err) {
    console.error("GET /api/people/time-entries error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/people/time-entries - Create a new time entry
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

    if (body.hours == null && (!body.clock_in || !body.clock_out)) {
      return NextResponse.json(
        { error: "Either hours or clock-in/clock-out times are required." },
        { status: 400 }
      );
    }

    // Use the provided user_id or default to the current user
    const targetUserId = body.user_id || userCtx.userId;

    const { entry, error } = await createTimeEntry(
      supabase,
      userCtx.companyId,
      {
        user_id: targetUserId,
        project_id: body.project_id || null,
        entry_date: body.entry_date,
        clock_in: body.clock_in || null,
        clock_out: body.clock_out || null,
        hours: body.hours ?? null,
        break_minutes: body.break_minutes ?? null,
        work_type: body.work_type || null,
        cost_code: body.cost_code || null,
        notes: body.notes || null,
        gps_lat: body.gps_lat ?? null,
        gps_lng: body.gps_lng ?? null,
        status: "pending",
      }
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error("POST /api/people/time-entries error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
