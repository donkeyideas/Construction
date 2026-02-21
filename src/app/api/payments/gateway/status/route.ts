import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getCompanyGatewayConfig } from "@/lib/payments";
import { getGateway } from "@/lib/payments";

/**
 * POST /api/payments/gateway/status
 * Returns the company's payment gateway configuration and live account status.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await getCompanyGatewayConfig(ctx.companyId);

    if (!config) {
      return NextResponse.json({
        hasGateway: false,
        provider: null,
        isActive: false,
        accountStatus: null,
      });
    }

    // If we have an account_id, check live status with the provider
    let accountStatus = null;
    if (config.account_id) {
      const gateway = getGateway(config.provider);
      if (gateway) {
        accountStatus = await gateway.getAccountStatus(config.account_id);
      }
    }

    return NextResponse.json({
      hasGateway: true,
      provider: config.provider,
      isActive: config.is_active,
      onboardedAt: config.onboarded_at,
      accountStatus,
    });
  } catch (err) {
    console.error("Gateway status error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
