"use client";

import { useMemo } from "react";
import {
  Sparkles,
  TrendingUp,
  ShieldAlert,
  Wrench,
  DollarSign,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils/format";
import {
  predictBudgetOverrun,
  calculateSafetyRiskScore,
  predictEquipmentFailure,
} from "@/lib/ai/analysis";
import type {
  BudgetOverrunResult,
  SafetyRiskResult,
  EquipmentFailureResult,
} from "@/lib/ai/analysis";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProjectData {
  id: string;
  name: string;
  code: string;
  status: string;
  contract_amount: number;
  estimated_cost: number;
  actual_cost: number;
  completion_pct: number;
  start_date: string | null;
  end_date: string | null;
}

interface SafetyData {
  incidentCount: number;
  severeIncidentCount: number;
  avgInspectionScore: number;
  certGapCount: number;
  daysSinceLastIncident: number;
  projectCount: number;
}

interface EquipmentData {
  id: string;
  name: string;
  status: string;
  purchase_date: string | null;
  next_maintenance_date: string | null;
}

interface FinancialOverviewData {
  totalAR: number;
  totalAP: number;
  cashPosition: number;
  revenueThisMonth: number;
  expensesThisMonth: number;
}

interface PredictionsClientProps {
  projects: ProjectData[];
  safetyData: SafetyData;
  equipment: EquipmentData[];
  financialOverview: FinancialOverviewData;
}

// ---------------------------------------------------------------------------
// Derived types
// ---------------------------------------------------------------------------

interface ProjectPrediction {
  project: ProjectData;
  prediction: BudgetOverrunResult;
}

interface EquipmentPrediction {
  equipment: EquipmentData;
  prediction: EquipmentFailureResult;
  ageMonths: number;
  daysSinceLastService: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function riskColor(risk: string): string {
  switch (risk) {
    case "low":
      return "var(--color-green)";
    case "medium":
      return "var(--color-amber)";
    case "high":
      return "var(--color-red)";
    case "critical":
      return "#991b1b";
    default:
      return "var(--muted)";
  }
}

function riskBadgeClass(risk: string): string {
  switch (risk) {
    case "low":
      return "risk-badge risk-low";
    case "medium":
      return "risk-badge risk-medium";
    case "high":
      return "risk-badge risk-high";
    case "critical":
      return "risk-badge risk-critical";
    default:
      return "risk-badge";
  }
}

function daysBetween(dateStr: string | null, reference: Date): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  return Math.floor(
    (reference.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function monthsBetween(dateStr: string | null, reference: Date): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  return Math.max(
    0,
    (reference.getFullYear() - d.getFullYear()) * 12 +
      (reference.getMonth() - d.getMonth())
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PredictionsClient({
  projects,
  safetyData,
  equipment,
  financialOverview,
}: PredictionsClientProps) {
  const now = useMemo(() => new Date(), []);

  // ---- Project budget predictions ----
  const projectPredictions: ProjectPrediction[] = useMemo(() => {
    return projects.map((p) => ({
      project: p,
      prediction: predictBudgetOverrun({
        budget: p.contract_amount || p.estimated_cost,
        actualCost: p.actual_cost,
        completionPct: p.completion_pct / 100,
      }),
    }));
  }, [projects]);

  const projectsAtRisk = useMemo(
    () =>
      projectPredictions.filter(
        (pp) => pp.prediction.risk === "high" || pp.prediction.risk === "critical"
      ).length,
    [projectPredictions]
  );

  // ---- Safety risk ----
  const safetyRisk: SafetyRiskResult = useMemo(
    () => calculateSafetyRiskScore(safetyData),
    [safetyData]
  );

  // ---- Equipment predictions ----
  const equipmentPredictions: EquipmentPrediction[] = useMemo(() => {
    return equipment.map((e) => {
      const ageMonths = monthsBetween(e.purchase_date, now);
      const daysSinceLastService = e.next_maintenance_date
        ? Math.max(0, -daysBetween(e.next_maintenance_date, now))
        : ageMonths * 10; // fallback heuristic if no maintenance date
      // If next_maintenance_date is in the past, it's overdue
      const actualDaysSinceService = e.next_maintenance_date
        ? daysBetween(e.next_maintenance_date, now)
        : ageMonths * 10;

      return {
        equipment: e,
        ageMonths,
        daysSinceLastService: Math.max(0, actualDaysSinceService),
        prediction: predictEquipmentFailure({
          ageMonths,
          usageHours: ageMonths * 80, // estimate ~80 hrs/month usage
          maintenanceCount: 0, // not available from the query, use 0 for conservative estimate
          daysSinceLastService: Math.max(0, actualDaysSinceService),
          expectedServiceIntervalDays: 90,
        }),
      };
    });
  }, [equipment, now]);

  const equipmentAlerts = useMemo(
    () =>
      equipmentPredictions.filter(
        (ep) => ep.prediction.risk === "medium" || ep.prediction.risk === "high"
      ).length,
    [equipmentPredictions]
  );

  // ---- Cash runway ----
  const monthlyBurnRate = financialOverview.expensesThisMonth || 1;
  const cashRunwayMonths = useMemo(() => {
    if (monthlyBurnRate <= 0) return 99;
    return Math.round((financialOverview.cashPosition / monthlyBurnRate) * 10) / 10;
  }, [financialOverview.cashPosition, monthlyBurnRate]);

  // ---- Render ----
  return (
    <div className="ai-feature-page">
      {/* Header */}
      <div className="ai-feature-header">
        <div>
          <h1>
            <Sparkles size={28} className="sparkle-icon" />
            AI Predictions
          </h1>
          <p className="subtitle">
            Real-time risk analysis and forecasting across your projects
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="ai-kpi-grid">
        <div
          className={`ai-kpi-card ${
            projectsAtRisk > 0 ? "kpi-critical" : "kpi-good"
          }`}
        >
          <span className="kpi-label">Projects At Risk</span>
          <span className="kpi-value" style={{ color: projectsAtRisk > 0 ? "var(--color-red)" : "var(--color-green)" }}>
            {projectsAtRisk}
          </span>
          <span className="kpi-change" style={{ color: "var(--muted)" }}>
            <AlertTriangle size={13} />
            of {projects.length} active projects
          </span>
        </div>

        <div
          className={`ai-kpi-card ${
            safetyRisk.level === "critical"
              ? "kpi-critical"
              : safetyRisk.level === "high"
                ? "kpi-critical"
                : safetyRisk.level === "medium"
                  ? "kpi-warning"
                  : "kpi-good"
          }`}
        >
          <span className="kpi-label">Safety Risk Score</span>
          <span className="kpi-value" style={{ color: riskColor(safetyRisk.level) }}>
            {safetyRisk.score}
            <span style={{ fontSize: "0.7em", fontWeight: 400, color: "var(--muted)" }}>/100</span>
          </span>
          <span className="kpi-change" style={{ color: "var(--muted)" }}>
            <ShieldAlert size={13} />
            {safetyRisk.level.charAt(0).toUpperCase() + safetyRisk.level.slice(1)} risk
          </span>
        </div>

        <div
          className={`ai-kpi-card ${
            equipmentAlerts > 0 ? "kpi-warning" : "kpi-good"
          }`}
        >
          <span className="kpi-label">Equipment Alerts</span>
          <span className="kpi-value" style={{ color: equipmentAlerts > 0 ? "var(--color-amber)" : "var(--color-green)" }}>
            {equipmentAlerts}
          </span>
          <span className="kpi-change" style={{ color: "var(--muted)" }}>
            <Wrench size={13} />
            need maintenance attention
          </span>
        </div>

        <div
          className={`ai-kpi-card ${
            cashRunwayMonths < 3
              ? "kpi-critical"
              : cashRunwayMonths < 6
                ? "kpi-warning"
                : "kpi-good"
          }`}
        >
          <span className="kpi-label">Cash Runway</span>
          <span
            className="kpi-value"
            style={{
              color:
                cashRunwayMonths < 3
                  ? "var(--color-red)"
                  : cashRunwayMonths < 6
                    ? "var(--color-amber)"
                    : "var(--color-green)",
            }}
          >
            {cashRunwayMonths > 24 ? "24+" : cashRunwayMonths}
            <span style={{ fontSize: "0.7em", fontWeight: 400, color: "var(--muted)" }}> mo</span>
          </span>
          <span className="kpi-change" style={{ color: "var(--muted)" }}>
            <DollarSign size={13} />
            {formatCompactCurrency(financialOverview.cashPosition)} cash
          </span>
        </div>
      </div>

      {/* Project Budget Predictions */}
      <SectionTitle icon={<TrendingUp size={20} />} title="Project Budget Predictions" />
      {projects.length === 0 ? (
        <EmptyCard message="No active projects to analyze. Create a project to see budget predictions." />
      ) : (
        <div className="prediction-grid">
          {projectPredictions.map(({ project, prediction }) => (
            <div key={project.id} className="prediction-card">
              <div className="project-name">
                {project.name}
                {project.code && (
                  <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: "0.82rem" }}>
                    {" "}({project.code})
                  </span>
                )}
              </div>
              <span className={riskBadgeClass(prediction.risk)}>
                {prediction.risk.toUpperCase()} RISK
              </span>
              <div className="metric-row">
                <span className="metric-label">Budget</span>
                <span className="metric-value">
                  {formatCurrency(project.contract_amount || project.estimated_cost)}
                </span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Actual Cost</span>
                <span className="metric-value">{formatCurrency(project.actual_cost)}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Predicted Final</span>
                <span className="metric-value">{formatCurrency(prediction.predictedFinalCost)}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Variance</span>
                <span
                  className="metric-value"
                  style={{
                    color:
                      prediction.variance > 0
                        ? "var(--color-red)"
                        : prediction.variance < 0
                          ? "var(--color-green)"
                          : "var(--text)",
                  }}
                >
                  {prediction.variance >= 0 ? "+" : ""}
                  {formatCurrency(prediction.variance)} ({prediction.variancePct >= 0 ? "+" : ""}
                  {prediction.variancePct.toFixed(1)}%)
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(100, Math.max(0, project.completion_pct))}%`,
                    background:
                      prediction.risk === "critical"
                        ? "var(--color-red)"
                        : prediction.risk === "high"
                          ? "var(--color-red)"
                          : prediction.risk === "medium"
                            ? "var(--color-amber)"
                            : "var(--color-blue)",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "var(--muted)",
                  marginTop: "4px",
                  textAlign: "right",
                }}
              >
                {project.completion_pct.toFixed(0)}% complete
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Safety Risk Section */}
      <SectionTitle icon={<ShieldAlert size={20} />} title="Safety Risk Analysis" />
      {safetyData.projectCount === 0 && safetyData.incidentCount === 0 ? (
        <EmptyCard message="No safety data available. Safety risk scores will appear once incidents or inspections are recorded." />
      ) : (
        <div className="prediction-card" style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div>
              <div className="project-name" style={{ marginBottom: 4 }}>
                Overall Safety Risk Score
              </div>
              <span className={riskBadgeClass(safetyRisk.level)}>
                {safetyRisk.level.toUpperCase()}
              </span>
            </div>
            <div
              style={{
                fontSize: "2.2rem",
                fontFamily: "var(--font-serif)",
                fontWeight: 700,
                color: riskColor(safetyRisk.level),
              }}
            >
              {safetyRisk.score}
              <span style={{ fontSize: "0.5em", fontWeight: 400, color: "var(--muted)" }}>/100</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {safetyRisk.factors.map((factor) => (
              <div key={factor.name} className="metric-row" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: "0 0 160px" }}>
                  <span className="metric-label">{factor.name}</span>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        height: 6,
                        background: "var(--surface)",
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, factor.value)}%`,
                          height: "100%",
                          borderRadius: 3,
                          background:
                            factor.value > 60
                              ? "var(--color-red)"
                              : factor.value > 30
                                ? "var(--color-amber)"
                                : "var(--color-green)",
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        fontFamily: "var(--font-serif)",
                        minWidth: 28,
                        textAlign: "right",
                      }}
                    >
                      {Math.round(factor.value)}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                    {factor.impact}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Equipment Maintenance Predictions */}
      <SectionTitle icon={<Wrench size={20} />} title="Equipment Maintenance Predictions" />
      {equipment.length === 0 ? (
        <EmptyCard message="No equipment registered. Add equipment to see maintenance predictions." />
      ) : (
        <div className="prediction-grid">
          {equipmentPredictions
            .sort((a, b) => b.prediction.probability - a.prediction.probability)
            .map(({ equipment: eq, prediction, ageMonths, daysSinceLastService }) => (
              <div key={eq.id} className="prediction-card">
                <div className="project-name">{eq.name}</div>
                <span className={riskBadgeClass(prediction.risk)}>
                  {prediction.risk.toUpperCase()} RISK
                </span>
                <div className="metric-row">
                  <span className="metric-label">Age</span>
                  <span className="metric-value">
                    {ageMonths > 0 ? `${ageMonths} months` : "Unknown"}
                  </span>
                </div>
                <div className="metric-row">
                  <span className="metric-label">Days Since Service</span>
                  <span
                    className="metric-value"
                    style={{
                      color:
                        daysSinceLastService > 90
                          ? "var(--color-red)"
                          : daysSinceLastService > 60
                            ? "var(--color-amber)"
                            : "var(--text)",
                    }}
                  >
                    {eq.next_maintenance_date ? `${daysSinceLastService} days` : "N/A"}
                  </span>
                </div>
                <div className="metric-row">
                  <span className="metric-label">Failure Probability</span>
                  <span
                    className="metric-value"
                    style={{
                      color: riskColor(prediction.risk),
                    }}
                  >
                    {(prediction.probability * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="metric-row" style={{ borderBottom: "none" }}>
                  <span className="metric-label">Status</span>
                  <span className="metric-value" style={{ textTransform: "capitalize" }}>
                    {eq.status}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px 12px",
                    background: "var(--surface)",
                    borderRadius: 8,
                    fontSize: "0.78rem",
                    color: "var(--muted)",
                    lineHeight: 1.5,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  {prediction.risk === "high" ? (
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2, color: "var(--color-red)" }} />
                  ) : prediction.risk === "medium" ? (
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2, color: "var(--color-amber)" }} />
                  ) : (
                    <CheckCircle size={14} style={{ flexShrink: 0, marginTop: 2, color: "var(--color-green)" }} />
                  )}
                  {prediction.recommendation}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
        marginTop: 8,
      }}
    >
      <span style={{ color: "var(--muted)" }}>{icon}</span>
      <h2
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "1.15rem",
          fontWeight: 600,
          color: "var(--text)",
          margin: 0,
        }}
      >
        {title}
      </h2>
    </div>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div
      className="prediction-card"
      style={{
        textAlign: "center",
        padding: "40px 24px",
        marginBottom: 24,
        color: "var(--muted)",
      }}
    >
      <CheckCircle size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
      <p style={{ fontSize: "0.88rem", lineHeight: 1.5, margin: 0 }}>{message}</p>
    </div>
  );
}
