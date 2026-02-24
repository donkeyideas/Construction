import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserCompany } from "@/lib/queries/user";
import type { ClockEvent } from "@/lib/queries/employee-portal";
import { getEmployeeRateMap, createLaborAccrualJE } from "@/lib/utils/labor-cost";
import { getTzToday, toTzDateStr, addDaysToDateStr } from "@/lib/utils/timezone";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate total hours from paired clock_in/clock_out events.
 * Pairs events in chronological order: first clock_in with first clock_out, etc.
 * If the last event is a clock_in with no matching clock_out, calculates
 * elapsed time from clock_in to now.
 */
function calculateTodayHours(events: ClockEvent[]): number {
  // Sort ascending by timestamp
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let totalMs = 0;
  let pendingClockIn: Date | null = null;

  for (const event of sorted) {
    if (event.event_type === "clock_in") {
      pendingClockIn = new Date(event.timestamp);
    } else if (event.event_type === "clock_out" && pendingClockIn) {
      const clockOut = new Date(event.timestamp);
      totalMs += clockOut.getTime() - pendingClockIn.getTime();
      pendingClockIn = null;
    }
  }

  // If still clocked in, count time up to now
  if (pendingClockIn) {
    totalMs += Date.now() - pendingClockIn.getTime();
  }

  const hours = totalMs / 3_600_000;
  return Math.round(hours * 100) / 100;
}

