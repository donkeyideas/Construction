import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGateway } from "@/lib/payments";

/**
 * POST /api/payments/gateway/onboard
 * Save the company's own payment gateway API keys.
 * Body: { provider: "stripe", credentials: { secret_key: "sk_...", webhook_secret?: "whsec_..." } }
 * Validates the key with the provider, then stores it.
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
    const { provider, credentials } = body;

    if (!provider || !credentials?.secret_key) {
      return NextResponse.json(
        { error: "provider and credentials.secret_key are required" },
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

    // Validate the API key with the provider
    const validation = await gateway.validateCredentials(credentials);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Invalid credentials" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();

    // Upsert gateway config with the company's own keys
    await admin.from("payment_gateway_config").upsert(
      {
        company_id: ctx.companyId,
        provider,
        is_active: true,
        account_id: validation.accountName || provider,
        config: credentials,
        onboarded_at: now,
        updated_at: now,
      },
      { onConflict: "company_id,provider" }
    );

    // Auto-create "online_payment" method for all company properties
    const { data: properties } = await admin
      .from("properties")
      .select("id")
      .eq("company_id", ctx.companyId);

    if (properties && properties.length > 0) {
      for (const prop of properties) {
        const { data: existing } = await admin
          .from("property_payment_methods")
          .select("id")
          .eq("property_id", prop.id)
          .eq("method_type", "online_payment")
          .limit(1)
          .single();

        if (!existing) {
          await admin.from("property_payment_methods").insert({
            company_id: ctx.companyId,
            property_id: prop.id,
            method_type: "online_payment",
            label: "Pay Online",
            instructions: "Pay securely with card or bank transfer.",
            is_enabled: true,
            display_order: 0,
          });
        } else {
          await admin
            .from("property_payment_methods")
            .update({ is_enabled: true })
            .eq("id", existing.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      accountName: validation.accountName,
    });
  } catch (err) {
    console.error("Gateway setup error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
