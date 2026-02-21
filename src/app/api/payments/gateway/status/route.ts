import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getCompanyGatewayConfig, getGateway } from "@/lib/payments";
import type { GatewayCredentials } from "@/lib/payments";

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

    // If active, check credentials are still valid
    let accountStatus = null;
    const credentials = (config.config || {}) as GatewayCredentials;
    if (config.is_active && credentials.secret_key) {
      const gateway = getGateway(config.provider);
      if (gateway) {
        accountStatus = await gateway.getAccountStatus(credentials);
      }
    }

    return NextResponse.json({
      hasGateway: true,
      provider: config.provider,
      isActive: config.is_active,
      onboardedAt: config.onboarded_at,
      accountName: config.account_id,
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
