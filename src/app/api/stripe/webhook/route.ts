import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeInstance, getWebhookSecret } from "@/lib/stripe/config";
import {
  generateRentPaymentJournalEntry,
  buildCompanyAccountMap,
} from "@/lib/utils/invoice-accounting";

// ---------------------------------------------------------------------------
// POST /api/stripe/webhook - Handle Stripe webhook events
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
        const paymentType = session.metadata?.payment_type;

        // --- Subscription checkout ---
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

        // --- Rent payment checkout ---
        if (paymentType === "rent" && companyId) {
          await handleRentPaymentWebhook(supabase, event, session);
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

      case "account.updated": {
        // Stripe Connect account status change
        const account = event.data.object;
        const companyId = account.metadata?.company_id;

        if (
          companyId &&
          account.charges_enabled &&
          account.details_submitted
        ) {
          await supabase
            .from("payment_gateway_config")
            .update({
              is_active: true,
              onboarded_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("account_id", account.id)
            .eq("provider", "stripe");
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

// ---------------------------------------------------------------------------
// Handle rent payment from Stripe Checkout
// ---------------------------------------------------------------------------

async function handleRentPaymentWebhook(
  supabase: ReturnType<typeof createAdminClient>,
  event: { id: string },
  session: {
    id: string;
    amount_total?: number | null;
    payment_intent?: string | { id: string } | null;
    metadata?: Record<string, string> | null;
  }
) {
  const companyId = session.metadata?.company_id;
  const leaseId = session.metadata?.lease_id;
  const tenantUserId = session.metadata?.tenant_user_id;
  const dueDate = session.metadata?.due_date;

  if (!companyId || !leaseId) return;

  // Idempotency: check if this event was already processed
  const { data: existingEvent } = await supabase
    .from("payment_webhook_events")
    .select("id")
    .eq("event_id", event.id)
    .limit(1)
    .single();

  if (existingEvent) return; // Already processed

  // Also check if a payment with this session already exists
  const { data: existingPayment } = await supabase
    .from("rent_payments")
    .select("id")
    .eq("gateway_session_id", session.id)
    .limit(1)
    .single();

  if (existingPayment) return;

  // Get lease details for JE generation
  const { data: lease } = await supabase
    .from("leases")
    .select("id, property_id, tenant_name")
    .eq("id", leaseId)
    .single();

  if (!lease) return;

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const amount = (session.amount_total ?? 0) / 100; // cents → dollars
  const paymentDate = new Date().toISOString().slice(0, 10);

  // Insert rent_payment
  const { data: payment } = await supabase
    .from("rent_payments")
    .insert({
      company_id: companyId,
      lease_id: leaseId,
      amount,
      payment_date: paymentDate,
      due_date: dueDate || paymentDate,
      method: "online",
      status: "paid",
      gateway_provider: "stripe",
      gateway_payment_id: paymentIntentId,
      gateway_session_id: session.id,
      notes: "Paid online via Stripe",
    })
    .select()
    .single();

  if (!payment) return;

  // Auto-generate journal entry (DR Cash / CR Rent Receivable)
  try {
    const accountMap = await buildCompanyAccountMap(supabase, companyId);
    await generateRentPaymentJournalEntry(
      supabase,
      companyId,
      tenantUserId || "system",
      {
        id: payment.id,
        amount,
        payment_date: paymentDate,
        lease_id: leaseId,
        property_id: lease.property_id,
        tenant_name: lease.tenant_name || "Tenant",
      },
      accountMap
    );
  } catch (jeError) {
    console.warn("Rent payment JE generation warning:", jeError);
  }

  // Log webhook event for idempotency
  await supabase.from("payment_webhook_events").insert({
    event_id: event.id,
    provider: "stripe",
    event_type: "checkout.session.completed",
    company_id: companyId,
    payload: session,
  });
}
