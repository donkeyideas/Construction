import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCompanyGateway } from "@/lib/payments";
import Stripe from "stripe";
import {
  generateRentPaymentJournalEntry,
  buildCompanyAccountMap,
} from "@/lib/utils/invoice-accounting";

/**
 * POST /api/tenant/payments/verify
 * Called when the tenant returns from checkout with ?success=true.
 * Verifies the payment session with the provider and records the payment + JE
 * if it hasn't been recorded yet (covers cases where webhook hasn't fired).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get tenant's active lease
    const { data: lease } = await admin
      .from("leases")
      .select("id, company_id, property_id, tenant_name")
      .eq("tenant_user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();

    if (!lease) {
      return NextResponse.json({ error: "No active lease" }, { status: 404 });
    }

    const companyId = lease.company_id as string;

    // Get company's gateway
    const result = await getCompanyGateway(companyId);
    if (!result) {
      return NextResponse.json({ error: "No gateway configured" }, { status: 400 });
    }

    // Find the most recent checkout session for this tenant
    // For Stripe: list recent sessions and find one matching this tenant
    if (result.config.provider === "stripe") {
      const stripe = new Stripe(result.credentials.secret_key);

      // List recent checkout sessions
      const sessions = await stripe.checkout.sessions.list({
        limit: 5,
      });

      // Find the most recent completed session for this tenant/lease
      const session = sessions.data.find(
        (s) =>
          s.status === "complete" &&
          s.metadata?.tenant_user_id === user.id &&
          s.metadata?.lease_id === lease.id &&
          s.metadata?.payment_type === "rent"
      );

      if (!session) {
        return NextResponse.json({ recorded: false, message: "No completed session found" });
      }

      // Check if already recorded
      const { data: existing } = await admin
        .from("rent_payments")
        .select("id")
        .eq("gateway_session_id", session.id)
        .limit(1)
        .single();

      if (existing) {
        return NextResponse.json({ recorded: true, paymentId: existing.id });
      }

      // Record the payment
      const amount = (session.amount_total ?? 0) / 100;
      const paymentDate = new Date().toISOString().slice(0, 10);
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null;

      const { data: payment } = await admin
        .from("rent_payments")
        .insert({
          company_id: companyId,
          lease_id: lease.id,
          amount,
          payment_date: paymentDate,
          due_date: session.metadata?.due_date || paymentDate,
          method: "online",
          status: "paid",
          gateway_provider: "stripe",
          gateway_payment_id: paymentIntentId,
          gateway_session_id: session.id,
          notes: "Paid online via Stripe",
        })
        .select()
        .single();

      if (!payment) {
        return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
      }

      // Auto-generate journal entry
      try {
        const accountMap = await buildCompanyAccountMap(admin, companyId);
        await generateRentPaymentJournalEntry(
          admin,
          companyId,
          user.id,
          {
            id: payment.id,
            amount,
            payment_date: paymentDate,
            lease_id: lease.id,
            property_id: lease.property_id,
            tenant_name: lease.tenant_name || "Tenant",
            gateway_provider: "stripe",
          },
          accountMap
        );
      } catch (jeError) {
        console.warn("Rent payment JE warning:", jeError);
      }

      // Log for idempotency
      await admin.from("payment_webhook_events").insert({
        event_id: `verify-${session.id}`,
        provider: "stripe",
        event_type: "checkout.session.verified",
        company_id: companyId,
        payload: { sessionId: session.id, paymentId: paymentIntentId },
      });

      return NextResponse.json({ recorded: true, paymentId: payment.id });
    }

    // For other providers, return status only
    return NextResponse.json({ recorded: false, message: "Verification not yet implemented for this provider" });
  } catch (err) {
    console.error("Payment verify error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
