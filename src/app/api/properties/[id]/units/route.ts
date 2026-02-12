import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getUnits, createUnit } from "@/lib/queries/properties";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the property belongs to the user's company
    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("id", id)
      .eq("company_id", ctx.companyId)
      .single();

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const units = await getUnits(supabase, id);
    return NextResponse.json(units);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the property belongs to the user's company
    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("id", id)
      .eq("company_id", ctx.companyId)
      .single();

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const body = await request.json();

    if (!body.unit_number || !body.unit_number.trim()) {
      return NextResponse.json(
        { error: "Unit number is required." },
        { status: 400 }
      );
    }

    const validTypes = ["studio", "1br", "2br", "3br", "office", "retail", "warehouse"];
    if (!body.unit_type || !validTypes.includes(body.unit_type)) {
      return NextResponse.json(
        { error: "Valid unit type is required." },
        { status: 400 }
      );
    }

    const unit = await createUnit(supabase, ctx.companyId, id, {
      unit_number: body.unit_number.trim(),
      unit_type: body.unit_type,
      sqft: body.sqft ?? null,
      bedrooms: body.bedrooms ?? null,
      bathrooms: body.bathrooms ?? null,
      floor_number: body.floor_number ?? null,
      market_rent: body.market_rent ?? null,
      status: body.status ?? "vacant",
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
