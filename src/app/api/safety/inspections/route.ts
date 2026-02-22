import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { createNotifications } from "@/lib/utils/notifications";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const inspection_type = searchParams.get("inspection_type");

    let query = supabase
      .from("safety_inspections")
      .select("*, projects(name)")
      .eq("company_id", userCtx.companyId)
      .order("inspection_date", { ascending: false });

    if (status) query = query.eq("status", status);
    if (inspection_type) query = query.eq("inspection_type", inspection_type);

    const { data, error } = await query;

    if (error) {
      console.error("GET /api/safety/inspections error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("GET /api/safety/inspections error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.inspection_type) {
      return NextResponse.json({ error: "Inspection type is required." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("safety_inspections")
      .insert({
        company_id: userCtx.companyId,
        inspector_id: userCtx.userId,
        project_id: body.project_id || null,
        inspection_type: body.inspection_type,
        inspection_date: body.inspection_date || new Date().toISOString(),
        score: body.score ? Number(body.score) : null,
        findings: body.findings?.trim() || null,
        corrective_actions: body.corrective_actions?.trim() || null,
        status: body.status || "scheduled",
      })
      .select()
      .single();

    if (error) {
      console.error("POST /api/safety/inspections error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    try {
      await createNotifications(supabase, {
        companyId: userCtx.companyId,
        actorUserId: userCtx.userId,
        title: `Safety Inspection: ${body.inspection_type}`,
        message: `A new ${body.inspection_type} safety inspection has been logged.`,
        notificationType: "info",
        entityType: "safety_inspection",
        entityId: data.id,
      });
    } catch (e) { console.warn("Notification failed:", e); }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/safety/inspections error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
