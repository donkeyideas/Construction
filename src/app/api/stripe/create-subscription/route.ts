import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getStripeInstance } from "@/lib/stripe/config";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// POST /api/stripe/create-subscription
// Creates a Stripe Subscription with payment_behavior='default_incomplete'
// Returns the PaymentIntent client_secret for use with Stripe Elements
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
    const billing = (body.billing as string) || "monthly";

    // Look up Stripe price ID from pricing_tiers table
    const admin = createAdminClient();

    const { data: tier } = await admin
      .from("pricing_tiers")
      .select("id, name, monthly_price, annual_price, stripe_price_id_monthly, stripe_price_id_annual")
      .ilike("name", plan)
      .single();

    let priceId = billing === "annual"
      ? tier?.stripe_price_id_annual
      : tier?.stripe_price_id_monthly;

    // Fallback to env vars
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
          ? Math.round(unitPrice * 100 * 12)
          : Math.round(unitPrice * 100);

        const newPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: amount,
          currency: "usd",
          recurring: { interval },
          metadata: { tier_id: tier.id, billing },
        });

        priceId = newPrice.id;

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

    // Create subscription with incomplete payment — returns PaymentIntent client_secret
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      expand: ["latest_invoice.payment_intent"],
      metadata: { company_id: userCtx.companyId, plan },
    });

    // Extract the client secret from the PaymentIntent
    const invoice = subscription.latest_invoice as any;
    const paymentIntent = invoice?.payment_intent;

    if (!paymentIntent?.client_secret) {
      return NextResponse.json(
        { error: "Failed to create payment intent for subscription." },
        { status: 500 }
      );
    }

    // Store the subscription ID on the company so sync can find it
    await supabase
      .from("companies")
      .update({ stripe_subscription_id: subscription.id })
      .eq("id", userCtx.companyId);

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
      plan,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });
  } catch (err) {
    console.error("POST /api/stripe/create-subscription error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
