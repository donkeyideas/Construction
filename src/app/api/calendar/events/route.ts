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

// ---------------------------------------------------------------------------
// POST /api/calendar/events — Create a new project task (calendar event)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "Title is required." },
        { status: 400 }
      );
    }

    if (!body.project_id) {
      return NextResponse.json(
        { error: "Project is required." },
        { status: 400 }
      );
    }

    if (!body.start_date) {
      return NextResponse.json(
        { error: "Start date is required." },
        { status: 400 }
      );
    }

    const { data: task, error } = await supabase
      .from("project_tasks")
      .insert({
        company_id: userCtx.companyId,
        project_id: body.project_id,
        name: body.title.trim(),
        description: body.description?.trim() || null,
        start_date: body.start_date,
        end_date: body.end_date || body.start_date,
        priority: body.priority || "medium",
        is_milestone: body.is_milestone || false,
        assigned_to: body.assigned_to || null,
        status: "not_started",
        completion_pct: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("POST /api/calendar/events insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error("POST /api/calendar/events error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
