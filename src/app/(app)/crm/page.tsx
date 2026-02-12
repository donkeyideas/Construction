import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Target,
  DollarSign,
  TrendingUp,
  BarChart3,
  User,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getOpportunities,
  getPipelineSummary,
  type Opportunity,
  type OpportunityStage,
} from "@/lib/queries/crm";
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
} from "@/lib/utils/format";

export const metadata = {
  title: "Sales Pipeline - ConstructionERP",
};

const STAGE_LABELS: Record<OpportunityStage, string> = {
  lead: "Lead",
  qualification: "Qualification",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

const STAGE_COLORS: Record<OpportunityStage, string> = {
  lead: "badge-blue",
  qualification: "badge-amber",
  proposal: "badge-blue",
  negotiation: "badge-amber",
  won: "badge-green",
  lost: "badge-red",
};

export default async function CRMPipelinePage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const { companyId } = userCompany;

  const [opportunities, summary] = await Promise.all([
    getOpportunities(supabase, companyId),
    getPipelineSummary(supabase, companyId),
  ]);

  // Group opportunities by stage
  const stages: OpportunityStage[] = [
    "lead",
    "qualification",
    "proposal",
    "negotiation",
    "won",
    "lost",
  ];

  const groupedByStage = new Map<OpportunityStage, Opportunity[]>();
  for (const stage of stages) {
    groupedByStage.set(
      stage,
      opportunities.filter((o) => o.stage === stage)
    );
  }

  const isEmpty = opportunities.length === 0;

  return (
    <div>
      {/* Header */}
      <div className="crm-header">
        <div>
          <h2>Sales Pipeline</h2>
          <p className="crm-header-sub">
            Track opportunities from lead to close.
          </p>
        </div>
        <div className="crm-header-actions">
          <Link href="/crm/bids" className="ui-btn ui-btn-md ui-btn-secondary">
            Bid Management
          </Link>
        </div>
      </div>

      {/* Pipeline Summary */}
      <div className="pipeline-summary">
        <SummaryCard
          label="Total Pipeline"
          value={formatCompactCurrency(summary.totalPipelineValue)}
          icon={<DollarSign size={20} />}
        />
        <SummaryCard
          label="Weighted Value"
          value={formatCompactCurrency(summary.weightedValue)}
          icon={<TrendingUp size={20} />}
        />
        <SummaryCard
          label="Win Rate"
          value={formatPercent(summary.winRate)}
          icon={<Target size={20} />}
        />
        <SummaryCard
          label="Avg Deal Size"
          value={formatCompactCurrency(summary.avgDealSize)}
          icon={<BarChart3 size={20} />}
        />
      </div>

      {/* Empty State */}
      {isEmpty ? (
        <div className="card" style={{ textAlign: "center", padding: "64px 24px" }}>
          <div style={{ marginBottom: 16, color: "var(--border)" }}>
            <Target size={48} />
          </div>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1.15rem",
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            No opportunities yet
          </div>
          <p
            style={{
              color: "var(--muted)",
              fontSize: "0.85rem",
              maxWidth: 400,
              margin: "0 auto 20px",
              lineHeight: 1.5,
            }}
          >
            Start building your sales pipeline by adding leads and tracking them
            through each stage to close.
          </p>
        </div>
      ) : (
        /* Kanban Board */
        <div className="pipeline-board">
          {stages.map((stage) => {
            const stageOpps = groupedByStage.get(stage) || [];
            const stageInfo = summary.stageBreakdown.find(
              (s) => s.stage === stage
            );
            return (
              <div key={stage} className="pipeline-column">
                <div className="pipeline-column-header">
                  <div className="pipeline-column-title">
                    <span className={`badge ${STAGE_COLORS[stage]}`}>
                      {stageOpps.length}
                    </span>
                    <span>{STAGE_LABELS[stage]}</span>
                  </div>
                  <div className="pipeline-column-value">
                    {formatCompactCurrency(stageInfo?.value || 0)}
                  </div>
                </div>
                <div className="pipeline-column-cards">
                  {stageOpps.length === 0 ? (
                    <div className="pipeline-empty">No items</div>
                  ) : (
                    stageOpps.map((opp) => (
                      <PipelineCard key={opp.id} opportunity={opp} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="pipeline-summary-card">
      <div className="pipeline-summary-icon">{icon}</div>
      <div>
        <div className="pipeline-summary-label">{label}</div>
        <div className="pipeline-summary-value">{value}</div>
      </div>
    </div>
  );
}

function PipelineCard({ opportunity }: { opportunity: Opportunity }) {
  const assignedName =
    opportunity.assigned_user?.full_name ||
    opportunity.assigned_user?.email ||
    null;

  return (
    <div className="pipeline-card">
      <div className="pipeline-card-name">{opportunity.name}</div>
      {opportunity.client_name && (
        <div className="pipeline-card-client">{opportunity.client_name}</div>
      )}
      <div className="pipeline-card-details">
        {opportunity.estimated_value != null && (
          <div className="pipeline-card-value">
            <DollarSign size={13} />
            {formatCurrency(opportunity.estimated_value)}
          </div>
        )}
        {opportunity.probability_pct != null && (
          <div className="pipeline-card-prob">
            {opportunity.probability_pct}%
          </div>
        )}
      </div>
      <div className="pipeline-card-footer">
        {assignedName && (
          <div className="pipeline-card-assigned">
            <User size={12} />
            <span>{assignedName}</span>
          </div>
        )}
        {opportunity.expected_close_date && (
          <div className="pipeline-card-date">
            <Calendar size={12} />
            <span>
              {new Date(opportunity.expected_close_date).toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric" }
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
