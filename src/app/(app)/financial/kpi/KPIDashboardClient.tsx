"use client";

import { useState } from "react";
import {
  BarChart3,
  Droplets,
  TrendingUp,
  Zap,
  Landmark,
  X,
  Info,
} from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import type { FinancialKPIs } from "@/lib/queries/financial";

interface KPIDashboardClientProps {
  kpis: FinancialKPIs;
}

type StatusColor = "green" | "amber" | "red" | "blue";

interface KPICardData {
  label: string;
  value: string;
  status: StatusColor;
  explanation: string;
  detailTitle: string;
  detailFormula: string;
  detailComponents: { label: string; value: string }[];
  detailBenchmark: string;
}

function getRatioStatus(
  value: number | null,
  greenThreshold: number,
  amberThreshold: number
): StatusColor {
  if (value === null) return "blue";
  if (value >= greenThreshold) return "green";
  if (value >= amberThreshold) return "amber";
  return "red";
}

function formatRatio(value: number | null): string {
  if (value === null) return "N/A";
  return value.toFixed(2);
}

function formatDays(value: number | null): string {
  if (value === null) return "N/A";
  return `${Math.round(value)} days`;
}

function formatDebtRatio(value: number | null): string {
  if (value === null) return "N/A";
  return `${value.toFixed(2)}:1`;
}

function formatPercentValue(value: number | null): string {
  if (value === null) return "N/A";
  return formatPercent(value);
}

function formatCurrencyValue(value: number | null): string {
  if (value === null) return "N/A";
  return formatCurrency(value);
}

function StatusDot({ color }: { color: StatusColor }) {
  const colorMap: Record<StatusColor, string> = {
    green: "var(--color-green)",
    amber: "var(--color-amber)",
    red: "var(--color-red)",
    blue: "var(--color-blue)",
  };

  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        backgroundColor: colorMap[color],
        flexShrink: 0,
      }}
    />
  );
}

function KPICard({
  data,
  onClick,
}: {
  data: KPICardData;
  onClick: () => void;
}) {
  const isNA = data.value === "N/A";
  const valueColorMap: Record<StatusColor, string> = {
    green: "var(--color-green)",
    amber: "var(--color-amber)",
    red: "var(--color-red)",
    blue: "var(--text)",
  };

  return (
    <div
      className="fin-kpi"
      style={{ position: "relative", cursor: "pointer" }}
      onClick={onClick}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 2,
        }}
      >
        <span className="fin-kpi-label">{data.label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {!isNA && <StatusDot color={data.status} />}
          <Info size={12} style={{ color: "var(--muted)", opacity: 0.5 }} />
        </div>
      </div>
      <span
        className="fin-kpi-value"
        style={{
          color: isNA ? "var(--muted)" : valueColorMap[data.status],
          fontSize: isNA ? "1.2rem" : undefined,
        }}
      >
        {data.value}
      </span>
      <span
        style={{
          fontSize: "0.72rem",
          color: "var(--muted)",
          lineHeight: 1.4,
          marginTop: 4,
        }}
      >
        {data.explanation}
      </span>
    </div>
  );
}

