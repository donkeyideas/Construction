import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { Map } from "lucide-react";

export const metadata = {
  title: "Plan Room - ConstructionERP",
};

export default async function PlanRoomPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><Map size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access the plan room.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Plan Room</h2>
          <p className="fin-header-sub">View and manage construction drawings, blueprints, and specifications</p>
        </div>
      </div>
      <div className="fin-empty">
        <div className="fin-empty-icon"><Map size={48} /></div>
        <div className="fin-empty-title">Plan Room Coming Soon</div>
        <div className="fin-empty-desc">
          Drawing management with version control, markup tools,
          sheet indexing, and RFI linking are under development.
        </div>
      </div>
    </div>
  );
}
