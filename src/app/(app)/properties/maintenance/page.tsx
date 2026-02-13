import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { Wrench } from "lucide-react";

export const metadata = {
  title: "Maintenance - ConstructionERP",
};

export default async function MaintenancePage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><Wrench size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access maintenance requests.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Maintenance Requests</h2>
          <p className="fin-header-sub">Track work orders, preventive maintenance, and repair requests</p>
        </div>
      </div>
      <div className="fin-empty">
        <div className="fin-empty-icon"><Wrench size={48} /></div>
        <div className="fin-empty-title">Maintenance Management Coming Soon</div>
        <div className="fin-empty-desc">
          Work order management, preventive maintenance scheduling,
          vendor assignment, and cost tracking are under development.
        </div>
      </div>
    </div>
  );
}
