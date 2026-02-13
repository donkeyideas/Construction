import Link from "next/link";
import {
  FileEdit,
  Hash,
  Clock,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils/format";

export const metadata = {
  title: "Change Orders - ConstructionERP",
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

const REASON_LABELS: Record<string, string> = {
  owner_request: "Owner Request",
  design_change: "Design Change",
  unforeseen_condition: "Unforeseen",
  value_engineering: "Value Eng.",
};

const REASON_BADGE: Record<string, string> = {
  owner_request: "badge-blue",
  design_change: "badge-amber",
  unforeseen_condition: "badge-red",
  value_engineering: "badge-green",
};

const STATUS_BADGE: Record<string, string> = {
  draft: "inv-status inv-status-draft",
  submitted: "inv-status inv-status-pending",
  approved: "inv-status inv-status-approved",
  rejected: "inv-status inv-status-voided",
};

export default async function ChangeOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><FileEdit size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access change orders.</div>
      </div>
    );
  }

  const activeStatus = params.status || undefined;

  // Build query
  let query = supabase
    .from("change_orders")
    .select("*, projects(name, code)")
    .eq("company_id", userCompany.companyId)
    .order("created_at", { ascending: false });

  if (activeStatus && activeStatus !== "all") {
    query = query.eq("status", activeStatus);
  }

  const { data: changeOrders } = await query;
  const rows = changeOrders ?? [];

  // Fetch all COs (unfiltered) for KPI counts
  const { data: allCos } = await supabase
    .from("change_orders")
    .select("id, status, amount")
    .eq("company_id", userCompany.companyId);

  const all = allCos ?? [];
  const totalCount = all.length;
  const pendingValue = all
    .filter((co) => co.status === "submitted" || co.status === "draft")
    .reduce((sum, co) => sum + (co.amount ?? 0), 0);
  const approvedValue = all
    .filter((co) => co.status === "approved")
    .reduce((sum, co) => sum + (co.amount ?? 0), 0);
  const awaitingApproval = all.filter((co) => co.status === "submitted").length;

  // Collect unique user IDs for name lookup
  const userIds = new Set<string>();
  for (const co of rows) {
    if (co.requested_by) userIds.add(co.requested_by);
    if (co.approved_by) userIds.add(co.approved_by);
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

  const statuses = [
    { label: "All", value: "all" },
    { label: "Draft", value: "draft" },
    { label: "Submitted", value: "submitted" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
  ];

  function buildUrl(status?: string): string {
    if (!status || status === "all") return "/projects/change-orders";
    return `/projects/change-orders?status=${status}`;
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Change Orders</h2>
          <p className="fin-header-sub">Track scope changes, cost impact, and schedule adjustments</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="financial-kpi-row">
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <Hash size={18} />
          </div>
          <span className="fin-kpi-label">Total COs</span>
          <span className="fin-kpi-value">{totalCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <DollarSign size={18} />
          </div>
          <span className="fin-kpi-label">Pending Value</span>
          <span className="fin-kpi-value">{formatCompactCurrency(pendingValue)}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon green">
            <CheckCircle2 size={18} />
          </div>
          <span className="fin-kpi-label">Approved Value</span>
          <span className="fin-kpi-value positive">{formatCompactCurrency(approvedValue)}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon red">
            <Clock size={18} />
          </div>
          <span className="fin-kpi-label">Awaiting Approval</span>
          <span className="fin-kpi-value">{awaitingApproval}</span>
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
                  <th>CO #</th>
                  <th>Title</th>
                  <th>Project</th>
                  <th>Reason</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th style={{ textAlign: "right" }}>Schedule Impact</th>
                  <th>Requested By</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((co) => {
                  const project = co.projects as { name: string; code: string } | null;
                  const amount = co.amount as number | null;
                  const isNegative = amount != null && amount < 0;
                  const isLarge = amount != null && amount > 100000;

                  return (
                    <tr key={co.id}>
                      <td style={{ fontWeight: 600, fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                        {co.co_number}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{co.title}</div>
                        {co.description && (
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
                            {co.description}
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
                        {co.reason ? (
                          <span className={`badge ${REASON_BADGE[co.reason] ?? "badge-blue"}`}>
                            {REASON_LABELS[co.reason] ?? co.reason}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td className="amount-col">
                        {amount != null ? (
                          <span
                            style={{
                              color: isNegative
                                ? "var(--color-green)"
                                : isLarge
                                ? "var(--color-red)"
                                : "var(--text)",
                              fontWeight: isNegative || isLarge ? 600 : 400,
                            }}
                          >
                            {formatCurrency(amount)}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td className="amount-col">
                        {co.schedule_impact_days != null ? (
                          <span
                            style={{
                              color:
                                co.schedule_impact_days > 0
                                  ? "var(--color-red)"
                                  : co.schedule_impact_days < 0
                                  ? "var(--color-green)"
                                  : "var(--text)",
                              fontWeight: co.schedule_impact_days !== 0 ? 600 : 400,
                            }}
                          >
                            {co.schedule_impact_days > 0 ? "+" : ""}
                            {co.schedule_impact_days}d
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {co.requested_by ? userMap[co.requested_by] ?? "--" : "--"}
                      </td>
                      <td>
                        <span className={STATUS_BADGE[co.status] ?? "inv-status"}>
                          {co.status}
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
              <FileEdit size={48} />
            </div>
            <div className="fin-empty-title">No Change Orders Found</div>
            <div className="fin-empty-desc">
              {activeStatus && activeStatus !== "all"
                ? "No change orders match the current filter. Try selecting a different status."
                : "No change orders have been created yet. They will appear here once submitted."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
