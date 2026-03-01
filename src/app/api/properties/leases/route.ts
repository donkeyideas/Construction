import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  buildCompanyAccountMap,
  generateLeaseRevenueSchedule,
  generateSecurityDepositJournalEntry,
} from "@/lib/utils/invoice-accounting";

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

    // Look up the unit to get the property_id — also verify it belongs to this company
    const { data: unit, error: unitError } = await supabase
      .from("units")
      .select("property_id, company_id")
      .eq("id", body.unit_id)
      .single();

    if (unitError || !unit) {
      return NextResponse.json(
        { error: "Invalid unit selected." },
        { status: 400 }
      );
    }

    if (unit.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Unit does not belong to your company." },
        { status: 403 }
      );
    }

    const { data: lease, error } = await supabase
      .from("leases")
      .insert({
        company_id: userCtx.companyId,
        property_id: unit.property_id,
        unit_id: body.unit_id,
        tenant_name: body.tenant_name.trim(),
        tenant_email: body.tenant_email || null,
        tenant_phone: body.tenant_phone || null,
        lease_start: body.lease_start,
        lease_end: body.lease_end,
        monthly_rent: Number(body.monthly_rent),
        security_deposit: body.security_deposit ? Number(body.security_deposit) : null,
        auto_renew: body.auto_renew === true,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("Create lease error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Generate lease revenue schedule + security deposit JE
    try {
      const accountMap = await buildCompanyAccountMap(supabase, userCtx.companyId);

      // Revenue schedule: monthly accrual JEs from lease_start to lease_end
      await generateLeaseRevenueSchedule(supabase, userCtx.companyId, userCtx.userId, {
        id: lease.id,
        property_id: unit.property_id,
        tenant_name: body.tenant_name.trim(),
        monthly_rent: Number(body.monthly_rent),
        lease_start: body.lease_start,
        lease_end: body.lease_end,
      }, accountMap);

      // Security deposit JE: DR Cash / CR Security Deposits Held
      if (body.security_deposit && Number(body.security_deposit) > 0) {
        await generateSecurityDepositJournalEntry(supabase, userCtx.companyId, userCtx.userId, {
          leaseId: lease.id,
          amount: Number(body.security_deposit),
          tenantName: body.tenant_name.trim(),
          date: body.lease_start,
        }, accountMap);
      }
    } catch (jeErr) {
      console.warn("Lease JE generation failed (non-blocking):", jeErr);
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

// ---------------------------------------------------------------------------
// PATCH /api/properties/leases - Update an existing lease
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Lease id is required." },
        { status: 400 }
      );
    }

    // Verify the lease exists and belongs to the user's company
    const { data: existingLease } = await supabase
      .from("leases")
      .select("id")
      .eq("id", body.id)
      .eq("company_id", userCtx.companyId)
      .single();

    if (!existingLease) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    // Allow only specific updatable fields
    const allowedFields = [
      "tenant_name",
      "tenant_email",
      "tenant_phone",
      "monthly_rent",
      "security_deposit",
      "lease_start",
      "lease_end",
      "status",
      "auto_renew",
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update." },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("leases")
      .update(updates)
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      console.error("Update lease error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/properties/leases error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/properties/leases - Delete a lease
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Lease id is required." },
        { status: 400 }
      );
    }

    // Verify the lease exists and belongs to the user's company
    const { data: existingLease } = await supabase
      .from("leases")
      .select("id")
      .eq("id", body.id)
      .eq("company_id", userCtx.companyId)
      .single();

    if (!existingLease) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    const { error } = await supabase.from("leases").delete().eq("id", body.id);

    if (error) {
      console.error("Delete lease error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/properties/leases error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
