import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getStripeInstance } from "@/lib/stripe/config";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// POST /api/stripe/sync-subscription
// Checks the company's Stripe customer for active subscriptions and syncs
// the subscription_plan, subscription_status, and stripe_subscription_id
// back to the companies table. Called after checkout success redirect.
// ---------------------------------------------------------------------------

export async function POST() {
  try {
    const stripe = await getStripeInstance();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get the company's Stripe customer ID
    const { data: company } = await admin
      .from("companies")
      .select("stripe_customer_id, subscription_plan, subscription_status")
      .eq("id", userCtx.companyId)
      .single();

    if (!company?.stripe_customer_id) {
      return NextResponse.json({ error: "No Stripe customer" }, { status: 400 });
    }

    // Fetch all active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: company.stripe_customer_id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      // Also check for trialing
      const trialSubs = await stripe.subscriptions.list({
        customer: company.stripe_customer_id,
        status: "trialing",
        limit: 1,
      });
      if (trialSubs.data.length === 0) {
        return NextResponse.json({ synced: false, message: "No active subscription found" });
      }
      subscriptions.data = trialSubs.data;
    }

    const sub = subscriptions.data[0];
    const priceId = sub.items.data[0]?.price?.id;

    // Look up which plan this price belongs to
    let plan = company.subscription_plan || "starter";

    if (priceId) {
      const { data: tier } = await admin
        .from("pricing_tiers")
        .select("name")
        .eq("stripe_price_id_monthly", priceId)
        .single();

      if (tier) {
        plan = tier.name.toLowerCase();
      } else {
        // Try annual price
        const { data: tierAnnual } = await admin
          .from("pricing_tiers")
          .select("name")
          .eq("stripe_price_id_annual", priceId)
          .single();

        if (tierAnnual) {
          plan = tierAnnual.name.toLowerCase();
        } else {
          // Fallback: check price metadata
          const price = await stripe.prices.retrieve(priceId);
          if (price.metadata?.tier_id) {
            const { data: tierById } = await admin
              .from("pricing_tiers")
              .select("name")
              .eq("id", price.metadata.tier_id)
              .single();
            if (tierById) {
              plan = tierById.name.toLowerCase();
            }
          }
        }
      }
    }

    // Update company
    const { error: updateError } = await admin
      .from("companies")
      .update({
        subscription_plan: plan,
        subscription_status: sub.status === "active" ? "active" : sub.status,
        stripe_subscription_id: sub.id,
        trial_ends_at: null, // Clear trial since they've subscribed
        updated_at: new Date().toISOString(),
      })
      .eq("id", userCtx.companyId);

    if (updateError) {
      console.error("Failed to sync subscription:", updateError);
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json({
      synced: true,
      plan,
      status: sub.status,
      subscription_id: sub.id,
    });
  } catch (err) {
    console.error("POST /api/stripe/sync-subscription error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
