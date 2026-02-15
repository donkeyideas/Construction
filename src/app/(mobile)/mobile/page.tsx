import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  ClipboardList,
  Camera,
  ShieldCheck,
  MapPin,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getUserDisplayName } from "@/lib/queries/user";
import { getTranslations, getLocale } from "next-intl/server";

export const metadata = {
  title: "Mobile Home - Buildwrk",
};

export default async function MobileHomePage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/login");
  }

  const { userId, companyId } = userCompany;
  const userName = await getUserDisplayName(supabase, userId);
  const firstName = userName.split(" ")[0];
  const t = await getTranslations("mobile.dashboard");
  const locale = await getLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const dateDisplay = now.toLocaleDateString(dateLocale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Fetch today's data in parallel
  const [timeEntriesRes, projectsRes, tasksRes, activityRes] =
    await Promise.all([
      supabase
        .from("time_entries")
        .select("id, clock_in, clock_out, hours, project_id, projects(name)")
        .eq("company_id", companyId)
        .eq("user_id", userId)
        .eq("entry_date", today)
        .order("clock_in", { ascending: false }),

      supabase
        .from("projects")
        .select("id, name, code, address_line1, city, state, status")
        .eq("company_id", companyId)
        .in("status", ["active", "pre_construction"])
        .order("name", { ascending: true }),

      supabase
        .from("project_tasks")
        .select(
          "id, name, status, priority, project_id, projects(name, code)"
        )
        .eq("company_id", companyId)
        .eq("assigned_to", userId)
        .in("status", ["not_started", "in_progress"])
        .order("priority", { ascending: true })
        .limit(5),

      supabase
        .from("audit_log")
        .select("id, action, entity_type, details, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const timeEntries = timeEntriesRes.data ?? [];
  const projects = projectsRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const activity = activityRes.data ?? [];

  const openEntry = timeEntries.find(
    (e: { clock_in: string | null; clock_out: string | null }) =>
      e.clock_in && !e.clock_out
  );
  const isClockedIn = !!openEntry;

  const todayHours = timeEntries.reduce(
    (sum: number, e: { hours: number | null }) => sum + (e.hours ?? 0),
    0
  );

  return (
    <div>
      {/* Header */}
      <div className="mobile-header">
        <div>
          <h2>{t("hello", { name: firstName })}</h2>
          <div className="mobile-header-date">{dateDisplay}</div>
        </div>
        <div>
          {isClockedIn ? (
            <span className="mobile-status mobile-status-clocked-in">
              <CheckCircle size={14} /> {t("clockedIn")}
            </span>
          ) : (
            <span className="mobile-status mobile-status-clocked-out">
              <AlertCircle size={14} /> {t("clockedOut")}
            </span>
          )}
        </div>
      </div>

      {/* Clock-In Status Card */}
      <div className="mobile-card">
        <div className="mobile-card-title">
          {isClockedIn ? t("currentlyWorking") : t("notClockedIn")}
        </div>
        {isClockedIn && openEntry ? (
          <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
            {t("clockedInAt", {
              time: new Date(openEntry.clock_in).toLocaleTimeString(dateLocale, {
                hour: "numeric",
                minute: "2-digit",
              }),
            })}
          </p>
        ) : (
          <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
            {t("tapClockIn")}
          </p>
        )}
        <div style={{ marginTop: "10px" }}>
          <Link
            href="/mobile/clock"
            className={`clock-btn ${isClockedIn ? "clock-btn-out" : "clock-btn-in"}`}
            style={{ display: "block", textAlign: "center", textDecoration: "none" }}
          >
            {isClockedIn ? t("clockOut") : t("clockIn")}
          </Link>
        </div>
        {todayHours > 0 && (
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--muted)",
              textAlign: "center",
              marginTop: "8px",
            }}
          >
            {t("todayHoursLogged", { hours: todayHours.toFixed(1) })}
          </p>
        )}
      </div>

      {/* Active Project Cards */}
      {projects.length > 0 && (
        <>
          <div className="mobile-section-title">{t("activeProjects")}</div>
          {projects.slice(0, 3).map(
            (project: {
              id: string;
              name: string;
              code: string;
              address_line1: string | null;
              city: string | null;
              state: string | null;
            }) => (
              <div key={project.id} className="mobile-card">
                <div className="mobile-card-title">{project.name}</div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                  }}
                >
                  <MapPin size={12} />
                  {[project.address_line1, project.city, project.state]
                    .filter(Boolean)
                    .join(", ") || t("noAddress")}
                </div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--muted)",
                    marginTop: "4px",
                  }}
                >
                  {t("projectCode", { code: project.code })}
                </div>
              </div>
            )
          )}
        </>
      )}

      {/* Quick Actions */}
      <div className="mobile-section-title">{t("quickActions")}</div>
      <div className="quick-actions">
        <Link href="/mobile/clock" className="quick-action">
          <Clock size={22} />
          {t("clockIn")}
        </Link>
        <Link href="/mobile/daily-log" className="quick-action">
          <ClipboardList size={22} />
          {t("dailyLog")}
        </Link>
        <Link href="/mobile/photos" className="quick-action">
          <Camera size={22} />
          {t("takePhoto")}
        </Link>
        <Link href="/mobile/daily-log" className="quick-action">
          <ShieldCheck size={22} />
          {t("safetyCheck")}
        </Link>
      </div>

      {/* Today's Tasks */}
      {tasks.length > 0 && (
        <>
          <div className="mobile-section-title">{t("yourTasks")}</div>
          <div className="mobile-card">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {tasks.map(
              (task: any) => (
                <div key={task.id} className="mobile-task">
                  <div
                    className={`mobile-task-checkbox ${task.status === "completed" ? "done" : ""}`}
                  />
                  <div>
                    <div className="mobile-task-name">{task.name}</div>
                    <div className="mobile-task-meta">
                      {(task.projects as { name: string } | null)?.name ??
                        t("unassigned")}{" "}
                      -- {task.priority}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </>
      )}

      {/* Recent Notifications */}
      {activity.length > 0 && (
        <>
          <div className="mobile-section-title">{t("recentActivity")}</div>
          <div className="mobile-card">
            {activity.map(
              (item: {
                id: string;
                action: string;
                entity_type: string | null;
                details: Record<string, unknown> | null;
                created_at: string;
              }) => {
                const details = (item.details ?? {}) as Record<
                  string,
                  unknown
                >;
                const refName =
                  (details.name as string) ??
                  (details.title as string) ??
                  item.entity_type ??
                  "";
                return (
                  <div key={item.id} className="mobile-notif">
                    <div className="mobile-notif-dot" />
                    <div className="mobile-notif-text">
                      <div>
                        {item.action.replace(/_/g, " ")} {refName}
                      </div>
                      <div className="mobile-notif-time">
                        {new Date(item.created_at).toLocaleTimeString(dateLocale, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </>
      )}
    </div>
  );
}
