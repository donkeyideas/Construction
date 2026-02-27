import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getEquipmentList,
  createEquipment,
  type EquipmentStatus,
} from "@/lib/queries/equipment";
import {
  buildCompanyAccountMap,
  generateEquipmentPurchaseJournalEntry,
  generateDepreciationJournalEntries,
} from "@/lib/utils/invoice-accounting";
import { checkSubscriptionAccess } from "@/lib/guards/subscription-guard";

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

    const subBlock = await checkSubscriptionAccess(userCtx.companyId, "POST");
    if (subBlock) return subBlock;

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
        useful_life_months: body.useful_life_months ? Number(body.useful_life_months) : undefined,
        salvage_value: body.salvage_value ? Number(body.salvage_value) : undefined,
        depreciation_start_date: body.depreciation_start_date || undefined,
      }
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    // Generate equipment purchase JE and/or depreciation JEs
    const needsPurchaseJE = equipment && body.purchase_cost && Number(body.purchase_cost) > 0;
    const needsDepreciation = equipment && body.useful_life_months && Number(body.useful_life_months) > 0;

    if (needsPurchaseJE || needsDepreciation) {
      try {
        const accountMap = await buildCompanyAccountMap(supabase, userCtx.companyId);

        if (needsPurchaseJE) {
          await generateEquipmentPurchaseJournalEntry(supabase, userCtx.companyId, userCtx.userId, {
            id: equipment.id,
            name: body.name.trim(),
            purchase_cost: Number(body.purchase_cost),
            purchase_date: body.purchase_date || new Date().toISOString().split("T")[0],
          }, accountMap);
        }

        if (needsDepreciation) {
          await generateDepreciationJournalEntries(supabase, userCtx.companyId, userCtx.userId, {
            id: equipment.id,
            name: body.name.trim(),
            purchase_cost: Number(body.purchase_cost) || 0,
            salvage_value: Number(body.salvage_value) || 0,
            useful_life_months: Number(body.useful_life_months),
            depreciation_start_date: body.depreciation_start_date || body.purchase_date || new Date().toISOString().split("T")[0],
          }, accountMap);
        }
      } catch (jeErr) {
        console.warn("Equipment JE generation failed (non-blocking):", jeErr);
      }
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
