"use client";

import { useState, useMemo } from "react";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Clock,
  ChevronDown,
} from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import {
  analyzeChangeOrderImpact,
  type ChangeOrderImpactResult,
} from "@/lib/ai/analysis";

interface Props {
  coAmount: number;
  currentBudget: number;
  currentActualCost: number;
  completionPct: number;
  scheduleImpactDays: number;
  originalContractValue: number;
  totalApprovedCOs: number;
}

export default function AIChangeOrderImpact({
  coAmount,
  currentBudget,
  currentActualCost,
  completionPct,
  scheduleImpactDays,
  originalContractValue,
  totalApprovedCOs,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  // Compute impact analysis using the deterministic engine
  const analysis: ChangeOrderImpactResult = useMemo(
    () =>
      analyzeChangeOrderImpact({
        coAmount,
        currentBudget,
        currentActualCost,
        completionPct,
        scheduleImpactDays,
        originalContractValue,
        totalCOsToDate: totalApprovedCOs,
      }),
    [
      coAmount,
      currentBudget,
      currentActualCost,
      completionPct,
      scheduleImpactDays,
      originalContractValue,
      totalApprovedCOs,
    ]
  );

  const budgetVariancePositive = analysis.budgetImpact.newVariance <= 0;
  const marginPositive = analysis.marginImpact.marginChange >= 0;
  const scheduleNeutral = analysis.scheduleImpact.newEndDateDelta === 0;
  const cumulativeHealthy = analysis.cumulativeCOPct <= 10;

  return (
    <div className="ai-inline-panel">
      {/* Header — click to toggle */}
      <div
        className="panel-header"
        onClick={() => setIsOpen((prev) => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
      >
        <Sparkles size={16} className="sparkle-icon" />
        <span className="panel-title">AI Impact Analysis</span>
        <ChevronDown
          size={16}
          className={`toggle-icon${isOpen ? " expanded" : ""}`}
        />
      </div>

      {/* Expandable content */}
      {isOpen && (
        <div className="panel-content">
          {/* 4 metric cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "14px",
              marginBottom: "16px",
            }}
          >
            {/* 1. Budget Impact */}
            <div
              style={{
                padding: "14px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "10px",
                }}
              >
                <DollarSign size={14} style={{ color: "var(--color-blue)" }} />
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  Budget Impact
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  marginBottom: "4px",
                }}
              >
                {formatCurrency(analysis.budgetImpact.newBudget)}
              </div>
              <div
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: budgetVariancePositive
                    ? "var(--color-green)"
                    : "var(--color-red)",
                }}
              >
                {analysis.budgetImpact.newVariance >= 0 ? "+" : ""}
                {formatCurrency(analysis.budgetImpact.newVariance)} variance (
                {formatPercent(Math.abs(analysis.budgetImpact.newVariancePct))})
              </div>
            </div>

            {/* 2. Schedule Impact */}
            <div
              style={{
                padding: "14px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "10px",
                }}
              >
                <Clock size={14} style={{ color: "var(--color-amber)" }} />
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  Schedule Impact
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  marginBottom: "4px",
                  color: scheduleNeutral
                    ? "var(--color-green)"
                    : "var(--color-red)",
                }}
              >
                {scheduleNeutral
                  ? "No delay"
                  : `+${analysis.scheduleImpact.newEndDateDelta} day${analysis.scheduleImpact.newEndDateDelta !== 1 ? "s" : ""}`}
              </div>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: analysis.scheduleImpact.criticalPathAffected
                    ? "var(--color-red)"
                    : "var(--muted)",
                  fontWeight: analysis.scheduleImpact.criticalPathAffected
                    ? 600
                    : 400,
                }}
              >
                {analysis.scheduleImpact.criticalPathAffected
                  ? "Critical path affected"
                  : "Critical path not affected"}
              </div>
            </div>

            {/* 3. Margin Impact */}
            <div
              style={{
                padding: "14px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "10px",
                }}
              >
                <TrendingUp size={14} style={{ color: "var(--color-green)" }} />
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  Margin Impact
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "8px",
                  marginBottom: "4px",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "1.15rem",
                    fontWeight: 700,
                  }}
                >
                  {formatPercent(analysis.marginImpact.projectedMargin)}
                </span>
                <span
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--muted)",
                  }}
                >
                  from {formatPercent(analysis.marginImpact.currentMargin)}
                </span>
              </div>
              <div
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: marginPositive
                    ? "var(--color-green)"
                    : "var(--color-red)",
                }}
              >
                {analysis.marginImpact.marginChange >= 0 ? "+" : ""}
                {formatPercent(analysis.marginImpact.marginChange)} change
              </div>
            </div>

            {/* 4. Cumulative COs */}
            <div
              style={{
                padding: "14px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "10px",
                }}
              >
                <AlertTriangle
                  size={14}
                  style={{
                    color: cumulativeHealthy
                      ? "var(--color-green)"
                      : "var(--color-red)",
                  }}
                />
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  Cumulative COs
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  marginBottom: "4px",
                  color: cumulativeHealthy
                    ? "var(--color-green)"
                    : analysis.cumulativeCOPct <= 15
                      ? "var(--color-amber)"
                      : "var(--color-red)",
                }}
              >
                {formatPercent(analysis.cumulativeCOPct)}
              </div>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--muted)",
                }}
              >
                of original contract value
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              background: cumulativeHealthy
                ? "rgba(22, 163, 74, 0.06)"
                : analysis.cumulativeCOPct <= 15
                  ? "rgba(217, 119, 6, 0.06)"
                  : "rgba(220, 38, 38, 0.06)",
              border: `1px solid ${
                cumulativeHealthy
                  ? "rgba(22, 163, 74, 0.15)"
                  : analysis.cumulativeCOPct <= 15
                    ? "rgba(217, 119, 6, 0.15)"
                    : "rgba(220, 38, 38, 0.15)"
              }`,
              fontSize: "0.84rem",
              lineHeight: 1.6,
              color: "var(--text)",
            }}
          >
            <strong style={{ display: "block", marginBottom: "4px" }}>
              Recommendation
            </strong>
            {analysis.recommendation}
          </div>
        </div>
      )}
    </div>
  );
}
