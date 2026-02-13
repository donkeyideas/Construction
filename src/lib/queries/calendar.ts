import { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CalendarModule = "projects" | "properties" | "financial" | "people" | "crm";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date string (YYYY-MM-DD)
  endDate?: string; // for ranges (projects, phases, leases, contracts)
  module: CalendarModule;
  type: string; // e.g. 'project_start', 'rfi_due', 'lease_end', etc.
  entityType: string; // table name
  entityId: string;
  color: string; // hex color for the module
  url?: string; // link to the source page
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Module color map
// ---------------------------------------------------------------------------

const MODULE_COLORS: Record<CalendarModule, string> = {
  projects: "#3b82f6",
  properties: "#22c55e",
  financial: "#f59e0b",
  people: "#a855f7",
  crm: "#14b8a6",
};

// ---------------------------------------------------------------------------
// Safe query helper – returns [] on any error so one failing table
// never breaks the whole calendar
// ---------------------------------------------------------------------------

async function safeQuery<T>(
  promise: PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  try {
    const { data, error } = await promise;
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Main query function
// ---------------------------------------------------------------------------

export async function getCalendarEvents(
  supabase: SupabaseClient,
  companyId: string,
  startDate: string, // ISO date
  endDate: string // ISO date
): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];

  // We run ALL queries in parallel for maximum performance
  const [
    projects,
    phases,
    tasks,
    dailyLogs,
    rfis,
    submittals,
    changeOrders,
    punchListItems,
    safetyInspections,
    leases,
    maintenanceRequests,
    rentPayments,
    invoices,
    payments,
    certifications,
    equipment,
    vendorContracts,
    opportunities,
    bids,
  ] = await Promise.all([
    // -----------------------------------------------------------------------
    // PROJECTS MODULE (blue)
    // -----------------------------------------------------------------------

    // 1. projects: start_date, estimated_end_date, actual_end_date
    safeQuery(
      supabase
        .from("projects")
        .select("id, name, start_date, estimated_end_date, actual_end_date, status")
        .eq("company_id", companyId)
        .or(
          `start_date.gte.${startDate},start_date.lte.${endDate},` +
          `estimated_end_date.gte.${startDate},estimated_end_date.lte.${endDate},` +
          `actual_end_date.gte.${startDate},actual_end_date.lte.${endDate}`
        )
    ),

    // 2. project_phases: start_date, end_date
    safeQuery(
      supabase
        .from("project_phases")
        .select("id, name, start_date, end_date, is_milestone, project_id, status")
        .eq("company_id", companyId)
        .or(
          `start_date.gte.${startDate},start_date.lte.${endDate},` +
          `end_date.gte.${startDate},end_date.lte.${endDate}`
        )
    ),

    // 3. project_tasks: start_date, end_date
    safeQuery(
      supabase
        .from("project_tasks")
        .select("id, name, start_date, end_date, status, priority, project_id, is_milestone")
        .eq("company_id", companyId)
        .or(
          `start_date.gte.${startDate},start_date.lte.${endDate},` +
          `end_date.gte.${startDate},end_date.lte.${endDate}`
        )
    ),

    // 4. daily_logs: log_date
    safeQuery(
      supabase
        .from("daily_logs")
        .select("id, log_date, project_id, weather, created_by")
        .eq("company_id", companyId)
        .gte("log_date", startDate)
        .lte("log_date", endDate)
    ),

    // 5. rfis: due_date
    safeQuery(
      supabase
        .from("rfis")
        .select("id, number, subject, due_date, status, project_id")
        .eq("company_id", companyId)
        .gte("due_date", startDate)
        .lte("due_date", endDate)
    ),

    // 6. submittals: due_date
    safeQuery(
      supabase
        .from("submittals")
        .select("id, title, due_date, status, project_id")
        .eq("company_id", companyId)
        .gte("due_date", startDate)
        .lte("due_date", endDate)
    ),

    // 7. change_orders: created_at
    safeQuery(
      supabase
        .from("change_orders")
        .select("id, title, created_at, status, amount, project_id")
        .eq("company_id", companyId)
        .gte("created_at", startDate)
        .lte("created_at", endDate + "T23:59:59")
    ),

    // 8. punch_list_items: due_date
    safeQuery(
      supabase
        .from("punch_list_items")
        .select("id, description, due_date, status, project_id")
        .eq("company_id", companyId)
        .gte("due_date", startDate)
        .lte("due_date", endDate)
    ),

    // 9. safety_inspections: inspection_date
    safeQuery(
      supabase
        .from("safety_inspections")
        .select("id, inspection_type, inspection_date, result, project_id")
        .eq("company_id", companyId)
        .gte("inspection_date", startDate)
        .lte("inspection_date", endDate)
    ),

    // -----------------------------------------------------------------------
    // PROPERTIES MODULE (green)
    // -----------------------------------------------------------------------

    // 10. leases: lease_start, lease_end
    safeQuery(
      supabase
        .from("leases")
        .select("id, lease_start, lease_end, monthly_rent, status, unit_id, property_id")
        .eq("company_id", companyId)
        .or(
          `lease_start.gte.${startDate},lease_start.lte.${endDate},` +
          `lease_end.gte.${startDate},lease_end.lte.${endDate}`
        )
    ),

    // 11. maintenance_requests: scheduled_date
    safeQuery(
      supabase
        .from("maintenance_requests")
        .select("id, title, scheduled_date, status, priority, property_id")
        .eq("company_id", companyId)
        .gte("scheduled_date", startDate)
        .lte("scheduled_date", endDate)
    ),

    // 12. rent_payments: due_date
    safeQuery(
      supabase
        .from("rent_payments")
        .select("id, due_date, amount, status, unit_id, property_id")
        .eq("company_id", companyId)
        .gte("due_date", startDate)
        .lte("due_date", endDate)
    ),

    // -----------------------------------------------------------------------
    // FINANCIAL MODULE (amber)
    // -----------------------------------------------------------------------

    // 13. invoices: due_date
    safeQuery(
      supabase
        .from("invoices")
        .select("id, invoice_number, due_date, total_amount, status")
        .eq("company_id", companyId)
        .gte("due_date", startDate)
        .lte("due_date", endDate)
    ),

    // 14. payments: payment_date
    safeQuery(
      supabase
        .from("payments")
        .select("id, description, payment_date, amount, payment_method")
        .eq("company_id", companyId)
        .gte("payment_date", startDate)
        .lte("payment_date", endDate)
    ),

    // -----------------------------------------------------------------------
    // PEOPLE MODULE (purple)
    // -----------------------------------------------------------------------

    // 15. certifications: expiry_date
    safeQuery(
      supabase
        .from("certifications")
        .select("id, cert_name, expiry_date, status, contact_id")
        .eq("company_id", companyId)
        .gte("expiry_date", startDate)
        .lte("expiry_date", endDate)
    ),

    // 16. equipment: next_maintenance_date
    safeQuery(
      supabase
        .from("equipment")
        .select("id, name, next_maintenance_date, status")
        .eq("company_id", companyId)
        .gte("next_maintenance_date", startDate)
        .lte("next_maintenance_date", endDate)
    ),

    // 17. vendor_contracts: start_date, end_date, insurance_expiry
    safeQuery(
      supabase
        .from("vendor_contracts")
        .select("id, title, start_date, end_date, insurance_expiry, status, vendor_id")
        .eq("company_id", companyId)
        .or(
          `start_date.gte.${startDate},start_date.lte.${endDate},` +
          `end_date.gte.${startDate},end_date.lte.${endDate},` +
          `insurance_expiry.gte.${startDate},insurance_expiry.lte.${endDate}`
        )
    ),

    // -----------------------------------------------------------------------
    // CRM MODULE (teal)
    // -----------------------------------------------------------------------

    // 18. opportunities: expected_close_date
    safeQuery(
      supabase
        .from("opportunities")
        .select("id, name, expected_close_date, stage, estimated_value")
        .eq("company_id", companyId)
        .gte("expected_close_date", startDate)
        .lte("expected_close_date", endDate)
    ),

    // 19. bids: due_date, bid_date
    safeQuery(
      supabase
        .from("bids")
        .select("id, title, due_date, bid_date, status, bid_amount")
        .eq("company_id", companyId)
        .or(
          `due_date.gte.${startDate},due_date.lte.${endDate},` +
          `bid_date.gte.${startDate},bid_date.lte.${endDate}`
        )
    ),
  ]);

  // -------------------------------------------------------------------------
  // Transform results into CalendarEvent[]
  // -------------------------------------------------------------------------

  // 1. Projects
  for (const p of projects) {
    if (p.start_date && p.start_date >= startDate && p.start_date <= endDate) {
      events.push({
        id: `project-start-${p.id}`,
        title: `Project: ${p.name} starts`,
        date: p.start_date,
        endDate: p.estimated_end_date || undefined,
        module: "projects",
        type: "project_start",
        entityType: "projects",
        entityId: p.id,
        color: MODULE_COLORS.projects,
        url: `/projects/${p.id}`,
        metadata: { status: p.status },
      });
    }
    if (p.estimated_end_date && p.estimated_end_date >= startDate && p.estimated_end_date <= endDate) {
      events.push({
        id: `project-end-${p.id}`,
        title: `Project: ${p.name} ends`,
        date: p.estimated_end_date,
        module: "projects",
        type: "project_end",
        entityType: "projects",
        entityId: p.id,
        color: MODULE_COLORS.projects,
        url: `/projects/${p.id}`,
        metadata: { status: p.status },
      });
    }
    if (p.actual_end_date && p.actual_end_date >= startDate && p.actual_end_date <= endDate) {
      events.push({
        id: `project-actual-end-${p.id}`,
        title: `Project: ${p.name} completed`,
        date: p.actual_end_date,
        module: "projects",
        type: "project_completed",
        entityType: "projects",
        entityId: p.id,
        color: MODULE_COLORS.projects,
        url: `/projects/${p.id}`,
        metadata: { status: p.status },
      });
    }
  }

  // 2. Project Phases
  for (const ph of phases) {
    const label = ph.is_milestone ? "Milestone" : "Phase";
    if (ph.start_date && ph.start_date >= startDate && ph.start_date <= endDate) {
      events.push({
        id: `phase-start-${ph.id}`,
        title: `${label}: ${ph.name}`,
        date: ph.start_date,
        endDate: ph.end_date || undefined,
        module: "projects",
        type: ph.is_milestone ? "milestone" : "phase_start",
        entityType: "project_phases",
        entityId: ph.id,
        color: MODULE_COLORS.projects,
        url: `/projects/${ph.project_id}`,
        metadata: { status: ph.status, is_milestone: ph.is_milestone },
      });
    }
    if (ph.end_date && ph.end_date >= startDate && ph.end_date <= endDate && ph.end_date !== ph.start_date) {
      events.push({
        id: `phase-end-${ph.id}`,
        title: `${label}: ${ph.name} ends`,
        date: ph.end_date,
        module: "projects",
        type: ph.is_milestone ? "milestone_end" : "phase_end",
        entityType: "project_phases",
        entityId: ph.id,
        color: MODULE_COLORS.projects,
        url: `/projects/${ph.project_id}`,
        metadata: { status: ph.status, is_milestone: ph.is_milestone },
      });
    }
  }

  // 3. Project Tasks
  for (const t of tasks) {
    const taskLabel = t.is_milestone ? "Milestone" : "Task";
    if (t.start_date && t.start_date >= startDate && t.start_date <= endDate) {
      events.push({
        id: `task-start-${t.id}`,
        title: `${taskLabel}: ${t.name}`,
        date: t.start_date,
        endDate: t.end_date || undefined,
        module: "projects",
        type: t.is_milestone ? "milestone" : "task_start",
        entityType: "project_tasks",
        entityId: t.id,
        color: MODULE_COLORS.projects,
        url: `/projects/${t.project_id}`,
        metadata: { status: t.status, priority: t.priority },
      });
    }
    if (t.end_date && t.end_date >= startDate && t.end_date <= endDate && t.end_date !== t.start_date) {
      events.push({
        id: `task-end-${t.id}`,
        title: `${taskLabel}: ${t.name} due`,
        date: t.end_date,
        module: "projects",
        type: t.is_milestone ? "milestone_end" : "task_end",
        entityType: "project_tasks",
        entityId: t.id,
        color: MODULE_COLORS.projects,
        url: `/projects/${t.project_id}`,
        metadata: { status: t.status, priority: t.priority },
      });
    }
  }

  // 4. Daily Logs
  for (const dl of dailyLogs) {
    events.push({
      id: `daily-log-${dl.id}`,
      title: `Daily Log`,
      date: dl.log_date,
      module: "projects",
      type: "daily_log",
      entityType: "daily_logs",
      entityId: dl.id,
      color: MODULE_COLORS.projects,
      url: `/projects/${dl.project_id}`,
      metadata: { weather: dl.weather },
    });
  }

  // 5. RFIs
  for (const r of rfis) {
    events.push({
      id: `rfi-${r.id}`,
      title: `RFI #${r.number} Due: ${r.subject || ""}`.trim(),
      date: r.due_date,
      module: "projects",
      type: "rfi_due",
      entityType: "rfis",
      entityId: r.id,
      color: MODULE_COLORS.projects,
      url: `/projects/${r.project_id}`,
      metadata: { status: r.status },
    });
  }

  // 6. Submittals
  for (const s of submittals) {
    events.push({
      id: `submittal-${s.id}`,
      title: `Submittal: ${s.title} Due`,
      date: s.due_date,
      module: "projects",
      type: "submittal_due",
      entityType: "submittals",
      entityId: s.id,
      color: MODULE_COLORS.projects,
      url: `/projects/${s.project_id}`,
      metadata: { status: s.status },
    });
  }

  // 7. Change Orders
  for (const co of changeOrders) {
    events.push({
      id: `change-order-${co.id}`,
      title: `Change Order: ${co.title}`,
      date: co.created_at.slice(0, 10), // extract date from timestamp
      module: "projects",
      type: "change_order",
      entityType: "change_orders",
      entityId: co.id,
      color: MODULE_COLORS.projects,
      url: `/projects/${co.project_id}`,
      metadata: { status: co.status, amount: co.amount },
    });
  }

  // 8. Punch List Items
  for (const pl of punchListItems) {
    events.push({
      id: `punch-list-${pl.id}`,
      title: `Punch List: ${(pl.description || "").slice(0, 60)} Due`,
      date: pl.due_date,
      module: "projects",
      type: "punch_list_due",
      entityType: "punch_list_items",
      entityId: pl.id,
      color: MODULE_COLORS.projects,
      url: `/projects/${pl.project_id}`,
      metadata: { status: pl.status },
    });
  }

  // 9. Safety Inspections
  for (const si of safetyInspections) {
    events.push({
      id: `safety-inspection-${si.id}`,
      title: `Safety Inspection: ${si.inspection_type || "General"}`,
      date: si.inspection_date,
      module: "projects",
      type: "safety_inspection",
      entityType: "safety_inspections",
      entityId: si.id,
      color: MODULE_COLORS.projects,
      url: `/projects/${si.project_id}`,
      metadata: { result: si.result },
    });
  }

  // 10. Leases
  for (const l of leases) {
    if (l.lease_start && l.lease_start >= startDate && l.lease_start <= endDate) {
      events.push({
        id: `lease-start-${l.id}`,
        title: `Lease Start`,
        date: l.lease_start,
        endDate: l.lease_end || undefined,
        module: "properties",
        type: "lease_start",
        entityType: "leases",
        entityId: l.id,
        color: MODULE_COLORS.properties,
        url: `/properties/${l.property_id}`,
        metadata: { status: l.status, monthly_rent: l.monthly_rent },
      });
    }
    if (l.lease_end && l.lease_end >= startDate && l.lease_end <= endDate) {
      events.push({
        id: `lease-end-${l.id}`,
        title: `Lease End`,
        date: l.lease_end,
        module: "properties",
        type: "lease_end",
        entityType: "leases",
        entityId: l.id,
        color: MODULE_COLORS.properties,
        url: `/properties/${l.property_id}`,
        metadata: { status: l.status, monthly_rent: l.monthly_rent },
      });
    }
  }

  // 11. Maintenance Requests
  for (const m of maintenanceRequests) {
    events.push({
      id: `maintenance-${m.id}`,
      title: `Maintenance: ${m.title}`,
      date: m.scheduled_date,
      module: "properties",
      type: "maintenance_scheduled",
      entityType: "maintenance_requests",
      entityId: m.id,
      color: MODULE_COLORS.properties,
      url: `/properties/${m.property_id}`,
      metadata: { status: m.status, priority: m.priority },
    });
  }

  // 12. Rent Payments
  for (const rp of rentPayments) {
    events.push({
      id: `rent-payment-${rp.id}`,
      title: `Rent Due`,
      date: rp.due_date,
      module: "properties",
      type: "rent_due",
      entityType: "rent_payments",
      entityId: rp.id,
      color: MODULE_COLORS.properties,
      url: `/properties/${rp.property_id}`,
      metadata: { status: rp.status, amount: rp.amount },
    });
  }

  // 13. Invoices
  for (const inv of invoices) {
    events.push({
      id: `invoice-${inv.id}`,
      title: `Invoice Due: #${inv.invoice_number}`,
      date: inv.due_date,
      module: "financial",
      type: "invoice_due",
      entityType: "invoices",
      entityId: inv.id,
      color: MODULE_COLORS.financial,
      url: `/financial`,
      metadata: { status: inv.status, amount: inv.total_amount },
    });
  }

  // 14. Payments
  for (const pay of payments) {
    events.push({
      id: `payment-${pay.id}`,
      title: `Payment: ${pay.description || "Payment"}`,
      date: pay.payment_date,
      module: "financial",
      type: "payment",
      entityType: "payments",
      entityId: pay.id,
      color: MODULE_COLORS.financial,
      url: `/financial`,
      metadata: { amount: pay.amount, method: pay.payment_method },
    });
  }

  // 15. Certifications
  for (const cert of certifications) {
    events.push({
      id: `cert-${cert.id}`,
      title: `Cert Expiring: ${cert.cert_name}`,
      date: cert.expiry_date,
      module: "people",
      type: "certification_expiry",
      entityType: "certifications",
      entityId: cert.id,
      color: MODULE_COLORS.people,
      url: `/people/certifications`,
      metadata: { status: cert.status },
    });
  }

  // 16. Equipment
  for (const eq of equipment) {
    events.push({
      id: `equipment-${eq.id}`,
      title: `Equipment Maintenance: ${eq.name}`,
      date: eq.next_maintenance_date,
      module: "people",
      type: "equipment_maintenance",
      entityType: "equipment",
      entityId: eq.id,
      color: MODULE_COLORS.people,
      url: `/people`,
      metadata: { status: eq.status },
    });
  }

  // 17. Vendor Contracts
  for (const vc of vendorContracts) {
    if (vc.start_date && vc.start_date >= startDate && vc.start_date <= endDate) {
      events.push({
        id: `vendor-contract-start-${vc.id}`,
        title: `Contract: ${vc.title} starts`,
        date: vc.start_date,
        endDate: vc.end_date || undefined,
        module: "people",
        type: "contract_start",
        entityType: "vendor_contracts",
        entityId: vc.id,
        color: MODULE_COLORS.people,
        url: `/people`,
        metadata: { status: vc.status },
      });
    }
    if (vc.end_date && vc.end_date >= startDate && vc.end_date <= endDate) {
      events.push({
        id: `vendor-contract-end-${vc.id}`,
        title: `Contract: ${vc.title} ends`,
        date: vc.end_date,
        module: "people",
        type: "contract_end",
        entityType: "vendor_contracts",
        entityId: vc.id,
        color: MODULE_COLORS.people,
        url: `/people`,
        metadata: { status: vc.status },
      });
    }
    if (vc.insurance_expiry && vc.insurance_expiry >= startDate && vc.insurance_expiry <= endDate) {
      events.push({
        id: `vendor-insurance-${vc.id}`,
        title: `Insurance Expiry: ${vc.title}`,
        date: vc.insurance_expiry,
        module: "people",
        type: "insurance_expiry",
        entityType: "vendor_contracts",
        entityId: vc.id,
        color: MODULE_COLORS.people,
        url: `/people`,
        metadata: { status: vc.status },
      });
    }
  }

  // 18. Opportunities
  for (const opp of opportunities) {
    events.push({
      id: `opportunity-${opp.id}`,
      title: `Opportunity Close: ${opp.name}`,
      date: opp.expected_close_date,
      module: "crm",
      type: "opportunity_close",
      entityType: "opportunities",
      entityId: opp.id,
      color: MODULE_COLORS.crm,
      url: `/crm`,
      metadata: { stage: opp.stage, estimated_value: opp.estimated_value },
    });
  }

  // 19. Bids
  for (const b of bids) {
    if (b.due_date && b.due_date >= startDate && b.due_date <= endDate) {
      events.push({
        id: `bid-due-${b.id}`,
        title: `Bid Due: ${b.title}`,
        date: b.due_date,
        module: "crm",
        type: "bid_due",
        entityType: "bids",
        entityId: b.id,
        color: MODULE_COLORS.crm,
        url: `/crm/bids`,
        metadata: { status: b.status, bid_amount: b.bid_amount },
      });
    }
    if (b.bid_date && b.bid_date >= startDate && b.bid_date <= endDate && b.bid_date !== b.due_date) {
      events.push({
        id: `bid-date-${b.id}`,
        title: `Bid Submitted: ${b.title}`,
        date: b.bid_date,
        module: "crm",
        type: "bid_date",
        entityType: "bids",
        entityId: b.id,
        color: MODULE_COLORS.crm,
        url: `/crm/bids`,
        metadata: { status: b.status, bid_amount: b.bid_amount },
      });
    }
  }

  // Sort by date ascending
  events.sort((a, b) => a.date.localeCompare(b.date));

  return events;
}

// ---------------------------------------------------------------------------
// Helper: get events for a specific month
// ---------------------------------------------------------------------------

export async function getCalendarEventsByMonth(
  supabase: SupabaseClient,
  companyId: string,
  year: number,
  month: number // 1-based (January = 1)
): Promise<CalendarEvent[]> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;

  // Calculate last day of the month
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return getCalendarEvents(supabase, companyId, startDate, endDate);
}
