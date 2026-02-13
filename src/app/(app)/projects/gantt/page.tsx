import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { GanttChart } from "lucide-react";

export const metadata = {
  title: "Gantt Schedule - ConstructionERP",
};

export default async function GanttPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><GanttChart size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access the Gantt schedule.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Gantt Schedule</h2>
          <p className="fin-header-sub">Interactive project timeline and critical path analysis</p>
        </div>
      </div>
      <div className="fin-empty">
        <div className="fin-empty-icon"><GanttChart size={48} /></div>
        <div className="fin-empty-title">Gantt Chart Coming Soon</div>
        <div className="fin-empty-desc">
          The interactive Gantt schedule with drag-and-drop task management, dependency tracking,
          and critical path analysis is under development.
        </div>
      </div>
    </div>
  );
}
