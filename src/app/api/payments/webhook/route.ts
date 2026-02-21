import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";
import {
  generateRentPaymentJournalEntry,
  buildCompanyAccountMap,
} from "@/lib/utils/invoice-accounting";
import type { GatewayCredentials } from "@/lib/payments";

// ---------------------------------------------------------------------------
// POST /api/payments/webhook
// Handle rent payment webhooks from company-owned Stripe accounts.
// Each company configures this URL in their own Stripe dashboard.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  try {
    const body = await request.text();
    const sig = request.headers.get("stripe-signature");

    // Parse the body first (unverified) to extract company_id from metadata
    let rawEvent: { type?: string; data?: { object?: { metadata?: Record<string, string> } } };
    try {
      rawEvent = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Extract company_id from checkout session metadata
    const companyId = rawEvent?.data?.object?.metadata?.company_id;
    if (!companyId) {
      // Not a rent payment event we care about — acknowledge it
      return NextResponse.json({ received: true });
    }

    // Look up the company's webhook secret for signature verification
    const { data: gatewayConfig } = await supabase
      .from("payment_gateway_config")
      .select("config")
      .eq("company_id", companyId)
      .eq("provider", "stripe")
      .eq("is_active", true)
      .single();

    if (!gatewayConfig) {
      return NextResponse.json({ error: "No gateway config found" }, { status: 400 });
    }

    const credentials = (gatewayConfig.config || {}) as GatewayCredentials;

    // Verify webhook signature if webhook_secret is configured
    let event: Stripe.Event;
    if (credentials.webhook_secret && sig) {
      try {
        const stripe = new Stripe(credentials.secret_key);
        event = stripe.webhooks.constructEvent(body, sig, credentials.webhook_secret);
      } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    } else {
      // No webhook secret configured — parse event without verification
      // (Less secure, but functional. Property managers should be encouraged to set webhook secret.)
      event = rawEvent as unknown as Stripe.Event;
    }

    // Handle checkout.session.completed for rent payments
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentType = session.metadata?.payment_type;

      if (paymentType === "rent") {
        await handleRentPaymentWebhook(supabase, event, session);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Payments webhook error:", err);
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
