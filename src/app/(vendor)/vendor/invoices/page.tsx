import { redirect } from "next/navigation";
import { Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVendorInvoices } from "@/lib/queries/vendor-portal";
import { formatCurrency, formatDateSafe } from "@/lib/utils/format";
import { getTranslations, getLocale } from "next-intl/server";

export const metadata = { title: "My Invoices - Buildwrk" };

export default async function VendorInvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect("/login/vendor"); }

  const admin = createAdminClient();
  const invoices = await getVendorInvoices(admin, user.id);
  const t = await getTranslations("vendor");
  const locale = await getLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>{t("invoicesTitle")}</h2>
          <p className="fin-header-sub">{t("invoicesSubtitle")}</p>
        </div>
      </div>

      {invoices.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>{t("thInvoiceNumber")}</th>
                  <th>{t("thDate")}</th>
                  <th style={{ textAlign: "right" }}>{t("thAmount")}</th>
                  <th>{t("thStatus")}</th>
                  <th style={{ textAlign: "right" }}>{t("thBalanceDue")}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: Record<string, unknown>) => (
                  <tr key={inv.id as string}>
                    <td style={{ fontWeight: 600 }}>
                      <a
                        href={`/vendor/invoices/${inv.id}`}
                        style={{ color: "var(--color-blue)", textDecoration: "none" }}
                      >
                        {(inv.invoice_number as string) ?? "--"}
                      </a>
                    </td>
                    <td>
                      {inv.invoice_date
                        ? formatDateSafe(inv.invoice_date as string)
                        : "--"}
                    </td>
                    <td className="amount-col">
                      {formatCurrency((inv.total_amount as number) ?? 0)}
                    </td>
                    <td>
                      <span className={`inv-status inv-status-${inv.status}`}>
                        {inv.status as string}
                      </span>
                    </td>
                    <td className="amount-col">
                      {formatCurrency((inv.balance_due as number) ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon"><Receipt size={48} /></div>
            <div className="fin-empty-title">{t("noInvoicesFound")}</div>
            <div className="fin-empty-desc">{t("noInvoicesDesc")}</div>
          </div>
        </div>
      )}
    </div>
  );
}
