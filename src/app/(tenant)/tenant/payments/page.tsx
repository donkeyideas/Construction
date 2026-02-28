import { redirect } from "next/navigation";
import { CreditCard, CheckCircle2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantPayments } from "@/lib/queries/tenant-portal";
import { getCompanyGateway } from "@/lib/payments";
import { formatCurrency, formatDateSafe } from "@/lib/utils/format";
import { getTranslations, getLocale } from "next-intl/server";
import Stripe from "stripe";
import {
  generateRentPaymentJournalEntry,
  buildCompanyAccountMap,
} from "@/lib/utils/invoice-accounting";

export const metadata = {
  title: "Payments - Buildwrk",
};

/**
 * Server-side: verify & record payment when tenant returns from checkout.
 * This covers cases where the webhook hasn't fired yet.
 */
async function verifyAndRecordPayment(userId: string) {
  const admin = createAdminClient();

  // Get tenant's active lease
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

      // Already recorded?
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

      if (!payment) return;

      // Auto-generate journal entry
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

      // Log for idempotency
      await admin.from("payment_webhook_events").insert({
        event_id: `verify-${session.id}`,
        provider: "stripe",
        event_type: "checkout.session.verified",
        company_id: companyId,
        payload: { sessionId: session.id, paymentId: paymentIntentId },
      });
    }
    // PayPal, Square, GoCardless: webhook is primary path; no server-side verify yet
  } catch (err) {
    console.warn("Payment verification warning:", err);
  }
}

export default async function TenantPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login/tenant");
  }

  const params = await searchParams;
  const showSuccess = params.success === "true";
  const showCanceled = params.canceled === "true";

  // If returning from successful checkout, verify & record before fetching payments
  if (showSuccess) {
    await verifyAndRecordPayment(user.id);
  }

  const [payments, t, locale] = await Promise.all([
    getTenantPayments(supabase, user.id),
    getTranslations("tenant"),
    getLocale(),
  ]);

  const dateLocale = locale === "es" ? "es" : "en-US";

  function getStatusBadge(status: string): string {
    switch (status) {
      case "paid":
        return "badge badge-green";
      case "pending":
        return "badge badge-amber";
      case "overdue":
        return "badge badge-red";
      case "failed":
        return "badge badge-red";
      default:
        return "badge badge-blue";
    }
  }

  return (
    <div>
      {/* Payment result banners */}
      {showSuccess && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            marginBottom: 16,
            borderRadius: 8,
            background: "color-mix(in srgb, var(--color-green) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-green) 25%, transparent)",
            color: "var(--color-green)",
            fontSize: "0.88rem",
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={18} />
          {t("paymentSuccessBanner")}
        </div>
      )}
      {showCanceled && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            marginBottom: 16,
            borderRadius: 8,
            background: "color-mix(in srgb, #fbbf24 10%, transparent)",
            border: "1px solid color-mix(in srgb, #fbbf24 25%, transparent)",
            color: "#fbbf24",
            fontSize: "0.88rem",
            fontWeight: 500,
          }}
        >
          <AlertTriangle size={18} />
          {t("paymentCanceledBanner")}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", fontWeight: 700 }}>
          {t("paymentsTitle")}
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginTop: 4 }}>
          {t("paymentsSubtitle")}
        </p>
      </div>

      {payments.length > 0 ? (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>{t("thDate")}</th>
                  <th style={{ textAlign: "right" }}>{t("thAmount")}</th>
                  <th>{t("thStatus")}</th>
                  <th>{t("thMethod")}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      {payment.payment_date
                        ? formatDateSafe(payment.payment_date)
                        : "--"}
                    </td>
                    <td className="amount-col">
                      {payment.amount != null ? formatCurrency(payment.amount) : "--"}
                    </td>
                    <td>
                      <span className={getStatusBadge(payment.status)}>
                        {payment.status}
                      </span>
                    </td>
                    <td>
                      {payment.method === "online" && payment.gateway_provider
                        ? `Online (${payment.gateway_provider.charAt(0).toUpperCase() + payment.gateway_provider.slice(1)})`
                        : payment.method ?? "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <CreditCard size={48} style={{ color: "var(--muted)", marginBottom: 12 }} />
            <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: 4 }}>
              {t("noPaymentsFound")}
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              {t("noPaymentsDesc")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
