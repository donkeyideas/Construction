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

    // Look up Stripe price ID from pricing_tiers table, fallback to env vars
    const admin = createAdminClient();
    const { data: tier } = await admin
      .from("pricing_tiers")
      .select("stripe_price_id_monthly")
      .ilike("name", plan)
      .single();

    const priceId = tier?.stripe_price_id_monthly
      || (plan === "professional" ? process.env.STRIPE_PRICE_PROFESSIONAL : undefined)
      || (plan === "enterprise" ? process.env.STRIPE_PRICE_ENTERPRISE : undefined);

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
