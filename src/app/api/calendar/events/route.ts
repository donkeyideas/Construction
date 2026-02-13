import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getCalendarEvents, type CalendarModule } from "@/lib/queries/calendar";

// ---------------------------------------------------------------------------
// GET /api/calendar/events?start=YYYY-MM-DD&end=YYYY-MM-DD&modules=projects,financial
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const modulesParam = searchParams.get("modules");

    if (!start || !end) {
      return NextResponse.json(
        { error: "start and end query parameters are required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start) || !dateRegex.test(end)) {
      return NextResponse.json(
        { error: "Dates must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    let events = await getCalendarEvents(
      supabase,
      userCtx.companyId,
      start,
      end
    );

    // Filter by modules if specified
    if (modulesParam) {
      const allowedModules = new Set(
        modulesParam.split(",").map((m) => m.trim()) as CalendarModule[]
      );
      events = events.filter((e) => allowedModules.has(e.module));
    }

    return NextResponse.json(events);
  } catch (err) {
    console.error("GET /api/calendar/events error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
