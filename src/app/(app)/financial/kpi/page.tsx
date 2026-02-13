import { BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getFinancialKPIs } from "@/lib/queries/financial";
import KPIDashboardClient from "./KPIDashboardClient";

export const metadata = {
  title: "Financial KPIs - ConstructionERP",
};

export default async function KPIDashboardPage() {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon">
          <BarChart3 size={48} />
        </div>
        <div className="fin-empty-title">Connection Error</div>
        <div className="fin-empty-desc">
          Unable to connect to the database. Please try again.
        </div>
      </div>
    );
  }

  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon">
          <BarChart3 size={48} />
        </div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">
          Complete your company registration to view financial KPIs.
        </div>
      </div>
    );
  }

  const kpis = await getFinancialKPIs(supabase, userCompany.companyId);

  return <KPIDashboardClient kpis={kpis} />;
}
