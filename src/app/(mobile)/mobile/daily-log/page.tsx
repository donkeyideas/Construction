import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import DailyLogClient from "./DailyLogClient";

export const metadata = {
  title: "Daily Log - ConstructionERP",
};

export default async function DailyLogPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/login");
  }

  const { companyId } = userCompany;

  // Fetch active projects for dropdown
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, code")
    .eq("company_id", companyId)
    .in("status", ["active", "pre_construction"])
    .order("name", { ascending: true });

  // Fetch recent daily logs for this company
  const { data: recentLogs } = await supabase
    .from("daily_logs")
    .select(
      "id, log_date, weather_condition, work_performed, projects(name)"
    )
    .eq("company_id", companyId)
    .order("log_date", { ascending: false })
    .limit(5);

  const projectList = (projects ?? []) as Array<{
    id: string;
    name: string;
    code: string;
  }>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logList = (recentLogs ?? []).map((log: any) => ({
    id: log.id as string,
    logDate: log.log_date as string,
    weatherCondition: log.weather_condition as string | null,
    workPerformed: log.work_performed as string | null,
    projectName: (log.projects as { name: string } | null)?.name ?? null,
  }));

  return (
    <div>
      <div className="mobile-header">
        <div>
          <h2>Daily Log</h2>
          <div className="mobile-header-date">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </div>

      <DailyLogClient projects={projectList} />

      {/* Recent Logs */}
      {logList.length > 0 && (
        <>
          <div className="mobile-section-title">Recent Logs</div>
          {logList.map(
            (log: {
              id: string;
              logDate: string;
              weatherCondition: string | null;
              workPerformed: string | null;
              projectName: string | null;
            }) => (
              <div key={log.id} className="mobile-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: "0.85rem",
                    }}
                  >
                    {log.projectName ?? "No Project"}
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--muted)",
                    }}
                  >
                    {new Date(log.logDate + "T00:00:00").toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </span>
                </div>
                {log.weatherCondition && (
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--muted)",
                      marginBottom: "4px",
                    }}
                  >
                    Weather: {log.weatherCondition}
                  </div>
                )}
                {log.workPerformed && (
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text)",
                    }}
                  >
                    {log.workPerformed.length > 120
                      ? log.workPerformed.slice(0, 120) + "..."
                      : log.workPerformed}
                  </div>
                )}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
