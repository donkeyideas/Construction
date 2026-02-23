import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getStripeInstance } from "@/lib/stripe/config";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// POST /api/stripe/downgrade
// Downgrades the company's Stripe subscription to a lower plan.
// The change takes effect at the end of the current billing period.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const targetPlan = body.plan as string;

    if (!targetPlan) {
      return NextResponse.json({ error: "Missing target plan" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: company } = await admin
      .from("companies")
      .select("stripe_subscription_id, subscription_plan, subscription_status, stripe_customer_id")
      .eq("id", userCtx.companyId)
      .single();

    if (!company?.stripe_subscription_id) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 400 });
    }

    // Validate downgrade direction
    const planRank: Record<string, number> = { starter: 0, professional: 1, enterprise: 2 };
    const currentRank = planRank[company.subscription_plan || "starter"] ?? 0;
    const targetRank = planRank[targetPlan] ?? 0;

    if (targetRank >= currentRank) {
      return NextResponse.json(
        { error: "Target plan must be lower than current plan. Use upgrade instead." },
        { status: 400 }
      );
    }

    // If downgrading to starter (free), cancel the subscription instead
    if (targetPlan === "starter") {
      const sub = await stripe.subscriptions.update(
        company.stripe_subscription_id,
        { cancel_at_period_end: true }
      ) as unknown as { current_period_end: number | null };

      await admin
        .from("companies")
        .update({
          subscription_status: "canceling",
          updated_at: new Date().toISOString(),
        })
        .eq("id", userCtx.companyId);

      await admin.from("subscription_events").insert({
        company_id: userCtx.companyId,
        event_type: "downgraded",
        plan_from: company.subscription_plan,
        plan_to: "starter",
        amount: 0,
        stripe_event_id: `downgrade_${company.stripe_subscription_id}_${Date.now()}`,
      });

      await admin.from("audit_logs").insert({
        company_id: userCtx.companyId,
        user_id: userCtx.userId,
        action: "subscription_downgraded",
        entity_type: "subscription",
        details: {
          plan_from: company.subscription_plan,
          plan_to: "starter",
          effective_at: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
        },
      });

      return NextResponse.json({
        downgraded: true,
        plan: "starter",
        effective_at: sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null,
        message: "Your subscription will be canceled at the end of the billing period.",
      });
    }

    // Look up the target plan's Stripe price
    // Determine current billing interval from the subscription
    const currentSub = await stripe.subscriptions.retrieve(
      company.stripe_subscription_id
    ) as unknown as {
      items: { data: Array<{ id: string; price: { recurring: { interval: string } | null } }> };
      current_period_end: number | null;
    };

    const currentInterval = currentSub.items.data[0]?.price?.recurring?.interval || "month";
    const subscriptionItemId = currentSub.items.data[0]?.id;

    if (!subscriptionItemId) {
      return NextResponse.json({ error: "Could not find subscription item" }, { status: 500 });
    }

    // Get the target plan's price ID
    const priceField = currentInterval === "year"
      ? "stripe_price_id_annual"
      : "stripe_price_id_monthly";

    const { data: targetTier } = await admin
      .from("pricing_tiers")
      .select(`id, name, ${priceField}`)
      .ilike("name", targetPlan)
      .single();

    const targetPriceId = targetTier?.[priceField as keyof typeof targetTier] as string | undefined;

    if (!targetPriceId) {
      return NextResponse.json(
        { error: `No Stripe price configured for ${targetPlan} plan. Contact support.` },
        { status: 400 }
      );
    }

    // Update the subscription to the lower plan at end of period
    // Using proration_behavior: 'none' so the customer keeps their current plan
    // until the next billing cycle, then the new lower price kicks in
    const updatedSub = await stripe.subscriptions.update(
      company.stripe_subscription_id,
      {
        items: [{
          id: subscriptionItemId,
          price: targetPriceId,
        }],
        proration_behavior: "none",
      }
    ) as unknown as { current_period_end: number | null };

    // Update company record
    await admin
      .from("companies")
      .update({
        subscription_plan: targetPlan,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userCtx.companyId);

    // Record subscription event
    await admin.from("subscription_events").insert({
      company_id: userCtx.companyId,
      event_type: "downgraded",
      plan_from: company.subscription_plan,
      plan_to: targetPlan,
      amount: 0,
      stripe_event_id: `downgrade_${company.stripe_subscription_id}_${Date.now()}`,
    });

    // Audit log
    await admin.from("audit_logs").insert({
      company_id: userCtx.companyId,
      user_id: userCtx.userId,
      action: "subscription_downgraded",
      entity_type: "subscription",
      details: {
        plan_from: company.subscription_plan,
        plan_to: targetPlan,
        effective_at: updatedSub.current_period_end
          ? new Date(updatedSub.current_period_end * 1000).toISOString()
          : "immediately",
      },
    });

    return NextResponse.json({
      downgraded: true,
      plan: targetPlan,
      effective_at: updatedSub.current_period_end
        ? new Date(updatedSub.current_period_end * 1000).toISOString()
        : null,
      message: `Your plan has been changed to ${targetPlan}. The new pricing takes effect at the next billing cycle.`,
    });
  } catch (err) {
    console.error("POST /api/stripe/downgrade error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
