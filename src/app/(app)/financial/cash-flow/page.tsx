import { TrendingUp, Landmark, DollarSign, Building2, ArrowDownUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getCashFlowStatement } from "@/lib/queries/financial";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils/format";

export const metadata = {
  title: "Cash Flow - Buildwrk",
};

interface BankAccount {
  id: string;
  name: string;
  bank_name: string;
  account_number_last4: string | null;
  account_type: string;
  current_balance: number;
  is_default: boolean;
}

interface MonthlyFlow {
  label: string;
  inflows: number;
  outflows: number;
  net: number;
  runningBalance: number;
}

export default async function CashFlowPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><TrendingUp size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access cash flow.</div>
      </div>
    );
  }

  // Date range for the cash flow statement: first day of current month to last day
  const now = new Date();
  const cfStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const cfEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  const cfMonthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Fetch cash flow statement and bank accounts in parallel
  const [cashFlowStatement, bankAccountsRes] = await Promise.all([
    getCashFlowStatement(supabase, userCompany.companyId, cfStartDate, cfEndDate),
    supabase
      .from("bank_accounts")
      .select("id, name, bank_name, account_number_last4, account_type, current_balance, is_default")
      .eq("company_id", userCompany.companyId)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true }),
  ]);

  const bankAccounts = (bankAccountsRes.data ?? []) as BankAccount[];
  const totalCashPosition = bankAccounts.reduce((sum, a) => sum + (a.current_balance ?? 0), 0);

  // Calculate monthly cash flow for the last 6 months
  const monthlyFlows: MonthlyFlow[] = [];

  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const label = monthDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const startISO = monthDate.toISOString();
    const endISO = monthEnd.toISOString();

    const [inflowRes, outflowRes] = await Promise.all([
      supabase
        .from("invoices")
        .select("total_amount")
        .eq("company_id", userCompany.companyId)
        .eq("invoice_type", "receivable")
        .eq("status", "paid")
        .gte("invoice_date", startISO)
        .lte("invoice_date", endISO),
      supabase
        .from("invoices")
        .select("total_amount")
        .eq("company_id", userCompany.companyId)
        .eq("invoice_type", "payable")
        .eq("status", "paid")
        .gte("invoice_date", startISO)
        .lte("invoice_date", endISO),
    ]);

    const inflows = (inflowRes.data ?? []).reduce(
      (sum, r) => sum + (r.total_amount ?? 0),
      0
    );
    const outflows = (outflowRes.data ?? []).reduce(
      (sum, r) => sum + (r.total_amount ?? 0),
      0
    );

    monthlyFlows.push({
      label,
      inflows,
      outflows,
      net: inflows - outflows,
      runningBalance: 0,
    });
  }

  // Calculate running balance
  const totalNetAllMonths = monthlyFlows.reduce((sum, m) => sum + m.net, 0);
  let runningBal = totalCashPosition - totalNetAllMonths;
  for (const month of monthlyFlows) {
    runningBal += month.net;
    month.runningBalance = runningBal;
  }

  // Find max value for bar chart scaling
  const maxBarValue = Math.max(
    ...monthlyFlows.map((m) => Math.max(m.inflows, m.outflows)),
    1
  );

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Cash Flow</h2>
          <p className="fin-header-sub">Monitor inflows, outflows, and project-level cash projections</p>
        </div>
      </div>

      {/* ============================================================
          CASH FLOW STATEMENT (formal 3-section format)
          ============================================================ */}
      <div className="fin-chart-card fs-statement-card" style={{ marginBottom: "24px" }}>
        <div className="fs-title-block">
          <div className="fs-company-name">{userCompany.companyName}</div>
          <div className="fs-statement-name">Cash Flow Statement</div>
          <div className="fs-date-range">{cfMonthLabel}</div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="fs-table">
            <thead>
              <tr>
                <th>Description</th>
                <th className="fs-amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              {/* Operating Activities */}
              <tr className="fs-section-header">
                <td colSpan={2}>Operating Activities</td>
              </tr>
              {cashFlowStatement.operating.map((item, idx) => (
                <tr key={`op-${idx}`} className="fs-account-row">
                  <td className="fs-indent">{item.label}</td>
                  <td className={`fs-amount ${item.amount < 0 ? "fs-negative" : ""}`}>
                    {item.amount < 0 ? `(${formatCurrency(Math.abs(item.amount))})` : formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
              {cashFlowStatement.operating.length === 0 && (
                <tr className="fs-account-row">
                  <td className="fs-indent fs-no-data" colSpan={2}>No operating activities</td>
                </tr>
              )}
              <tr className="fs-section-total">
                <td>Net Cash from Operations</td>
                <td className={`fs-amount ${cashFlowStatement.netOperating < 0 ? "fs-negative" : ""}`}>
                  {cashFlowStatement.netOperating < 0
                    ? `(${formatCurrency(Math.abs(cashFlowStatement.netOperating))})`
                    : formatCurrency(cashFlowStatement.netOperating)}
                </td>
              </tr>

              <tr className="fs-spacer"><td colSpan={2} /></tr>

              {/* Investing Activities */}
              <tr className="fs-section-header">
                <td colSpan={2}>Investing Activities</td>
              </tr>
              {cashFlowStatement.investing.length > 0 ? (
                cashFlowStatement.investing.map((item, idx) => (
                  <tr key={`inv-${idx}`} className="fs-account-row">
                    <td className="fs-indent">{item.label}</td>
                    <td className={`fs-amount ${item.amount < 0 ? "fs-negative" : ""}`}>
                      {item.amount < 0 ? `(${formatCurrency(Math.abs(item.amount))})` : formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="fs-account-row">
                  <td className="fs-indent fs-no-data" colSpan={2}>No investing activities</td>
                </tr>
              )}
              <tr className="fs-section-total">
                <td>Net Cash from Investing</td>
                <td className="fs-amount">{formatCurrency(cashFlowStatement.netInvesting)}</td>
              </tr>

              <tr className="fs-spacer"><td colSpan={2} /></tr>

              {/* Financing Activities */}
              <tr className="fs-section-header">
                <td colSpan={2}>Financing Activities</td>
              </tr>
              {cashFlowStatement.financing.length > 0 ? (
                cashFlowStatement.financing.map((item, idx) => (
                  <tr key={`fin-${idx}`} className="fs-account-row">
                    <td className="fs-indent">{item.label}</td>
                    <td className={`fs-amount ${item.amount < 0 ? "fs-negative" : ""}`}>
                      {item.amount < 0 ? `(${formatCurrency(Math.abs(item.amount))})` : formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="fs-account-row">
                  <td className="fs-indent fs-no-data" colSpan={2}>No financing activities</td>
                </tr>
              )}
              <tr className="fs-section-total">
                <td>Net Cash from Financing</td>
                <td className="fs-amount">{formatCurrency(cashFlowStatement.netFinancing)}</td>
              </tr>

              {/* Summary totals */}
              <tr className="fs-spacer"><td colSpan={2} /></tr>

              <tr className="fs-grand-total">
                <td>Net Change in Cash</td>
                <td className={`fs-amount ${cashFlowStatement.netChange >= 0 ? "fs-positive" : "fs-negative"}`}>
                  {cashFlowStatement.netChange < 0
                    ? `(${formatCurrency(Math.abs(cashFlowStatement.netChange))})`
                    : formatCurrency(cashFlowStatement.netChange)}
                </td>
              </tr>
              <tr className="fs-summary-line">
                <td>Beginning Cash Balance</td>
                <td className="fs-amount">{formatCurrency(cashFlowStatement.beginningCash)}</td>
              </tr>
              <tr className="fs-net-income">
                <td>Ending Cash Balance</td>
                <td className="fs-amount">{formatCurrency(cashFlowStatement.endingCash)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================
          EXISTING CONTENT: Total Cash Position KPI
          ============================================================ */}
      <div className="financial-kpi-row" style={{ gridTemplateColumns: "1fr", maxWidth: "320px", marginBottom: "24px" }}>
        <div className="fin-kpi">
          <div className="fin-kpi-icon green">
            <DollarSign size={18} />
          </div>
          <span className="fin-kpi-label">Total Cash Position</span>
          <span className={`fin-kpi-value ${totalCashPosition >= 0 ? "positive" : "negative"}`}>
            {formatCompactCurrency(totalCashPosition)}
          </span>
        </div>
      </div>

      {/* Bank Accounts Summary */}
      {bankAccounts.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {bankAccounts.map((account) => (
              <div key={account.id} className="fin-chart-card">
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <div className="fin-kpi-icon blue" style={{ width: "32px", height: "32px" }}>
                    <Building2 size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>
                      {account.name}
                      {account.is_default && (
                        <span
                          style={{
                            marginLeft: "8px",
                            fontSize: "0.68rem",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            background: "var(--color-green-light)",
                            color: "var(--color-green)",
                            fontWeight: 600,
                          }}
                        >
                          Default
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                      {account.bank_name}
                      {account.account_number_last4 && ` ••••${account.account_number_last4}`}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    {account.account_type}
                  </span>
                  <span style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: "1.15rem" }}>
                    {formatCurrency(account.current_balance)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {bankAccounts.length === 0 && (
        <div className="fin-chart-card" style={{ marginBottom: "24px" }}>
          <div className="fin-empty" style={{ padding: "32px 20px" }}>
            <div className="fin-empty-icon">
              <Landmark size={36} />
            </div>
            <div className="fin-empty-title">No Bank Accounts</div>
            <div className="fin-empty-desc">
              Add bank accounts to track your cash position across multiple accounts.
            </div>
          </div>
        </div>
      )}

      {/* Monthly Cash Flow Chart & Table */}
      <div className="fin-chart-card">
        <div className="fin-chart-title">
          <TrendingUp size={18} />
          Monthly Cash Flow (Last 6 Months)
        </div>

        {monthlyFlows.some((m) => m.inflows > 0 || m.outflows > 0) ? (
          <>
            {/* Bar Chart */}
            <div className="fin-bar-chart">
              {monthlyFlows.map((m) => (
                <div key={m.label} className="fin-bar-group">
                  <div className="fin-bar-pair">
                    <div
                      className="fin-bar-income"
                      style={{
                        height: `${Math.max((m.inflows / maxBarValue) * 100, 2)}%`,
                      }}
                      title={`Inflows: ${formatCurrency(m.inflows)}`}
                    />
                    <div
                      className="fin-bar-expense"
                      style={{
                        height: `${Math.max((m.outflows / maxBarValue) * 100, 2)}%`,
                      }}
                      title={`Outflows: ${formatCurrency(m.outflows)}`}
                    />
                  </div>
                  <span className="fin-bar-month">{m.label}</span>
                </div>
              ))}
            </div>
            <div className="fin-chart-legend">
              <span className="fin-legend-item">
                <span
                  className="fin-legend-dot"
                  style={{ background: "var(--color-green)" }}
                />
                Inflows
              </span>
              <span className="fin-legend-item">
                <span
                  className="fin-legend-dot"
                  style={{ background: "var(--color-red)", opacity: 0.75 }}
                />
                Outflows
              </span>
            </div>

            {/* Cash Flow Table */}
            <div style={{ overflowX: "auto", marginTop: "24px" }}>
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th style={{ textAlign: "right" }}>Inflows</th>
                    <th style={{ textAlign: "right" }}>Outflows</th>
                    <th style={{ textAlign: "right" }}>Net</th>
                    <th style={{ textAlign: "right" }}>Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyFlows.map((m) => (
                    <tr key={m.label}>
                      <td style={{ fontWeight: 600 }}>{m.label}</td>
                      <td className="amount-col" style={{ color: "var(--color-green)" }}>
                        +{formatCurrency(m.inflows)}
                      </td>
                      <td className="amount-col" style={{ color: "var(--color-red)" }}>
                        -{formatCurrency(m.outflows)}
                      </td>
                      <td
                        className="amount-col"
                        style={{
                          color: m.net >= 0 ? "var(--color-green)" : "var(--color-red)",
                          fontWeight: 600,
                        }}
                      >
                        {m.net >= 0 ? "+" : ""}{formatCurrency(m.net)}
                      </td>
                      <td className="amount-col" style={{ fontWeight: 600 }}>
                        {formatCurrency(m.runningBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="fin-empty" style={{ padding: "40px 20px" }}>
            <p className="fin-empty-desc">No cash flow data for the last 6 months.</p>
          </div>
        )}
      </div>
    </div>
  );
}
