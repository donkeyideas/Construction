import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProperties, createProperty, createUnit } from "@/lib/queries/properties";
import { checkPlanLimit, planLimitError } from "@/lib/utils/plan-limits";
import { checkSubscriptionAccess } from "@/lib/guards/subscription-guard";
import { generatePropertyPurchaseJournalEntry } from "@/lib/utils/invoice-accounting";

const DEFAULT_UNIT_TYPE_BY_PROPERTY: Record<string, string> = {
  residential: "1br",
  commercial: "office",
  industrial: "warehouse",
  mixed_use: "1br",
};

/**
 * Generate unit numbers based on total units and optional floor count.
 * With floors: 101, 102, 201, 202, …  (floor * 100 + unit_on_floor)
 * Without floors: 101, 102, 103, …
 */
function generateUnitNumbers(total: number, floors: number | null): string[] {
  const numbers: string[] = [];

  if (floors && floors > 1) {
    const perFloor = Math.ceil(total / floors);
    outer: for (let f = 1; f <= floors; f++) {
      for (let u = 1; u <= perFloor; u++) {
        numbers.push(`${f}${String(u).padStart(2, "0")}`);
        if (numbers.length >= total) break outer;
      }
    }
  } else {
    for (let i = 1; i <= total; i++) {
      numbers.push(String(100 + i)); // 101, 102, 103 …
    }
  }

  return numbers;
}

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

    const subBlock = await checkSubscriptionAccess(ctx.companyId, "POST");
    if (subBlock) return subBlock;

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

    const totalUnits: number = body.total_units ?? 0;

    const property = await createProperty(supabase, ctx.companyId, {
      name: body.name,
      property_type: body.property_type,
      address_line1: body.address_line1,
      city: body.city,
      state: body.state,
      zip: body.zip,
      year_built: body.year_built ?? null,
      total_sqft: body.total_sqft ?? null,
      total_units: totalUnits,
      purchase_price: body.purchase_price ?? null,
      land_value: body.land_value ?? null,
      current_value: body.current_value ?? null,
    });

    // ── Auto-generate purchase journal entry ───────────────────────
    const purchasePrice = body.purchase_price ? Number(body.purchase_price) : 0;
    if (purchasePrice > 0) {
      const financingMethod: "cash" | "mortgage" =
        body.financing_method === "cash" ? "cash" : "mortgage";
      // Non-blocking — JE failure doesn't block property creation
      generatePropertyPurchaseJournalEntry(supabase, ctx.companyId, ctx.userId, {
        id: property.id,
        name: property.name,
        purchase_price: purchasePrice,
      }, financingMethod).catch((err) =>
        console.warn("[property-JE] Failed to generate purchase JE:", err)
      );
    }

    // ── Auto-create placeholder units ──────────────────────────────
    if (totalUnits > 0) {
      const unitType: string =
        body.default_unit_type ||
        DEFAULT_UNIT_TYPE_BY_PROPERTY[body.property_type as string] ||
        "1br";
      const floors: number | null = body.floors ? Number(body.floors) : null;
      const sqftPerUnit: number | null = body.default_sqft_per_unit
        ? Number(body.default_sqft_per_unit)
        : null;
      const marketRent: number | null = body.default_market_rent
        ? Number(body.default_market_rent)
        : null;

      const unitNumbers = generateUnitNumbers(totalUnits, floors);

      // Create all units — errors are non-fatal (property still returns)
      await Promise.allSettled(
        unitNumbers.map((unitNumber, idx) =>
          createUnit(supabase, ctx.companyId, property.id, {
            unit_number: unitNumber,
            unit_type: unitType,
            sqft: sqftPerUnit,
            market_rent: marketRent,
            floor_number: floors && floors > 1 ? Math.floor(idx / Math.ceil(totalUnits / floors)) + 1 : null,
            status: "vacant",
          })
        )
      );
    }

    return NextResponse.json(property, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
