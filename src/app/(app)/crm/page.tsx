import { redirect } from "next/navigation";
import Link from "next/link";
import { DollarSign, TrendingUp, Target, BarChart3, FileText, Clock, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getCRMOverview } from "@/lib/queries/crm";
import { formatCompactCurrency, formatPercent, formatCurrency } from "@/lib/utils/format";
import CRMPipelineClient from "./CRMPipelineClient";
import PipelineFunnelChart from "@/components/charts/PipelineFunnelChart";
import BidPerformanceChart from "@/components/charts/BidPerformanceChart";

export const metadata = {
  title: "Sales Pipeline - Buildwrk",
};

const STAGE_LABELS: Record<string, string> = {
  lead: "Lead",
  qualification: "Qualification",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

const STAGE_BADGE: Record<string, string> = {
  lead: "draft",
  qualification: "pending",
  proposal: "pending",
  negotiation: "approved",
  won: "paid",
  lost: "overdue",
};

export default async function CRMPipelinePage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const { companyId } = userCompany;
  const overview = await getCRMOverview(supabase, companyId);

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>CRM & Bids</h2>
          <p className="fin-header-sub">Sales pipeline, opportunities, and bid management.</p>
        </div>
        <div className="fin-header-actions">
          <Link href="/crm/bids" className="ui-btn ui-btn-md ui-btn-secondary">Bid Management</Link>
          <Link href="/crm/bids/new" className="ui-btn ui-btn-md ui-btn-primary">
            <Plus size={16} /> New Bid
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="financial-kpi-row" style={{ marginBottom: 24 }}>
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue"><DollarSign size={18} /></div>
          <span className="fin-kpi-label">Pipeline Value</span>
          <span className="fin-kpi-value">{formatCompactCurrency(overview.summary.totalPipelineValue)}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon green"><TrendingUp size={18} /></div>
          <span className="fin-kpi-label">Weighted Value</span>
          <span className="fin-kpi-value">{formatCompactCurrency(overview.summary.weightedValue)}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon green"><Target size={18} /></div>
          <span className="fin-kpi-label">Win Rate</span>
          <span className="fin-kpi-value" style={{ color: overview.summary.winRate >= 50 ? "var(--color-green)" : overview.summary.winRate >= 25 ? "var(--color-amber)" : "var(--color-red)" }}>
            {formatPercent(overview.summary.winRate)}
          </span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue"><BarChart3 size={18} /></div>
          <span className="fin-kpi-label">Avg. Deal Size</span>
          <span className="fin-kpi-value">{formatCompactCurrency(overview.summary.avgDealSize)}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber"><FileText size={18} /></div>
          <span className="fin-kpi-label">Active Bids</span>
          <span className="fin-kpi-value">{overview.activeBidCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon red"><Clock size={18} /></div>
          <span className="fin-kpi-label">Bids Due This Week</span>
          <span className="fin-kpi-value" style={{ color: overview.bidsDueThisWeek > 0 ? "var(--color-red)" : undefined }}>
            {overview.bidsDueThisWeek}
          </span>
        </div>
      </div>

      {/* Charts */}
      <div className="financial-charts-row" style={{ marginBottom: 24 }}>
        <div className="fin-chart-card">
          <div className="fin-chart-title">Pipeline by Stage</div>
          <PipelineFunnelChart data={overview.stageData} />
        </div>
        <div className="fin-chart-card">
          <div className="fin-chart-title">Bid Performance (6 Months)</div>
          <BidPerformanceChart data={overview.monthlyBidTrend} />
        </div>
      </div>

      {/* Lists */}
      <div className="financial-charts-row" style={{ marginBottom: 24 }}>
        <div className="fin-chart-card">
          <div className="fin-chart-title">Hot Opportunities</div>
          {overview.hotOpportunities.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className="invoice-table">
                <thead><tr><th>Opportunity</th><th>Client</th><th>Stage</th><th>Value</th><th>Probability</th><th>Expected Close</th></tr></thead>
                <tbody>
                  {overview.hotOpportunities.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 500 }}>{o.name}</td>
                      <td style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{o.client_name ?? "—"}</td>
                      <td>
                        <span className={`inv-status inv-status-${STAGE_BADGE[o.stage] ?? "draft"}`}>
                          {STAGE_LABELS[o.stage] ?? o.stage}
                        </span>
                      </td>
                      <td className="amount-col">{formatCompactCurrency(Number(o.estimated_value) || 0)}</td>
                      <td style={{ color: "var(--color-blue)", fontWeight: 500 }}>
                        {o.probability_pct ?? 0}%
                      </td>
                      <td style={{ fontSize: "0.78rem" }}>
                        {o.expected_close_date
                          ? new Date(o.expected_close_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px", color: "var(--muted)", fontSize: "0.85rem" }}>No active opportunities</div>
          )}
        </div>
        <div className="fin-chart-card">
          <div className="fin-chart-title">Bids Due Soon</div>
          {overview.bidsDueSoon.length > 0 ? (
            <div>
              {overview.bidsDueSoon.map((b) => {
                const daysLeft = b.due_date
                  ? Math.ceil((new Date(b.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : 999;
                return (
                  <div key={b.id} className="activity-item">
                    <div className="activity-icon" style={{ color: daysLeft <= 7 ? "var(--color-red)" : "var(--color-amber)" }}>
                      <Clock size={14} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="activity-text">
                        <strong>{b.bid_number}</strong> — {b.project_name}
                      </div>
                      <div className="activity-time">
                        {b.client_name ?? "No client"} · Due{" "}
                        <span style={{ color: daysLeft <= 7 ? "var(--color-red)" : "var(--color-amber)", fontWeight: 600 }}>
                          {b.due_date
                            ? new Date(b.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            : "TBD"}
                          {daysLeft <= 30 && ` (${daysLeft}d)`}
                        </span>
                        {b.bid_amount ? ` · ${formatCompactCurrency(b.bid_amount)}` : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px", color: "var(--muted)", fontSize: "0.85rem" }}>No bids due soon</div>
          )}
        </div>
      </div>

      {/* Pipeline Kanban */}
      <CRMPipelineClient opportunities={overview.hotOpportunities} summary={overview.summary} />
    </div>
  );
}
