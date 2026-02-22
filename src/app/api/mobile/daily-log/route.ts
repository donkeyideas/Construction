import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// POST /api/mobile/daily-log - Create a daily log entry
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
    if (!body.log_date) {
      return NextResponse.json(
        { error: "Log date is required." },
        { status: 400 }
      );
    }

    if (!body.project_id) {
      return NextResponse.json(
        { error: "Project is required." },
        { status: 400 }
      );
    }

    // Verify the project belongs to this company
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", body.project_id)
      .eq("company_id", userCtx.companyId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found or does not belong to your company." },
        { status: 400 }
      );
    }

    // Check for duplicate log for same project + date
    const { data: existingLog } = await supabase
      .from("daily_logs")
      .select("id")
      .eq("company_id", userCtx.companyId)
      .eq("project_id", body.project_id)
      .eq("log_date", body.log_date)
      .eq("created_by", userCtx.userId)
      .limit(1);

    if (existingLog && existingLog.length > 0) {
      return NextResponse.json(
        {
          error:
            "A daily log for this project and date already exists. Please edit the existing log instead.",
        },
        { status: 400 }
      );
    }

    // Build the workforce JSON field
    const workforce = body.workforce ?? null;

    // Build metadata for safety and visitors
    const metadata: Record<string, unknown> = {};
    if (body.safety_incident) {
      metadata.safety_incident = true;
      metadata.safety_notes = body.safety_notes || null;
    }
    if (body.visitors) {
      metadata.visitors = body.visitors;
    }

    const { data: log, error: insertError } = await supabase
      .from("daily_logs")
      .insert({
        company_id: userCtx.companyId,
        project_id: body.project_id,
        log_date: body.log_date,
        created_by: userCtx.userId,
        weather_condition: body.weather_condition || null,
        weather_temp_high: body.weather_temp_high ?? null,
        weather_temp_low: body.weather_temp_low ?? null,
        weather_precipitation: body.weather_precipitation || null,
        workforce,
        work_performed: body.work_performed || null,
        status: "submitted",
      })
      .select()
      .single();

    if (insertError) {
      console.error("POST /api/mobile/daily-log error:", insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      );
    }

    // Also log to audit_log
    await supabase.from("audit_logs").insert({
      company_id: userCtx.companyId,
      user_id: userCtx.userId,
      action: "submit_daily_log",
      entity_type: "daily_log",
      entity_id: log.id,
      details: {
        project_id: body.project_id,
        log_date: body.log_date,
        has_safety_incident: !!body.safety_incident,
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (err) {
    console.error("POST /api/mobile/daily-log error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
