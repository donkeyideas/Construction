"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Activity, DollarSign, Hash, Zap, Wallet } from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatRelativeTime, formatDateShort, toDateStr } from "@/lib/utils/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Provider {
  id: string;
  provider_name: string;
  model_id: string;
  is_active: boolean;
  monthly_budget_limit: number | null;
  current_month_usage: number | null;
}

interface UsageLog {
  id: string;
  provider_name: string | null;
  user_id: string | null;
  task_type: string | null;
  model_id: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  estimated_cost: number | null;
  created_at: string;
}

interface UsageClientProps {
  providers: Provider[];
  usageLogs: UsageLog[];
  companyId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PIE_COLORS = [
  "var(--color-blue)",
  "var(--color-green)",
  "var(--color-amber)",
  "var(--color-red)",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#f97316",
];

type SortField =
  | "created_at"
  | "provider_name"
  | "model_id"
  | "task_type"
  | "input_tokens"
  | "output_tokens"
  | "estimated_cost";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format large token counts with K/M suffix. */
function formatTokens(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}K`;
  }
  return n.toLocaleString();
}

/** Format cost to high precision for small amounts. */
function formatCost(cost: number): string {
  if (cost === 0) return "$0.00";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(4)}`;
  if (cost < 1000) return `$${cost.toFixed(2)}`;
  return `$${cost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Format a date string to short date label (e.g., "Feb 5"). */
function shortDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return formatDateShort(toDateStr(d));
}

/** Get YYYY-MM-DD key from a date string. */
function dateKey(dateStr: string): string {
  return dateStr.slice(0, 10);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UsageClient({
  providers,
  usageLogs,
  companyId: _companyId,
}: UsageClientProps) {
  const t = useTranslations("ai");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  // -------------------------------------------------------------------------
  // KPI calculations
  // -------------------------------------------------------------------------

  const totalSpend = useMemo(
    () => usageLogs.reduce((sum, l) => sum + (l.estimated_cost ?? 0), 0),
    [usageLogs],
  );

  const totalTokens = useMemo(
    () =>
      usageLogs.reduce(
        (sum, l) => sum + (l.input_tokens ?? 0) + (l.output_tokens ?? 0),
        0,
      ),
    [usageLogs],
  );

  const totalRequests = usageLogs.length;

  const budgetRemaining = useMemo(() => {
    let remaining = 0;
    let totalBudget = 0;
    for (const p of providers) {
      if (p.monthly_budget_limit && p.monthly_budget_limit > 0) {
        totalBudget += p.monthly_budget_limit;
        remaining += p.monthly_budget_limit - (p.current_month_usage ?? 0);
      }
    }
    return { remaining: Math.max(0, remaining), totalBudget };
  }, [providers]);

  const budgetPct =
    budgetRemaining.totalBudget > 0
      ? (budgetRemaining.remaining / budgetRemaining.totalBudget) * 100
      : 100;

  const budgetKpiClass =
    budgetPct > 50 ? "kpi-good" : budgetPct > 20 ? "kpi-warning" : "kpi-critical";

  const budgetKpiColor =
    budgetPct > 50
      ? "var(--color-green)"
      : budgetPct > 20
        ? "var(--color-amber)"
        : "var(--color-red)";

  // -------------------------------------------------------------------------
  // Chart 1: Daily Spend Trend (AreaChart)
  // -------------------------------------------------------------------------

  const dailySpendData = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of usageLogs) {
      const dk = dateKey(l.created_at);
      map.set(dk, (map.get(dk) ?? 0) + (l.estimated_cost ?? 0));
    }
    const entries = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([date, cost]) => ({
      date: shortDateLabel(date),
      cost: Math.round(cost * 10000) / 10000,
    }));
  }, [usageLogs]);

  // -------------------------------------------------------------------------
  // Chart 2: Cost by Provider (PieChart)
  // -------------------------------------------------------------------------

  const costByProvider = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of usageLogs) {
      const name = l.provider_name ?? "Unknown";
      map.set(name, (map.get(name) ?? 0) + (l.estimated_cost ?? 0));
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 10000) / 10000 }))
      .sort((a, b) => b.value - a.value);
  }, [usageLogs]);

  // -------------------------------------------------------------------------
  // Chart 3: Tokens by Model (BarChart, stacked input + output)
  // -------------------------------------------------------------------------

  const inputTokensLabel = t("usage.colInputTokens");
  const outputTokensLabel = t("usage.colOutputTokens");

  const tokensByModel = useMemo(() => {
    const map = new Map<string, { input: number; output: number }>();
    for (const l of usageLogs) {
      const model = l.model_id ?? "Unknown";
      const existing = map.get(model) ?? { input: 0, output: 0 };
      existing.input += l.input_tokens ?? 0;
      existing.output += l.output_tokens ?? 0;
      map.set(model, existing);
    }
    return Array.from(map.entries())
      .map(([model, { input, output }]) => ({
        model,
        [inputTokensLabel]: input,
        [outputTokensLabel]: output,
      }))
      .sort((a, b) => (b[inputTokensLabel] as number) + (b[outputTokensLabel] as number) - (a[inputTokensLabel] as number) - (a[outputTokensLabel] as number));
  }, [usageLogs, inputTokensLabel, outputTokensLabel]);

  // -------------------------------------------------------------------------
  // Chart 4: Requests Over Time (LineChart)
  // -------------------------------------------------------------------------

  const requestsOverTime = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of usageLogs) {
      const dk = dateKey(l.created_at);
      map.set(dk, (map.get(dk) ?? 0) + 1);
    }
    const entries = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([date, count]) => ({
      date: shortDateLabel(date),
      requests: count,
    }));
  }, [usageLogs]);

  // -------------------------------------------------------------------------
  // Provider budget utilization
  // -------------------------------------------------------------------------

  const providersWithBudget = useMemo(
    () => providers.filter((p) => p.monthly_budget_limit && p.monthly_budget_limit > 0),
    [providers],
  );

  // -------------------------------------------------------------------------
  // Sortable table data (recent 50)
  // -------------------------------------------------------------------------

  const tableData = useMemo(() => {
    const enriched = usageLogs.map((l) => ({
      ...l,
      _providerName: l.provider_name ?? "Unknown",
    }));

    enriched.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "created_at":
          cmp = a.created_at.localeCompare(b.created_at);
          break;
        case "provider_name":
          cmp = a._providerName.localeCompare(b._providerName);
          break;
        case "model_id":
          cmp = (a.model_id ?? "").localeCompare(b.model_id ?? "");
          break;
        case "task_type":
          cmp = (a.task_type ?? "").localeCompare(b.task_type ?? "");
          break;
        case "input_tokens":
          cmp = (a.input_tokens ?? 0) - (b.input_tokens ?? 0);
          break;
        case "output_tokens":
          cmp = (a.output_tokens ?? 0) - (b.output_tokens ?? 0);
          break;
        case "estimated_cost":
          cmp = (a.estimated_cost ?? 0) - (b.estimated_cost ?? 0);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return enriched.slice(0, 50);
  }, [usageLogs, sortField, sortAsc]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  }

  function sortIndicator(field: SortField): string {
    if (sortField !== field) return "";
    return sortAsc ? " \u25B2" : " \u25BC";
  }

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  if (usageLogs.length === 0 && providers.length === 0) {
    return (
      <div className="ai-feature-page">
        <div className="ai-feature-header">
          <div>
            <h1>
              <Activity size={28} className="sparkle-icon" />
              {t("usage.title")}
            </h1>
            <p className="subtitle">
              {t("usage.subtitle")}
            </p>
          </div>
        </div>
        <div
          className="usage-chart-card"
          style={{ textAlign: "center", padding: "60px 24px" }}
        >
          <Activity
            size={48}
            style={{ color: "var(--border)", marginBottom: 16 }}
          />
          <div
            style={{
              fontSize: "1.1rem",
              fontWeight: 600,
              marginBottom: 8,
              color: "var(--text)",
            }}
          >
            {t("usage.noUsageData")}
          </div>
          <div
            style={{
              color: "var(--muted)",
              fontSize: "0.88rem",
              maxWidth: 420,
              margin: "0 auto",
            }}
          >
            {t("usage.noUsageDataDesc")}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="ai-feature-page">
      {/* ---------------------------------------------------------------- */}
      {/* Header                                                           */}
      {/* ---------------------------------------------------------------- */}
      <div className="ai-feature-header">
        <div>
          <h1>
            <Activity size={28} className="sparkle-icon" />
            {t("usage.title")}
          </h1>
          <p className="subtitle">
            {t("usage.subtitle")}
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* KPI Row                                                          */}
      {/* ---------------------------------------------------------------- */}
      <div className="ai-kpi-grid">
        {/* Total Spend */}
        <div className="ai-kpi-card kpi-info">
          <span className="kpi-label">{t("usage.totalSpend")}</span>
          <span
            className="kpi-value"
            style={{ color: "var(--color-blue)" }}
          >
            {formatCost(totalSpend)}
          </span>
          <span className="kpi-change" style={{ color: "var(--muted)" }}>
            <DollarSign size={12} />
            {t("usage.thisMonth")}
          </span>
        </div>

        {/* Total Tokens */}
        <div className="ai-kpi-card kpi-info">
          <span className="kpi-label">{t("usage.totalTokens")}</span>
          <span
            className="kpi-value"
            style={{ color: "var(--color-blue)" }}
          >
            {formatTokens(totalTokens)}
          </span>
          <span className="kpi-change" style={{ color: "var(--muted)" }}>
            <Zap size={12} />
            {t("usage.inputPlusOutput")}
          </span>
        </div>

        {/* Total Requests */}
        <div className="ai-kpi-card kpi-info">
          <span className="kpi-label">{t("usage.totalRequests")}</span>
          <span
            className="kpi-value"
            style={{ color: "var(--color-blue)" }}
          >
            {totalRequests.toLocaleString()}
          </span>
          <span className="kpi-change" style={{ color: "var(--muted)" }}>
            <Hash size={12} />
            {t("usage.apiCallsThisMonth")}
          </span>
        </div>

        {/* Budget Remaining */}
        <div className={`ai-kpi-card ${budgetKpiClass}`}>
          <span className="kpi-label">{t("usage.budgetRemaining")}</span>
          <span className="kpi-value" style={{ color: budgetKpiColor }}>
            {budgetRemaining.totalBudget > 0
              ? formatCost(budgetRemaining.remaining)
              : "N/A"}
          </span>
          <span className="kpi-change" style={{ color: "var(--muted)" }}>
            <Wallet size={12} />
            {budgetRemaining.totalBudget > 0
              ? t("usage.ofBudgetLeft", { pct: budgetPct.toFixed(0) })
              : t("usage.noBudgetsSet")}
          </span>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Charts Section (2x2 grid)                                        */}
      {/* ---------------------------------------------------------------- */}
      <div className="usage-chart-grid">
        {/* Chart 1: Daily Spend Trend */}
        <div className="usage-chart-card">
          <div className="chart-title">{t("usage.dailySpendTrend")}</div>
          {dailySpendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={dailySpendData}
                margin={{ top: 10, right: 20, bottom: 0, left: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "var(--muted)" }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--muted)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${v}`}
                />
                <Tooltip
                  formatter={(value: number | string | undefined) => [
                    formatCost(Number(value ?? 0)),
                    t("usage.cost"),
                  ]}
                  contentStyle={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: "0.82rem",
                  }}
                  labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="var(--color-blue)"
                  fill="var(--color-blue)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartMsg message={t("usage.noDataAvailable")} />
          )}
        </div>

        {/* Chart 2: Cost by Provider */}
        <div className="usage-chart-card">
          <div className="chart-title">{t("usage.costByProvider")}</div>
          {costByProvider.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={costByProvider}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={45}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={2}
                  label={(props: { name?: string; percent?: number }) =>
                    `${props.name ?? ""} (${((props.percent ?? 0) * 100).toFixed(0)}%)`
                  }
                  labelLine={{ stroke: "var(--muted)", strokeWidth: 1 }}
                >
                  {costByProvider.map((_entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={PIE_COLORS[idx % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number | string | undefined) => [
                    formatCost(Number(value ?? 0)),
                    t("usage.cost"),
                  ]}
                  contentStyle={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: "0.82rem",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartMsg message={t("usage.noDataAvailable")} />
          )}
        </div>

        {/* Chart 3: Tokens by Model */}
        <div className="usage-chart-card">
          <div className="chart-title">{t("usage.tokensByModel")}</div>
          {tokensByModel.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={tokensByModel}
                margin={{ top: 10, right: 20, bottom: 0, left: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="model"
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--muted)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => formatTokens(v)}
                />
                <Tooltip
                  formatter={(value: number | string | undefined, name: string | undefined) => [
                    formatTokens(Number(value ?? 0)),
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
                  dataKey={inputTokensLabel}
                  stackId="tokens"
                  fill="var(--color-blue)"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey={outputTokensLabel}
                  stackId="tokens"
                  fill="var(--color-green)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartMsg message={t("usage.noDataAvailable")} />
          )}
        </div>

        {/* Chart 4: Requests Over Time */}
        <div className="usage-chart-card">
          <div className="chart-title">{t("usage.requestsOverTime")}</div>
          {requestsOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={requestsOverTime}
                margin={{ top: 10, right: 20, bottom: 0, left: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "var(--muted)" }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--muted)" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(value: number | string | undefined) => [
                    Number(value ?? 0),
                    t("usage.requests"),
                  ]}
                  contentStyle={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: "0.82rem",
                  }}
                  labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="var(--color-blue)"
                  strokeWidth={2}
                  dot={{
                    r: 4,
                    fill: "var(--color-blue)",
                    stroke: "#fff",
                    strokeWidth: 2,
                  }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartMsg message={t("usage.noDataAvailable")} />
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Provider Budget Utilization                                       */}
      {/* ---------------------------------------------------------------- */}
      {providersWithBudget.length > 0 && (
        <>
          <SectionTitle title={t("usage.providerBudgetUtilization")} />
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
            {providersWithBudget.map((p) => {
              const limit = p.monthly_budget_limit ?? 0;
              const used = p.current_month_usage ?? 0;
              const pct = limit > 0 ? (used / limit) * 100 : 0;
              const fillClass =
                pct < 70 ? "usage-low" : pct < 90 ? "usage-mid" : "usage-high";

              return (
                <div
                  key={p.id}
                  className="usage-chart-card"
                  style={{ padding: 16 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: "0.9rem",
                          color: "var(--text)",
                        }}
                      >
                        {p.provider_name}
                      </span>
                      <span
                        style={{
                          color: "var(--muted)",
                          fontSize: "0.8rem",
                          marginLeft: 8,
                        }}
                      >
                        {p.model_id}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: "var(--text)",
                      }}
                    >
                      {formatCost(used)} / {formatCost(limit)}
                    </span>
                  </div>
                  <div className="usage-budget-bar">
                    <div
                      className={`bar-fill ${fillClass}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                    <span className="usage-budget-label">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Recent API Calls Table                                            */}
      {/* ---------------------------------------------------------------- */}
      <SectionTitle title={t("usage.recentApiCalls")} />
      {tableData.length > 0 ? (
        <div
          className="usage-chart-card"
          style={{ padding: 0, overflow: "auto" }}
        >
          <table className="usage-table">
            <thead>
              <tr>
                <th
                  onClick={() => handleSort("created_at")}
                  style={{ cursor: "pointer" }}
                >
                  {t("usage.colTime")}{sortIndicator("created_at")}
                </th>
                <th
                  onClick={() => handleSort("provider_name")}
                  style={{ cursor: "pointer" }}
                >
                  {t("usage.colProvider")}{sortIndicator("provider_name")}
                </th>
                <th
                  onClick={() => handleSort("model_id")}
                  style={{ cursor: "pointer" }}
                >
                  {t("usage.colModel")}{sortIndicator("model_id")}
                </th>
                <th
                  onClick={() => handleSort("task_type")}
                  style={{ cursor: "pointer" }}
                >
                  {t("usage.colTask")}{sortIndicator("task_type")}
                </th>
                <th
                  onClick={() => handleSort("input_tokens")}
                  style={{ cursor: "pointer", textAlign: "right" }}
                >
                  {t("usage.colInputTokens")}{sortIndicator("input_tokens")}
                </th>
                <th
                  onClick={() => handleSort("output_tokens")}
                  style={{ cursor: "pointer", textAlign: "right" }}
                >
                  {t("usage.colOutputTokens")}{sortIndicator("output_tokens")}
                </th>
                <th
                  onClick={() => handleSort("estimated_cost")}
                  style={{ cursor: "pointer", textAlign: "right" }}
                >
                  {t("usage.colCost")}{sortIndicator("estimated_cost")}
                </th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {formatRelativeTime(row.created_at)}
                  </td>
                  <td>{row._providerName}</td>
                  <td>
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {row.model_id ?? "-"}
                    </span>
                  </td>
                  <td style={{ textTransform: "capitalize" }}>
                    {row.task_type ?? "-"}
                  </td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {(row.input_tokens ?? 0).toLocaleString()}
                  </td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {(row.output_tokens ?? 0).toLocaleString()}
                  </td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {formatCost(row.estimated_cost ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="usage-chart-card"
          style={{
            textAlign: "center",
            padding: "40px 24px",
            color: "var(--muted)",
          }}
        >
          <p style={{ fontSize: "0.88rem", margin: 0 }}>
            {t("usage.noApiCallsThisMonth")}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionTitle({ title }: { title: string }) {
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

function EmptyChartMsg({ message }: { message: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: 200,
        color: "var(--muted)",
        fontSize: "0.85rem",
      }}
    >
      {message}
    </div>
  );
}
