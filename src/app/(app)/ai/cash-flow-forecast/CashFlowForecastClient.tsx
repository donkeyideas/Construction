"use client";

import { useState } from "react";
import {
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from "lucide-react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils/format";
import {
  forecastCashFlow,
  type AgingBuckets,
  type CashFlowPeriod,
} from "@/lib/ai/analysis";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  totalCash: number;
  arAging: AgingBuckets;
  apAging: AgingBuckets;
  monthlyBurnRate: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CashFlowForecastClient({
  totalCash,
  arAging,
  apAging,
  monthlyBurnRate,
}: Props) {
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);

  // Totals for KPI cards
  const totalAR =
    arAging.current + arAging.days30 + arAging.days60 + arAging.days90plus;
  const totalAP =
    apAging.current + apAging.days30 + apAging.days60 + apAging.days90plus;

  // Run the forecast engine
  const periods: CashFlowPeriod[] = forecastCashFlow({
    currentCash: totalCash,
    arAging,
    apAging,
    monthlyBurnRate,
  });

  // Check for empty state
  const hasData = totalCash > 0 || totalAR > 0 || totalAP > 0;

  // Build chart data: "Today" baseline + 3 forecast periods
  const chartData = [
    {
      name: "Today",
      "Expected Collections": 0,
      "Expected Payments": 0,
      "Projected Cash": totalCash,
    },
    ...periods.map((p) => ({
      name: p.period,
      "Expected Collections": Math.round(p.expectedCollections),
      "Expected Payments": Math.round(p.expectedPayments),
      "Projected Cash": Math.round(p.projectedCash),
    })),
  ];

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------
  if (!hasData) {
    return (
      <div className="ai-feature-page">
        <div className="ai-feature-header">
          <div>
            <h1>
              <TrendingUp size={28} className="sparkle-icon" />
              Cash Flow Forecast
            </h1>
            <p className="subtitle">
              30/60/90-day cash position projections
            </p>
          </div>
        </div>

        <div className="forecast-chart-container" style={{ textAlign: "center", padding: "60px 24px" }}>
          <DollarSign size={48} style={{ color: "var(--border)", marginBottom: 16 }} />
          <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>
            No Financial Data Available
          </div>
          <div style={{ color: "var(--muted)", fontSize: "0.88rem", maxWidth: 420, margin: "0 auto" }}>
            Add bank accounts and invoices to generate cash flow forecasts.
            The forecast uses your current cash position, accounts receivable,
            and accounts payable to project future balances.
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="ai-feature-page">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="ai-feature-header">
        <div>
          <h1>
            <TrendingUp size={28} className="sparkle-icon" />
            Cash Flow Forecast
          </h1>
          <p className="subtitle">
            30/60/90-day cash position projections
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Current Position KPIs                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="ai-kpi-grid">
        {/* Current Cash */}
        <div className="ai-kpi-card kpi-good">
          <span className="kpi-label">Current Cash</span>
          <span className="kpi-value" style={{ color: "var(--color-green)" }}>
            {formatCurrency(totalCash)}
          </span>
          <span className="kpi-change positive">
            <DollarSign size={12} />
            Sum of all bank accounts
          </span>
        </div>

        {/* Accounts Receivable */}
        <div className="ai-kpi-card kpi-info">
          <span className="kpi-label">Accounts Receivable</span>
          <span className="kpi-value" style={{ color: "var(--color-blue)" }}>
            {formatCurrency(totalAR)}
          </span>
          <span className="kpi-change positive">
            <ArrowUpRight size={12} />
            Outstanding receivables
          </span>
        </div>

        {/* Accounts Payable */}
        <div className="ai-kpi-card kpi-warning">
          <span className="kpi-label">Accounts Payable</span>
          <span className="kpi-value" style={{ color: "var(--color-amber)" }}>
            {formatCurrency(totalAP)}
          </span>
          <span className="kpi-change negative">
            <ArrowDownRight size={12} />
            Outstanding payables
          </span>
        </div>

        {/* Monthly Burn Rate */}
        <div className="ai-kpi-card kpi-critical">
          <span className="kpi-label">Monthly Burn Rate</span>
          <span className="kpi-value" style={{ color: "var(--color-red)" }}>
            {formatCurrency(monthlyBurnRate)}
          </span>
          <span className="kpi-change negative">
            <ArrowDownRight size={12} />
            Avg. monthly expenses (3 mo.)
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Forecast Chart                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="forecast-chart-container">
        <div className="chart-title">Cash Flow Projection</div>
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 13, fill: "var(--muted)" }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--muted)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => formatCompactCurrency(v)}
            />
            <Tooltip
              formatter={(value: number | string | undefined, name: string | undefined) => [
                formatCurrency(Number(value ?? 0)),
                name ?? "",
              ]}
              contentStyle={{
                background: "var(--card-bg)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: "0.82rem",
              }}
              labelStyle={{ fontWeight: 600, marginBottom: 4 }}
            />
            <Legend
              wrapperStyle={{ fontSize: "0.8rem", paddingTop: 8 }}
            />
            <Bar
              dataKey="Expected Collections"
              fill="var(--color-green)"
              radius={[4, 4, 0, 0]}
              barSize={36}
              opacity={0.85}
            />
            <Bar
              dataKey="Expected Payments"
              fill="var(--color-red)"
              radius={[4, 4, 0, 0]}
              barSize={36}
              opacity={0.85}
            />
            <Line
              type="monotone"
              dataKey="Projected Cash"
              stroke="var(--color-blue)"
              strokeWidth={3}
              dot={{ r: 5, fill: "var(--color-blue)", stroke: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 7 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Forecast Summary Cards                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="forecast-summary-grid">
        {periods.map((period) => {
          const changeFromToday = period.projectedCash - totalCash;
          const isPositive = period.projectedCash >= 0;
          const changeIsPositive = changeFromToday >= 0;

          return (
            <div className="forecast-card" key={period.period}>
              <div className="period-label">{period.period}</div>
              <div
                className="amount"
                style={{ color: isPositive ? "var(--color-green)" : "var(--color-red)" }}
              >
                {formatCurrency(period.projectedCash)}
              </div>
              <div className={`change-indicator ${changeIsPositive ? "positive" : "negative"}`}>
                {changeIsPositive ? (
                  <ArrowUpRight size={14} />
                ) : (
                  <ArrowDownRight size={14} />
                )}
                {changeIsPositive ? "+" : ""}
                {formatCurrency(changeFromToday)} from today
              </div>

              {/* Collections & Payments breakdown */}
              <div style={{ marginTop: 12, fontSize: "0.82rem", color: "var(--muted)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>Expected Collections</span>
                  <span style={{ fontWeight: 600, color: "var(--color-green)" }}>
                    {formatCurrency(period.expectedCollections)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Expected Payments</span>
                  <span style={{ fontWeight: 600, color: "var(--color-red)" }}>
                    {formatCurrency(period.expectedPayments)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Assumptions Panel (Collapsible)                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="ai-inline-panel">
        <div
          className="panel-header"
          onClick={() => setAssumptionsOpen(!assumptionsOpen)}
        >
          <Info size={18} className="sparkle-icon" style={{ color: "var(--color-blue)" }} />
          <span className="panel-title">Forecast Assumptions</span>
          <span className={`toggle-icon ${assumptionsOpen ? "expanded" : ""}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
        {assumptionsOpen && (
          <div className="panel-content">
            <div style={{ fontSize: "0.85rem", lineHeight: 1.7, color: "var(--text)" }}>
              <p style={{ marginBottom: 12, color: "var(--muted)" }}>
                The forecast is generated using deterministic collection and payment rate
                assumptions applied to your current AR/AP aging buckets, plus monthly burn rate.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* AR Collection Rates */}
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 8, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--muted)" }}>
                    AR Collection Rates
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Current (not overdue)</span>
                      <span style={{ fontWeight: 600 }}>95%</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>1-30 days overdue</span>
                      <span style={{ fontWeight: 600 }}>85%</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>31-60 days overdue</span>
                      <span style={{ fontWeight: 600 }}>70%</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>90+ days overdue</span>
                      <span style={{ fontWeight: 600 }}>50%</span>
                    </div>
                  </div>
                </div>

                {/* AP Payment Rates */}
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 8, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--muted)" }}>
                    AP Payment Rates
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Current (not overdue)</span>
                      <span style={{ fontWeight: 600 }}>100%</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>1-30 days overdue</span>
                      <span style={{ fontWeight: 600 }}>95%</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>31-60 days overdue</span>
                      <span style={{ fontWeight: 600 }}>90%</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>90+ days overdue</span>
                      <span style={{ fontWeight: 600 }}>80%</span>
                    </div>
                  </div>
                </div>
              </div>

              <p style={{ marginTop: 14, color: "var(--muted)", fontSize: "0.82rem" }}>
                The monthly burn rate is computed as the average of your payable invoices
                over the last 3 months and is subtracted from each 30-day forecast period.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
