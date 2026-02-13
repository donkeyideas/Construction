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

// ---------------------------------------------------------------------------
// PATCH /api/projects/daily-logs — Update an existing daily log
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
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

    if (!body.id) {
      return NextResponse.json(
        { error: "Daily log id is required." },
        { status: 400 }
      );
    }

    // Build update payload from allowed fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.work_performed !== undefined) updateData.work_performed = body.work_performed;
    if (body.weather_conditions !== undefined) updateData.weather_conditions = body.weather_conditions;
    if (body.weather_temp_high !== undefined) updateData.weather_temp_high = body.weather_temp_high;
    if (body.weather_temp_low !== undefined) updateData.weather_temp_low = body.weather_temp_low;
    if (body.workforce !== undefined) updateData.workforce = body.workforce;
    if (body.delays !== undefined) updateData.delays = body.delays;
    if (body.safety_incidents !== undefined) updateData.safety_incidents = body.safety_incidents;
    if (body.materials_received !== undefined) updateData.materials_received = body.materials_received;
    if (body.status !== undefined) updateData.status = body.status;

    // If approved, record who and when
    if (body.status === "approved") {
      updateData.approved_by = userCtx.userId;
      updateData.approved_at = new Date().toISOString();
    }

    const { data: dailyLog, error } = await supabase
      .from("daily_logs")
      .update(updateData)
      .eq("id", body.id)
      .select("*")
      .single();

    if (error) {
      console.error("Update daily_log error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(dailyLog);
  } catch (err) {
    console.error("PATCH /api/projects/daily-logs error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
