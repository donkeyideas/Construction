import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getIncidentById,
  updateIncident,
} from "@/lib/queries/safety";

// ---------------------------------------------------------------------------
// PATCH /api/safety/incidents/[id] — Update an incident
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify the incident exists and belongs to the company
    const existing = await getIncidentById(supabase, id);
    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const { incident, error } = await updateIncident(supabase, id, body);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(incident);
  } catch (err) {
    console.error("PATCH /api/safety/incidents/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/safety/incidents/[id] — Delete an incident
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify the incident exists and belongs to the company
    const existing = await getIncidentById(supabase, id);
    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("safety_incidents")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/safety/incidents/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
