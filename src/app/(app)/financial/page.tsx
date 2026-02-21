import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Landmark,
  FileText,
  BarChart3,
  BookOpen,
  PieChart,
  Scale,
  Activity,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getFinancialOverview,
  getRecentInvoices,
  getAgingBuckets,
  getMonthlyIncomeExpenses,
  getFinancialKPIs,
} from "@/lib/queries/financial";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils/format";


export const metadata = {
  title: "Financial Overview - Buildwrk",
};

export default async function FinancialDashboardPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon">
          <DollarSign size={48} />
        </div>
        <div className="fin-empty-title">Set Up Your Company</div>
        <div className="fin-empty-desc">
          Complete your company registration to start tracking financials,
          invoices, and budgets.
        </div>
        <Link href="/admin/settings" className="ui-btn ui-btn-primary ui-btn-md">
          Go to Settings
        </Link>
      </div>
    );
  }

  const [overview, recentInvoices, aging, monthlyData, kpis] = await Promise.all([
    getFinancialOverview(supabase, userCompany.companyId),
    getRecentInvoices(supabase, userCompany.companyId, 10),
    getAgingBuckets(supabase, userCompany.companyId),
    getMonthlyIncomeExpenses(supabase, userCompany.companyId),
    getFinancialKPIs(supabase, userCompany.companyId),
  ]);

  // Calculate Financial Health Score (0-100)
  let healthScore = 50; // baseline
  let healthFactors: string[] = [];

  if (kpis.currentRatio !== null) {
    if (kpis.currentRatio >= 1.5) { healthScore += 10; healthFactors.push("Strong liquidity"); }
    else if (kpis.currentRatio >= 1.0) { healthScore += 5; }
    else { healthScore -= 10; healthFactors.push("Low liquidity"); }
  }
  if (kpis.grossMargin !== null) {
    if (kpis.grossMargin >= 20) { healthScore += 10; healthFactors.push("Healthy margins"); }
    else if (kpis.grossMargin >= 10) { healthScore += 5; }
    else { healthScore -= 5; }
  }
  if (kpis.netProfitMargin !== null && kpis.netProfitMargin > 0) {
    healthScore += 10; healthFactors.push("Profitable");
  }
  if (kpis.debtToEquity !== null && kpis.debtToEquity < 2) {
    healthScore += 10; healthFactors.push("Manageable debt");
  }
  if (overview.cashPosition > 0) {
    healthScore += 10; healthFactors.push("Positive cash");
  }

  healthScore = Math.max(0, Math.min(100, healthScore));
  const healthColor = healthScore >= 70 ? "var(--color-green)" : healthScore >= 40 ? "var(--color-amber)" : "var(--color-red)";
  const healthLabel = healthScore >= 70 ? "Good" : healthScore >= 40 ? "Fair" : "Needs Attention";

  const maxAgingTotal = Math.max(
    ...aging.map((b) => b.arAmount + b.apAmount),
    1
  );

  const maxMonthly = Math.max(
    ...monthlyData.map((m) => Math.max(m.income, m.expenses)),
    1
  );

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Financial Overview</h2>
          <p className="fin-header-sub">
            Real-time snapshot of your company finances.
          </p>
        </div>
        <div className="fin-header-actions">
          <Link href="/financial/general-ledger" className="ui-btn ui-btn-outline ui-btn-sm">
            <BookOpen size={14} />
            Journal Entries
          </Link>
        </div>
      </div>

      {/* Financial Health Score */}
      <div className="fin-chart-card" style={{ marginBottom: "20px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "20px" }}>
        <div style={{
          width: "56px", height: "56px", borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.2rem", fontWeight: 700, color: "#fff",
          background: healthColor, flexShrink: 0,
        }}>
          {healthScore}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
            Financial Health Score
            <span style={{
              fontSize: "0.72rem", padding: "2px 8px", borderRadius: "4px",
              background: healthColor, color: "#fff", fontWeight: 600,
            }}>
              {healthLabel}
            </span>
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
            {healthFactors.length > 0 ? healthFactors.join(" · ") : "Add financial data to calculate your health score"}
          </div>
        </div>
        <Link href="/financial/kpi" className="ui-btn ui-btn-outline ui-btn-sm">
          <PieChart size={14} />
          View All KPIs
        </Link>
      </div>

      {/* KPI Row */}
      <div className="financial-kpi-row">
        <div className="fin-kpi">
          <div className="fin-kpi-icon green">
            <TrendingUp size={18} />
          </div>
          <span className="fin-kpi-label">Revenue ({overview.periodLabel})</span>
          <span className="fin-kpi-value positive">
            {formatCompactCurrency(overview.revenueThisMonth)}
          </span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon red">
            <TrendingDown size={18} />
          </div>
          <span className="fin-kpi-label">Expenses ({overview.periodLabel})</span>
          <span className="fin-kpi-value">
            {formatCompactCurrency(overview.expensesThisMonth)}
          </span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <DollarSign size={18} />
          </div>
          <span className="fin-kpi-label">Net Income</span>
          <span
            className={`fin-kpi-value ${overview.netIncome >= 0 ? "positive" : "negative"}`}
          >
            {formatCompactCurrency(overview.netIncome)}
          </span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <Landmark size={18} />
          </div>
          <span className="fin-kpi-label">Cash Position</span>
          <span className="fin-kpi-value">
            {formatCompactCurrency(overview.cashPosition)}
          </span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <ArrowUpRight size={18} />
          </div>
          <span className="fin-kpi-label">AR Outstanding</span>
          <span className="fin-kpi-value">
            {formatCompactCurrency(overview.totalAR)}
          </span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <ArrowDownLeft size={18} />
          </div>
          <span className="fin-kpi-label">AP Outstanding</span>
          <span className="fin-kpi-value">
            {formatCompactCurrency(overview.totalAP)}
          </span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="financial-charts-row">
        {/* Income vs Expenses Bar Chart */}
        <div className="fin-chart-card">
          <div className="fin-chart-title">
            <BarChart3 size={18} />
            Income vs Expenses
          </div>
          {monthlyData.length > 0 ? (
            <>
              <div className="fin-bar-chart">
                {monthlyData.map((m) => (
                  <div key={m.month} className="fin-bar-group">
                    <div className="fin-bar-pair">
                      <div
                        className="fin-bar-income"
                        style={{
                          height: `${Math.max((m.income / maxMonthly) * 100, 2)}%`,
                        }}
                        title={`Income: ${formatCurrency(m.income)}`}
                      />
                      <div
                        className="fin-bar-expense"
                        style={{
                          height: `${Math.max((m.expenses / maxMonthly) * 100, 2)}%`,
                        }}
                        title={`Expenses: ${formatCurrency(m.expenses)}`}
                      />
                    </div>
                    <span className="fin-bar-month">{m.month}</span>
                  </div>
                ))}
              </div>
              <div className="fin-chart-legend">
                <span className="fin-legend-item">
                  <span
                    className="fin-legend-dot"
                    style={{ background: "var(--color-green)" }}
                  />
                  Income
                </span>
                <span className="fin-legend-item">
                  <span
                    className="fin-legend-dot"
                    style={{ background: "var(--color-red)", opacity: 0.75 }}
                  />
                  Expenses
                </span>
              </div>
            </>
          ) : (
            <div className="fin-empty" style={{ padding: "40px 20px" }}>
              <p className="fin-empty-desc">No financial data for the last 6 months.</p>
            </div>
          )}
        </div>

        {/* AR/AP Aging */}
        <div className="fin-chart-card">
          <div className="fin-chart-title">
            <CreditCard size={18} />
            AR/AP Aging
          </div>
          <div className="aging-chart">
            {aging.map((bucket) => (
              <div key={bucket.label} className="aging-bucket">
                <span className="aging-label">{bucket.label}</span>
                <div className="aging-bars">
                  <div
                    className="aging-bar-ar"
                    style={{
                      width: `${Math.max((bucket.arAmount / maxAgingTotal) * 100, 1)}%`,
                    }}
                    title={`AR: ${formatCurrency(bucket.arAmount)}`}
                  />
                  <div
                    className="aging-bar-ap"
                    style={{
                      width: `${Math.max((bucket.apAmount / maxAgingTotal) * 100, 1)}%`,
                    }}
                    title={`AP: ${formatCurrency(bucket.apAmount)}`}
                  />
                </div>
                <span className="aging-amount">
                  {formatCompactCurrency(bucket.arAmount + bucket.apAmount)}
                </span>
              </div>
            ))}
            <div className="fin-chart-legend" style={{ marginTop: "12px" }}>
              <span className="fin-legend-item">
                <span
                  className="fin-legend-dot"
                  style={{ background: "var(--color-blue)" }}
                />
                Receivable
              </span>
              <span className="fin-legend-item">
                <span
                  className="fin-legend-dot"
                  style={{ background: "var(--color-amber)" }}
                />
                Payable
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Invoices & Cash Flow */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", marginBottom: "24px" }}>
        {/* Recent Invoices */}
        <div className="fin-chart-card">
          <div className="fin-chart-title">
            <FileText size={18} />
            Recent Invoices
          </div>
          {recentInvoices.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Type</th>
                    <th>Vendor / Client</th>
                    <th>Date</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => {
                    const isPastDue = new Date(inv.due_date) < new Date() && inv.status !== "paid" && inv.status !== "voided";
                    return (
                    <tr
                      key={inv.id}
                      className={isPastDue || inv.status === "overdue" ? "invoice-row-overdue" : ""}
                    >
                      <td style={{ fontWeight: 600 }}>
                        <Link
                          href={`/financial/invoices/${inv.id}`}
                          style={{ color: "var(--color-blue)", textDecoration: "none" }}
                        >
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td>
                        <span
                          className={`inv-type inv-type-${inv.invoice_type}`}
                        >
                          {inv.invoice_type === "payable" ? "AP" : "AR"}
                        </span>
                      </td>
                      <td>
                        {inv.invoice_type === "payable"
                          ? inv.vendor_name ?? "--"
                          : inv.client_name ?? "--"}
                      </td>
                      <td>
                        {new Date(inv.invoice_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="amount-col">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td>
                        <span className={`inv-status inv-status-${inv.status}`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="fin-empty" style={{ padding: "32px 20px" }}>
              <div className="fin-empty-icon">
                <FileText size={36} />
              </div>
              <div className="fin-empty-title">No Invoices Yet</div>
              <div className="fin-empty-desc">
                Create your first invoice to start tracking your accounts payable
                and receivable.
              </div>
            </div>
          )}
          {recentInvoices.length > 0 && (
            <div style={{ marginTop: "12px" }}>
              <Link href="/financial/invoices" className="view-all">
                View All Invoices
              </Link>
            </div>
          )}
        </div>

        {/* Cash Flow Summary */}
        <div className="fin-chart-card">
          <div className="fin-chart-title">
            <Landmark size={18} />
            Cash Flow Summary
          </div>
          <div className="cashflow-summary">
            <div className="cashflow-item">
              <div className="cashflow-item-label">Inflows ({overview.periodLabel})</div>
              <div className="cashflow-item-value inflow">
                +{formatCompactCurrency(overview.revenueThisMonth)}
              </div>
            </div>
            <div className="cashflow-item">
              <div className="cashflow-item-label">Outflows ({overview.periodLabel})</div>
              <div className="cashflow-item-value outflow">
                -{formatCompactCurrency(overview.expensesThisMonth)}
              </div>
            </div>
            <div className="cashflow-item">
              <div className="cashflow-item-label">Net Cash Flow</div>
              <div
                className={`cashflow-item-value ${overview.netIncome >= 0 ? "inflow" : "outflow"}`}
              >
                {overview.netIncome >= 0 ? "+" : ""}
                {formatCompactCurrency(overview.netIncome)}
              </div>
            </div>
          </div>
          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: "16px",
              marginTop: "16px",
            }}
          >
            <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "8px" }}>
              Quick Actions
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Link href="/financial/invoices" className="ui-btn ui-btn-outline ui-btn-sm" style={{ justifyContent: "flex-start" }}>
                <FileText size={14} />
                Invoices
              </Link>
              <Link href="/financial/general-ledger" className="ui-btn ui-btn-outline ui-btn-sm" style={{ justifyContent: "flex-start" }}>
                <BookOpen size={14} />
                Journal Entries
              </Link>
              <Link href="/financial/income-statement" className="ui-btn ui-btn-outline ui-btn-sm" style={{ justifyContent: "flex-start" }}>
                <TrendingUp size={14} />
                Income Statement
              </Link>
              <Link href="/financial/balance-sheet" className="ui-btn ui-btn-outline ui-btn-sm" style={{ justifyContent: "flex-start" }}>
                <Scale size={14} />
                Balance Sheet
              </Link>
              <Link href="/financial/kpi" className="ui-btn ui-btn-outline ui-btn-sm" style={{ justifyContent: "flex-start" }}>
                <Activity size={14} />
                KPI Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
