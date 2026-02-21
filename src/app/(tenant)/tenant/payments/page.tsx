import { redirect } from "next/navigation";
import { CreditCard, CheckCircle2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTenantPayments } from "@/lib/queries/tenant-portal";
import { formatCurrency } from "@/lib/utils/format";
import { getTranslations, getLocale } from "next-intl/server";

export const metadata = {
  title: "Payments - Buildwrk",
};

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

  const [payments, t, locale, params] = await Promise.all([
    getTenantPayments(supabase, user.id),
    getTranslations("tenant"),
    getLocale(),
    searchParams,
  ]);

  const dateLocale = locale === "es" ? "es" : "en-US";
  const showSuccess = params.success === "true";
  const showCanceled = params.canceled === "true";

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
                        ? new Date(payment.payment_date).toLocaleDateString(dateLocale, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
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
                    <td>{payment.payment_method ?? "--"}</td>
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