// ---------------------------------------------------------------------------
// GET /api/employee/clock — Get today's clock events + current status
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const todayLocal = getTzToday();
    // Widen query to ±1 day UTC to capture all events from the local date
    const dayBefore = addDaysToDateStr(todayLocal, -1);
    const dayAfter = addDaysToDateStr(todayLocal, 1);

    const { data, error } = await supabase
      .from("clock_events")
      .select("*, projects(name)")
      .eq("user_id", userCtx.userId)
      .eq("company_id", userCtx.companyId)
      .gte("timestamp", `${dayBefore}T00:00:00.000Z`)
      .lt("timestamp", `${dayAfter}T23:59:59.999Z`)
      .order("timestamp", { ascending: true });

    if (error) {
      console.error("GET /api/employee/clock error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Filter to only events on today's LOCAL date
    const todayEvents: ClockEvent[] = (data ?? []).filter(
      (row) => toTzDateStr(row.timestamp as string) === todayLocal
    ).map(
      (row: Record<string, unknown>) => {
        const project = row.projects as { name: string } | null;
        return {
          id: row.id as string,
          company_id: row.company_id as string,
          user_id: row.user_id as string,
          event_type: row.event_type as "clock_in" | "clock_out",
          timestamp: row.timestamp as string,
          project_id: (row.project_id as string) ?? null,
          notes: (row.notes as string) ?? null,
          project_name: project?.name ?? undefined,
        };
      }
    );

    // Determine clock status from the last event
    const lastEvent =
      todayEvents.length > 0 ? todayEvents[todayEvents.length - 1] : null;
    const isClockedIn = lastEvent?.event_type === "clock_in";

    const todayHours = calculateTodayHours(todayEvents);

    return NextResponse.json({
      isClockedIn,
      lastEvent,
      todayEvents,
      todayHours,
    });
  } catch (err) {
    console.error("GET /api/employee/clock error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/employee/clock — Record a clock event (clock_in or clock_out)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { event_type, project_id, notes } = body as {
      event_type?: string;
      project_id?: string;
      notes?: string;
    };

    // Validate event_type
    if (!event_type || !["clock_in", "clock_out"].includes(event_type)) {
      return NextResponse.json(
        {
          error:
            'Invalid event_type. Must be "clock_in" or "clock_out".',
        },
        { status: 400 }
      );
    }

    // Get the most recent clock event for this user to validate state
    const { data: lastEventData, error: lastError } = await supabase
      .from("clock_events")
      .select("id, event_type")
      .eq("user_id", userCtx.userId)
      .eq("company_id", userCtx.companyId)
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastError) {
      console.error("POST /api/employee/clock lookup error:", lastError);
      return NextResponse.json(
        { error: lastError.message },
        { status: 400 }
      );
    }

    const lastEventType = lastEventData?.event_type as string | undefined;

    // Prevent double clock-in
    if (event_type === "clock_in" && lastEventType === "clock_in") {
      return NextResponse.json(
        {
          error:
            "You are already clocked in. Please clock out before clocking in again.",
        },
        { status: 400 }
      );
    }

    // Prevent clock-out when not clocked in
    if (event_type === "clock_out" && lastEventType !== "clock_in") {
      return NextResponse.json(
        {
          error:
            "You are not currently clocked in. Please clock in first.",
        },
        { status: 400 }
      );
    }

    // Insert the clock event
    const { data: newEvent, error: insertError } = await supabase
      .from("clock_events")
      .insert({
        company_id: userCtx.companyId,
        user_id: userCtx.userId,
        event_type,
        timestamp: new Date().toISOString(),
        project_id: project_id || null,
        notes: notes || null,
      })
      .select("*, projects(name)")
      .single();

    if (insertError) {
      console.error("POST /api/employee/clock insert error:", insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      );
    }

    // Shape the response
    const project = (newEvent as Record<string, unknown>).projects as {
      name: string;
    } | null;

    const result: ClockEvent = {
      id: newEvent.id,
      company_id: newEvent.company_id,
      user_id: newEvent.user_id,
      event_type: newEvent.event_type as "clock_in" | "clock_out",
      timestamp: newEvent.timestamp,
      project_id: newEvent.project_id ?? null,
      notes: newEvent.notes ?? null,
      project_name: project?.name ?? undefined,
    };

    // On clock-out: sync time_entries + create/update labor accrual JE
    // Uses admin client to bypass RLS (employees may not have write access)
    if (event_type === "clock_out") {
      try {
        const adminSb = createAdminClient();
        const todayLocal = getTzToday();
        const jeDayBefore = addDaysToDateStr(todayLocal, -1);
        const jeDayAfter = addDaysToDateStr(todayLocal, 1);

        // Fetch today's clock events (widened to ±1 day UTC, filtered by local date)
        const { data: todayData, error: evtErr } = await adminSb
          .from("clock_events")
          .select("id, event_type, timestamp, project_id")
          .eq("user_id", userCtx.userId)
          .eq("company_id", userCtx.companyId)
          .gte("timestamp", `${jeDayBefore}T00:00:00.000Z`)
          .lt("timestamp", `${jeDayAfter}T23:59:59.999Z`)
          .order("timestamp", { ascending: true });

        if (evtErr) console.error("[clock-out] Error fetching events:", evtErr);

        const todayClock = ((todayData ?? []) as ClockEvent[]).filter(
          (e) => toTzDateStr(e.timestamp) === todayLocal
        );
        const todayHours = calculateTodayHours(todayClock);

        // Find first clock_in and last clock_out of the day
        const firstClockIn = todayClock.find((e) => e.event_type === "clock_in");
        const lastClockOut = [...todayClock].reverse().find((e) => e.event_type === "clock_out");
        const lastWithProject = [...todayClock].reverse().find((e) => e.project_id);

        // ---- Sync to time_entries so employee portal + admin show same hours ----
        if (todayHours > 0) {
          try {
            // Check if a time_entries row already exists for this user+date
            const { data: existingTE } = await adminSb
              .from("time_entries")
              .select("id")
              .eq("user_id", userCtx.userId)
              .eq("company_id", userCtx.companyId)
              .eq("entry_date", todayLocal)
              .limit(1)
              .maybeSingle();

            const tePayload = {
              hours: todayHours,
              clock_in: firstClockIn?.timestamp ?? null,
              clock_out: lastClockOut?.timestamp ?? null,
              project_id: lastWithProject?.project_id ?? null,
              status: "approved",
            };

            if (existingTE) {
              await adminSb
                .from("time_entries")
                .update(tePayload)
                .eq("id", existingTE.id);
            } else {
              await adminSb
                .from("time_entries")
                .insert({
                  ...tePayload,
                  company_id: userCtx.companyId,
                  user_id: userCtx.userId,
                  entry_date: todayLocal,
                });
            }
          } catch (teErr) {
            console.error("[clock-out] time_entries sync error:", teErr);
          }
        }

        // ---- Create/update labor accrual JE ----
        if (todayHours > 0) {
          const rateMap = await getEmployeeRateMap(adminSb, userCtx.companyId);
          const rate = rateMap.get(userCtx.userId);

          if (rate) {
            const { data: profile } = await adminSb
              .from("user_profiles")
              .select("full_name, email")
              .eq("id", userCtx.userId)
              .maybeSingle();

            const employeeName = profile?.full_name || profile?.email || "Employee";

            await createLaborAccrualJE(
              adminSb,
              userCtx.companyId,
              userCtx.userId,
              employeeName,
              todayHours,
              rate,
              todayLocal,
              lastWithProject?.project_id ?? undefined
            );
          }
        }
      } catch (jeErr) {
        console.error("[clock-out] JE/sync error:", jeErr);
      }
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("POST /api/employee/clock error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
