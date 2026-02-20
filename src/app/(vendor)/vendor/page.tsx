import { redirect } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getVendorDashboardFull } from "@/lib/queries/vendor-portal";
import { getTranslations } from "next-intl/server";
import VendorDashboardClient from "./VendorDashboardClient";

export const metadata = { title: "Vendor Dashboard - Buildwrk" };

export default async function VendorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect("/login/vendor"); }

  const dashboard = await getVendorDashboardFull(supabase, user.id);
  const t = await getTranslations("vendor");

  if (!dashboard.contact) {
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

  return <VendorDashboardClient dashboard={dashboard} />;
}
