"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  FileText,
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import type { AccrualRow, WageAccountSummary } from "./page";

import "@/styles/financial.css";
import "@/styles/payroll.css";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReconcileClientProps {
  accruals: AccrualRow[];
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

// Parse hours/rate from description like "Labor accrual — Name — 8h @ $45/h"
function parseHoursRate(desc: string): { hours: string; rate: string } {
  const match = desc.match(/([\d.]+)h\s*@\s*\$([\d.]+)/);
  if (match) return { hours: match[1], rate: match[2] };
  return { hours: "\u2014", rate: "\u2014" };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReconcileClient({
  accruals,
  wageAccounts,
}: ReconcileClientProps) {
  const t = useTranslations("people");
  const totalAccrued = accruals.reduce((s, a) => s + a.amount, 0);

  const expenseAccount = wageAccounts.find((a) => a.accountType === "expense");
  const payableAccount = wageAccounts.find((a) => a.accountType === "liability");

  const payableBalance = payableAccount
    ? payableAccount.totalCredits - payableAccount.totalDebits
    : 0;

  // Alerts
  const alerts: string[] = [];

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const oldAccruals = accruals.filter(
    (a) => new Date(a.date + "T00:00:00") < fourteenDaysAgo
  );
  if (oldAccruals.length > 0) {
    alerts.push(
      t("reconcile.oldAccrualsWarning", { count: oldAccruals.length })
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>{t("reconcile.title")}</h2>
          <p className="fin-header-sub">
            {t("reconcile.subtitle")}
          </p>
        </div>
        <div className="fin-header-actions">
          <Link
            href="/people/labor"
            className="ui-btn ui-btn-md ui-btn-secondary"
          >
            {t("reconcile.laborAndTime")}
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
          <span className="fin-kpi-label">{t("reconcile.openAccruals")}</span>
          <span className="fin-kpi-value">{accruals.length}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <DollarSign size={18} />
          </div>
          <span className="fin-kpi-label">{t("reconcile.accruedAmount")}</span>
          <span className="fin-kpi-value" style={{ color: totalAccrued > 0 ? "var(--color-amber)" : undefined }}>
            {fmtMoney(totalAccrued)}
          </span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon red">
            <TrendingUp size={18} />
          </div>
          <span className="fin-kpi-label">{t("reconcile.wagesExpense")}</span>
          <span className="fin-kpi-value">
            {fmtMoney(expenseAccount?.netBalance ?? 0)}
          </span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <TrendingDown size={18} />
          </div>
          <span className="fin-kpi-label">{t("reconcile.wagesPayable")}</span>
          <span className="fin-kpi-value" style={{ color: payableBalance > 0 ? "var(--color-amber)" : undefined }}>
            {fmtMoney(payableBalance)}
          </span>
        </div>
      </div>

      {/* Two-column: Accruals + Payroll Runs */}
      <div className="financial-charts-row" style={{ marginBottom: 24 }}>
        {/* Open Labor Accruals */}
        <div className="fin-chart-card">
          <div className="fin-chart-title">{t("reconcile.openLaborAccruals")}</div>
          {accruals.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>{t("reconcile.date")}</th>
                    <th>{t("reconcile.employee")}</th>
                    <th>{t("reconcile.hours")}</th>
                    <th>{t("reconcile.rate")}</th>
                    <th style={{ textAlign: "right" }}>{t("reconcile.amount")}</th>
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
                    <td colSpan={4}>{t("reconcile.totalAccrued")}</td>
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
              {t("reconcile.noOpenAccruals")}
            </div>
          )}
        </div>

      </div>

      {/* Wage Account Summary */}
      <div className="fin-chart-card" style={{ marginBottom: 32 }}>
        <div className="fin-chart-title">{t("reconcile.wageAccountSummary")}</div>
        <div style={{ overflowX: "auto" }}>
          <table className="invoice-table">
            <thead>
              <tr>
                <th>{t("reconcile.account")}</th>
                <th>{t("reconcile.type")}</th>
                <th style={{ textAlign: "right" }}>{t("reconcile.totalDebits")}</th>
                <th style={{ textAlign: "right" }}>{t("reconcile.totalCredits")}</th>
                <th style={{ textAlign: "right" }}>{t("reconcile.netBalance")}</th>
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
          {t("reconcile.wagesPayableNote")}
        </div>
      </div>
    </div>
  );
}
