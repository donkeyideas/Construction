import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClockEvent {
  id: string;
  company_id: string;
  user_id: string;
  event_type: "clock_in" | "clock_out";
  timestamp: string;
  project_id: string | null;
  notes: string | null;
  project_name?: string;
}

export interface EmployeeDashboardData {
  clockStatus: {
    isClockedIn: boolean;
    lastEvent: ClockEvent | null;
    todayEvents: ClockEvent[];
  };
  hoursThisWeek: number;
  weekClockEvents: ClockEvent[];
  pendingTimesheets: number;
  recentPayslip: { period: string; net_pay: number } | null;
  certifications: { total: number; expiring: number };
  employeeName: string;
  companyName: string;
  role: string;
  projects: { id: string; name: string }[];
  recentDailyLogs: {
    id: string;
    log_date: string;
    project_name: string | null;
    work_performed: string | null;
  }[];
  recentSafetyIncidents: {
    id: string;
    title: string;
    severity: string;
    created_at: string;
    project_name: string | null;
  }[];
  recentRfis: {
    id: string;
    subject: string;
    priority: string;
    status: string;
    created_at: string;
    project_name: string | null;
  }[];
  recentPhotos: {
    id: string;
    name: string;
    category: string;
    file_type: string;
    created_at: string;
    project_name: string | null;
  }[];
}

export interface EmployeeTimesheet {
  id: string;
  entry_date: string;
  clock_in: string | null;
  clock_out: string | null;
  hours: number | null;
  status: string;
  work_type: string | null;
  cost_code: string | null;
  notes: string | null;
  project_name: string | null;
}

export interface EmployeePayslip {
  id: string;
  payroll_run_id: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  gross_pay: number;
  federal_income_tax: number;
  state_income_tax: number;
  social_security_employee: number;
  medicare_employee: number;
  total_taxes: number;
  pretax_deductions: number;
  posttax_deductions: number;
  total_deductions: number;
  net_pay: number;
}

