import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { FileEdit } from "lucide-react";

export const metadata = {
  title: "Change Orders - ConstructionERP",
};

export default async function ChangeOrdersPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><FileEdit size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access change orders.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Change Orders</h2>
          <p className="fin-header-sub">Track scope changes, cost impact, and schedule adjustments</p>
        </div>
      </div>
      <div className="fin-empty">
        <div className="fin-empty-icon"><FileEdit size={48} /></div>
        <div className="fin-empty-title">Change Order Management Coming Soon</div>
        <div className="fin-empty-desc">
          Change order creation with cost and schedule impact analysis,
          approval workflows, and audit trails are under development.
        </div>
      </div>
    </div>
  );
}
