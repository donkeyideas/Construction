"use client";

import {
  BarChart3,
  Droplets,
  TrendingUp,
  Zap,
  Landmark,
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

function KPICard({ data }: { data: KPICardData }) {
  const isNA = data.value === "N/A";
  const valueColorMap: Record<StatusColor, string> = {
    green: "var(--color-green)",
    amber: "var(--color-amber)",
    red: "var(--color-red)",
    blue: "var(--text)",
  };

  return (
    <div className="fin-kpi" style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 2,
        }}
      >
        <span className="fin-kpi-label">{data.label}</span>
        {!isNA && <StatusDot color={data.status} />}
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
  // Liquidity Ratios
  const liquidityCards: KPICardData[] = [
    {
      label: "Current Ratio",
      value: formatRatio(kpis.currentRatio),
      status: getRatioStatus(kpis.currentRatio, 1.5, 1.0),
      explanation: "Current assets divided by current liabilities",
    },
    {
      label: "Quick Ratio",
      value: formatRatio(kpis.quickRatio),
      status: getRatioStatus(kpis.quickRatio, 1.5, 1.0),
      explanation: "Cash + receivables divided by current liabilities",
    },
    {
      label: "Working Capital",
      value: formatCurrencyValue(kpis.workingCapital),
      status: kpis.workingCapital >= 0 ? "green" : "red",
      explanation: "Current assets minus current liabilities",
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
    },
    {
      label: "Days Payable Outstanding",
      value: formatDays(kpis.dpo),
      status: kpis.dpo === null ? "blue" : "blue",
      explanation: "Average days to pay vendor invoices",
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
    },
    {
      label: "Monthly Burn Rate",
      value: formatCurrencyValue(kpis.burnRate),
      status: kpis.burnRate === 0 ? "blue" : "amber",
      explanation: "Average monthly expenses over last 6 months",
    },
  ];

  const sections = [
    {
      title: "Liquidity Ratios",
      icon: <Droplets size={18} />,
      cards: liquidityCards,
    },
    {
      title: "Profitability",
      icon: <TrendingUp size={18} />,
      cards: profitabilityCards,
    },
    {
      title: "Efficiency",
      icon: <Zap size={18} />,
      cards: efficiencyCards,
    },
    {
      title: "Cash & Debt",
      icon: <Landmark size={18} />,
      cards: cashDebtCards,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Financial KPIs</h2>
          <p className="fin-header-sub">
            Key performance indicators for your company&apos;s financial health.
          </p>
        </div>
        <div className="fin-header-actions">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: "0.78rem",
              color: "var(--muted)",
            }}
          >
            <BarChart3 size={14} />
            Updated in real-time
          </div>
        </div>
      </div>

      {/* KPI Sections */}
      {sections.map((section) => (
        <div key={section.title} style={{ marginBottom: 32 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 14,
              fontFamily: "var(--font-serif)",
              fontSize: "1.1rem",
              fontWeight: 600,
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                color: "var(--muted)",
              }}
            >
              {section.icon}
            </span>
            {section.title}
          </div>
          <div className="financial-kpi-row" style={{ gridTemplateColumns: `repeat(${section.cards.length}, 1fr)` }}>
            {section.cards.map((card) => (
              <KPICard key={card.label} data={card} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
