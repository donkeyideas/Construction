import Link from "next/link";
import {
  ClipboardList,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  Wind,
  Hash,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Wrench,
  HardHat,
  Thermometer,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

export const metadata = {
  title: "Daily Logs - ConstructionERP",
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

interface WorkforceEntry {
  trade?: string;
  company?: string;
  headcount?: number;
  hours?: number;
}

const WEATHER_ICONS: Record<string, React.ReactNode> = {
  sunny: <Sun size={16} />,
  clear: <Sun size={16} />,
  cloudy: <Cloud size={16} />,
  overcast: <Cloud size={16} />,
  partly_cloudy: <Cloud size={16} />,
  rain: <CloudRain size={16} />,
  rainy: <CloudRain size={16} />,
  snow: <Snowflake size={16} />,
  snowy: <Snowflake size={16} />,
  windy: <Wind size={16} />,
};

function getWeatherIcon(condition: string | null): React.ReactNode {
  if (!condition) return <Sun size={16} />;
  const key = condition.toLowerCase().replace(/\s+/g, "_");
  return WEATHER_ICONS[key] ?? <Cloud size={16} />;
}

const STATUS_BADGE: Record<string, string> = {
  draft: "inv-status inv-status-draft",
  submitted: "inv-status inv-status-pending",
  approved: "inv-status inv-status-approved",
};

export default async function DailyLogsPage({ searchParams }: PageProps) {
  const params = await searchParams;
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

  const activeStatus = params.status || undefined;

  // Build query
  let query = supabase
    .from("daily_logs")
    .select("*, projects(name, code)")
    .eq("company_id", userCompany.companyId)
    .order("log_date", { ascending: false });

  if (activeStatus && activeStatus !== "all") {
    query = query.eq("status", activeStatus);
  }

  const { data: dailyLogs } = await query;
  const rows = dailyLogs ?? [];

  // Fetch all logs (unfiltered) for KPI counts
  const { data: allLogs } = await supabase
    .from("daily_logs")
    .select("id, status")
    .eq("company_id", userCompany.companyId);

  const all = allLogs ?? [];
  const totalCount = all.length;
  const pendingReview = all.filter((l) => l.status === "submitted").length;
  const approvedCount = all.filter((l) => l.status === "approved").length;

  // Collect unique user IDs
  const userIds = new Set<string>();
  for (const log of rows) {
    if (log.created_by) userIds.add(log.created_by);
    if (log.approved_by) userIds.add(log.approved_by);
  }

  const userMap: Record<string, string> = {};
  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .in("id", Array.from(userIds));

    for (const p of profiles ?? []) {
      userMap[p.id] = p.full_name || p.email || "Unknown";
    }
  }

  const statuses = [
    { label: "All", value: "all" },
    { label: "Draft", value: "draft" },
    { label: "Submitted", value: "submitted" },
    { label: "Approved", value: "approved" },
  ];

  function buildUrl(status?: string): string {
    if (!status || status === "all") return "/projects/daily-logs";
    return `/projects/daily-logs?status=${status}`;
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Daily Logs</h2>
          <p className="fin-header-sub">Field reports with weather, workforce, equipment, and activity tracking</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="financial-kpi-row">
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <Hash size={18} />
          </div>
          <span className="fin-kpi-label">Total Logs</span>
          <span className="fin-kpi-value">{totalCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <Clock size={18} />
          </div>
          <span className="fin-kpi-label">Pending Review</span>
          <span className="fin-kpi-value">{pendingReview}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon green">
            <CheckCircle2 size={18} />
          </div>
          <span className="fin-kpi-label">Approved</span>
          <span className="fin-kpi-value">{approvedCount}</span>
        </div>
      </div>

      {/* Status Filters */}
      <div className="fin-filters">
        <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500 }}>
          Status:
        </label>
        {statuses.map((s) => (
          <Link
            key={s.value}
            href={buildUrl(s.value)}
            className={`ui-btn ui-btn-sm ${
              activeStatus === s.value || (!activeStatus && s.value === "all")
                ? "ui-btn-primary"
                : "ui-btn-outline"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Card-based layout */}
      {rows.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {rows.map((log) => {
            const project = log.projects as { name: string; code: string } | null;
            const workforce = (log.workforce ?? []) as WorkforceEntry[];
            const equipment = (log.equipment ?? []) as Array<Record<string, unknown>>;
            const totalWorkers = workforce.reduce((sum, w) => sum + (w.headcount ?? 0), 0);
            const totalManHours = workforce.reduce(
              (sum, w) => sum + (w.headcount ?? 0) * (w.hours ?? 0),
              0
            );
            const hasSafety = !!log.safety_incidents;
            const hasDelays = !!log.delays;

            return (
              <div key={log.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                {/* Card Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 20px",
                    borderBottom: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                      {new Date(log.log_date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className={STATUS_BADGE[log.status] ?? "inv-status"}>
                      {log.status}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.82rem", color: "var(--muted)" }}>
                    {project && (
                      <span>
                        <strong>{project.code}</strong> {project.name}
                      </span>
                    )}
                    {log.created_by && (
                      <span>by {userMap[log.created_by] ?? "Unknown"}</span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Weather Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      fontSize: "0.85rem",
                      color: "var(--muted)",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {getWeatherIcon(log.weather_conditions)}
                      {log.weather_conditions ?? "N/A"}
                    </span>
                    {(log.weather_temp_high != null || log.weather_temp_low != null) && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Thermometer size={14} />
                        {log.weather_temp_low != null ? `${log.weather_temp_low}` : "--"}
                        {" / "}
                        {log.weather_temp_high != null ? `${log.weather_temp_high}` : "--"}
                        &deg;F
                      </span>
                    )}
                    {log.weather_wind_mph != null && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Wind size={14} />
                        {log.weather_wind_mph} mph
                      </span>
                    )}
                  </div>

                  {/* Work Performed */}
                  {log.work_performed && (
                    <div>
                      <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        Work Performed
                      </div>
                      <div style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>
                        {log.work_performed}
                      </div>
                    </div>
                  )}

                  {/* Stats Row */}
                  <div
                    style={{
                      display: "flex",
                      gap: 20,
                      flexWrap: "wrap",
                      fontSize: "0.85rem",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Users size={14} style={{ color: "var(--color-blue)" }} />
                      <strong>{totalWorkers}</strong> workers
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <HardHat size={14} style={{ color: "var(--color-blue)" }} />
                      <strong>{totalManHours.toLocaleString()}</strong> man-hrs
                    </span>
                    {equipment.length > 0 && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Wrench size={14} style={{ color: "var(--color-blue)" }} />
                        <strong>{equipment.length}</strong> equipment
                      </span>
                    )}
                  </div>

                  {/* Safety / Delay flags */}
                  {(hasSafety || hasDelays) && (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {hasSafety && (
                        <span
                          className="badge badge-red"
                          style={{ display: "flex", alignItems: "center", gap: 4 }}
                        >
                          <AlertTriangle size={12} />
                          Safety Incident
                        </span>
                      )}
                      {hasDelays && (
                        <span
                          className="badge badge-amber"
                          style={{ display: "flex", alignItems: "center", gap: 4 }}
                        >
                          <Clock size={12} />
                          Delay Reported
                        </span>
                      )}
                    </div>
                  )}

                  {/* Workforce Breakdown */}
                  {workforce.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {workforce.map((w, i) => (
                        <span
                          key={i}
                          className="badge badge-blue"
                          style={{ fontSize: "0.75rem" }}
                        >
                          {w.trade ?? "General"}: {w.headcount ?? 0}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expandable details: materials, delays, safety */}
                  {(log.materials_received || log.delays || log.safety_incidents) && (
                    <details
                      style={{
                        borderTop: "1px solid var(--border)",
                        paddingTop: 12,
                        marginTop: 2,
                      }}
                    >
                      <summary
                        style={{
                          cursor: "pointer",
                          fontSize: "0.82rem",
                          fontWeight: 500,
                          color: "var(--color-blue)",
                          userSelect: "none",
                        }}
                      >
                        Additional Details
                      </summary>
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10, fontSize: "0.85rem" }}>
                        {log.materials_received && (
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "0.78rem", color: "var(--muted)", marginBottom: 2 }}>
                              Materials Received
                            </div>
                            <div style={{ lineHeight: 1.5 }}>{log.materials_received}</div>
                          </div>
                        )}
                        {log.delays && (
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "0.78rem", color: "var(--color-amber)", marginBottom: 2 }}>
                              Delays
                            </div>
                            <div style={{ lineHeight: 1.5 }}>{log.delays}</div>
                          </div>
                        )}
                        {log.safety_incidents && (
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "0.78rem", color: "var(--color-red)", marginBottom: 2 }}>
                              Safety Incidents
                            </div>
                            <div style={{ lineHeight: 1.5 }}>{log.safety_incidents}</div>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <ClipboardList size={48} />
            </div>
            <div className="fin-empty-title">No Daily Logs Found</div>
            <div className="fin-empty-desc">
              {activeStatus && activeStatus !== "all"
                ? "No daily logs match the current filter. Try selecting a different status."
                : "No daily logs have been created yet. Field reports will appear here once submitted."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
