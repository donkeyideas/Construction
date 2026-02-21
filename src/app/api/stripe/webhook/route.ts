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

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const companyId = session.metadata?.company_id;
        const plan = session.metadata?.plan;

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
              updated_at: new Date().toISOString(),
            })
            .eq("id", companyId);

          await supabase.from("subscription_events").insert({
            company_id: companyId,
            event_type: "upgraded",
            plan_to: plan,
            stripe_event_id: event.id,
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

          await supabase
            .from("companies")
            .update({
              subscription_status: status,
              updated_at: new Date().toISOString(),
            })
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
          await supabase
            .from("companies")
            .update({
              subscription_status: "canceled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", company.id);

          await supabase.from("subscription_events").insert({
            company_id: company.id,
            event_type: "canceled",
            plan_from: company.subscription_plan,
            stripe_event_id: event.id,
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
