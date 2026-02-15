import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getVendorCertifications } from "@/lib/queries/vendor-portal";
import { getTranslations, getLocale } from "next-intl/server";

export const metadata = { title: "Compliance - Buildwrk" };

export default async function VendorCompliancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect("/login/vendor"); }

  const certifications = await getVendorCertifications(supabase, user.id);
  const t = await getTranslations("vendor");
  const locale = await getLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  function getCertStatus(expiryDate: string): { label: string; className: string } {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (expiry < now) {
      return { label: t("statusExpired"), className: "inv-status inv-status-overdue" };
    }
    if (expiry <= thirtyDaysFromNow) {
      return { label: t("statusExpiringSoon"), className: "inv-status inv-status-pending" };
    }
    return { label: t("statusValid"), className: "inv-status inv-status-paid" };
  }

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>{t("complianceTitle")}</h2>
          <p className="fin-header-sub">{t("complianceSubtitle")}</p>
        </div>
      </div>

      {certifications.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>{t("thCertName")}</th>
                  <th>{t("thType")}</th>
                  <th>{t("thExpiryDate")}</th>
                  <th>{t("thStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {certifications.map((cert: Record<string, unknown>) => {
                  const status = cert.expiry_date
                    ? getCertStatus(cert.expiry_date as string)
                    : { label: t("statusUnknown"), className: "inv-status" };

                  return (
                    <tr key={cert.id as string}>
                      <td style={{ fontWeight: 600 }}>
                        {(cert.cert_name as string) ?? t("unnamed")}
                      </td>
                      <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                        {(cert.cert_type as string) ?? "--"}
                      </td>
                      <td>
                        {cert.expiry_date
                          ? new Date(cert.expiry_date as string).toLocaleDateString(dateLocale, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "--"}
                      </td>
                      <td>
                        <span className={status.className}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon"><ShieldCheck size={48} /></div>
            <div className="fin-empty-title">{t("noCertsFound")}</div>
            <div className="fin-empty-desc">{t("noCertsDesc")}</div>
          </div>
        </div>
      )}
    </div>
  );
}
