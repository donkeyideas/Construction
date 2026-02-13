import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// POST /api/properties/leases - Create a new lease
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.unit_id) {
      return NextResponse.json(
        { error: "Unit is required." },
        { status: 400 }
      );
    }

    if (!body.tenant_name || typeof body.tenant_name !== "string" || !body.tenant_name.trim()) {
      return NextResponse.json(
        { error: "Tenant name is required." },
        { status: 400 }
      );
    }

    if (!body.monthly_rent || Number(body.monthly_rent) <= 0) {
      return NextResponse.json(
        { error: "Monthly rent is required and must be greater than 0." },
        { status: 400 }
      );
    }

    if (!body.lease_start) {
      return NextResponse.json(
        { error: "Lease start date is required." },
        { status: 400 }
      );
    }

    if (!body.lease_end) {
      return NextResponse.json(
        { error: "Lease end date is required." },
        { status: 400 }
      );
    }

    // Look up the unit to get the property_id
    const { data: unit, error: unitError } = await supabase
      .from("units")
      .select("property_id")
      .eq("id", body.unit_id)
      .single();

    if (unitError || !unit) {
      return NextResponse.json(
        { error: "Invalid unit selected." },
        { status: 400 }
      );
    }

    const { data: lease, error } = await supabase
      .from("leases")
      .insert({
        company_id: userCtx.companyId,
        property_id: unit.property_id,
        unit_id: body.unit_id,
        tenant_name: body.tenant_name.trim(),
        lease_start: body.lease_start,
        lease_end: body.lease_end,
        monthly_rent: Number(body.monthly_rent),
        security_deposit: body.security_deposit ? Number(body.security_deposit) : null,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("Create lease error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(lease, { status: 201 });
  } catch (err) {
    console.error("POST /api/properties/leases error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
