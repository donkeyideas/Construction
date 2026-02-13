import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getEquipmentList,
  createEquipment,
  type EquipmentStatus,
} from "@/lib/queries/equipment";

// ---------------------------------------------------------------------------
// GET /api/equipment — List equipment for the current user's company
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
    const status = searchParams.get("status") as EquipmentStatus | null;
    const equipment_type = searchParams.get("equipment_type");
    const search = searchParams.get("search");

    const equipment = await getEquipmentList(supabase, userCtx.companyId, {
      status: status ?? undefined,
      equipment_type: equipment_type ?? undefined,
      search: search ?? undefined,
    });

    return NextResponse.json(equipment);
  } catch (err) {
    console.error("GET /api/equipment error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/equipment — Create new equipment
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
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "Equipment name is required." },
        { status: 400 }
      );
    }

    if (!body.equipment_type) {
      return NextResponse.json(
        { error: "Equipment type is required." },
        { status: 400 }
      );
    }

    const { equipment, error } = await createEquipment(
      supabase,
      userCtx.companyId,
      {
        name: body.name.trim(),
        equipment_type: body.equipment_type,
        make: body.make?.trim() || undefined,
        model: body.model?.trim() || undefined,
        serial_number: body.serial_number?.trim() || undefined,
        purchase_date: body.purchase_date || undefined,
        purchase_cost: body.purchase_cost ? Number(body.purchase_cost) : undefined,
        hourly_rate: body.hourly_rate ? Number(body.hourly_rate) : undefined,
      }
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(equipment, { status: 201 });
  } catch (err) {
    console.error("POST /api/equipment error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
