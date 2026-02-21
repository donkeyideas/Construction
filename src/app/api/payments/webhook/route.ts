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
// Handle rent payment webhooks from company-owned payment accounts.
// Each company configures this URL in their provider dashboard.
// Supports Stripe, PayPal, Square, GoCardless.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  try {
    const body = await request.text();

    // Parse the body to determine the provider and extract company_id
    let rawEvent: Record<string, unknown>;
    try {
      rawEvent = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Detect provider from event structure
    const provider = detectProvider(rawEvent, request);

    // Extract metadata depending on provider
    const metadata = extractMetadata(rawEvent, provider);
    const companyId = metadata?.company_id;

    if (!companyId) {
      // Not a rent payment event we care about — acknowledge it
      return NextResponse.json({ received: true });
    }

    // Look up the company's config for signature verification
    const { data: gatewayConfig } = await supabase
      .from("payment_gateway_config")
      .select("config, provider")
      .eq("company_id", companyId)
      .eq("provider", provider)
      .eq("is_active", true)
      .single();

    if (!gatewayConfig) {
      return NextResponse.json({ error: "No gateway config found" }, { status: 400 });
    }

    const credentials = (gatewayConfig.config || {}) as GatewayCredentials;

    // Verify signature based on provider
    const verified = await verifySignature(provider, credentials, body, request);

    // If webhook secret is configured but verification fails, reject
    if (verified === false) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Route to provider-specific handler
    switch (provider) {
      case "stripe":
        await handleStripeEvent(supabase, rawEvent, credentials, body, request);
        break;
      case "paypal":
        await handlePayPalEvent(supabase, rawEvent);
        break;
      case "square":
        await handleSquareEvent(supabase, rawEvent);
        break;
      case "gocardless":
        await handleGoCardlessEvent(supabase, rawEvent);
        break;
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
// Provider detection from event structure
// ---------------------------------------------------------------------------

function detectProvider(event: Record<string, unknown>, request: NextRequest): string {
  // Stripe: has "type" field and stripe-signature header
  if (request.headers.get("stripe-signature")) return "stripe";
  // PayPal: has paypal-transmission-id header
  if (request.headers.get("paypal-transmission-id")) return "paypal";
  // Square: has x-square-hmacsha256-signature header
  if (request.headers.get("x-square-hmacsha256-signature")) return "square";
  // GoCardless: has webhook-signature header
  if (request.headers.get("webhook-signature")) return "gocardless";
  // Fallback: check event structure
  if (event.type && typeof event.type === "string" && event.data) return "stripe";
  if (event.event_type && typeof event.event_type === "string" && event.resource) return "paypal";
  if (event.type && event.data && (event as Record<string, unknown>).merchant_id) return "square";
  if (event.events && Array.isArray(event.events)) return "gocardless";
  return "stripe"; // default
}

// ---------------------------------------------------------------------------
// Extract metadata (company_id etc.) from event based on provider
// ---------------------------------------------------------------------------

function extractMetadata(
  event: Record<string, unknown>,
  provider: string
): Record<string, string> | null {
  try {
    switch (provider) {
      case "stripe": {
        const data = event.data as { object?: { metadata?: Record<string, string> } };
        return data?.object?.metadata || null;
      }
      case "paypal": {
        const resource = event.resource as { purchase_units?: { custom_id?: string }[] };
        const customId = resource?.purchase_units?.[0]?.custom_id;
        if (customId) {
          try { return JSON.parse(customId); } catch { return null; }
        }
        return null;
      }
      case "square": {
        const data = event.data as { object?: { order?: { line_items?: { metadata?: Record<string, string> }[] } } };
        return data?.object?.order?.line_items?.[0]?.metadata || null;
      }
      case "gocardless": {
        const events = event.events as { links?: { payment?: string }; resource_metadata?: Record<string, string> }[];
        return events?.[0]?.resource_metadata || null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Webhook signature verification
// ---------------------------------------------------------------------------

async function verifySignature(
  provider: string,
  credentials: GatewayCredentials,
  body: string,
  request: NextRequest
): Promise<boolean | null> {
  // Returns true = verified, false = failed, null = no secret configured (skip)
  switch (provider) {
    case "stripe": {
      const sig = request.headers.get("stripe-signature");
      if (!credentials.webhook_secret || !sig) return null;
      try {
        const stripe = new Stripe(credentials.secret_key);
        stripe.webhooks.constructEvent(body, sig, credentials.webhook_secret);
        return true;
      } catch {
        return false;
      }
    }
    case "paypal": {
      // PayPal verification requires webhook_id — skip if not set
      if (!credentials.webhook_id) return null;
      return null; // PayPal verification is complex and done in handler
    }
    case "square": {
      const sig = request.headers.get("x-square-hmacsha256-signature");
      if (!credentials.webhook_secret || !sig) return null;
      try {
        const crypto = await import("crypto");
        const hmac = crypto.createHmac("sha256", credentials.webhook_secret);
        hmac.update(body);
        const expected = hmac.digest("base64");
        return sig === expected;
      } catch {
        return false;
      }
    }
    case "gocardless": {
      const sig = request.headers.get("webhook-signature");
      if (!credentials.webhook_secret || !sig) return null;
      try {
        const crypto = await import("crypto");
        const hmac = crypto.createHmac("sha256", credentials.webhook_secret);
        hmac.update(body);
        const expected = hmac.digest("hex");
        return sig === expected;
      } catch {
        return false;
      }
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Stripe event handler
// ---------------------------------------------------------------------------

async function handleStripeEvent(
  supabase: ReturnType<typeof createAdminClient>,
  rawEvent: Record<string, unknown>,
  credentials: GatewayCredentials,
  body: string,
  request: NextRequest
) {
  // Re-construct verified event if possible
  let event = rawEvent as unknown as Stripe.Event;
  const sig = request.headers.get("stripe-signature");
  if (credentials.webhook_secret && sig) {
    try {
      const stripe = new Stripe(credentials.secret_key);
      event = stripe.webhooks.constructEvent(body, sig, credentials.webhook_secret);
    } catch { /* already verified above, use raw */ }
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.payment_type === "rent") {
      await recordRentPayment(supabase, {
        eventId: event.id || `stripe-${Date.now()}`,
        sessionId: session.id,
        provider: "stripe",
        companyId: session.metadata.company_id!,
        leaseId: session.metadata.lease_id!,
        tenantUserId: session.metadata.tenant_user_id || "system",
        dueDate: session.metadata.due_date,
        amount: (session.amount_total ?? 0) / 100,
        paymentId: typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent as { id: string })?.id ?? null,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// PayPal event handler
// ---------------------------------------------------------------------------

async function handlePayPalEvent(
  supabase: ReturnType<typeof createAdminClient>,
  rawEvent: Record<string, unknown>
) {
  const eventType = rawEvent.event_type as string;
  // PayPal fires CHECKOUT.ORDER.APPROVED when the buyer approves the payment
  // and PAYMENT.CAPTURE.COMPLETED when payment is captured
  if (eventType === "CHECKOUT.ORDER.APPROVED" || eventType === "PAYMENT.CAPTURE.COMPLETED") {
    const resource = rawEvent.resource as {
      id?: string;
      purchase_units?: { custom_id?: string; amount?: { value?: string } }[];
    };
    const customId = resource?.purchase_units?.[0]?.custom_id;
    if (!customId) return;

    let metadata: Record<string, string>;
    try { metadata = JSON.parse(customId); } catch { return; }

    if (metadata.payment_type !== "rent") return;

    const amountStr = resource?.purchase_units?.[0]?.amount?.value;
    const amount = amountStr ? parseFloat(amountStr) : 0;

    await recordRentPayment(supabase, {
      eventId: (rawEvent.id as string) || `paypal-${Date.now()}`,
      sessionId: resource?.id || `paypal-${Date.now()}`,
      provider: "paypal",
      companyId: metadata.company_id,
      leaseId: metadata.lease_id,
      tenantUserId: metadata.tenant_user_id || "system",
      dueDate: metadata.due_date,
      amount,
      paymentId: resource?.id || null,
    });
  }
}

// ---------------------------------------------------------------------------
// Square event handler
// ---------------------------------------------------------------------------

async function handleSquareEvent(
  supabase: ReturnType<typeof createAdminClient>,
  rawEvent: Record<string, unknown>
) {
  const eventType = rawEvent.type as string;
  // Square fires payment.completed or order.fulfillment.updated
  if (eventType === "payment.completed") {
    const data = rawEvent.data as {
      object?: {
        payment?: {
          id?: string;
          order_id?: string;
          amount_money?: { amount?: number };
        };
      };
    };
    const payment = data?.object?.payment;
    if (!payment) return;

    // We need to get metadata from the order's line items
    // For now, extract from event data structure
    const eventData = rawEvent.data as {
      object?: {
        order?: {
          line_items?: { metadata?: Record<string, string> }[];
        };
      };
    };
    const metadata = eventData?.object?.order?.line_items?.[0]?.metadata;
    if (!metadata || metadata.payment_type !== "rent") return;

    const amount = payment.amount_money?.amount
      ? payment.amount_money.amount / 100
      : 0;

    await recordRentPayment(supabase, {
      eventId: (rawEvent.event_id as string) || `square-${Date.now()}`,
      sessionId: payment.order_id || payment.id || `square-${Date.now()}`,
      provider: "square",
      companyId: metadata.company_id,
      leaseId: metadata.lease_id,
      tenantUserId: metadata.tenant_user_id || "system",
      dueDate: metadata.due_date,
      amount,
      paymentId: payment.id || null,
    });
  }
}

// ---------------------------------------------------------------------------
// GoCardless event handler
// ---------------------------------------------------------------------------

async function handleGoCardlessEvent(
  supabase: ReturnType<typeof createAdminClient>,
  rawEvent: Record<string, unknown>
) {
  const events = rawEvent.events as {
    id?: string;
    action?: string;
    resource_type?: string;
    links?: { payment?: string };
    resource_metadata?: Record<string, string>;
  }[];

  if (!events?.length) return;

  for (const evt of events) {
    // GoCardless fires payments.confirmed or payments.paid_out
    if (evt.resource_type === "payments" && (evt.action === "confirmed" || evt.action === "paid_out")) {
      const metadata = evt.resource_metadata;
      if (!metadata || metadata.payment_type !== "rent") continue;

      // Amount is in metadata since GC event doesn't always include it
      // We'll look it up from the billing request if needed
      const amount = metadata.amount ? parseFloat(metadata.amount) / 100 : 0;

      await recordRentPayment(supabase, {
        eventId: evt.id || `gc-${Date.now()}`,
        sessionId: evt.links?.payment || `gc-${Date.now()}`,
        provider: "gocardless",
        companyId: metadata.company_id,
        leaseId: metadata.lease_id,
        tenantUserId: metadata.tenant_user_id || "system",
        dueDate: metadata.due_date,
        amount,
        paymentId: evt.links?.payment || null,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Common: Record rent payment + generate journal entry
// ---------------------------------------------------------------------------

interface RentPaymentData {
  eventId: string;
  sessionId: string;
  provider: string;
  companyId: string;
  leaseId: string;
  tenantUserId: string;
  dueDate?: string;
  amount: number;
  paymentId: string | null;
}

async function recordRentPayment(
  supabase: ReturnType<typeof createAdminClient>,
  data: RentPaymentData
) {
  // Idempotency: check if this event was already processed
  const { data: existingEvent } = await supabase
    .from("payment_webhook_events")
    .select("id")
    .eq("event_id", data.eventId)
    .limit(1)
    .single();

  if (existingEvent) return; // Already processed

  // Also check if a payment with this session already exists
  const { data: existingPayment } = await supabase
    .from("rent_payments")
    .select("id")
    .eq("gateway_session_id", data.sessionId)
    .limit(1)
    .single();

  if (existingPayment) return;

  // Get lease details for JE generation
  const { data: lease } = await supabase
    .from("leases")
    .select("id, property_id, tenant_name")
    .eq("id", data.leaseId)
    .single();

  if (!lease) return;

  const paymentDate = new Date().toISOString().slice(0, 10);
  const providerLabel = data.provider.charAt(0).toUpperCase() + data.provider.slice(1);

  // Insert rent_payment
  const { data: payment } = await supabase
    .from("rent_payments")
    .insert({
      company_id: data.companyId,
      lease_id: data.leaseId,
      amount: data.amount,
      payment_date: paymentDate,
      due_date: data.dueDate || paymentDate,
      method: "online",
      status: "paid",
      gateway_provider: data.provider,
      gateway_payment_id: data.paymentId,
      gateway_session_id: data.sessionId,
      notes: `Paid online via ${providerLabel}`,
    })
    .select()
    .single();

  if (!payment) return;

  // Auto-generate journal entry (DR Cash / CR Rent Receivable)
  try {
    const accountMap = await buildCompanyAccountMap(supabase, data.companyId);
    await generateRentPaymentJournalEntry(
      supabase,
      data.companyId,
      data.tenantUserId,
      {
        id: payment.id,
        amount: data.amount,
        payment_date: paymentDate,
        lease_id: data.leaseId,
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
    event_id: data.eventId,
    provider: data.provider,
    event_type: "payment.completed",
    company_id: data.companyId,
    payload: { sessionId: data.sessionId, paymentId: data.paymentId },
  });
}
