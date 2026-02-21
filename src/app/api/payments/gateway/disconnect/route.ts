import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCompanyGatewayConfig, getGateway } from "@/lib/payments";

/**
 * POST /api/payments/gateway/disconnect
 * Disconnect the company's active payment gateway.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["owner", "admin"].includes(ctx.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const config = await getCompanyGatewayConfig(ctx.companyId);
    if (!config) {
      return NextResponse.json({ error: "No gateway configured" }, { status: 400 });
    }

    // Disconnect via the provider
    const gateway = getGateway(config.provider);
    if (gateway) {
      await gateway.disconnect(ctx.companyId);
    }

    // Disable all online_payment methods for the company's properties
    const admin = createAdminClient();
    await admin
      .from("property_payment_methods")
      .update({ is_enabled: false })
      .eq("company_id", ctx.companyId)
      .eq("method_type", "online_payment");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Gateway disconnect error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
