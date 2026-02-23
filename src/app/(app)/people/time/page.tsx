import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getTimeEntries, getTimeEntriesFromClockEvents, type TimeEntry } from "@/lib/queries/people";
import { getEmployeeRateMap, rateMapToRecord } from "@/lib/utils/labor-cost";
import TimeClient from "./TimeClient";

export const metadata = {
  title: "Time & Attendance - Buildwrk",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function formatDateISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function TimeAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; view?: string }>;
}) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const params = await searchParams;
  const { companyId } = userCompany;
  const currentView = params.view === "all" ? "all" : "weekly";

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

  const weekDates = Array.from({ length: 7 }, (_, i) =>
    formatDateISO(addDays(weekStart, i))
  );

  // Fetch time entries from both tables (time_entries + clock_events)
  // and merge them, deduplicating by user+date
  const weekFilter = {
    dateRange: {
      start: formatDateISO(weekStart),
      end: formatDateISO(weekEnd),
    },
  };

  const [manualEntries, clockEntries, allManual, allClock, rateMap] = await Promise.all([
    getTimeEntries(supabase, companyId, weekFilter),
    getTimeEntriesFromClockEvents(supabase, companyId, weekFilter),
    currentView === "all"
      ? getTimeEntries(supabase, companyId)
      : Promise.resolve([]),
    currentView === "all"
      ? getTimeEntriesFromClockEvents(supabase, companyId)
      : Promise.resolve([]),
    getEmployeeRateMap(supabase, companyId),
  ]);

  // Merge: manual time_entries take precedence over clock-derived ones
  function mergeEntries(manual: TimeEntry[], clock: TimeEntry[]): TimeEntry[] {
    const seen = new Set(manual.map((e) => `${e.user_id}::${e.entry_date}`));
    return [...manual, ...clock.filter((e) => !seen.has(`${e.user_id}::${e.entry_date}`))];
  }

  const entries = mergeEntries(manualEntries, clockEntries);
  const allEntries = mergeEntries(allManual, allClock);

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
  const pendingCount = entries.filter((e) => e.status === "pending").length;

  return (
    <TimeClient
      users={users}
      entries={entries}
      allEntries={allEntries}
      currentView={currentView}
      pendingCount={pendingCount}
      weekDates={weekDates}
      weekStartISO={formatDateISO(weekStart)}
      weekEndISO={formatDateISO(weekEnd)}
      prevWeekISO={formatDateISO(prevWeek)}
      nextWeekISO={formatDateISO(nextWeek)}
      userRole={userCompany.role}
      rateMap={rateMapToRecord(rateMap)}
    />
  );
}
