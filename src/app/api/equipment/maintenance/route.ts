import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getMaintenanceLogs,
  createMaintenanceLog,
} from "@/lib/queries/equipment";

// ---------------------------------------------------------------------------
// GET /api/equipment/maintenance — List maintenance logs
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
    const maintenance_type = searchParams.get("maintenance_type");
    const status = searchParams.get("status");
    const equipment_id = searchParams.get("equipment_id");

    const logs = await getMaintenanceLogs(supabase, userCtx.companyId, {
      maintenance_type: maintenance_type ?? undefined,
      status: status ?? undefined,
      equipment_id: equipment_id ?? undefined,
    });

    return NextResponse.json(logs);
  } catch (err) {
    console.error("GET /api/equipment/maintenance error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/equipment/maintenance — Create maintenance log
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

    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "Title is required." },
        { status: 400 }
      );
    }

    if (!body.maintenance_type) {
      return NextResponse.json(
        { error: "Maintenance type is required." },
        { status: 400 }
      );
    }

    const { log, error } = await createMaintenanceLog(
      supabase,
      userCtx.companyId,
      {
        equipment_id: body.equipment_id,
        maintenance_type: body.maintenance_type,
        title: body.title.trim(),
        description: body.description?.trim() || undefined,
        maintenance_date: body.maintenance_date || undefined,
        cost: body.cost ? Number(body.cost) : undefined,
        performed_by: body.performed_by?.trim() || undefined,
        vendor_name: body.vendor_name?.trim() || undefined,
        status: body.status || undefined,
        next_due_date: body.next_due_date || undefined,
        notes: body.notes?.trim() || undefined,
      }
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(log, { status: 201 });
  } catch (err) {
    console.error("POST /api/equipment/maintenance error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
