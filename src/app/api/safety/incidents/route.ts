import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getIncidents,
  createIncident,
  type IncidentStatus,
  type IncidentSeverity,
  type IncidentType,
} from "@/lib/queries/safety";
import { createNotifications } from "@/lib/utils/notifications";
import { checkSubscriptionAccess } from "@/lib/guards/subscription-guard";

// ---------------------------------------------------------------------------
// GET /api/safety/incidents — List incidents for the current user's company
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as IncidentStatus | null;
    const severity = searchParams.get("severity") as IncidentSeverity | null;
    const incident_type = searchParams.get("incident_type") as IncidentType | null;
    const search = searchParams.get("search");

    const incidents = await getIncidents(supabase, userCtx.companyId, {
      status: status ?? undefined,
      severity: severity ?? undefined,
      incident_type: incident_type ?? undefined,
      search: search ?? undefined,
    });

    return NextResponse.json(incidents);
  } catch (err) {
    console.error("GET /api/safety/incidents error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/safety/incidents — Create a new incident
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

    const subBlock = await checkSubscriptionAccess(userCtx.companyId, "POST");
    if (subBlock) return subBlock;

    const body = await request.json();

    // Validate required fields
    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "Incident title is required." },
        { status: 400 }
      );
    }

    const { incident, error } = await createIncident(
      supabase,
      userCtx.companyId,
      userCtx.userId,
      {
        title: body.title.trim(),
        description: body.description?.trim() || undefined,
        incident_type: body.incident_type || undefined,
        severity: body.severity || undefined,
        project_id: body.project_id || undefined,
        property_id: body.property_id || undefined,
        assigned_to: body.assigned_to || undefined,
        incident_date: body.incident_date || undefined,
        location: body.location?.trim() || undefined,
        osha_recordable: body.osha_recordable ?? false,
      }
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    try {
      await createNotifications(supabase, {
        companyId: userCtx.companyId,
        actorUserId: userCtx.userId,
        title: `Safety Incident: ${body.title.trim()}`,
        message: `A safety incident "${body.title.trim()}" has been reported.${body.severity ? ` Severity: ${body.severity}.` : ""}`,
        notificationType: "alert",
        entityType: "safety_incident",
        entityId: incident?.id,
      });
    } catch (e) { console.warn("Notification failed:", e); }

    return NextResponse.json(incident, { status: 201 });
  } catch (err) {
    console.error("POST /api/safety/incidents error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
