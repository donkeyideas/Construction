import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { ClipboardList } from "lucide-react";

export const metadata = {
  title: "Daily Logs - ConstructionERP",
};

export default async function DailyLogsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><ClipboardList size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access daily logs.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Daily Logs</h2>
          <p className="fin-header-sub">Field reports with weather, workforce, equipment, and activity tracking</p>
        </div>
      </div>
      <div className="fin-empty">
        <div className="fin-empty-icon"><ClipboardList size={48} /></div>
        <div className="fin-empty-title">Daily Logs Coming Soon</div>
        <div className="fin-empty-desc">
          Daily field logs with weather conditions, workforce counts, equipment tracking,
          and activity reporting are under development.
        </div>
      </div>
    </div>
  );
}
