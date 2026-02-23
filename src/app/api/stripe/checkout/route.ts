import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getStripeInstance } from "@/lib/stripe/config";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// POST /api/stripe/checkout - Create a Stripe Checkout session
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const stripe = await getStripeInstance();
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured. Add keys in Super Admin > Stripe Settings." },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const plan = body.plan as string;
    const billing = (body.billing as string) || "monthly"; // "monthly" or "annual"

    // Look up Stripe price ID from pricing_tiers table
    const admin = createAdminClient();

    const { data: tier } = await admin
      .from("pricing_tiers")
      .select("id, name, monthly_price, annual_price, stripe_price_id_monthly, stripe_price_id_annual")
      .ilike("name", plan)
      .single();

    // Choose price based on billing interval
    let priceId = billing === "annual"
      ? tier?.stripe_price_id_annual
      : tier?.stripe_price_id_monthly;

    // Fallback to env vars for monthly
    if (!priceId && billing === "monthly") {
      priceId = (plan === "professional" ? process.env.STRIPE_PRICE_PROFESSIONAL : undefined)
        || (plan === "enterprise" ? process.env.STRIPE_PRICE_ENTERPRISE : undefined);
    }

    // Auto-create Stripe Product + Price if tier exists but price ID is missing
    if (!priceId && tier) {
      const unitPrice = billing === "annual"
        ? (tier.annual_price || tier.monthly_price || 0)
        : (tier.monthly_price || 0);

      if (unitPrice > 0) {
        const product = await stripe.products.create({
          name: `Buildwrk ${tier.name}`,
          metadata: { tier_id: tier.id, plan: plan.toLowerCase() },
        });

        const interval = billing === "annual" ? "year" : "month";
        const amount = billing === "annual"
          ? Math.round(unitPrice * 100 * 12) // annual_price is per-month, multiply by 12
          : Math.round(unitPrice * 100);

        const newPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: amount,
          currency: "usd",
          recurring: { interval },
          metadata: { tier_id: tier.id, billing },
        });

        priceId = newPrice.id;

        // Persist price ID back to DB (best-effort)
        const updateField = billing === "annual"
          ? { stripe_price_id_annual: newPrice.id }
          : { stripe_price_id_monthly: newPrice.id };
        admin.from("pricing_tiers").update(updateField).eq("id", tier.id).then(() => {});
      }
    }

    if (!priceId) {
      return NextResponse.json(
        { error: `No Stripe price configured for plan: ${plan}. Set it in Super Admin > Pricing Tiers.` },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const { data: company } = await supabase
      .from("companies")
      .select("stripe_customer_id, name")
      .eq("id", userCtx.companyId)
      .single();

    let customerId = company?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { company_id: userCtx.companyId },
        name: company?.name || undefined,
      });
      customerId = customer.id;

      await supabase
        .from("companies")
        .update({ stripe_customer_id: customerId })
        .eq("id", userCtx.companyId);
    }

    const origin = request.headers.get("origin") || "https://construction-gamma-six.vercel.app";
    const embedded = body.embedded === true;

    if (embedded) {
      // Embedded checkout — returns client_secret for in-page rendering
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        ui_mode: "embedded",
        return_url: `${origin}/admin/settings?tab=subscription&success=true&session_id={CHECKOUT_SESSION_ID}`,
        metadata: { company_id: userCtx.companyId, plan },
      });

      return NextResponse.json({ clientSecret: session.client_secret });
    }

    // Hosted checkout — redirects to Stripe
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/admin/settings?tab=subscription&success=true`,
      cancel_url: `${origin}/admin/settings?tab=subscription`,
      metadata: { company_id: userCtx.companyId, plan },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("POST /api/stripe/checkout error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
