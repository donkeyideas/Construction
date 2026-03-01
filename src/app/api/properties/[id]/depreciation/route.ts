import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getDefaultUsefulLife,
  generateAllDepreciationJEs,
} from "@/lib/utils/property-depreciation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/properties/[id]/depreciation
 * Sets up depreciation parameters and generates ALL monthly JEs for the full useful life.
 * Body: { land_value?, useful_life_years?, depreciation_start_date? }
 * Idempotent — existing JEs are skipped, only missing ones are created.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: property, error: propErr } = await supabase
      .from("properties")
      .select("id, name, purchase_price, property_type")
      .eq("id", id)
      .eq("company_id", ctx.companyId)
      .single();

    if (propErr || !property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const purchasePrice = Number(property.purchase_price) || 0;
    if (purchasePrice <= 0) {
      return NextResponse.json(
        { error: "Property has no purchase price — cannot generate depreciation schedule." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const landValue: number | null =
      body.land_value !== undefined && body.land_value !== "" && body.land_value !== null
        ? Number(body.land_value)
        : null;

    const usefulLifeYears: number =
      body.useful_life_years && Number(body.useful_life_years) > 0
        ? Number(body.useful_life_years)
        : getDefaultUsefulLife(property.property_type);

    const depreciationStartDate: string =
      body.depreciation_start_date || new Date().toISOString().slice(0, 10);

    // Persist depreciation setup on the property
    await supabase
      .from("properties")
      .update({
        land_value: landValue,
        useful_life_years: usefulLifeYears,
        depreciation_method: "straight_line",
        depreciation_start_date: depreciationStartDate,
      })
      .eq("id", id)
      .eq("company_id", ctx.companyId);

    // Generate all JEs
    const result = await generateAllDepreciationJEs(supabase, ctx.companyId, ctx.userId, {
      id: property.id,
      name: property.name,
      purchase_price: purchasePrice,
      land_value: landValue,
      useful_life_years: usefulLifeYears,
      depreciation_start_date: depreciationStartDate,
      property_type: property.property_type,
    });

    return NextResponse.json({
      success: true,
      created: result.created,
      skipped: result.skipped,
      monthlyAmount: result.monthlyAmount,
      totalMonths: result.totalMonths,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/properties/[id]/depreciation
 * Resets the depreciation schedule: deletes all depreciation JEs and clears setup fields.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify property belongs to company
    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("id", id)
      .eq("company_id", ctx.companyId)
      .single();

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Delete all depreciation JEs for this property
    // Note: deleting journal_entries will cascade to journal_entry_lines via FK
    const { count } = await supabase
      .from("journal_entries")
      .delete({ count: "exact" })
      .eq("company_id", ctx.companyId)
      .like("reference", `depreciation:${id}:%`);

    // Clear depreciation setup columns
    await supabase
      .from("properties")
      .update({
        land_value: null,
        useful_life_years: null,
        depreciation_method: null,
        depreciation_start_date: null,
      })
      .eq("id", id)
      .eq("company_id", ctx.companyId);

    return NextResponse.json({ success: true, deleted: count ?? 0 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
