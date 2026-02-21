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

    // Auto-create GL clearing account for this payment provider
    const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1);
    const clearingAccountName = `${providerLabel} Clearing`;

    const { data: existingAccount } = await admin
      .from("chart_of_accounts")
      .select("id")
      .eq("company_id", ctx.companyId)
      .eq("name", clearingAccountName)
      .limit(1)
      .single();

    if (!existingAccount) {
      // Find the next available account number in the 1xxx range (assets)
      const { data: maxAccount } = await admin
        .from("chart_of_accounts")
        .select("account_number")
        .eq("company_id", ctx.companyId)
        .gte("account_number", "1050")
        .lte("account_number", "1099")
        .order("account_number", { ascending: false })
        .limit(1)
        .single();

      const nextNum = maxAccount
        ? String(parseInt(maxAccount.account_number, 10) + 1)
        : "1060";

      await admin.from("chart_of_accounts").insert({
        company_id: ctx.companyId,
        account_number: nextNum,
        name: clearingAccountName,
        account_type: "asset",
        sub_type: "current_asset",
        is_active: true,
        description: `Clearing account for ${providerLabel} online payments. Funds received via ${providerLabel} before deposit.`,
        normal_balance: "debit",
      });
    }

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
