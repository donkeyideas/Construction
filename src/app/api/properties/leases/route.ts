import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  buildCompanyAccountMap,
  generateLeaseRevenueSchedule,
  generateSecurityDepositJournalEntry,
} from "@/lib/utils/invoice-accounting";
import { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Helpers – sync unit status & property occupancy after lease changes
// ---------------------------------------------------------------------------

/** Mark a unit as occupied/vacant and update the property's occupied_units count. */
async function syncUnitAndProperty(
  supabase: SupabaseClient,
  unitId: string,
  propertyId: string,
  status: "occupied" | "vacant",
  tenantName: string | null
) {
  // 1. Update the unit
  await supabase
    .from("units")
    .update({
      status,
      current_tenant_id: null, // we don't have a tenant user_id, just the name
      metadata: tenantName ? { tenant_name: tenantName } : {},
    })
    .eq("id", unitId);

  // 2. Recalculate occupied_units on the property
  await refreshPropertyOccupancy(supabase, propertyId);
}

/** Recount occupied units and update the property row. */
async function refreshPropertyOccupancy(
  supabase: SupabaseClient,
  propertyId: string
) {
  const { count } = await supabase
    .from("units")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId)
    .eq("status", "occupied");

  await supabase
    .from("properties")
    .update({ occupied_units: count ?? 0 })
    .eq("id", propertyId);
}

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

    // Validate date order: end must be after start
    if (body.lease_end <= body.lease_start) {
      return NextResponse.json(
        { error: "Lease end date must be after the start date." },
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

    // ── Mark unit as occupied & update property occupancy ────────────
    await syncUnitAndProperty(
      supabase,
      body.unit_id,
      unit.property_id,
      "occupied",
      body.tenant_name.trim()
    );

    // Generate lease JEs: revenue schedule + security deposit
    // Must be awaited (not fire-and-forget) to ensure all months are generated
    // before the serverless function exits.
    try {
      const accountMap = await buildCompanyAccountMap(supabase, userCtx.companyId);

      // Security deposit JE: DR Cash / CR Security Deposits Held (fast, single JE)
      if (body.security_deposit && Number(body.security_deposit) > 0) {
        await generateSecurityDepositJournalEntry(supabase, userCtx.companyId, userCtx.userId, {
          leaseId: lease.id,
          amount: Number(body.security_deposit),
          tenantName: body.tenant_name.trim(),
          date: body.lease_start,
        }, accountMap);
      }

      // Revenue schedule: monthly accrual JEs from lease_start to lease_end
      const result = await generateLeaseRevenueSchedule(supabase, userCtx.companyId, userCtx.userId, {
        id: lease.id,
        property_id: unit.property_id,
        tenant_name: body.tenant_name.trim(),
        monthly_rent: Number(body.monthly_rent),
        lease_start: body.lease_start,
        lease_end: body.lease_end,
      }, accountMap);
      console.log("[lease-create] Revenue schedule:", result);
    } catch (jeErr) {
      console.error("[lease-create] JE generation failed:", jeErr);
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
      .select("id, unit_id, property_id, tenant_name, status")
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

    // ── Sync unit status when lease status changes ──────────────────
    const newStatus = updates.status as string | undefined;
    if (newStatus) {
      const wasActive = existingLease.status === "active";
      const isNowActive = newStatus === "active";

      if (wasActive && !isNowActive) {
        // Lease deactivated → mark unit vacant
        await syncUnitAndProperty(
          supabase,
          existingLease.unit_id,
          existingLease.property_id,
          "vacant",
          null
        );

        // ── Delete future rent accrual JEs when lease is terminated/expired ──
        if (newStatus === "terminated" || newStatus === "expired") {
          const today = new Date().toISOString().slice(0, 10);
          const leaseId = existingLease.id;

          // NULL out FK references in future schedule rows before deleting JEs
          await supabase
            .from("lease_revenue_schedule")
            .update({ accrual_je_id: null, recognition_je_id: null, collection_je_id: null })
            .eq("lease_id", leaseId)
            .gt("schedule_date", today);

          // Delete future JEs directly with .like()
          for (const pattern of [
            `rent:accrual:${leaseId}:%`,
            `lease_accrual:${leaseId}:%`,
            `lease_recognition:${leaseId}:%`,
          ]) {
            await supabase
              .from("journal_entries")
              .delete()
              .eq("company_id", userCtx.companyId)
              .like("reference", pattern)
              .gt("entry_date", today);
          }

          // Delete future schedule rows
          await supabase
            .from("lease_revenue_schedule")
            .delete()
            .eq("lease_id", leaseId)
            .gt("schedule_date", today);
        }
      } else if (!wasActive && isNowActive) {
        // Lease reactivated → mark unit occupied
        await syncUnitAndProperty(
          supabase,
          existingLease.unit_id,
          existingLease.property_id,
          "occupied",
          updated.tenant_name
        );
      }
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

    // Fetch the lease to get unit_id and property_id before deleting
    const { data: existingLease } = await supabase
      .from("leases")
      .select("id, unit_id, property_id, status")
      .eq("id", body.id)
      .eq("company_id", userCtx.companyId)
      .single();

    if (!existingLease) {
      return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    }

    const leaseId = existingLease.id;

    // ── Step 1: Null out FK refs in lease_revenue_schedule ──────────
    // These columns reference journal_entries WITHOUT ON DELETE CASCADE,
    // so we must clear them before deleting the JEs.
    const { error: nullErr } = await supabase
      .from("lease_revenue_schedule")
      .update({ accrual_je_id: null, recognition_je_id: null, collection_je_id: null })
      .eq("lease_id", leaseId);

    if (nullErr) {
      console.error("[lease-delete] Failed to null FK refs in schedule:", nullErr);
    }

    // ── Step 2: Delete ALL journal entries linked to this lease ──────
    // Use .like() directly on DELETE (no SELECT+IN needed, avoids row limits).
    const likePatterns = [
      `rent:accrual:${leaseId}:%`,
      `lease_accrual:${leaseId}:%`,
      `lease_recognition:${leaseId}:%`,
    ];

    for (const pattern of likePatterns) {
      const { error: delErr } = await supabase
        .from("journal_entries")
        .delete()
        .eq("company_id", userCtx.companyId)
        .like("reference", pattern);

      if (delErr) {
        console.error(`[lease-delete] Failed to delete JEs (LIKE ${pattern}):`, delErr);
      }
    }

    // Exact-match patterns (security deposit, etc.)
    for (const ref of [`lease:${leaseId}`]) {
      const { error: delErr } = await supabase
        .from("journal_entries")
        .delete()
        .eq("company_id", userCtx.companyId)
        .eq("reference", ref);

      if (delErr) {
        console.error(`[lease-delete] Failed to delete JE (ref=${ref}):`, delErr);
      }
    }

    // ── Step 3: Delete the lease (cascades to lease_revenue_schedule, rent_payments) ──
    const { error } = await supabase.from("leases").delete().eq("id", body.id);

    if (error) {
      console.error("Delete lease error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ── Mark unit as vacant if the deleted lease was active ──────────
    if (existingLease.status === "active") {
      await syncUnitAndProperty(
        supabase,
        existingLease.unit_id,
        existingLease.property_id,
        "vacant",
        null
      );
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
