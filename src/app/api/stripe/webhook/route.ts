import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeInstance, getWebhookSecret } from "@/lib/stripe/config";

// ---------------------------------------------------------------------------
// POST /api/stripe/webhook - Handle platform subscription webhook events
// NOTE: Rent payment webhooks go to /api/payments/webhook (per-company keys)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const stripe = await getStripeInstance();
    const webhookSecret = await getWebhookSecret();

    if (!stripe || !webhookSecret) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const body = await request.text();
    const sig = request.headers.get("stripe-signature");

    if (!sig) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    const supabase = createAdminClient();

    // Idempotency: skip already-processed events to handle Stripe retries safely
    const { data: existingEvent } = await supabase
      .from("subscription_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .limit(1)
      .maybeSingle();

    if (existingEvent) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const ALLOWED_PLANS = ["starter", "professional", "enterprise"];

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const companyId = session.metadata?.company_id;
        const plan = session.metadata?.plan;

        // Validate plan against allowed tiers
        if (plan && !ALLOWED_PLANS.includes(plan)) {
          console.warn(`Stripe webhook: invalid plan "${plan}" in metadata for company ${companyId}`);
          return NextResponse.json({ received: true, error: "invalid_plan" });
        }

        // Only handle subscription checkouts here
        if (companyId && plan) {
          await supabase
            .from("companies")
            .update({
              subscription_plan: plan,
              subscription_status: "active",
              stripe_subscription_id: typeof session.subscription === "string"
                ? session.subscription
                : null,
              grace_period_ends_at: null, // Clear grace period on resubscription
              updated_at: new Date().toISOString(),
            })
            .eq("id", companyId);

          await supabase.from("subscription_events").insert({
            company_id: companyId,
            event_type: "upgraded",
            plan_to: plan,
            stripe_event_id: event.id,
          });

          await supabase.from("audit_logs").insert({
            company_id: companyId,
            action: "subscription_upgraded",
            entity_type: "subscription",
            details: { plan, stripe_event_id: event.id },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer;

        const { data: company } = await supabase
          .from("companies")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (company) {
          const status = subscription.status === "active" ? "active"
            : subscription.status === "past_due" ? "past_due"
            : subscription.status === "canceled" ? "canceled"
            : "active";

          const updatePayload: Record<string, unknown> = {
            subscription_status: status,
            updated_at: new Date().toISOString(),
          };

          // Clear grace period when subscription becomes active again
          if (status === "active") {
            updatePayload.grace_period_ends_at = null;
          }

          await supabase
            .from("companies")
            .update(updatePayload)
            .eq("id", company.id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer;

        const { data: company } = await supabase
          .from("companies")
          .select("id, subscription_plan")
          .eq("stripe_customer_id", customerId)
          .single();

        if (company) {
          // Start 30-day read-only grace period instead of immediate cancellation
          const gracePeriodEndsAt = new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString();

          await supabase
            .from("companies")
            .update({
              subscription_status: "grace_period",
              grace_period_ends_at: gracePeriodEndsAt,
              stripe_subscription_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", company.id);

          await supabase.from("subscription_events").insert({
            company_id: company.id,
            event_type: "grace_period_started",
            plan_from: company.subscription_plan,
            stripe_event_id: event.id,
            metadata: { grace_period_ends_at: gracePeriodEndsAt },
          });

          await supabase.from("audit_logs").insert({
            company_id: company.id,
            action: "grace_period_started",
            entity_type: "subscription",
            details: {
              plan_from: company.subscription_plan,
              stripe_event_id: event.id,
              grace_period_ends_at: gracePeriodEndsAt,
            },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer;

        const { data: company } = await supabase
          .from("companies")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (company) {
          await supabase
            .from("companies")
            .update({
              subscription_status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("id", company.id);

          await supabase.from("subscription_events").insert({
            company_id: company.id,
            event_type: "payment_failed",
            stripe_event_id: event.id,
          });

          await supabase.from("audit_logs").insert({
            company_id: company.id,
            action: "payment_failed",
            entity_type: "subscription",
            details: { stripe_event_id: event.id },
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook error" },
      { status: 400 }
    );
  }
}
