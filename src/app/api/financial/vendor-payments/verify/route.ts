import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCompanyGateway } from "@/lib/payments";
import { recordPayment } from "@/lib/queries/financial";
import {
  generatePaymentJournalEntry,
  buildCompanyAccountMap,
} from "@/lib/utils/invoice-accounting";
import Stripe from "stripe";

/**
 * POST /api/financial/vendor-payments/verify
 * Called when admin returns from checkout with ?payment=success.
 * Verifies the payment with the provider and records it + auto-generates JE.
 * Body: { invoice_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { invoice_id } = body;

    if (!invoice_id) {
      return NextResponse.json(
        { error: "invoice_id is required" },
        { status: 400 }
      );
    }

    // Get company's gateway
    const result = await getCompanyGateway(ctx.companyId);
    if (!result) {
      return NextResponse.json(
        { error: "No gateway configured" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Fetch the invoice
    const { data: invoice } = await admin
      .from("invoices")
      .select(
        "id, invoice_number, vendor_name, total_amount, balance_due, status, invoice_type, due_date"
      )
      .eq("id", invoice_id)
      .eq("company_id", ctx.companyId)
      .single();

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // For Stripe: list recent sessions and find matching one
    if (result.config.provider === "stripe") {
      const stripe = new Stripe(result.credentials.secret_key);

      const sessions = await stripe.checkout.sessions.list({ limit: 10 });

      // Find the most recent completed session for this invoice
      const session = sessions.data.find(
        (s) =>
          s.status === "complete" &&
          s.metadata?.lease_id === invoice_id && // we stored invoice_id in leaseId field
          s.metadata?.company_id === ctx.companyId
      );

      if (!session) {
        return NextResponse.json({
          recorded: false,
          message: "No completed checkout session found for this invoice",
        });
      }

      // Check if already recorded (idempotency via webhook event log)
      const { data: existingEvent } = await admin
        .from("payment_webhook_events")
        .select("id")
        .eq("event_id", `vendor-verify-${session.id}`)
        .limit(1)
        .single();

      if (existingEvent) {
        return NextResponse.json({
          recorded: true,
          message: "Payment already recorded",
        });
      }

      // Record the payment
      const amount = (session.amount_total ?? 0) / 100;
      const paymentDate = new Date().toISOString().slice(0, 10);
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null;

      const payResult = await recordPayment(admin, ctx.companyId, {
        invoice_id: invoice.id,
        payment_date: paymentDate,
        amount,
        method: "online",
        reference_number: paymentIntentId || session.id,
        notes: `Paid online via Stripe (${session.id})`,
      });

      if (!payResult) {
        return NextResponse.json(
          { error: "Failed to record payment" },
          { status: 500 }
        );
      }

      // Auto-generate JE
      try {
        const accountMap = await buildCompanyAccountMap(admin, ctx.companyId);
        await generatePaymentJournalEntry(
          admin,
          ctx.companyId,
          ctx.userId,
          {
            id: payResult.id,
            amount,
            payment_date: paymentDate,
            method: "online",
          },
          invoice,
          accountMap
        );
      } catch (jeErr) {
        console.warn("Vendor payment JE warning:", jeErr);
      }

      // Log for idempotency
      await admin.from("payment_webhook_events").insert({
        event_id: `vendor-verify-${session.id}`,
        provider: "stripe",
        event_type: "vendor_payment.verified",
        company_id: ctx.companyId,
        payload: {
          invoiceId: invoice.id,
          sessionId: session.id,
          paymentId: paymentIntentId,
        },
      });

      return NextResponse.json({
        recorded: true,
        paymentId: payResult.id,
      });
    }

    // For other providers
    return NextResponse.json({
      recorded: false,
      message: "Auto-verification not yet implemented for this provider. Use manual Record Payment.",
    });
  } catch (err) {
    console.error("Vendor payment verify error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
