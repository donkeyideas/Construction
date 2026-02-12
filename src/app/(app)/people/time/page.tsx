import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getTimeEntries, type TimeEntry } from "@/lib/queries/people";

export const metadata = {
  title: "Time & Attendance - ConstructionERP",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get Monday of the week containing the given date. */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function TimeAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const params = await searchParams;
  const { companyId } = userCompany;

  // Determine the week
  const today = new Date();
  let weekStart: Date;

  if (params.week) {
    weekStart = getMonday(new Date(params.week));
  } else {
    weekStart = getMonday(today);
  }

  const weekEnd = addDays(weekStart, 6);
  const prevWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  // Build dates for each day of the week
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch time entries for this week
  const entries = await getTimeEntries(supabase, companyId, {
    dateRange: {
      start: formatDateISO(weekStart),
      end: formatDateISO(weekEnd),
    },
  });

  // Group by user
  const userMap = new Map<
    string,
    {
      userId: string;
      name: string;
      email: string;
      entries: TimeEntry[];
    }
  >();

  for (const entry of entries) {
    if (!userMap.has(entry.user_id)) {
      const name =
        entry.user_profile?.full_name ||
        entry.user_profile?.email ||
        "Unknown User";
      userMap.set(entry.user_id, {
        userId: entry.user_id,
        name,
        email: entry.user_profile?.email || "",
        entries: [],
      });
    }
    userMap.get(entry.user_id)!.entries.push(entry);
  }

  const users = Array.from(userMap.values());

  // Count pending entries
  const pendingCount = entries.filter((e) => e.status === "pending").length;

  const isEmpty = entries.length === 0;

  return (
    <div>
      {/* Header */}
      <div className="people-header">
        <div>
          <h2>Time & Attendance</h2>
          <p className="people-header-sub">
            Track team hours and approve timesheets.
          </p>
        </div>
        <div className="people-header-actions">
          <Link href="/people" className="ui-btn ui-btn-md ui-btn-secondary">
            People Directory
          </Link>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="week-nav">
        <Link
          href={`/people/time?week=${formatDateISO(prevWeek)}`}
          className="week-nav-btn"
        >
          <ChevronLeft size={18} />
        </Link>
        <Link
          href={`/people/time?week=${formatDateISO(nextWeek)}`}
          className="week-nav-btn"
        >
          <ChevronRight size={18} />
        </Link>
        <span className="week-nav-label">
          Week of {formatDateShort(weekStart)}
        </span>
        <span className="week-nav-dates">
          {formatDateShort(weekStart)} - {formatDateShort(weekEnd)},{" "}
          {weekEnd.getFullYear()}
        </span>
      </div>

      {/* Actions Bar */}
      {pendingCount > 0 && (
        <div className="timesheet-actions">
          <div className="timesheet-actions-info">
            <strong>{pendingCount}</strong> time{" "}
            {pendingCount !== 1 ? "entries" : "entry"} pending approval
          </div>
          <button className="ui-btn ui-btn-sm ui-btn-primary">
            <CheckCircle2 size={14} />
            Approve All
          </button>
        </div>
      )}

      {/* Timesheet Grid */}
      {isEmpty ? (
        <div className="people-empty">
          <div className="people-empty-icon">
            <Clock size={48} />
          </div>
          <div className="people-empty-title">No time entries this week</div>
          <p className="people-empty-desc">
            No team members have logged hours for the week of{" "}
            {formatDateShort(weekStart)}. Time entries will appear here as they
            are submitted.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="timesheet-grid">
              <thead>
                <tr>
                  <th>Team Member</th>
                  {weekDates.map((date, i) => (
                    <th key={i}>
                      {DAY_LABELS[i]}
                      <br />
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 400,
                          color: "var(--muted)",
                        }}
                      >
                        {date.getMonth() + 1}/{date.getDate()}
                      </span>
                    </th>
                  ))}
                  <th className="total-col">Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  // Calculate hours per day
                  const dailyHours = weekDates.map((date) => {
                    const dateStr = formatDateISO(date);
                    const dayEntries = user.entries.filter(
                      (e) => e.entry_date === dateStr
                    );
                    return dayEntries.reduce(
                      (sum, e) => sum + (Number(e.hours) || 0),
                      0
                    );
                  });

                  const totalHours = dailyHours.reduce((a, b) => a + b, 0);

                  // Determine overall status
                  const statuses = user.entries.map((e) => e.status);
                  const overallStatus = statuses.includes("rejected")
                    ? "rejected"
                    : statuses.includes("pending")
                      ? "pending"
                      : "approved";

                  const initials = user.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={user.userId}>
                      <td>
                        <div className="timesheet-person">
                          <div className="timesheet-person-avatar">
                            {initials}
                          </div>
                          <div className="timesheet-person-info">
                            <div className="timesheet-person-name">
                              {user.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      {dailyHours.map((hours, i) => (
                        <td key={i}>
                          <div
                            className={`timesheet-cell ${
                              hours > 0 ? "has-hours" : "no-hours"
                            }`}
                          >
                            {hours > 0 ? hours.toFixed(1) : "--"}
                          </div>
                        </td>
                      ))}
                      <td className="total-col">
                        {totalHours > 0 ? totalHours.toFixed(1) : "--"}
                      </td>
                      <td>
                        <span className={`time-status time-status-${overallStatus}`}>
                          {overallStatus === "pending"
                            ? "Pending"
                            : overallStatus === "approved"
                              ? "Approved"
                              : "Rejected"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