export default function KPIDashboardClient({ kpis }: KPIDashboardClientProps) {
  const [selectedKPI, setSelectedKPI] = useState<KPICardData | null>(null);

  // Liquidity Ratios
  const liquidityCards: KPICardData[] = [
    {
      label: "Current Ratio",
      value: formatRatio(kpis.currentRatio),
      status: getRatioStatus(kpis.currentRatio, 1.5, 1.0),
      explanation: "Current assets divided by current liabilities",
      detailTitle: "Current Ratio",
      detailFormula: "Current Assets / Current Liabilities",
      detailComponents: [
        { label: "Ratio", value: formatRatio(kpis.currentRatio) },
      ],
      detailBenchmark: "≥ 1.5 is healthy (green), 1.0–1.5 is acceptable (amber), < 1.0 is a concern (red). In construction, 1.5+ ensures you can cover short-term obligations.",
    },
    {
      label: "Quick Ratio",
      value: formatRatio(kpis.quickRatio),
      status: getRatioStatus(kpis.quickRatio, 1.5, 1.0),
      explanation: "Cash + receivables divided by current liabilities",
      detailTitle: "Quick Ratio (Acid-Test)",
      detailFormula: "(Cash + Accounts Receivable) / Current Liabilities",
      detailComponents: [
        { label: "Ratio", value: formatRatio(kpis.quickRatio) },
      ],
      detailBenchmark: "≥ 1.5 is healthy, 1.0–1.5 is acceptable. Excludes inventory and prepaid expenses for a stricter liquidity view.",
    },
    {
      label: "Working Capital",
      value: formatCurrencyValue(kpis.workingCapital),
      status: kpis.workingCapital >= 0 ? "green" : "red",
      explanation: "Current assets minus current liabilities",
      detailTitle: "Working Capital",
      detailFormula: "Current Assets − Current Liabilities",
      detailComponents: [
        { label: "Working Capital", value: formatCurrencyValue(kpis.workingCapital) },
      ],
      detailBenchmark: "Positive working capital means you can pay short-term debts. Negative is a red flag that may require financing.",
    },
  ];

  // Profitability
  const profitabilityCards: KPICardData[] = [
    {
      label: "Gross Margin",
      value: formatPercentValue(kpis.grossMargin),
      status:
        kpis.grossMargin === null
          ? "blue"
          : kpis.grossMargin >= 20
            ? "green"
            : kpis.grossMargin >= 10
              ? "amber"
              : "red",
      explanation: "Revenue minus cost of construction, as % of revenue",
      detailTitle: "Gross Margin",
      detailFormula: "(Revenue − Cost of Construction) / Revenue × 100",
      detailComponents: [
        { label: "Gross Margin", value: formatPercentValue(kpis.grossMargin) },
      ],
      detailBenchmark: "≥ 20% is strong for construction, 10–20% is typical, < 10% needs attention. Industry average is 15–25%.",
    },
    {
      label: "Net Profit Margin",
      value: formatPercentValue(kpis.netProfitMargin),
      status:
        kpis.netProfitMargin === null
          ? "blue"
          : kpis.netProfitMargin >= 10
            ? "green"
            : kpis.netProfitMargin >= 0
              ? "amber"
              : "red",
      explanation: "Net income as a percentage of total revenue",
      detailTitle: "Net Profit Margin",
      detailFormula: "Net Income / Total Revenue × 100",
      detailComponents: [
        { label: "Net Profit Margin", value: formatPercentValue(kpis.netProfitMargin) },
      ],
      detailBenchmark: "≥ 10% is excellent, 0–10% is typical for construction, negative means the company is operating at a loss.",
    },
    {
      label: "Revenue Growth",
      value: formatPercentValue(kpis.revenueGrowth),
      status:
        kpis.revenueGrowth === null
          ? "blue"
          : kpis.revenueGrowth > 0
            ? "green"
            : "red",
      explanation: "Month-over-month change in revenue",
      detailTitle: "Revenue Growth",
      detailFormula: "(Current Month − Prior Month) / Prior Month × 100",
      detailComponents: [
        { label: "Growth Rate", value: formatPercentValue(kpis.revenueGrowth) },
      ],
      detailBenchmark: "Positive growth indicates expanding revenue. Negative may indicate seasonal slowdown or lost contracts.",
    },
  ];

  // Efficiency
  const efficiencyCards: KPICardData[] = [
    {
      label: "Days Sales Outstanding",
      value: formatDays(kpis.dso),
      status:
        kpis.dso === null
          ? "blue"
          : kpis.dso <= 30
            ? "green"
            : kpis.dso <= 60
              ? "amber"
              : "red",
      explanation: "Average days to collect receivables",
      detailTitle: "Days Sales Outstanding (DSO)",
      detailFormula: "(Accounts Receivable / Revenue) × 30",
      detailComponents: [
        { label: "DSO", value: formatDays(kpis.dso) },
      ],
      detailBenchmark: "≤ 30 days is excellent, 30–60 days is normal for construction, > 60 days indicates slow collections.",
    },
    {
      label: "Days Payable Outstanding",
      value: formatDays(kpis.dpo),
      status: kpis.dpo === null ? "blue" : "blue",
      explanation: "Average days to pay vendor invoices",
      detailTitle: "Days Payable Outstanding (DPO)",
      detailFormula: "(Accounts Payable / COGS) × 30",
      detailComponents: [
        { label: "DPO", value: formatDays(kpis.dpo) },
      ],
      detailBenchmark: "Higher DPO means you keep cash longer. Too high may harm vendor relationships. 30–45 days is typical.",
    },
  ];

  // Cash & Debt
  const cashDebtCards: KPICardData[] = [
    {
      label: "Debt-to-Equity",
      value: formatDebtRatio(kpis.debtToEquity),
      status:
        kpis.debtToEquity === null
          ? "blue"
          : kpis.debtToEquity < 1
            ? "green"
            : kpis.debtToEquity < 2
              ? "amber"
              : "red",
      explanation: "Total liabilities divided by total equity",
      detailTitle: "Debt-to-Equity Ratio",
      detailFormula: "Total Liabilities / Total Equity",
      detailComponents: [
        { label: "Ratio", value: formatDebtRatio(kpis.debtToEquity) },
      ],
      detailBenchmark: "< 1.0 means more equity than debt (green), 1.0–2.0 is manageable (amber), > 2.0 is heavily leveraged (red).",
    },
    {
      label: "Monthly Burn Rate",
      value: formatCurrencyValue(kpis.burnRate),
      status: kpis.burnRate === 0 ? "blue" : "amber",
      explanation: "Average monthly expenses over last 6 months",
      detailTitle: "Monthly Burn Rate",
      detailFormula: "Total Expenses (Last 6 Months) / 6",
      detailComponents: [
        { label: "Monthly Burn Rate", value: formatCurrencyValue(kpis.burnRate) },
      ],
      detailBenchmark: "Divide cash position by burn rate to estimate months of cash remaining (runway).",
    },
  ];

  const sections = [
    { title: "Liquidity Ratios", icon: <Droplets size={18} />, cards: liquidityCards },
    { title: "Profitability", icon: <TrendingUp size={18} />, cards: profitabilityCards },
    { title: "Efficiency", icon: <Zap size={18} />, cards: efficiencyCards },
    { title: "Cash & Debt", icon: <Landmark size={18} />, cards: cashDebtCards },
  ];

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Financial KPIs</h2>
          <p className="fin-header-sub">
            Key performance indicators for your company&apos;s financial health.
            Click any card for details.
          </p>
        </div>
        <div className="fin-header-actions">
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem", color: "var(--muted)" }}>
            <BarChart3 size={14} />
            Updated in real-time
          </div>
        </div>
      </div>

      {/* KPI Sections */}
      {sections.map((section) => (
        <div key={section.title} style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontFamily: "var(--font-serif)", fontSize: "1.1rem", fontWeight: 600 }}>
            <span style={{ display: "flex", alignItems: "center", color: "var(--muted)" }}>
              {section.icon}
            </span>
            {section.title}
          </div>
          <div className="financial-kpi-row" style={{ gridTemplateColumns: `repeat(${section.cards.length}, 1fr)` }}>
            {section.cards.map((card) => (
              <KPICard key={card.label} data={card} onClick={() => setSelectedKPI(card)} />
            ))}
          </div>
        </div>
      ))}

      {/* Detail Modal */}
      {selectedKPI && (
        <div className="ticket-modal-overlay" onClick={() => setSelectedKPI(null)}>
          <div className="ticket-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{selectedKPI.detailTitle}</h3>
              <button className="ticket-modal-close" onClick={() => setSelectedKPI(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="ticket-detail-body">
              {/* Current Value */}
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{
                  fontSize: "2rem", fontWeight: 700,
                  color: selectedKPI.value === "N/A" ? "var(--muted)"
                    : selectedKPI.status === "green" ? "var(--color-green)"
                    : selectedKPI.status === "amber" ? "var(--color-amber)"
                    : selectedKPI.status === "red" ? "var(--color-red)"
                    : "var(--text)",
                }}>
                  {selectedKPI.value}
                </div>
                <StatusDot color={selectedKPI.status} />
              </div>

              {/* Formula */}
              <div className="ticket-detail-row">
                <span className="ticket-detail-label">Formula</span>
                <span style={{ fontSize: "0.85rem" }}>{selectedKPI.detailFormula}</span>
              </div>

              {/* Components */}
              {selectedKPI.detailComponents.length > 0 && (
                <div style={{ margin: "16px 0" }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: 8, color: "var(--muted)" }}>
                    Components
                  </div>
                  {selectedKPI.detailComponents.map((comp) => (
                    <div key={comp.label} style={{
                      display: "flex", justifyContent: "space-between",
                      padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: "0.85rem",
                    }}>
                      <span style={{ color: "var(--muted)" }}>{comp.label}</span>
                      <span style={{ fontWeight: 600 }}>{comp.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Benchmark */}
              <div style={{ background: "var(--surface)", borderRadius: 8, padding: "12px 16px", marginTop: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <Info size={14} style={{ color: "var(--color-blue)", marginTop: 2, flexShrink: 0 }} />
                  <div style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.5 }}>
                    {selectedKPI.detailBenchmark}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
