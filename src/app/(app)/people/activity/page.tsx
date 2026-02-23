import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getEmployeeRateMap, rateMapToRecord } from "@/lib/utils/labor-cost";
import ActivityClient from "./ActivityClient";

export const metadata = { title: "Employee Activity - Buildwrk" };

export default async function EmployeeActivityPage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);
  if (!userCtx) redirect("/register");

  const { companyId } = userCtx;

  // Get today's date range
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
  const weekStartISO = weekStart.toISOString().slice(0, 10);

  // Fetch clock events, employee names, and pay rates in parallel
  const [clockRes, employeeRes, rateMap] = await Promise.all([
    supabase
      .from("clock_events")
      .select("id, user_id, event_type, timestamp, project_id, notes, created_at")
      .eq("company_id", companyId)
      .gte("timestamp", weekStartISO + "T00:00:00")
      .order("timestamp", { ascending: false }),
    supabase
      .from("contacts")
      .select("user_id, first_name, last_name, email, job_title")
      .eq("company_id", companyId)
      .eq("contact_type", "employee")
      .eq("is_active", true)
      .not("user_id", "is", null),
    getEmployeeRateMap(supabase, companyId),
  ]);

  const clockEvents = clockRes.data ?? [];
  const employees = employeeRes.data ?? [];

  // Build employee map
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

  // Build employee activity summary
  type ClockEvent = {
    id: string;
    user_id: string;
    event_type: string;
    timestamp: string;
    notes: string | null;
  };

  type EmployeeActivity = {
    userId: string;
    name: string;
    email: string;
    jobTitle: string;
    currentStatus: "clocked_in" | "clocked_out" | "no_activity";
    lastEvent: string | null;
    todayHours: number;
    weekHours: number;
    todayEvents: ClockEvent[];
  };

  const activityMap = new Map<string, EmployeeActivity>();

  // Initialize all employees with login
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

  // Process clock events (they're already sorted desc by timestamp)
  for (const event of clockEvents) {
    const userId = event.user_id;
    if (!activityMap.has(userId)) {
      // Employee clocked in but not in contacts (edge case)
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
    const eventDate = event.timestamp.slice(0, 10);

    // Set current status from most recent event
    if (!activity.lastEvent) {
      activity.lastEvent = event.timestamp;
      activity.currentStatus = event.event_type === "clock_in" ? "clocked_in" : "clocked_out";
    }

    // Collect today's events
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

  // Calculate hours for each employee from paired clock_in/clock_out events
  for (const activity of activityMap.values()) {
    // Get all events for this user sorted ascending
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
        if (ev.timestamp.slice(0, 10) === todayISO) {
          todayMs += duration;
        }
        if (clockOut) i++; // skip the clock_out event
      }
    }

    activity.todayHours = Math.round((todayMs / (1000 * 60 * 60)) * 10) / 10;
    activity.weekHours = Math.round((weekMs / (1000 * 60 * 60)) * 10) / 10;
  }

  // Sort: clocked_in first, then clocked_out, then no_activity
  const statusOrder = { clocked_in: 0, clocked_out: 1, no_activity: 2 };
  const activities = Array.from(activityMap.values()).sort(
    (a, b) => statusOrder[a.currentStatus] - statusOrder[b.currentStatus]
  );

  return (
    <ActivityClient
      activities={JSON.parse(JSON.stringify(activities))}
      todayISO={todayISO}
      rateMap={rateMapToRecord(rateMap)}
    />
  );
}
