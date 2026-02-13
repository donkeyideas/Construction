import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { TrendingUp } from "lucide-react";

export const metadata = {
  title: "Cash Flow - ConstructionERP",
};

export default async function CashFlowPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><TrendingUp size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access cash flow.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Cash Flow</h2>
          <p className="fin-header-sub">Monitor inflows, outflows, and project-level cash projections</p>
        </div>
      </div>
      <div className="fin-empty">
        <div className="fin-empty-icon"><TrendingUp size={48} /></div>
        <div className="fin-empty-title">Cash Flow Analysis Coming Soon</div>
        <div className="fin-empty-desc">
          Cash flow projections, bank account reconciliation,
          project-level cash requirements, and liquidity forecasting are under development.
        </div>
      </div>
    </div>
  );
}