export interface EmployeeCertification {
  id: string;
  cert_type: string | null;
  cert_name: string;
  issuing_authority: string | null;
  cert_number: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  document_url: string | null;
  status: "valid" | "expiring_soon" | "expired";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the Monday of the ISO week (Mon-Sun) for a given date.
 */
function getISOWeekMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  // day 0=Sunday, 1=Monday ... 6=Saturday
  // Shift so Monday=0: (day + 6) % 7
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

/**
 * Calculate total completed hours from paired clock_in/clock_out events.
 * Does NOT count still-clocked-in time (client handles live timer).
 */
function calculateHoursFromEvents(events: ClockEvent[]): number {
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  let totalMs = 0;
  let pendingIn: Date | null = null;
  for (const e of sorted) {
    if (e.event_type === "clock_in") {
      pendingIn = new Date(e.timestamp);
    } else if (e.event_type === "clock_out" && pendingIn) {
      totalMs += new Date(e.timestamp).getTime() - pendingIn.getTime();
      pendingIn = null;
    }
  }
  return Math.round((totalMs / 3_600_000) * 100) / 100;
}

/**
 * Compute certification status from expiry_date.
 */
function computeCertStatus(
  expiryDate: string | null
): "valid" | "expiring_soon" | "expired" {
  if (!expiryDate) return "valid";

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  if (expiry < now) return "expired";

  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  if (expiry.getTime() - now.getTime() <= thirtyDays) return "expiring_soon";

  return "valid";
}

// ---------------------------------------------------------------------------
// 1. getEmployeeDashboard
// ---------------------------------------------------------------------------

export async function getEmployeeDashboard(
  supabase: SupabaseClient,
  userId: string,
  companyId: string
): Promise<EmployeeDashboardData> {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // ISO week: Monday through Sunday
  const weekMonday = getISOWeekMonday(now);
  const weekSunday = new Date(weekMonday);
  weekSunday.setDate(weekMonday.getDate() + 6);
  const weekStartStr = weekMonday.toISOString().slice(0, 10);
  const weekEndStr = weekSunday.toISOString().slice(0, 10);

  const [
    clockEventsRes,
    weekHoursRes,
    pendingRes,
    payslipRes,
    contactRes,
    profileRes,
    companyRes,
    projectsRes,
    memberRes,
    dailyLogsRes,
    safetyRes,
    rfisRes,
    photosRes,
  ] = await Promise.all([
    // Today's clock events
    supabase
      .from("clock_events")
      .select("*, projects(name)")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .gte("timestamp", `${todayStr}T00:00:00.000Z`)
      .lt("timestamp", `${todayStr}T23:59:59.999Z`)
      .order("timestamp", { ascending: false }),

    // Week clock events (Mon-Sun) for hours calculation + timecard
    supabase
      .from("clock_events")
      .select("*, projects(name)")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .gte("timestamp", `${weekStartStr}T00:00:00.000Z`)
      .lte("timestamp", `${weekEndStr}T23:59:59.999Z`)
      .order("timestamp", { ascending: true }),

    // Pending time entries count (placeholder — time_entries not used by clock system)
    supabase
      .from("time_entries")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .eq("status", "pending"),

    // Latest payslip from a paid payroll run
    supabase
      .from("payroll_items")
      .select(
        "net_pay, payroll_runs!inner(period_start, period_end, pay_date, status)"
      )
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .eq("payroll_runs.status", "paid")
      .order("payroll_runs(pay_date)", { ascending: false })
      .limit(1),

    // Find contact record for this user (for certifications)
    supabase
      .from("contacts")
      .select("id")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .limit(1)
      .maybeSingle(),

    // Employee profile name
    supabase
      .from("user_profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single(),

    // Company name
    supabase.from("companies").select("name").eq("id", companyId).single(),

    // Active projects for modal dropdowns
    supabase
      .from("projects")
      .select("id, name")
      .eq("company_id", companyId)
      .in("status", ["active", "in_progress", "planning"])
      .order("name"),

    // Employee role
    supabase
      .from("company_members")
      .select("role")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .limit(1)
      .maybeSingle(),

    // Recent daily logs (last 5)
    supabase
      .from("daily_logs")
      .select("id, log_date, work_performed, projects(name)")
      .eq("company_id", companyId)
      .eq("created_by", userId)
      .order("log_date", { ascending: false })
      .limit(5),

    // Recent safety incidents (last 5)
    supabase
      .from("safety_incidents")
      .select("id, title, severity, created_at, projects(name)")
      .eq("company_id", companyId)
      .eq("reported_by", userId)
      .order("created_at", { ascending: false })
      .limit(5),

    // Recent RFIs (last 5)
    supabase
      .from("rfis")
      .select("id, subject, priority, status, created_at, projects(name)")
      .eq("company_id", companyId)
      .eq("submitted_by", userId)
      .order("created_at", { ascending: false })
      .limit(5),

    // Recent photos (documents with category 'photos', uploaded by this user)
    supabase
      .from("documents")
      .select("id, name, category, file_type, created_at, projects(name)")
      .eq("company_id", companyId)
      .eq("uploaded_by", userId)
      .eq("category", "photos")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Parse clock events
  const todayEvents: ClockEvent[] = (clockEventsRes.data ?? []).map(
    (row: Record<string, unknown>) => {
      const project = row.projects as { name: string } | null;
      return {
        id: row.id as string,
        company_id: row.company_id as string,
        user_id: row.user_id as string,
        event_type: row.event_type as "clock_in" | "clock_out",
        timestamp: row.timestamp as string,
        project_id: (row.project_id as string) ?? null,
        notes: (row.notes as string) ?? null,
        project_name: project?.name ?? undefined,
      };
    }
  );

  const lastEvent = todayEvents.length > 0 ? todayEvents[0] : null;
  const isClockedIn = lastEvent?.event_type === "clock_in";

  // Parse week clock events and calculate hours
  const weekClockEvents: ClockEvent[] = (weekHoursRes.data ?? []).map(
    (row: Record<string, unknown>) => {
      const project = row.projects as { name: string } | null;
      return {
        id: row.id as string,
        company_id: row.company_id as string,
        user_id: row.user_id as string,
        event_type: row.event_type as "clock_in" | "clock_out",
        timestamp: row.timestamp as string,
        project_id: (row.project_id as string) ?? null,
        notes: (row.notes as string) ?? null,
        project_name: project?.name ?? undefined,
      };
    }
  );
  const hoursThisWeek = calculateHoursFromEvents(weekClockEvents);

  // Pending timesheets count
  const pendingTimesheets = pendingRes.count ?? 0;

  // Recent payslip
  let recentPayslip: { period: string; net_pay: number } | null = null;
  if (payslipRes.data && payslipRes.data.length > 0) {
    const item = payslipRes.data[0] as Record<string, unknown>;
    const run = item.payroll_runs as {
      period_start: string;
      period_end: string;
    } | null;
    if (run) {
      recentPayslip = {
        period: `${run.period_start} - ${run.period_end}`,
        net_pay: Number(item.net_pay) || 0,
      };
    }
  }

  // Certifications
  let certTotal = 0;
  let certExpiring = 0;

  if (contactRes.data?.id) {
    const contactId = contactRes.data.id;

    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );
    const todayDateStr = now.toISOString().slice(0, 10);
    const cutoff = thirtyDaysFromNow.toISOString().slice(0, 10);

    const [totalCertsRes, expiringCertsRes] = await Promise.all([
      supabase
        .from("certifications")
        .select("id", { count: "exact" })
        .eq("contact_id", contactId)
        .eq("company_id", companyId),
      supabase
        .from("certifications")
        .select("id", { count: "exact" })
        .eq("contact_id", contactId)
        .eq("company_id", companyId)
        .not("expiry_date", "is", null)
        .lte("expiry_date", cutoff)
        .gte("expiry_date", todayDateStr),
    ]);

    certTotal = totalCertsRes.count ?? 0;
    certExpiring = expiringCertsRes.count ?? 0;
  }

  return {
    clockStatus: {
      isClockedIn,
      lastEvent,
      todayEvents,
    },
    hoursThisWeek: Math.round(hoursThisWeek * 100) / 100,
    weekClockEvents,
    pendingTimesheets,
    recentPayslip,
    certifications: { total: certTotal, expiring: certExpiring },
    employeeName:
      profileRes.data?.full_name ||
      profileRes.data?.email ||
      "Employee",
    companyName: companyRes.data?.name || "My Company",
    role: memberRes.data?.role || "employee",
    projects: (projectsRes.data ?? []).map(
      (p: { id: string; name: string }) => ({ id: p.id, name: p.name })
    ),
    recentDailyLogs: (dailyLogsRes.data ?? []).map(
      (r: Record<string, unknown>) => ({
        id: r.id as string,
        log_date: r.log_date as string,
        project_name: (r.projects as { name: string } | null)?.name ?? null,
        work_performed: (r.work_performed as string) ?? null,
      })
    ),
    recentSafetyIncidents: (safetyRes.data ?? []).map(
      (r: Record<string, unknown>) => ({
        id: r.id as string,
        title: r.title as string,
        severity: r.severity as string,
        created_at: r.created_at as string,
        project_name: (r.projects as { name: string } | null)?.name ?? null,
      })
    ),
    recentRfis: (rfisRes.data ?? []).map(
      (r: Record<string, unknown>) => ({
        id: r.id as string,
        subject: r.subject as string,
        priority: r.priority as string,
        status: r.status as string,
        created_at: r.created_at as string,
        project_name: (r.projects as { name: string } | null)?.name ?? null,
      })
    ),
    recentPhotos: (photosRes.data ?? []).map(
      (r: Record<string, unknown>) => ({
        id: r.id as string,
        name: r.name as string,
        category: r.category as string,
        file_type: r.file_type as string,
        created_at: r.created_at as string,
        project_name: (r.projects as { name: string } | null)?.name ?? null,
      })
    ),
  };
}

// ---------------------------------------------------------------------------
// 2. getClockEvents
// ---------------------------------------------------------------------------

export async function getClockEvents(
  supabase: SupabaseClient,
  userId: string,
  date: string
): Promise<ClockEvent[]> {
  const { data, error } = await supabase
    .from("clock_events")
    .select("*, projects(name)")
    .eq("user_id", userId)
    .gte("timestamp", `${date}T00:00:00.000Z`)
    .lt("timestamp", `${date}T23:59:59.999Z`)
    .order("timestamp", { ascending: true });

  if (error) {
    console.error("getClockEvents error:", error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const project = row.projects as { name: string } | null;
    return {
      id: row.id as string,
      company_id: row.company_id as string,
      user_id: row.user_id as string,
      event_type: row.event_type as "clock_in" | "clock_out",
      timestamp: row.timestamp as string,
      project_id: (row.project_id as string) ?? null,
      notes: (row.notes as string) ?? null,
      project_name: project?.name ?? undefined,
    };
  });
}

// ---------------------------------------------------------------------------
// 3. getCurrentClockStatus
// ---------------------------------------------------------------------------

export async function getCurrentClockStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<{ isClockedIn: boolean; lastEvent: ClockEvent | null }> {
  const { data, error } = await supabase
    .from("clock_events")
    .select("*, projects(name)")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("getCurrentClockStatus error:", error);
    }
    return { isClockedIn: false, lastEvent: null };
  }

  const project = (data as Record<string, unknown>).projects as {
    name: string;
  } | null;

  const lastEvent: ClockEvent = {
    id: data.id,
    company_id: data.company_id,
    user_id: data.user_id,
    event_type: data.event_type as "clock_in" | "clock_out",
    timestamp: data.timestamp,
    project_id: data.project_id ?? null,
    notes: data.notes ?? null,
    project_name: project?.name ?? undefined,
  };

  return {
    isClockedIn: lastEvent.event_type === "clock_in",
    lastEvent,
  };
}

// ---------------------------------------------------------------------------
// 4. getEmployeeTimesheets
// ---------------------------------------------------------------------------

export async function getEmployeeTimesheets(
  supabase: SupabaseClient,
  userId: string,
  companyId: string
): Promise<EmployeeTimesheet[]> {
  const { data, error } = await supabase
    .from("time_entries")
    .select(
      "id, entry_date, clock_in, clock_out, hours, status, work_type, cost_code, notes, projects(name)"
    )
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .order("entry_date", { ascending: false });

  if (error) {
    console.error("getEmployeeTimesheets error:", error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const project = row.projects as { name: string } | null;
    return {
      id: row.id as string,
      entry_date: row.entry_date as string,
      clock_in: (row.clock_in as string) ?? null,
      clock_out: (row.clock_out as string) ?? null,
      hours: row.hours != null ? Number(row.hours) : null,
      status: row.status as string,
      work_type: (row.work_type as string) ?? null,
      cost_code: (row.cost_code as string) ?? null,
      notes: (row.notes as string) ?? null,
      project_name: project?.name ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// 5. getEmployeePayslips
// ---------------------------------------------------------------------------

export async function getEmployeePayslips(
  supabase: SupabaseClient,
  userId: string
): Promise<EmployeePayslip[]> {
  const { data, error } = await supabase
    .from("payroll_items")
    .select(
      `id, payroll_run_id, gross_pay,
       federal_income_tax, state_income_tax,
       social_security_employee, medicare_employee,
       pretax_deductions, posttax_deductions, total_employee_deductions,
       net_pay,
       payroll_runs!inner(period_start, period_end, pay_date, status)`
    )
    .eq("user_id", userId)
    .eq("payroll_runs.status", "paid")
    .order("payroll_runs(pay_date)", { ascending: false });

  if (error) {
    console.error("getEmployeePayslips error:", error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const run = row.payroll_runs as {
      period_start: string;
      period_end: string;
      pay_date: string;
    };

    const federalTax = Number(row.federal_income_tax) || 0;
    const stateTax = Number(row.state_income_tax) || 0;
    const ssTax = Number(row.social_security_employee) || 0;
    const medicareTax = Number(row.medicare_employee) || 0;
    const totalTaxes = federalTax + stateTax + ssTax + medicareTax;

    const pretaxDed = Number(row.pretax_deductions) || 0;
    const posttaxDed = Number(row.posttax_deductions) || 0;

    return {
      id: row.id as string,
      payroll_run_id: row.payroll_run_id as string,
      period_start: run.period_start,
      period_end: run.period_end,
      pay_date: run.pay_date,
      gross_pay: Number(row.gross_pay) || 0,
      federal_income_tax: federalTax,
      state_income_tax: stateTax,
      social_security_employee: ssTax,
      medicare_employee: medicareTax,
      total_taxes: Math.round(totalTaxes * 100) / 100,
      pretax_deductions: pretaxDed,
      posttax_deductions: posttaxDed,
      total_deductions: Math.round((pretaxDed + posttaxDed) * 100) / 100,
      net_pay: Number(row.net_pay) || 0,
    };
  });
}

// ---------------------------------------------------------------------------
// 6. getEmployeeCertifications
// ---------------------------------------------------------------------------

export async function getEmployeeCertifications(
  supabase: SupabaseClient,
  userId: string,
  companyId: string
): Promise<EmployeeCertification[]> {
  // First find the contact_id for this user
  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("id")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .limit(1)
    .maybeSingle();

  if (contactError || !contact) {
    if (contactError) {
      console.error("getEmployeeCertifications contact lookup error:", contactError);
    }
    return [];
  }

  const { data, error } = await supabase
    .from("certifications")
    .select(
      "id, cert_type, cert_name, issuing_authority, cert_number, issued_date, expiry_date, document_url"
    )
    .eq("contact_id", contact.id)
    .eq("company_id", companyId)
    .order("expiry_date", { ascending: true });

  if (error) {
    console.error("getEmployeeCertifications error:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    cert_type: row.cert_type ?? null,
    cert_name: row.cert_name,
    issuing_authority: row.issuing_authority ?? null,
    cert_number: row.cert_number ?? null,
    issued_date: row.issued_date ?? null,
    expiry_date: row.expiry_date ?? null,
    document_url: row.document_url ?? null,
    status: computeCertStatus(row.expiry_date),
  }));
}
