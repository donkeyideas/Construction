import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProperties, createProperty } from "@/lib/queries/properties";
import { checkPlanLimit, planLimitError } from "@/lib/utils/plan-limits";

export async function GET() {
  try {
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const properties = await getProperties(supabase, ctx.companyId);
    return NextResponse.json(properties);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Enforce plan limit on properties
    const limitCheck = await checkPlanLimit(supabase, ctx.companyId, "properties");
    if (!limitCheck.allowed) return planLimitError(limitCheck);

    const body = await request.json();

    // Validate required fields
    const required = ["name", "property_type", "address_line1", "city", "state", "zip"];
    for (const field of required) {
      if (!body[field] || (typeof body[field] === "string" && !body[field].trim())) {
        return NextResponse.json(
          { error: `Field "${field}" is required.` },
          { status: 400 }
        );
      }
    }

    const validTypes = ["residential", "commercial", "industrial", "mixed_use"];
    if (!validTypes.includes(body.property_type)) {
      return NextResponse.json(
        { error: "Invalid property type." },
        { status: 400 }
      );
    }

    const property = await createProperty(supabase, ctx.companyId, {
      name: body.name,
      property_type: body.property_type,
      address_line1: body.address_line1,
      city: body.city,
      state: body.state,
      zip: body.zip,
      year_built: body.year_built ?? null,
      total_sqft: body.total_sqft ?? null,
      total_units: body.total_units ?? 0,
      purchase_price: body.purchase_price ?? null,
      current_value: body.current_value ?? null,
    });

    return NextResponse.json(property, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
