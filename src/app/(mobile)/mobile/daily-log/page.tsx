import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getTranslations, getLocale } from "next-intl/server";
import DailyLogClient from "./DailyLogClient";
import { formatDateShort, formatDateSafe, toDateStr } from "@/lib/utils/format";

export const metadata = {
  title: "Daily Log - Buildwrk",
};

export default async function DailyLogPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/login");
  }

  const { companyId } = userCompany;
  const t = await getTranslations("mobile.dailyLog");
  const locale = await getLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, code")
    .eq("company_id", companyId)
    .in("status", ["active", "pre_construction"])
    .order("name", { ascending: true });

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

  // Weather condition translation map
  const weatherKeyMap: Record<string, string> = {
    Clear: "weatherClear",
    "Partly Cloudy": "weatherPartlyCloudy",
    Overcast: "weatherOvercast",
    Rain: "weatherRain",
    "Heavy Rain": "weatherHeavyRain",
    Snow: "weatherSnow",
    Sleet: "weatherSleet",
    Fog: "weatherFog",
    Windy: "weatherWindy",
    Hot: "weatherHot",
    Cold: "weatherCold",
  };

  return (
    <div>
      <div className="mobile-header">
        <div>
          <h2>{t("title")}</h2>
          <div className="mobile-header-date">
            {formatDateSafe(toDateStr(new Date()))}
          </div>
        </div>
      </div>

      <DailyLogClient projects={projectList} />

      {/* Recent Logs */}
      {logList.length > 0 && (
        <>
          <div className="mobile-section-title">{t("recentLogs")}</div>
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
                    {log.projectName ?? t("noProjectLabel")}
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--muted)",
                    }}
                  >
                    {formatDateShort(log.logDate + "T00:00:00")}
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
                    {t("weatherPrefix", {
                      condition: weatherKeyMap[log.weatherCondition]
                        ? (t as any)(weatherKeyMap[log.weatherCondition])
                        : log.weatherCondition,
                    })}
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
