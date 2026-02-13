import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { FileSignature } from "lucide-react";

export const metadata = {
  title: "Leases - ConstructionERP",
};

export default async function LeasesPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><FileSignature size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access leases.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Lease Management</h2>
          <p className="fin-header-sub">Track leases, renewals, rent schedules, and tenant information</p>
        </div>
      </div>
      <div className="fin-empty">
        <div className="fin-empty-icon"><FileSignature size={48} /></div>
        <div className="fin-empty-title">Lease Management Coming Soon</div>
        <div className="fin-empty-desc">
          Lease tracking with auto-renewal alerts, rent escalation schedules,
          tenant management, and financial reporting are under development.
        </div>
      </div>
    </div>
  );
}
