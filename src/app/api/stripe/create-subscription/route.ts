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

    // Cancel any existing incomplete/past_due subscriptions and void open invoices
    const existingSubs = await stripe.subscriptions.list({
      customer: customerId,
      limit: 20,
    });
    for (const sub of existingSubs.data) {
      if (sub.status === "incomplete" || sub.status === "incomplete_expired" || sub.status === "past_due") {
        await stripe.subscriptions.cancel(sub.id);
      }
    }

    // Also void any lingering open invoices to clear customer credit balance
    const openInvoices = await stripe.invoices.list({
      customer: customerId,
      status: "open",
      limit: 20,
    });
    for (const inv of openInvoices.data) {
      try {
        await stripe.invoices.voidInvoice(inv.id);
      } catch {
        // Already voided or finalized — skip
      }
    }

    // Create subscription with incomplete payment
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      metadata: { company_id: userCtx.companyId, plan },
    });

    // Retrieve the invoice separately with payment_intent expanded
    // (nested expand on subscriptions.create can be unreliable)
    const invoiceId = typeof subscription.latest_invoice === "string"
      ? subscription.latest_invoice
      : subscription.latest_invoice?.id;

    if (!invoiceId) {
      console.error("No latest_invoice on subscription:", subscription.id);
      return NextResponse.json(
        { error: "Subscription created but no invoice was generated." },
        { status: 500 }
      );
    }

    const invoice = await stripe.invoices.retrieve(invoiceId, {
      expand: ["payment_intent"],
    }) as any;

    const piRaw = invoice.payment_intent;
    const paymentIntent = typeof piRaw === "string"
      ? await stripe.paymentIntents.retrieve(piRaw)
      : piRaw;

    if (!paymentIntent?.client_secret) {
      console.error("No payment_intent on invoice:", invoiceId, "sub:", subscription.id, "invoice status:", invoice.status, "pi:", piRaw);
      // Clean up the dangling subscription
      await stripe.subscriptions.cancel(subscription.id);
      return NextResponse.json(
        { error: "Could not initialize payment. Please try again." },
        { status: 500 }
      );
    }

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
