import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// POST /api/stripe/checkout - Create a Stripe Checkout session
// ---------------------------------------------------------------------------

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;

// Price IDs from Stripe Dashboard — set these in .env
const PRICE_MAP: Record<string, string | undefined> = {
  professional: process.env.STRIPE_PRICE_PROFESSIONAL,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
};

export async function POST(request: NextRequest) {
  if (!STRIPE_SECRET) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY to environment variables." },
      { status: 503 }
    );
  }

  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const plan = body.plan as string;
    const priceId = PRICE_MAP[plan];

    if (!priceId) {
      return NextResponse.json(
        { error: `No Stripe price configured for plan: ${plan}. Set STRIPE_PRICE_${plan.toUpperCase()} in env.` },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const { data: company } = await supabase
      .from("companies")
      .select("stripe_customer_id, name")
      .eq("id", userCtx.companyId)
      .single();

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(STRIPE_SECRET);

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
