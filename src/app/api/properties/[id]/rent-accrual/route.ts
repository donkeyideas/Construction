import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { generateAllRentAccrualJEs } from "@/lib/utils/lease-accounting";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/properties/[id]/rent-accrual
 * Generate all missing monthly rent accrual JEs for every active/expired
 * lease on this property, from lease_start up to today.
 * Idempotent — safe to call multiple times.
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify property belongs to this company
    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("id", id)
      .eq("company_id", ctx.companyId)
      .single();

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Fetch all active and expired leases for this property
    const { data: leases, error: leaseErr } = await supabase
      .from("leases")
      .select("id, tenant_name, monthly_rent, lease_start, lease_end, property_id")
      .eq("property_id", id)
      .eq("company_id", ctx.companyId)
      .in("status", ["active", "expired"]);

    if (leaseErr) {
      return NextResponse.json({ error: leaseErr.message }, { status: 500 });
    }

    if (!leases || leases.length === 0) {
      return NextResponse.json({ success: true, totalCreated: 0, totalSkipped: 0, leases: [] });
    }

    const result = await generateAllRentAccrualJEs(supabase, ctx.companyId, ctx.userId, leases);

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/properties/[id]/rent-accrual
 * Delete all rent accrual JEs for this property (reset).
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("id", id)
      .eq("company_id", ctx.companyId)
      .single();

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Get all lease IDs for this property
    const { data: leases } = await supabase
      .from("leases")
      .select("id")
      .eq("property_id", id)
      .eq("company_id", ctx.companyId);

    let deleted = 0;

    if (leases && leases.length > 0) {
      for (const lease of leases) {
        const { data: jes } = await supabase
          .from("journal_entries")
          .select("id")
          .eq("company_id", ctx.companyId)
          .like("reference", `rent:accrual:${lease.id}:%`);

        if (jes && jes.length > 0) {
          await supabase
            .from("journal_entries")
            .delete()
            .in("id", jes.map((j) => j.id));
          deleted += jes.length;
        }
      }
    }

    return NextResponse.json({ success: true, deleted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
