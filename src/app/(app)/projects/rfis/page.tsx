import Link from "next/link";
import {
  MessageSquareMore,
  AlertCircle,
  Hash,
  CircleDot,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = {
  title: "RFIs - ConstructionERP",
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function RfisPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><MessageSquareMore size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access RFIs.</div>
      </div>
    );
  }

  const activeStatus = params.status || undefined;

  // Build query
  let query = supabase
    .from("rfis")
    .select("*, projects(name, code)")
    .eq("company_id", userCompany.companyId)
    .order("created_at", { ascending: false });

  if (activeStatus && activeStatus !== "all") {
    query = query.eq("status", activeStatus);
  }

  const { data: rfis } = await query;
  const rows = rfis ?? [];

  // Fetch all RFIs (unfiltered) for KPI counts
  const { data: allRfis } = await supabase
    .from("rfis")
    .select("id, status")
    .eq("company_id", userCompany.companyId);

  const all = allRfis ?? [];
  const totalCount = all.length;
  const openCount = all.filter((r) => r.status === "open").length;
  const answeredCount = all.filter((r) => r.status === "answered").length;
  const closedCount = all.filter((r) => r.status === "closed").length;

  // Collect unique user IDs to look up names
  const userIds = new Set<string>();
  for (const rfi of rows) {
    if (rfi.submitted_by) userIds.add(rfi.submitted_by);
    if (rfi.assigned_to) userIds.add(rfi.assigned_to);
  }

  const userMap: Record<string, string> = {};
  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .in("id", Array.from(userIds));

    for (const p of profiles ?? []) {
      userMap[p.id] = p.full_name || p.email || "Unknown";
    }
  }

  const now = new Date();

  function daysOpen(createdAt: string, status: string, answeredAt: string | null): number {
    const start = new Date(createdAt);
    const end = status === "closed" && answeredAt ? new Date(answeredAt) : now;
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }

  function isOverdue(dueDate: string | null): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < now;
  }

  const statuses = [
    { label: "All", value: "all" },
    { label: "Open", value: "open" },
    { label: "Answered", value: "answered" },
    { label: "Closed", value: "closed" },
  ];

  function buildUrl(status?: string): string {
    if (!status || status === "all") return "/projects/rfis";
    return `/projects/rfis?status=${status}`;
  }

  const priorityBadge: Record<string, string> = {
    high: "badge-red",
    medium: "badge-amber",
    low: "badge-green",
    urgent: "badge-red",
  };

  const statusBadge: Record<string, string> = {
    open: "inv-status inv-status-pending",
    answered: "inv-status inv-status-approved",
    closed: "inv-status inv-status-paid",
  };

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Requests for Information</h2>
          <p className="fin-header-sub">Create, track, and respond to RFIs across all projects</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="financial-kpi-row">
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <Hash size={18} />
          </div>
          <span className="fin-kpi-label">Total RFIs</span>
          <span className="fin-kpi-value">{totalCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <CircleDot size={18} />
          </div>
          <span className="fin-kpi-label">Open</span>
          <span className="fin-kpi-value">{openCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon green">
            <MessageCircle size={18} />
          </div>
          <span className="fin-kpi-label">Answered</span>
          <span className="fin-kpi-value">{answeredCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <CheckCircle2 size={18} />
          </div>
          <span className="fin-kpi-label">Closed</span>
          <span className="fin-kpi-value">{closedCount}</span>
        </div>
      </div>

      {/* Status Filters */}
      <div className="fin-filters">
        <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500 }}>
          Status:
        </label>
        {statuses.map((s) => (
          <Link
            key={s.value}
            href={buildUrl(s.value)}
            className={`ui-btn ui-btn-sm ${
              activeStatus === s.value || (!activeStatus && s.value === "all")
                ? "ui-btn-primary"
                : "ui-btn-outline"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      {rows.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>RFI #</th>
                  <th>Subject</th>
                  <th>Project</th>
                  <th>Priority</th>
                  <th>Submitted By</th>
                  <th>Assigned To</th>
                  <th>Due Date</th>
                  <th style={{ textAlign: "right" }}>Days Open</th>
                  <th style={{ textAlign: "right" }}>Cost Impact</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((rfi) => {
                  const project = rfi.projects as { name: string; code: string } | null;
                  const overdue = rfi.status === "open" && isOverdue(rfi.due_date);
                  const days = daysOpen(rfi.created_at, rfi.status, rfi.answered_at);

                  return (
                    <tr key={rfi.id} className={overdue ? "invoice-row-overdue" : ""}>
                      <td style={{ fontWeight: 600, fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                        {rfi.rfi_number}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{rfi.subject}</div>
                        {rfi.answer && (
                          <div
                            style={{
                              fontSize: "0.78rem",
                              color: "var(--muted)",
                              marginTop: 2,
                              maxWidth: 300,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            A: {rfi.answer}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                        {project ? (
                          <span style={{ color: "var(--muted)" }}>
                            <strong>{project.code}</strong>
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td>
                        {rfi.priority ? (
                          <span className={`badge ${priorityBadge[rfi.priority] ?? "badge-blue"}`}>
                            {rfi.priority}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {rfi.submitted_by ? userMap[rfi.submitted_by] ?? "--" : "--"}
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {rfi.assigned_to ? userMap[rfi.assigned_to] ?? "--" : "--"}
                      </td>
                      <td>
                        {rfi.due_date ? (
                          <span
                            style={{
                              color: overdue ? "var(--color-red)" : "var(--text)",
                              fontWeight: overdue ? 600 : 400,
                            }}
                          >
                            {new Date(rfi.due_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                            {overdue && (
                              <AlertCircle
                                size={12}
                                style={{ marginLeft: 4, verticalAlign: "middle" }}
                              />
                            )}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td className="amount-col">
                        <span
                          style={{
                            color: days > 14 ? "var(--color-red)" : days > 7 ? "var(--color-amber)" : "var(--text)",
                            fontWeight: days > 14 ? 600 : 400,
                          }}
                        >
                          {days}d
                        </span>
                      </td>
                      <td className="amount-col">
                        {rfi.cost_impact != null ? formatCurrency(rfi.cost_impact) : "--"}
                      </td>
                      <td>
                        <span className={statusBadge[rfi.status] ?? "inv-status"}>
                          {rfi.status}
                        </span>
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
              <MessageSquareMore size={48} />
            </div>
            <div className="fin-empty-title">No RFIs Found</div>
            <div className="fin-empty-desc">
              {activeStatus && activeStatus !== "all"
                ? "No RFIs match the current filter. Try selecting a different status."
                : "No RFIs have been created yet. RFIs will appear here once submitted."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
