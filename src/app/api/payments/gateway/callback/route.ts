import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGateway } from "@/lib/payments";

/**
 * GET /api/payments/gateway/callback?provider=stripe
 * Handle the return from the provider's onboarding flow.
 * Checks account status, activates if ready, and redirects to the properties page.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);
    if (!ctx) {
      // Session expired during onboarding — redirect to login
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const provider =
      request.nextUrl.searchParams.get("provider") || "stripe";
    const admin = createAdminClient();

    // Get the stored config for this provider
    const { data: config } = await admin
      .from("payment_gateway_config")
      .select("*")
      .eq("company_id", ctx.companyId)
      .eq("provider", provider)
      .single();

    if (!config?.account_id) {
      return NextResponse.redirect(
        new URL("/properties?gateway=error", request.url)
      );
    }

    // Check if onboarding was completed
    const gateway = getGateway(provider);
    if (!gateway) {
      return NextResponse.redirect(
        new URL("/properties?gateway=error", request.url)
      );
    }

    const status = await gateway.getAccountStatus(config.account_id);

    if (status.chargesEnabled && status.detailsSubmitted) {
      // Onboarding complete — activate
      const now = new Date().toISOString();
      await admin
        .from("payment_gateway_config")
        .update({
          is_active: true,
          onboarded_at: now,
          updated_at: now,
        })
        .eq("company_id", ctx.companyId)
        .eq("provider", provider);

      // Auto-create "online_payment" method for all company properties
      const { data: properties } = await admin
        .from("properties")
        .select("id")
        .eq("company_id", ctx.companyId);

      if (properties && properties.length > 0) {
        for (const prop of properties) {
          // Check if already exists
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
            // Re-enable if it was disabled
            await admin
              .from("property_payment_methods")
              .update({ is_enabled: true })
              .eq("id", existing.id);
          }
        }
      }

      return NextResponse.redirect(
        new URL("/properties?gateway=connected", request.url)
      );
    }

    // Onboarding not yet complete
    return NextResponse.redirect(
      new URL("/properties?gateway=pending", request.url)
    );
  } catch (err) {
    console.error("Gateway callback error:", err);
    return NextResponse.redirect(
      new URL("/properties?gateway=error", request.url)
    );
  }
}
