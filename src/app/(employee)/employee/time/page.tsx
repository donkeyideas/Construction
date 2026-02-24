import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getClockEvents, getCurrentClockStatus } from "@/lib/queries/employee-portal";
import { getTzToday, toTzDateStr } from "@/lib/utils/timezone";
import ClockClient from "./ClockClient";

export const metadata = { title: "Clock In/Out - Buildwrk" };

export default async function EmployeeTimePage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);
  if (!userCtx) {
    redirect("/login");
  }

  const todayStr = getTzToday();

  // Fetch clock status and today's events in parallel
  const [clockStatus, todayEvents, weekEntriesRes] = await Promise.all([
    getCurrentClockStatus(supabase, userCtx.userId),
    getClockEvents(supabase, userCtx.userId, todayStr),
    // Get this week's time entries for daily summary
    (() => {
      const now = new Date();
      const day = now.getDay();
      const diff = (day + 6) % 7; // Monday = 0
      const monday = new Date(now);
      monday.setDate(now.getDate() - diff);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      return supabase
        .from("time_entries")
        .select("entry_date, hours")
        .eq("user_id", userCtx.userId)
        .eq("company_id", userCtx.companyId)
        .gte("entry_date", toTzDateStr(monday))
        .lte("entry_date", toTzDateStr(sunday));
    })(),
  ]);

  // Build weekly summary: { "2026-02-16": 8.5, ... }
  const weeklyHours: Record<string, number> = {};
  const now = new Date();
  const day = now.getDay();
  const diff = (day + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weeklyHours[toTzDateStr(d)] = 0;
  }

  for (const entry of weekEntriesRes.data ?? []) {
    const dateKey = (entry as { entry_date: string }).entry_date;
    const hours = Number((entry as { hours: number | null }).hours) || 0;
    if (weeklyHours[dateKey] !== undefined) {
      weeklyHours[dateKey] += hours;
    }
  }

  return (
    <ClockClient
      isClockedIn={clockStatus.isClockedIn}
      lastEvent={clockStatus.lastEvent}
      todayEvents={todayEvents}
      weeklyHours={weeklyHours}
    />
  );
}
