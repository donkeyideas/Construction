"use client";

import Link from "next/link";
import {
  FileText,
  DollarSign,
  TrendingDown,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import type { AccrualRow, WageAccountSummary } from "./page";
import type { PayrollRun } from "@/lib/queries/payroll";

import "@/styles/financial.css";
import "@/styles/payroll.css";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReconcileClientProps {
  accruals: AccrualRow[];
  payrollRuns: PayrollRun[];
  wageAccounts: WageAccountSummary[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtPeriod(start: string, end: string): string {
  const s = new Date(start + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const e = new Date(end + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${s} – ${e}`;
}

// Parse hours/rate from description like "Labor accrual — Name — 8h @ $45/h"
function parseHoursRate(desc: string): { hours: string; rate: string } {
  const match = desc.match(/([\d.]+)h\s*@\s*\$([\d.]+)/);
  if (match) return { hours: match[1], rate: match[2] };
  return { hours: "—", rate: "—" };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReconcileClient({
  accruals,
  payrollRuns,
  wageAccounts,
}: ReconcileClientProps) {
  const totalAccrued = accruals.reduce((s, a) => s + a.amount, 0);
  const paidRuns = payrollRuns.filter((r) => r.status === "paid");
  const pendingRuns = payrollRuns.filter(
    (r) => r.status === "draft" || r.status === "approved"
  );

  const expenseAccount = wageAccounts.find((a) => a.accountType === "expense");
  const payableAccount = wageAccounts.find((a) => a.accountType === "liability");

  // Alerts
  const alerts: string[] = [];
  const payableBalance = payableAccount
    ? payableAccount.totalCredits - payableAccount.totalDebits
    : 0;

  if (payableBalance > 0 && pendingRuns.length === 0 && accruals.length > 0) {
    alerts.push(
      "Accrued wages exist but no payroll run is draft or approved — consider creating a payroll run."
    );
  }

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const oldAccruals = accruals.filter(
    (a) => new Date(a.date + "T00:00:00") < fourteenDaysAgo
  );
  if (oldAccruals.length > 0) {
    alerts.push(
      `${oldAccruals.length} labor accrual(s) are older than 2 weeks — consider running payroll to clear them.`
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Labor Reconcile</h2>
          <p className="fin-header-sub">
            Overview of labor accruals, payroll runs, and wage account balances.
          </p>
        </div>
        <div className="fin-header-actions">
          <Link
            href="/people/payroll"
            className="ui-btn ui-btn-md ui-btn-secondary"
          >
            Payroll
          </Link>
          <Link
            href="/people/time"
            className="ui-btn ui-btn-md ui-btn-secondary"
          >
            Time & Attendance
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {alerts.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 16px",
                borderRadius: 8,
                background: "var(--color-amber-bg, rgba(245,158,11,0.1))",
                border: "1px solid var(--color-amber, #f59e0b)",
                color: "var(--color-amber, #f59e0b)",
                fontSize: "0.85rem",
                fontWeight: 500,
              }}
            >
              <AlertTriangle size={16} />
              {msg}
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="financial-kpi-row" style={{ marginBottom: 24 }}>
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <FileText size={18} />
          </div>
          <span className="fin-kpi-label">Open Accruals</span>
          <span className="fin-kpi-value">{accruals.length}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <DollarSign size={18} />
          </div>
          <span className="fin-kpi-label">Accrued Amount</span>
          <span className="fin-kpi-value" style={{ color: totalAccrued > 0 ? "var(--color-amber)" : undefined }}>
            {fmtMoney(totalAccrued)}
          </span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon red">
            <TrendingUp size={18} />
          </div>
          <span className="fin-kpi-label">Wages Expense</span>
          <span className="fin-kpi-value">
            {fmtMoney(expenseAccount?.netBalance ?? 0)}
          </span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <TrendingDown size={18} />
          </div>
          <span className="fin-kpi-label">Wages Payable</span>
          <span className="fin-kpi-value" style={{ color: payableBalance > 0 ? "var(--color-amber)" : undefined }}>
            {fmtMoney(payableBalance)}
          </span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon green">
            <CheckCircle size={18} />
          </div>
          <span className="fin-kpi-label">Paid Runs</span>
          <span className="fin-kpi-value">{paidRuns.length}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <Clock size={18} />
          </div>
          <span className="fin-kpi-label">Pending Runs</span>
          <span className="fin-kpi-value" style={{ color: pendingRuns.length > 0 ? "var(--color-blue)" : undefined }}>
            {pendingRuns.length}
          </span>
        </div>
      </div>

      {/* Two-column: Accruals + Payroll Runs */}
      <div className="financial-charts-row" style={{ marginBottom: 24 }}>
        {/* Open Labor Accruals */}
        <div className="fin-chart-card">
          <div className="fin-chart-title">Open Labor Accruals</div>
          {accruals.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Employee</th>
                    <th>Hours</th>
                    <th>Rate</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {accruals.map((a) => {
                    const { hours, rate } = parseHoursRate(a.description);
                    return (
                      <tr key={a.jeId}>
                        <td style={{ fontSize: "0.82rem" }}>{fmtDate(a.date)}</td>
                        <td style={{ fontWeight: 500 }}>{a.employeeName}</td>
                        <td>{hours}h</td>
                        <td>${rate}/h</td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 600,
                            color: "var(--color-amber)",
                          }}
                        >
                          {fmtMoney(a.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 700 }}>
                    <td colSpan={4}>Total Accrued</td>
                    <td style={{ textAlign: "right", color: "var(--color-amber)" }}>
                      {fmtMoney(totalAccrued)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: 32,
                color: "var(--muted)",
                fontSize: "0.85rem",
              }}
            >
              No open labor accruals — all caught up
            </div>
          )}
        </div>

        {/* Recent Payroll Runs */}
        <div className="fin-chart-card">
          <div className="fin-chart-title">Recent Payroll Runs</div>
          {payrollRuns.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Gross Pay</th>
                    <th style={{ textAlign: "right" }}>Employees</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRuns.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontSize: "0.82rem" }}>
                        {fmtPeriod(r.period_start, r.period_end)}
                      </td>
                      <td>
                        <span className={`payroll-status payroll-status-${r.status}`}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 500 }}>
                        {fmtMoney(r.total_gross)}
                      </td>
                      <td style={{ textAlign: "right" }}>{r.employee_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: 32,
                color: "var(--muted)",
                fontSize: "0.85rem",
              }}
            >
              No payroll runs yet
            </div>
          )}
        </div>
      </div>

      {/* Wage Account Summary */}
      <div className="fin-chart-card" style={{ marginBottom: 32 }}>
        <div className="fin-chart-title">Wage Account Summary</div>
        <div style={{ overflowX: "auto" }}>
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Type</th>
                <th style={{ textAlign: "right" }}>Total Debits</th>
                <th style={{ textAlign: "right" }}>Total Credits</th>
                <th style={{ textAlign: "right" }}>Net Balance</th>
              </tr>
            </thead>
            <tbody>
              {wageAccounts.map((acct) => {
                // For liability, net balance should be credits - debits
                const displayBalance =
                  acct.accountType === "liability"
                    ? acct.totalCredits - acct.totalDebits
                    : acct.netBalance;
                return (
                  <tr key={acct.accountName}>
                    <td style={{ fontWeight: 500 }}>{acct.accountName}</td>
                    <td style={{ fontSize: "0.82rem", textTransform: "capitalize" }}>
                      {acct.accountType}
                    </td>
                    <td style={{ textAlign: "right", color: "var(--color-red)" }}>
                      {fmtMoney(acct.totalDebits)}
                    </td>
                    <td style={{ textAlign: "right", color: "var(--color-green)" }}>
                      {fmtMoney(acct.totalCredits)}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: 700,
                        color:
                          displayBalance > 0
                            ? "var(--color-amber)"
                            : displayBalance === 0
                              ? "var(--color-green)"
                              : undefined,
                      }}
                    >
                      {fmtMoney(displayBalance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: "0.78rem",
            color: "var(--muted)",
            padding: "0 4px",
          }}
        >
          When Wages Payable is $0.00, all accrued labor has been paid through payroll runs.
        </div>
      </div>
    </div>
  );
}
