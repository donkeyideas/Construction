import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getEmployeePayRates,
  upsertEmployeePayRate,
} from "@/lib/queries/payroll";
import { getTimeEntries, getTimeEntriesFromClockEvents, type TimeEntry } from "@/lib/queries/people";
import { getEmployeeRateMap, rateMapToRecord } from "@/lib/utils/labor-cost";
import { getTzToday, toTzDateStr } from "@/lib/utils/timezone";
import LaborClient from "./LaborClient";

export const metadata = {
  title: "Labor & Time - Buildwrk",
};

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

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
  return toTzDateStr(date);
}

/* ------------------------------------------------------------------
   Page
   ------------------------------------------------------------------ */

export default async function LaborPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; tab?: string }>;
}) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const params = await searchParams;
  const { companyId, role } = userCompany;

  /* ----------------------------------------------------------------
     Week calculations for time / activity tabs
     ---------------------------------------------------------------- */
  const today = new Date();
  const todayISO = getTzToday();

  let weekStart: Date;
  if (params.week) {
    weekStart = getMonday(new Date(params.week));
  } else {
    weekStart = getMonday(today);
  }

  const weekEnd = addDays(weekStart, 6);
  const prevWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);
  const weekDates = Array.from({ length: 7 }, (_, i) => formatDateISO(addDays(weekStart, i)));
  const weekStartISO = formatDateISO(weekStart);
  const weekEndISO = formatDateISO(weekEnd);

  // Activity week always uses current week
  const activityWeekStart = new Date(today);
  activityWeekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
  const activityWeekStartISO = toTzDateStr(activityWeekStart);

  /* ----------------------------------------------------------------
     Parallel data fetching
     ---------------------------------------------------------------- */
  const weekFilter = {
    dateRange: { start: weekStartISO, end: weekEndISO },
  };

  const [
    payRates,
    employeeContactsRes,
    rateMap,
    clockEventsRes,
    manualEntries,
    clockEntries,
    allManual,
    allClock,
  ] = await Promise.all([
    getEmployeePayRates(supabase, companyId),
    supabase
      .from("contacts")
      .select("id, first_name, last_name, email, job_title, user_id, contact_type, hourly_rate")
      .eq("company_id", companyId)
      .eq("contact_type", "employee")
      .eq("is_active", true)
      .order("last_name"),
    getEmployeeRateMap(supabase, companyId),
    // Clock events for activity tab
    supabase
      .from("clock_events")
      .select("id, user_id, event_type, timestamp, project_id, notes, created_at")
      .eq("company_id", companyId)
      .gte("timestamp", activityWeekStartISO + "T00:00:00")
      .order("timestamp", { ascending: false }),
    // Time entries for weekly view
    getTimeEntries(supabase, companyId, weekFilter),
    getTimeEntriesFromClockEvents(supabase, companyId, weekFilter),
    // All time entries
    getTimeEntries(supabase, companyId),
    getTimeEntriesFromClockEvents(supabase, companyId),
  ]);

  const employeeContacts = (employeeContactsRes.data ?? []) as {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    job_title: string | null;
    user_id: string | null;
    contact_type: string;
    hourly_rate: number | null;
  }[];

  /* ----------------------------------------------------------------
     Auto-seed: Pay Rates from contacts.hourly_rate for unconfigured employees
     ---------------------------------------------------------------- */
  let effectivePayRates = payRates;
  const configuredUserIds = new Set(payRates.map((pr) => pr.user_id));
  const unconfiguredWithRate = employeeContacts.filter(
    (c) => c.user_id && !configuredUserIds.has(c.user_id) && c.hourly_rate && c.hourly_rate > 0
  );

  if (unconfiguredWithRate.length > 0) {
    try {
      await Promise.all(
        unconfiguredWithRate.map((c) =>
          upsertEmployeePayRate(supabase, companyId, {
            user_id: c.user_id!,
            pay_type: "hourly",
            hourly_rate: c.hourly_rate!,
            overtime_rate: Math.round(c.hourly_rate! * 1.5 * 100) / 100,
            filing_status: "single",
            federal_allowances: 0,
            state_code: "",
            effective_date: getTzToday(),
          })
        )
      );
      effectivePayRates = await getEmployeePayRates(supabase, companyId);
    } catch {
      // Non-blocking — employees can still be set up manually
    }
  }

  /* ----------------------------------------------------------------
     User profiles for employee cards
     ---------------------------------------------------------------- */
  const userIds = effectivePayRates.map((pr) => pr.user_id);
  let userProfiles: { id: string; full_name: string | null; email: string | null }[] = [];
  if (userIds.length > 0) {
    const { data } = await supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    userProfiles = (data ?? []) as { id: string; full_name: string | null; email: string | null }[];
  }

  /* ----------------------------------------------------------------
     Process activity data (from clock_events)
     ---------------------------------------------------------------- */
  const clockEvents = clockEventsRes.data ?? [];
  const employees = employeeContacts.filter((e) => e.user_id);

  const employeeMap: Record<string, { name: string; email: string; jobTitle: string }> = {};
  for (const emp of employees) {
    if (emp.user_id) {
      employeeMap[emp.user_id] = {
        name: `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim() || emp.email || "Unknown",
        email: emp.email || "",
        jobTitle: emp.job_title || "",
      };
    }
  }

  type ActivityClockEvent = {
    id: string;
    user_id: string;
    event_type: string;
    timestamp: string;
    notes: string | null;
  };

  type EmployeeActivityItem = {
    userId: string;
    name: string;
    email: string;
    jobTitle: string;
    currentStatus: "clocked_in" | "clocked_out" | "no_activity";
    lastEvent: string | null;
    todayHours: number;
    weekHours: number;
    todayEvents: ActivityClockEvent[];
  };

  const activityMap = new Map<string, EmployeeActivityItem>();

  for (const [userId, emp] of Object.entries(employeeMap)) {
    activityMap.set(userId, {
      userId,
      name: emp.name,
      email: emp.email,
      jobTitle: emp.jobTitle,
      currentStatus: "no_activity",
      lastEvent: null,
      todayHours: 0,
      weekHours: 0,
      todayEvents: [],
    });
  }

  for (const event of clockEvents) {
    const userId = event.user_id;
    if (!activityMap.has(userId)) {
      activityMap.set(userId, {
        userId,
        name: "Unknown Employee",
        email: "",
        jobTitle: "",
        currentStatus: "no_activity",
        lastEvent: null,
        todayHours: 0,
        weekHours: 0,
        todayEvents: [],
      });
    }

    const activity = activityMap.get(userId)!;
    const eventDate = toTzDateStr(event.timestamp);

    if (!activity.lastEvent) {
      activity.lastEvent = event.timestamp;
      activity.currentStatus = event.event_type === "clock_in" ? "clocked_in" : "clocked_out";
    }

    if (eventDate === todayISO) {
      activity.todayEvents.push({
        id: event.id,
        user_id: event.user_id,
        event_type: event.event_type,
        timestamp: event.timestamp,
        notes: event.notes,
      });
    }
  }

  for (const activity of activityMap.values()) {
    const userEvents = clockEvents
      .filter((e) => e.user_id === activity.userId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let todayMs = 0;
    let weekMs = 0;

    for (let i = 0; i < userEvents.length; i++) {
      const ev = userEvents[i];
      if (ev.event_type === "clock_in") {
        const clockOut = userEvents[i + 1]?.event_type === "clock_out" ? userEvents[i + 1] : null;
        const endTime = clockOut ? new Date(clockOut.timestamp).getTime() : Date.now();
        const startTime = new Date(ev.timestamp).getTime();
        const duration = endTime - startTime;

        weekMs += duration;
        if (toTzDateStr(ev.timestamp) === todayISO) {
          todayMs += duration;
        }
        if (clockOut) i++;
      }
    }

    activity.todayHours = Math.round((todayMs / (1000 * 60 * 60)) * 10) / 10;
    activity.weekHours = Math.round((weekMs / (1000 * 60 * 60)) * 10) / 10;
  }

  const statusOrder = { clocked_in: 0, clocked_out: 1, no_activity: 2 };
  const activities = Array.from(activityMap.values()).sort(
    (a, b) => statusOrder[a.currentStatus] - statusOrder[b.currentStatus]
  );

  /* ----------------------------------------------------------------
     Overview stats — labor-focused
     ---------------------------------------------------------------- */
  // Approved hours
  const { data: approvedHoursData } = await supabase
    .from("time_entries")
    .select("hours, user_id")
    .eq("company_id", companyId)
    .eq("status", "approved");

  const approvedHours = (approvedHoursData ?? []).reduce(
    (sum: number, r: { hours: number }) => sum + (r.hours ?? 0),
    0
  );

  // Pending hours
  const { data: pendingHoursData } = await supabase
    .from("time_entries")
    .select("hours")
    .eq("company_id", companyId)
    .eq("status", "pending");

  const pendingHours = (pendingHoursData ?? []).reduce(
    (sum: number, r: { hours: number }) => sum + (r.hours ?? 0),
    0
  );

  // Estimated labor cost from approved hours
  const rateMapRecord = rateMapToRecord(rateMap);
  let totalLaborCost = 0;
  for (const entry of approvedHoursData ?? []) {
    const rate = rateMapRecord[(entry as { user_id: string }).user_id] ?? 0;
    totalLaborCost += (entry.hours ?? 0) * rate;
  }

  const overview = {
    pendingHours: Math.round(pendingHours * 10) / 10,
    approvedHours: Math.round(approvedHours * 10) / 10,
    activeEmployees: employees.length,
    totalLaborCost: Math.round(totalLaborCost * 100) / 100,
  };

  /* ----------------------------------------------------------------
     Process time data
     ---------------------------------------------------------------- */
  function mergeEntries(manual: TimeEntry[], clock: TimeEntry[]): TimeEntry[] {
    const seen = new Set(manual.map((e) => `${e.user_id}::${e.entry_date}`));
    return [...manual, ...clock.filter((e) => !seen.has(`${e.user_id}::${e.entry_date}`))];
  }

  const timeEntries = mergeEntries(manualEntries, clockEntries);
  const allTimeEntries = mergeEntries(allManual, allClock);

  const timeUserMap = new Map<
    string,
    { userId: string; name: string; email: string; entries: TimeEntry[] }
  >();

  for (const entry of timeEntries) {
    if (!timeUserMap.has(entry.user_id)) {
      const name =
        entry.user_profile?.full_name ||
        entry.user_profile?.email ||
        "Unknown User";
      timeUserMap.set(entry.user_id, {
        userId: entry.user_id,
        name,
        email: entry.user_profile?.email || "",
        entries: [],
      });
    }
    timeUserMap.get(entry.user_id)!.entries.push(entry);
  }

  const timeUsers = Array.from(timeUserMap.values());
  const timePendingCount = timeEntries.filter((e) => e.status === "pending").length;

  /* ----------------------------------------------------------------
     Render
     ---------------------------------------------------------------- */
  return (
    <LaborClient
      payRates={effectivePayRates}
      userProfiles={userProfiles}
      overview={overview}
      companyId={companyId}
      userRole={role}
      employeeContacts={employeeContacts}
      // Activity data
      activities={JSON.parse(JSON.stringify(activities))}
      todayISO={todayISO}
      rateMap={rateMapRecord}
      // Time data
      timeUsers={timeUsers}
      timeEntries={timeEntries}
      allTimeEntries={allTimeEntries}
      timePendingCount={timePendingCount}
      weekDates={weekDates}
      weekStartISO={weekStartISO}
      weekEndISO={weekEndISO}
      prevWeekISO={formatDateISO(prevWeek)}
      nextWeekISO={formatDateISO(nextWeek)}
      // Default tab from URL
      defaultTab={params.tab || "dashboard"}
    />
  );
}
