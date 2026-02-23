import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getStripeInstance } from "@/lib/stripe/config";

// ---------------------------------------------------------------------------
// GET /api/stripe/subscription-details
// Returns current subscription dates (renewal, cancel) from Stripe.
// ---------------------------------------------------------------------------

export async function GET() {
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

    const { data: company } = await supabase
      .from("companies")
      .select("stripe_subscription_id")
      .eq("id", userCtx.companyId)
      .single();

    if (!company?.stripe_subscription_id) {
      return NextResponse.json({ subscription: null });
    }

    const sub = await stripe.subscriptions.retrieve(company.stripe_subscription_id) as unknown as {
      status: string;
      current_period_end: number | null;
      current_period_start: number | null;
      cancel_at_period_end: boolean;
      cancel_at: number | null;
      canceled_at: number | null;
      items: { data: Array<{ price: { unit_amount: number | null; recurring: { interval: string } | null } }> };
    };

    return NextResponse.json({
      subscription: {
        status: sub.status,
        currentPeriodEnd: sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null,
        currentPeriodStart: sub.current_period_start
          ? new Date(sub.current_period_start * 1000).toISOString()
          : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        cancelAt: sub.cancel_at
          ? new Date(sub.cancel_at * 1000).toISOString()
          : null,
        canceledAt: sub.canceled_at
          ? new Date(sub.canceled_at * 1000).toISOString()
          : null,
        interval: sub.items?.data?.[0]?.price?.recurring?.interval ?? "month",
        amount: sub.items?.data?.[0]?.price?.unit_amount
          ? sub.items.data[0].price.unit_amount / 100
          : null,
      },
    });
  } catch (err) {
    console.error("GET /api/stripe/subscription-details error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
