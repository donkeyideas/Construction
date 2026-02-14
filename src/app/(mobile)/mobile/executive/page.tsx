import { redirect } from "next/navigation";
import Link from "next/link";
import {
  DollarSign,
  Briefcase,
  FileWarning,
  Clock,
  MessageSquare,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getDashboardKPIs,
  getProjectStatusBreakdown,
  getPendingApprovals,
} from "@/lib/queries/dashboard";
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
} from "@/lib/utils/format";
import ExecutiveAiInput from "./ExecutiveAiInput";

export const metadata = {
  title: "Executive Dashboard - ConstructionERP",
};

export default async function ExecutiveMobilePage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/login");
  }

  const { companyId } = userCompany;

  // Fetch dashboard data in parallel
  const [kpis, projectStatus, pendingApprovalsResult] = await Promise.all([
    getDashboardKPIs(supabase, companyId),
    getProjectStatusBreakdown(supabase, companyId),
    getPendingApprovals(supabase, companyId),
  ]);
  const { items: pendingApprovals, totalCount: pendingApprovalsTotal } = pendingApprovalsResult;

  return (
    <div>
      <div className="mobile-header">
        <div>
          <h2>Executive View</h2>
          <div className="mobile-header-date">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
        <Link
          href="/mobile/profile"
          style={{
            fontSize: "0.75rem",
            color: "var(--color-blue)",
            textDecoration: "none",
          }}
        >
          Back
        </Link>
      </div>

      {/* KPI Grid */}
      <div className="mobile-kpi-grid">
        <div className="mobile-kpi">
          <div className="mobile-kpi-label">
            <Briefcase
              size={12}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: "4px",
              }}
            />
            Active Projects
          </div>
          <div className="mobile-kpi-value">
            {formatCompactCurrency(kpis.activeProjectsValue)}
          </div>
        </div>
        <div className="mobile-kpi">
          <div className="mobile-kpi-label">
            <DollarSign
              size={12}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: "4px",
              }}
            />
            Cash Position
          </div>
          <div className="mobile-kpi-value">
            {formatCompactCurrency(kpis.cashPosition)}
          </div>
        </div>
        <div className="mobile-kpi">
          <div className="mobile-kpi-label">
            <FileWarning
              size={12}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: "4px",
              }}
            />
            Open COs
          </div>
          <div
            className="mobile-kpi-value"
            style={{
              color:
                kpis.openChangeOrders > 0
                  ? "var(--color-amber)"
                  : "var(--text)",
            }}
          >
            {kpis.openChangeOrders}
          </div>
        </div>
        <div className="mobile-kpi">
          <div className="mobile-kpi-label">
            <Clock
              size={12}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: "4px",
              }}
            />
            Schedule
          </div>
          <div className="mobile-kpi-value">
            {formatPercent(kpis.schedulePerformance)}
          </div>
        </div>
      </div>

      {/* Project Counts */}
      <div className="mobile-card">
        <div className="mobile-card-title">Project Status</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "8px",
          }}
        >
          <StatusItem label="Active" count={projectStatus.active} color="var(--color-blue)" />
          <StatusItem
            label="Pre-Construction"
            count={projectStatus.pre_construction}
            color="var(--color-amber)"
          />
          <StatusItem label="Completed" count={projectStatus.completed} color="var(--color-green)" />
          <StatusItem label="On Hold" count={projectStatus.on_hold} color="var(--color-red)" />
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="mobile-card">
        <div className="mobile-card-title">
          Pending Approvals ({pendingApprovalsTotal})
        </div>
        {pendingApprovals.length === 0 ? (
          <div className="mobile-empty">No pending approvals</div>
        ) : (
          pendingApprovals.map((item) => (
            <div key={item.entityId} className="mobile-approval">
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  flexShrink: 0,
                  background:
                    item.urgency === "high"
                      ? "var(--color-red)"
                      : item.urgency === "medium"
                        ? "var(--color-amber)"
                        : "var(--color-green)",
                }}
              />
              <div className="mobile-approval-info">
                <div className="mobile-approval-title">{item.title}</div>
                <div className="mobile-approval-meta">
                  {item.type.replace("_", " ")} --{" "}
                  {item.amount != null ? formatCurrency(item.amount) : "N/A"}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* AI Query */}
      <div className="mobile-card">
        <div className="mobile-card-title">
          <MessageSquare
            size={16}
            style={{
              display: "inline",
              verticalAlign: "middle",
              marginRight: "6px",
            }}
          />
          Ask AI
        </div>
        <ExecutiveAiInput />
      </div>
    </div>
  );
}

function StatusItem({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: "0.8rem" }}>
        {label}:{" "}
        <strong>{count}</strong>
      </span>
    </div>
  );
}
