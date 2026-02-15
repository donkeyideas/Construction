"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
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
  const t = useTranslations("financial");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";
  const [selectedKPI, setSelectedKPI] = useState<KPICardData | null>(null);

  // Liquidity Ratios
  const liquidityCards: KPICardData[] = [
    {
      label: t("currentRatio"),
      value: formatRatio(kpis.currentRatio),
      status: getRatioStatus(kpis.currentRatio, 1.5, 1.0),
      explanation: t("currentRatioExplanation"),
      detailTitle: t("currentRatio"),
      detailFormula: t("currentRatioFormula"),
      detailComponents: [
        { label: t("ratio"), value: formatRatio(kpis.currentRatio) },
      ],
      detailBenchmark: t("currentRatioBenchmark"),
    },
    {
      label: t("quickRatio"),
      value: formatRatio(kpis.quickRatio),
      status: getRatioStatus(kpis.quickRatio, 1.5, 1.0),
      explanation: t("quickRatioExplanation"),
      detailTitle: t("quickRatioDetail"),
      detailFormula: t("quickRatioFormula"),
      detailComponents: [
        { label: t("ratio"), value: formatRatio(kpis.quickRatio) },
      ],
      detailBenchmark: t("quickRatioBenchmark"),
    },
    {
      label: t("workingCapital"),
      value: formatCurrencyValue(kpis.workingCapital),
      status: kpis.workingCapital >= 0 ? "green" : "red",
      explanation: t("workingCapitalExplanation"),
      detailTitle: t("workingCapital"),
      detailFormula: t("workingCapitalFormula"),
      detailComponents: [
        { label: t("workingCapital"), value: formatCurrencyValue(kpis.workingCapital) },
      ],
      detailBenchmark: t("workingCapitalBenchmark"),
    },
  ];

  // Profitability
  const profitabilityCards: KPICardData[] = [
    {
      label: t("grossMargin"),
      value: formatPercentValue(kpis.grossMargin),
      status:
        kpis.grossMargin === null
          ? "blue"
          : kpis.grossMargin >= 20
            ? "green"
            : kpis.grossMargin >= 10
              ? "amber"
              : "red",
      explanation: t("grossMarginExplanation"),
      detailTitle: t("grossMargin"),
      detailFormula: t("grossMarginFormula"),
      detailComponents: [
        { label: t("grossMargin"), value: formatPercentValue(kpis.grossMargin) },
      ],
      detailBenchmark: t("grossMarginBenchmark"),
    },
    {
      label: t("netProfitMargin"),
      value: formatPercentValue(kpis.netProfitMargin),
      status:
        kpis.netProfitMargin === null
          ? "blue"
          : kpis.netProfitMargin >= 10
            ? "green"
            : kpis.netProfitMargin >= 0
              ? "amber"
              : "red",
      explanation: t("netProfitMarginExplanation"),
      detailTitle: t("netProfitMargin"),
      detailFormula: t("netProfitMarginFormula"),
      detailComponents: [
        { label: t("netProfitMargin"), value: formatPercentValue(kpis.netProfitMargin) },
      ],
      detailBenchmark: t("netProfitMarginBenchmark"),
    },
    {
      label: t("revenueGrowth"),
      value: formatPercentValue(kpis.revenueGrowth),
      status:
        kpis.revenueGrowth === null
          ? "blue"
          : kpis.revenueGrowth > 0
            ? "green"
            : "red",
      explanation: t("revenueGrowthExplanation"),
      detailTitle: t("revenueGrowth"),
      detailFormula: t("revenueGrowthFormula"),
      detailComponents: [
        { label: t("growthRate"), value: formatPercentValue(kpis.revenueGrowth) },
      ],
      detailBenchmark: t("revenueGrowthBenchmark"),
    },
  ];

  // Efficiency
  const efficiencyCards: KPICardData[] = [
    {
      label: t("daysSalesOutstanding"),
      value: formatDays(kpis.dso),
      status:
        kpis.dso === null
          ? "blue"
          : kpis.dso <= 30
            ? "green"
            : kpis.dso <= 60
              ? "amber"
              : "red",
      explanation: t("dsoExplanation"),
      detailTitle: t("dsoDetail"),
      detailFormula: t("dsoFormula"),
      detailComponents: [
        { label: t("dsoLabel"), value: formatDays(kpis.dso) },
      ],
      detailBenchmark: t("dsoBenchmark"),
    },
    {
      label: t("daysPayableOutstanding"),
      value: formatDays(kpis.dpo),
      status: kpis.dpo === null ? "blue" : "blue",
      explanation: t("dpoExplanation"),
      detailTitle: t("dpoDetail"),
      detailFormula: t("dpoFormula"),
      detailComponents: [
        { label: t("dpoLabel"), value: formatDays(kpis.dpo) },
      ],
      detailBenchmark: t("dpoBenchmark"),
    },
  ];

  // Cash & Debt
  const cashDebtCards: KPICardData[] = [
    {
      label: t("debtToEquity"),
      value: formatDebtRatio(kpis.debtToEquity),
      status:
        kpis.debtToEquity === null
          ? "blue"
          : kpis.debtToEquity < 1
            ? "green"
            : kpis.debtToEquity < 2
              ? "amber"
              : "red",
      explanation: t("debtToEquityExplanation"),
      detailTitle: t("debtToEquityDetail"),
      detailFormula: t("debtToEquityFormula"),
      detailComponents: [
        { label: t("ratio"), value: formatDebtRatio(kpis.debtToEquity) },
      ],
      detailBenchmark: t("debtToEquityBenchmark"),
    },
    {
      label: t("monthlyBurnRate"),
      value: formatCurrencyValue(kpis.burnRate),
      status: kpis.burnRate === 0 ? "blue" : "amber",
      explanation: t("monthlyBurnRateExplanation"),
      detailTitle: t("monthlyBurnRate"),
      detailFormula: t("monthlyBurnRateFormula"),
      detailComponents: [
        { label: t("monthlyBurnRate"), value: formatCurrencyValue(kpis.burnRate) },
      ],
      detailBenchmark: t("monthlyBurnRateBenchmark"),
    },
  ];

  const sections = [
    { title: t("liquidityRatios"), icon: <Droplets size={18} />, cards: liquidityCards },
    { title: t("profitability"), icon: <TrendingUp size={18} />, cards: profitabilityCards },
    { title: t("efficiency"), icon: <Zap size={18} />, cards: efficiencyCards },
    { title: t("cashAndDebt"), icon: <Landmark size={18} />, cards: cashDebtCards },
  ];

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>{t("financialKpis")}</h2>
          <p className="fin-header-sub">
            {t("financialKpisDesc")}
          </p>
        </div>
        <div className="fin-header-actions">
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem", color: "var(--muted)" }}>
            <BarChart3 size={14} />
            {t("updatedInRealTime")}
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
                <span className="ticket-detail-label">{t("formula")}</span>
                <span style={{ fontSize: "0.85rem" }}>{selectedKPI.detailFormula}</span>
              </div>

              {/* Components */}
              {selectedKPI.detailComponents.length > 0 && (
                <div style={{ margin: "16px 0" }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: 8, color: "var(--muted)" }}>
                    {t("components")}
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
