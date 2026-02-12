import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import ClockClient from "./ClockClient";

export const metadata = {
  title: "Clock In/Out - ConstructionERP",
};

export default async function ClockPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/login");
  }

  const { userId, companyId } = userCompany;
  const today = new Date().toISOString().slice(0, 10);

  // Calculate start of the current week (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const weekStart = monday.toISOString().slice(0, 10);

  // Fetch data in parallel
  const [todayEntriesRes, weekEntriesRes, projectsRes] = await Promise.all([
    // Today's time entries
    supabase
      .from("time_entries")
      .select("id, clock_in, clock_out, hours, project_id, projects(name)")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .eq("entry_date", today)
      .order("clock_in", { ascending: false }),

    // This week's time entries
    supabase
      .from("time_entries")
      .select("id, entry_date, clock_in, clock_out, hours")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .gte("entry_date", weekStart)
      .lte("entry_date", today)
      .order("entry_date", { ascending: true }),

    // Active projects for the dropdown
    supabase
      .from("projects")
      .select("id, name, code")
      .eq("company_id", companyId)
      .in("status", ["active", "pre_construction"])
      .order("name", { ascending: true }),
  ]);

  const todayEntries = todayEntriesRes.data ?? [];
  const weekEntries = weekEntriesRes.data ?? [];
  const projects = (projectsRes.data ?? []) as Array<{
    id: string;
    name: string;
    code: string;
  }>;

  // Determine if currently clocked in
  const openEntry = todayEntries.find(
    (e: { clock_in: string | null; clock_out: string | null }) =>
      e.clock_in && !e.clock_out
  );

  // Calculate today's total hours
  const todayHours = todayEntries.reduce(
    (sum: number, e: { hours: number | null }) => sum + (e.hours ?? 0),
    0
  );

  // Build weekly summary by day
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyData: Array<{ day: string; hours: number }> = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayHours = weekEntries
      .filter(
        (e: { entry_date: string }) => e.entry_date === dateStr
      )
      .reduce(
        (sum: number, e: { hours: number | null }) => sum + (e.hours ?? 0),
        0
      );
    weeklyData.push({ day: dayNames[i], hours: dayHours });
  }

  const weekTotalHours = weeklyData.reduce((sum, d) => sum + d.hours, 0);
  const maxDayHours = Math.max(...weeklyData.map((d) => d.hours), 1);

  // Recent entries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentEntries = todayEntries.slice(0, 5).map((e: any) => ({
    id: e.id as string,
    clockIn: e.clock_in as string | null,
    clockOut: e.clock_out as string | null,
    hours: e.hours as number | null,
    projectName: (e.projects as { name: string } | null)?.name ?? null,
  }));

  return (
    <div>
      <div className="mobile-header">
        <div>
          <h2>Time Clock</h2>
          <div className="mobile-header-date">
            {now.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </div>

      {/* Client-side clock component */}
      <ClockClient
        isClockedIn={!!openEntry}
        openEntryId={openEntry?.id ?? null}
        openEntryClockIn={openEntry?.clock_in ?? null}
        todayHours={todayHours}
        projects={projects}
      />

      {/* Weekly Summary */}
      <div className="mobile-card" style={{ marginTop: "12px" }}>
        <div className="mobile-card-title">
          This Week ({weekTotalHours.toFixed(1)}h)
        </div>
        <div className="weekly-hours">
          {weeklyData.map((d) => (
            <div key={d.day} className="weekly-hours-row">
              <span className="weekly-hours-day">{d.day}</span>
              <div className="weekly-hours-bar-bg">
                <div
                  className="weekly-hours-bar"
                  style={{
                    width: `${(d.hours / maxDayHours) * 100}%`,
                  }}
                />
              </div>
              <span className="weekly-hours-value">
                {d.hours > 0 ? `${d.hours.toFixed(1)}h` : "--"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Entries */}
      {recentEntries.length > 0 && (
        <div className="mobile-card">
          <div className="mobile-card-title">Today&apos;s Entries</div>
          {recentEntries.map(
            (entry: {
              id: string;
              clockIn: string | null;
              clockOut: string | null;
              hours: number | null;
              projectName: string | null;
            }) => (
              <div
                key={entry.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border)",
                  fontSize: "0.8rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {entry.clockIn
                      ? new Date(entry.clockIn).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "--"}{" "}
                    -{" "}
                    {entry.clockOut
                      ? new Date(entry.clockOut).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "Active"}
                  </div>
                  {entry.projectName && (
                    <div style={{ color: "var(--muted)", fontSize: "0.7rem" }}>
                      {entry.projectName}
                    </div>
                  )}
                </div>
                <div style={{ fontWeight: 600 }}>
                  {entry.hours ? `${entry.hours.toFixed(1)}h` : "--"}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
