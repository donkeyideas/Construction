import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getGateway } from "@/lib/payments";

/**
 * POST /api/payments/gateway/onboard
 * Start the payment gateway onboarding flow.
 * Body: { provider: "stripe" }
 * Returns: { url } for frontend redirect
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["owner", "admin"].includes(ctx.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { provider } = body;

    if (!provider) {
      return NextResponse.json(
        { error: "provider is required" },
        { status: 400 }
      );
    }

    const gateway = getGateway(provider);
    if (!gateway) {
      return NextResponse.json(
        { error: `Provider "${provider}" is not supported` },
        { status: 400 }
      );
    }

    const origin = request.headers.get("origin") || "";
    const returnUrl = `${origin}/api/payments/gateway/callback?provider=${provider}`;
    const refreshUrl = `${origin}/api/payments/gateway/onboard?provider=${provider}&refresh=1`;

    const result = await gateway.createOnboardingUrl(
      ctx.companyId,
      returnUrl,
      refreshUrl
    );

    if (!result) {
      return NextResponse.json(
        { error: "Payment provider not configured. Check platform settings." },
        { status: 503 }
      );
    }

    return NextResponse.json({ url: result.url, accountId: result.accountId });
  } catch (err) {
    console.error("Gateway onboard error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
