import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { syncPropertyFinancials } from "@/lib/queries/properties";

/**
 * POST /api/automation/sync-property-financials
 *
 * Generates rent_payments + invoices from active leases and maintenance.
 * Called automatically after lease/maintenance imports.
 *
 * Body (optional): { property_id?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const propertyId = body.property_id || null;

    const result = await syncPropertyFinancials(supabase, ctx.companyId, propertyId);

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("POST /api/automation/sync-property-financials error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
