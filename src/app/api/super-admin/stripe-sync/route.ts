import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { getStripeInstance } from "@/lib/stripe/config";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// POST /api/super-admin/stripe-sync
// Creates Stripe Products + Prices for each pricing tier, saves IDs to DB,
// and configures the Stripe Customer Portal.
// ---------------------------------------------------------------------------

export async function POST() {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const stripe = await getStripeInstance();
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured. Add keys in Super Admin > Stripe Settings." },
        { status: 503 }
      );
    }

    const admin = createAdminClient();

    // Fetch all pricing tiers
    const { data: tiers, error: tierError } = await admin
      .from("pricing_tiers")
      .select("*")
      .order("sort_order", { ascending: true });

    if (tierError || !tiers || tiers.length === 0) {
      return NextResponse.json(
        { error: "No pricing tiers found. Create tiers first." },
        { status: 400 }
      );
    }

    const syncedTiers = [];
    const portalProducts: { product: string; prices: string[] }[] = [];

    for (const tier of tiers) {
      let productId = tier.stripe_product_id;

      // 1. Create or update Stripe Product
      if (productId) {
        try {
          await stripe.products.update(productId, {
            name: `Buildwrk ${tier.name}`,
            metadata: { tier_id: tier.id, plan: tier.name.toLowerCase() },
          });
        } catch {
          // Product may have been deleted in Stripe — recreate
          productId = null;
        }
      }

      if (!productId) {
        const product = await stripe.products.create({
          name: `Buildwrk ${tier.name}`,
          metadata: { tier_id: tier.id, plan: tier.name.toLowerCase() },
        });
        productId = product.id;
      }

      // 2. Create Stripe Price (monthly)
      const monthlyPrice = await stripe.prices.create({
        product: productId,
        unit_amount: Math.round((tier.monthly_price || 0) * 100),
        currency: "usd",
        recurring: { interval: "month" },
        metadata: { tier_id: tier.id, billing: "monthly" },
      });

      // 3. Create Stripe Price (annual)
      const annualPrice = await stripe.prices.create({
        product: productId,
        unit_amount: Math.round((tier.annual_price || tier.monthly_price || 0) * 100 * 12),
        currency: "usd",
        recurring: { interval: "year" },
        metadata: { tier_id: tier.id, billing: "annual" },
      });

      // 4. Save IDs to DB
      const { error: updateError } = await admin
        .from("pricing_tiers")
        .update({
          stripe_product_id: productId,
          stripe_price_id_monthly: monthlyPrice.id,
          stripe_price_id_annual: annualPrice.id,
        })
        .eq("id", tier.id);

      if (updateError) {
        console.error(`Failed to update tier ${tier.name}:`, updateError);
      }

      syncedTiers.push({
        ...tier,
        stripe_product_id: productId,
        stripe_price_id_monthly: monthlyPrice.id,
        stripe_price_id_annual: annualPrice.id,
      });

      portalProducts.push({
        product: productId,
        prices: [monthlyPrice.id, annualPrice.id],
      });
    }

    // 5. Configure Customer Portal
    try {
      await stripe.billingPortal.configurations.create({
        business_profile: {
          headline: "Manage your Buildwrk subscription",
        },
        features: {
          subscription_cancel: { enabled: true },
          subscription_update: {
            enabled: true,
            default_allowed_updates: ["price"],
            products: portalProducts,
          },
          payment_method_update: { enabled: true },
          invoice_history: { enabled: true },
        },
      });
    } catch (portalErr) {
      // Non-fatal — portal config may already exist or require dashboard setup
      console.warn("Customer Portal configuration warning:", portalErr);
    }

    return NextResponse.json({ synced: true, tiers: syncedTiers });
  } catch (err) {
    console.error("POST /api/super-admin/stripe-sync error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to sync with Stripe" },
      { status: 500 }
    );
  }
}
