import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { MessageSquareMore } from "lucide-react";

export const metadata = {
  title: "RFIs - ConstructionERP",
};

export default async function RfisPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><MessageSquareMore size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access RFIs.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Requests for Information</h2>
          <p className="fin-header-sub">Create, track, and respond to RFIs across all projects</p>
        </div>
      </div>
      <div className="fin-empty">
        <div className="fin-empty-icon"><MessageSquareMore size={48} /></div>
        <div className="fin-empty-title">RFI Management Coming Soon</div>
        <div className="fin-empty-desc">
          RFI creation, assignment, response tracking, and deadline management
          are under development.
        </div>
      </div>
    </div>
  );
}
