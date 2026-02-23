import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getStripeInstance } from "@/lib/stripe/config";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// POST /api/stripe/cancel-subscription
// Cancels the company's Stripe subscription at the end of the billing period.
// Does NOT cancel immediately — the user keeps access until the period ends.
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

    const { data: company } = await admin
      .from("companies")
      .select("stripe_subscription_id, subscription_plan, subscription_status")
      .eq("id", userCtx.companyId)
      .single();

    if (!company?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    // Cancel at period end (not immediately)
    const subscription = await stripe.subscriptions.update(
      company.stripe_subscription_id,
      { cancel_at_period_end: true }
    ) as unknown as { cancel_at: number | null; current_period_end: number | null };

    // Update company status
    await admin
      .from("companies")
      .update({
        subscription_status: "canceling",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userCtx.companyId);

    // Record the event
    await admin.from("subscription_events").insert({
      company_id: userCtx.companyId,
      event_type: "canceled",
      plan_from: company.subscription_plan,
      plan_to: company.subscription_plan,
      amount: 0,
      stripe_event_id: `cancel_${company.stripe_subscription_id}_${Date.now()}`,
    });

    // Audit log
    await admin.from("audit_logs").insert({
      company_id: userCtx.companyId,
      user_id: userCtx.userId,
      action: "subscription_canceled",
      entity_type: "subscription",
      details: {
        plan: company.subscription_plan,
        subscription_id: company.stripe_subscription_id,
        cancel_at: subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000).toISOString()
          : null,
        current_period_end: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
      },
    });

    return NextResponse.json({
      canceled: true,
      cancel_at_period_end: true,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
    });
  } catch (err) {
    console.error("POST /api/stripe/cancel-subscription error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
