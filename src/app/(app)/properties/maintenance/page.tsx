import Link from "next/link";
import {
  Wrench,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = {
  title: "Maintenance - ConstructionERP",
};

interface PageProps {
  searchParams: Promise<{
    status?: string;
    priority?: string;
  }>;
}

export default async function MaintenancePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><Wrench size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access maintenance requests.</div>
      </div>
    );
  }

  const { companyId } = userCompany;
  const activeStatus = params.status || "all";
  const activePriority = params.priority || "all";

  // Fetch maintenance requests with joined property info
  let query = supabase
    .from("maintenance_requests")
    .select("*, properties(name), units(unit_number), user_profiles:assigned_to(full_name, email)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (activeStatus !== "all") {
    query = query.eq("status", activeStatus);
  }
  if (activePriority !== "all") {
    query = query.eq("priority", activePriority);
  }

  const [{ data: requests }, { data: allRequestsRaw }] = await Promise.all([
    query,
    supabase
      .from("maintenance_requests")
      .select("id, status, priority")
      .eq("company_id", companyId),
  ]);

  const allRequests = requests ?? [];
  const allForKpis = allRequestsRaw ?? [];

  // KPIs
  const totalRequests = allForKpis.length;
  const openStatuses = ["submitted", "assigned", "in_progress"];
  const openCount = allForKpis.filter((r) => openStatuses.includes(r.status)).length;
  const completedCount = allForKpis.filter((r) => r.status === "completed" || r.status === "closed").length;
  const emergencyCount = allForKpis.filter((r) => r.priority === "emergency").length;

  // Filter options
  const statusFilters = [
    { label: "All", value: "all" },
    { label: "Submitted", value: "submitted" },
    { label: "Assigned", value: "assigned" },
    { label: "In Progress", value: "in_progress" },
    { label: "Completed", value: "completed" },
    { label: "Closed", value: "closed" },
  ];

  const priorityFilters = [
    { label: "All Priorities", value: "all" },
    { label: "Emergency", value: "emergency" },
    { label: "High", value: "high" },
    { label: "Medium", value: "medium" },
    { label: "Low", value: "low" },
  ];

  function buildUrl(status: string, priority: string): string {
    const p = new URLSearchParams();
    if (status !== "all") p.set("status", status);
    if (priority !== "all") p.set("priority", priority);
    const qs = p.toString();
    return `/properties/maintenance${qs ? `?${qs}` : ""}`;
  }

  function getCategoryBadge(category: string): string {
    switch (category) {
      case "plumbing":
        return "badge badge-blue";
      case "electrical":
        return "badge badge-amber";
      case "hvac":
        return "badge badge-green";
      case "appliance":
        return "badge badge-blue";
      case "structural":
        return "badge badge-red";
      case "general":
      default:
        return "badge badge-amber";
    }
  }

  function getPriorityBadge(priority: string): string {
    switch (priority) {
      case "emergency":
        return "badge badge-red";
      case "high":
        return "badge badge-amber";
      case "medium":
        return "badge badge-blue";
      case "low":
        return "badge badge-green";
      default:
        return "badge badge-blue";
    }
  }

  function getStatusBadge(status: string): string {
    switch (status) {
      case "submitted":
        return "inv-status inv-status-pending";
      case "assigned":
        return "inv-status inv-status-draft";
      case "in_progress":
        return "inv-status inv-status-pending";
      case "completed":
        return "inv-status inv-status-approved";
      case "closed":
        return "inv-status inv-status-paid";
      default:
        return "inv-status inv-status-draft";
    }
  }

  function formatStatus(status: string): string {
    return status.replace(/_/g, " ");
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Maintenance Requests</h2>
          <p className="fin-header-sub">
            Track work orders, preventive maintenance, and repair requests
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="financial-kpi-row">
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <ClipboardList size={18} />
          </div>
          <span className="fin-kpi-label">Total Requests</span>
          <span className="fin-kpi-value">{totalRequests}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <Wrench size={18} />
          </div>
          <span className="fin-kpi-label">Open</span>
          <span className="fin-kpi-value">{openCount}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon green">
            <CheckCircle2 size={18} />
          </div>
          <span className="fin-kpi-label">Completed</span>
          <span className="fin-kpi-value">{completedCount}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon red">
            <AlertTriangle size={18} />
          </div>
          <span className="fin-kpi-label">Emergency</span>
          <span className="fin-kpi-value">{emergencyCount}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="fin-filters">
        <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500 }}>
          Status:
        </label>
        {statusFilters.map((s) => (
          <Link
            key={s.value}
            href={buildUrl(s.value, activePriority)}
            className={`ui-btn ui-btn-sm ${
              activeStatus === s.value ? "ui-btn-primary" : "ui-btn-outline"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <div className="fin-filters" style={{ marginTop: "0" }}>
        <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500 }}>
          Priority:
        </label>
        {priorityFilters.map((p) => (
          <Link
            key={p.value}
            href={buildUrl(activeStatus, p.value)}
            className={`ui-btn ui-btn-sm ${
              activePriority === p.value ? "ui-btn-primary" : "ui-btn-outline"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {/* Maintenance Table */}
      {allRequests.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Property</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Scheduled Date</th>
                  <th style={{ textAlign: "right" }}>Est. Cost</th>
                  <th style={{ textAlign: "right" }}>Actual Cost</th>
                </tr>
              </thead>
              <tbody>
                {allRequests.map((req) => {
                  const property = req.properties as { name: string } | null;
                  const unit = req.units as { unit_number: string } | null;
                  const assignee = req.user_profiles as { full_name: string; email: string } | null;
                  const isEmergency = req.priority === "emergency";

                  return (
                    <tr
                      key={req.id}
                      className={isEmergency ? "invoice-row-overdue" : ""}
                    >
                      <td style={{ fontWeight: 600 }}>
                        {req.title}
                        {req.description && (
                          <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 400, maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {req.description}
                          </div>
                        )}
                      </td>
                      <td>
                        {property?.name ?? "--"}
                        {unit?.unit_number && (
                          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                            Unit {unit.unit_number}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={getCategoryBadge(req.category)}>
                          {req.category}
                        </span>
                      </td>
                      <td>
                        <span className={getPriorityBadge(req.priority)}>
                          {req.priority}
                        </span>
                      </td>
                      <td>
                        <span className={getStatusBadge(req.status)}>
                          {formatStatus(req.status)}
                        </span>
                      </td>
                      <td>
                        {assignee?.full_name ?? assignee?.email ?? "--"}
                      </td>
                      <td>
                        {req.scheduled_date
                          ? new Date(req.scheduled_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "--"}
                      </td>
                      <td className="amount-col">
                        {req.estimated_cost != null
                          ? formatCurrency(req.estimated_cost)
                          : "--"}
                      </td>
                      <td className="amount-col">
                        {req.actual_cost != null
                          ? formatCurrency(req.actual_cost)
                          : "--"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <Wrench size={48} />
            </div>
            <div className="fin-empty-title">No Maintenance Requests Found</div>
            <div className="fin-empty-desc">
              {activeStatus !== "all" || activePriority !== "all"
                ? "No requests match the current filters. Try adjusting your filters."
                : "No maintenance requests have been submitted yet."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
