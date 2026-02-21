import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantDashboard } from "@/lib/queries/tenant-portal";
import { getCompanyGateway } from "@/lib/payments";
import {
  generateRentPaymentJournalEntry,
  buildCompanyAccountMap,
} from "@/lib/utils/invoice-accounting";
import Stripe from "stripe";
import TenantDashboardClient from "./TenantDashboardClient";

export const metadata = {
  title: "Tenant Portal - Buildwrk",
};

/**
 * Verify & record payment when tenant returns from checkout.
 */
async function verifyAndRecordPayment(userId: string) {
  const admin = createAdminClient();

  const { data: lease } = await admin
    .from("leases")
    .select("id, company_id, property_id, tenant_name")
    .eq("tenant_user_id", userId)
    .eq("status", "active")
    .limit(1)
    .single();

  if (!lease) return;

  const companyId = lease.company_id as string;
  const result = await getCompanyGateway(companyId);
  if (!result) return;

  try {
    if (result.config.provider === "stripe") {
      const stripe = new Stripe(result.credentials.secret_key);
      const sessions = await stripe.checkout.sessions.list({ limit: 5 });

      const session = sessions.data.find(
        (s) =>
          s.status === "complete" &&
          s.metadata?.tenant_user_id === userId &&
          s.metadata?.lease_id === lease.id &&
          s.metadata?.payment_type === "rent"
      );

      if (!session) return;

      const { data: existing } = await admin
        .from("rent_payments")
        .select("id")
        .eq("gateway_session_id", session.id)
        .limit(1)
        .single();

      if (existing) return;

      const amount = (session.amount_total ?? 0) / 100;
      const paymentDate = new Date().toISOString().slice(0, 10);
      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : null;

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

      if (!payment) return;

      try {
        const accountMap = await buildCompanyAccountMap(admin, companyId);
        await generateRentPaymentJournalEntry(admin, companyId, userId, {
          id: payment.id,
          amount,
          payment_date: paymentDate,
          lease_id: lease.id,
          property_id: lease.property_id,
          tenant_name: lease.tenant_name || "Tenant",
          gateway_provider: "stripe",
        }, accountMap);
      } catch (jeErr) {
        console.warn("Rent payment JE warning:", jeErr);
      }

      await admin.from("payment_webhook_events").insert({
        event_id: `verify-${session.id}`,
        provider: "stripe",
        event_type: "checkout.session.verified",
        company_id: companyId,
        payload: { sessionId: session.id, paymentId: paymentIntentId },
      });
    }
  } catch (err) {
    console.warn("Payment verification warning:", err);
  }
}

export default async function TenantDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login/tenant");
  }

  const params = await searchParams;

  // If returning from successful checkout, verify & record before rendering
  if (params.payment === "success") {
    await verifyAndRecordPayment(user.id);
  }

  const dashboard = await getTenantDashboard(supabase, user.id);

  return (
    <TenantDashboardClient
      dashboard={dashboard}
      paymentStatus={params.payment as "success" | "canceled" | undefined}
    />
  );
}
