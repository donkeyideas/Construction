import { redirect } from "next/navigation";
import { LayoutDashboard, FileText, Receipt, DollarSign, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getVendorDashboard } from "@/lib/queries/vendor-portal";
import { formatCurrency } from "@/lib/utils/format";
import { getTranslations } from "next-intl/server";

export const metadata = { title: "Vendor Dashboard - Buildwrk" };

export default async function VendorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect("/login/vendor"); }

  const dashboard = await getVendorDashboard(supabase, user.id);
  const t = await getTranslations("vendor");

  if (!dashboard.contactId) {
    return (
      <div>
        <div className="fin-header">
          <div>
            <h2>{t("dashboardTitle")}</h2>
            <p className="fin-header-sub">{t("welcomeSubtitle")}</p>
          </div>
        </div>
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon"><LayoutDashboard size={48} /></div>
            <div className="fin-empty-title">{t("noVendorProfile")}</div>
            <div className="fin-empty-desc">
              {t("noVendorProfileDesc")}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>{t("dashboardTitle")}</h2>
          <p className="fin-header-sub">{t("dashboardSubtitle")}</p>
        </div>
      </div>

      <div className="vendor-kpi-grid">
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <FileText size={18} />
          </div>
          <span className="fin-kpi-label">{t("totalContractValue")}</span>
          <span className="fin-kpi-value">{formatCurrency(dashboard.totalContractValue)}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <Receipt size={18} />
          </div>
          <span className="fin-kpi-label">{t("outstandingInvoices")}</span>
          <span className="fin-kpi-value">{dashboard.outstandingInvoices}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon red">
            <DollarSign size={18} />
          </div>
          <span className="fin-kpi-label">{t("outstandingAmount")}</span>
          <span className={`fin-kpi-value ${dashboard.outstandingAmount > 0 ? "negative" : ""}`}>
            {formatCurrency(dashboard.outstandingAmount)}
          </span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon green">
            <ShieldCheck size={18} />
          </div>
          <span className="fin-kpi-label">{t("expiringCertifications")}</span>
          <span className={`fin-kpi-value ${dashboard.expiringCertifications > 0 ? "negative" : ""}`}>
            {dashboard.expiringCertifications}
          </span>
        </div>
      </div>
    </div>
  );
}
