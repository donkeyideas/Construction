import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getAssignments,
  createAssignment,
  type AssignmentStatus,
} from "@/lib/queries/equipment";

// ---------------------------------------------------------------------------
// GET /api/equipment/assignments — List equipment assignments
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
    const status = searchParams.get("status") as AssignmentStatus | null;
    const equipment_id = searchParams.get("equipment_id");
    const project_id = searchParams.get("project_id");

    const assignments = await getAssignments(supabase, userCtx.companyId, {
      status: status ?? undefined,
      equipment_id: equipment_id ?? undefined,
      project_id: project_id ?? undefined,
    });

    return NextResponse.json(assignments);
  } catch (err) {
    console.error("GET /api/equipment/assignments error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/equipment/assignments — Create assignment (check out equipment)
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
    if (!body.equipment_id) {
      return NextResponse.json(
        { error: "Equipment is required." },
        { status: 400 }
      );
    }

    const { assignment, error } = await createAssignment(
      supabase,
      userCtx.companyId,
      userCtx.userId,
      {
        equipment_id: body.equipment_id,
        project_id: body.project_id || undefined,
        property_id: body.property_id || undefined,
        assigned_to: body.assigned_to || undefined,
        notes: body.notes?.trim() || undefined,
      }
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(assignment, { status: 201 });
  } catch (err) {
    console.error("POST /api/equipment/assignments error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
