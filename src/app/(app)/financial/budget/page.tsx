import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { BarChart3 } from "lucide-react";

export const metadata = {
  title: "Budget vs Actual - ConstructionERP",
};

export default async function BudgetPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><BarChart3 size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access budget tracking.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Budget vs Actual</h2>
          <p className="fin-header-sub">Compare budgeted costs against actual spending by project and division</p>
        </div>
      </div>
      <div className="fin-empty">
        <div className="fin-empty-icon"><BarChart3 size={48} /></div>
        <div className="fin-empty-title">Budget Tracking Coming Soon</div>
        <div className="fin-empty-desc">
          Project budget setup, real-time variance analysis by CSI division,
          cost forecasting, and earned value reporting are under development.
        </div>
      </div>
    </div>
  );
}
