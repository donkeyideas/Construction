import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTenantPayments } from "@/lib/queries/tenant-portal";
import { formatCurrency } from "@/lib/utils/format";
import { getTranslations, getLocale } from "next-intl/server";

export const metadata = {
  title: "Payments - Buildwrk",
};

export default async function TenantPaymentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login/tenant");
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
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>{t("paymentsTitle")}</h2>
          <p className="fin-header-sub">
            {t("paymentsSubtitle")}
          </p>
        </div>
      </div>

      {payments.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
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
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon"><CreditCard size={48} /></div>
            <div className="fin-empty-title">{t("noPaymentsFound")}</div>
            <div className="fin-empty-desc">
              {t("noPaymentsDesc")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
