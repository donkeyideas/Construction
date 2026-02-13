import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// POST /api/projects/daily-logs — Create a new daily log
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
    if (!body.project_id) {
      return NextResponse.json(
        { error: "Project is required." },
        { status: 400 }
      );
    }

    if (!body.log_date) {
      return NextResponse.json(
        { error: "Log date is required." },
        { status: 400 }
      );
    }

    // Build workforce array from workforce_count if provided
    const workforce = body.workforce_count
      ? [{ trade: "General", headcount: Number(body.workforce_count), hours: 8 }]
      : [];

    const { data: dailyLog, error } = await supabase
      .from("daily_logs")
      .insert({
        company_id: userCtx.companyId,
        project_id: body.project_id,
        log_date: body.log_date,
        created_by: userCtx.userId,
        weather_conditions: body.weather_conditions || null,
        weather_temp_high: body.temperature ? Number(body.temperature) : null,
        workforce,
        work_performed: body.work_performed?.trim() || null,
        safety_incidents: body.safety_incidents?.trim() || null,
        delays: body.delays?.trim() || null,
        status: "draft",
      })
      .select("*")
      .single();

    if (error) {
      console.error("Insert daily_log error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(dailyLog, { status: 201 });
  } catch (err) {
    console.error("POST /api/projects/daily-logs error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
