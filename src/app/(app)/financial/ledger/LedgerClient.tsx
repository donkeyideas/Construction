"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Download, Filter } from "lucide-react";
import { formatCurrency, formatDateSafe } from "@/lib/utils/format";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JournalEntryNested {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  reference: string | null;
  status: string;
}

interface LedgerLine {
  id: string;
  account_id: string;
  debit: number;
  credit: number;
  description: string | null;
  journal_entries: JournalEntryNested;
}

interface AccountInfo {
  id: string;
  account_number: string;
  name: string;
  account_type: string;
  sub_type: string | null;
  normal_balance: string | null;
}

interface LedgerClientProps {
  lines: LedgerLine[];
  accounts: AccountInfo[];
  accountMap: Record<string, { number: string; name: string; type: string }>;
  totalLines: number;
  totalDebits: number;
  totalCredits: number;
  currentPage: number;
  pageSize: number;
  startDate: string;
  endDate: string;
  accountFilter?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildUrl(
  startDate: string,
  endDate: string,
  accountFilter?: string,
  page?: number
): string {
  const p = new URLSearchParams();
  if (startDate) p.set("start", startDate);
  if (endDate) p.set("end", endDate);
  if (accountFilter) p.set("account", accountFilter);
  if (page && page > 1) p.set("page", String(page));
  const qs = p.toString();
  return `/financial/ledger${qs ? `?${qs}` : ""}`;
}

function formatDate(dateStr: string): string {
  return formatDateSafe(dateStr);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LedgerClient({
  lines,
  accounts,
  accountMap,
  totalLines,
  totalDebits,
  totalCredits,
  currentPage,
  pageSize,
  startDate,
  endDate,
  accountFilter,
}: LedgerClientProps) {
  const router = useRouter();
  const t = useTranslations("financial");
  const [filterStart, setFilterStart] = useState(startDate);
  const [filterEnd, setFilterEnd] = useState(endDate);
  const [filterAccount, setFilterAccount] = useState(accountFilter || "");

  const totalPages = Math.max(1, Math.ceil(totalLines / pageSize));
  const net = totalDebits - totalCredits;

  // Compute page-level totals from the visible lines
  const pageDebits = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const pageCredits = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);

  function handleApply() {
    const url = buildUrl(filterStart, filterEnd, filterAccount || undefined, 1);
    router.push(url);
  }

  function handleExportCSV() {
    const rows: string[] = [];
    rows.push([
      t("ledger.csvDate"),
      t("ledger.csvJeNumber"),
      t("ledger.csvAccount"),
      t("ledger.csvDescription"),
      t("ledger.csvReference"),
      t("ledger.csvDebit"),
      t("ledger.csvCredit"),
    ].join(","));
    for (const line of lines) {
      const je = line.journal_entries;
      const acct = accountMap[line.account_id];
      const debitVal = Number(line.debit) || 0;
      const creditVal = Number(line.credit) || 0;
      const desc = (line.description || je.description || "").replace(/"/g, '""');
      const ref = (je.reference || "").replace(/"/g, '""');
      rows.push([
        je.entry_date,
        je.entry_number,
        acct ? `${acct.number} - ${acct.name}` : line.account_id,
        `"${desc}"`,
        `"${ref}"`,
        debitVal > 0 ? debitVal.toFixed(2) : "",
        creditVal > 0 ? creditVal.toFixed(2) : "",
      ].join(","));
    }
    rows.push([`"${t("ledger.total")}"`, "", "", "", "", totalDebits.toFixed(2), totalCredits.toFixed(2)].join(","));
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `general_ledger_${filterStart}_${filterEnd}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePageChange(page: number) {
    const url = buildUrl(filterStart, filterEnd, filterAccount || undefined, page);
    router.push(url);
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>{t("ledger.title")}</h2>
          <p className="fin-header-sub">
            {t("ledger.subtitle")}
          </p>
        </div>
        <div className="fin-header-actions">
          <button className="ui-btn ui-btn-outline ui-btn-sm" onClick={handleExportCSV}>
            <Download size={14} />
            {t("audit.exportCsv")}
          </button>
        </div>
      </div>

      {/* Date & Account Filters */}
      <div
        className="fin-chart-card"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          gap: 16,
          padding: "16px 20px",
          marginBottom: 20,
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.82rem",
              fontWeight: 500,
              color: "var(--muted)",
              marginBottom: 6,
            }}
          >
            {t("ledger.startDate")}
          </label>
          <input
            type="date"
            className="equipment-form-select"
            value={filterStart}
            onChange={(e) => setFilterStart(e.target.value)}
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.82rem",
              fontWeight: 500,
              color: "var(--muted)",
              marginBottom: 6,
            }}
          >
            {t("ledger.endDate")}
          </label>
          <input
            type="date"
            className="equipment-form-select"
            value={filterEnd}
            onChange={(e) => setFilterEnd(e.target.value)}
          />
        </div>
        <div style={{ minWidth: 220 }}>
          <label
            style={{
              display: "block",
              fontSize: "0.82rem",
              fontWeight: 500,
              color: "var(--muted)",
              marginBottom: 6,
            }}
          >
            <Filter size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
            {t("ledger.account")}
          </label>
          <select
            className="equipment-form-select"
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
          >
            <option value="">{t("ledger.allAccounts")}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_number} - {a.name}
              </option>
            ))}
          </select>
        </div>
        <button className="ui-btn ui-btn-primary ui-btn-sm" onClick={handleApply}>
          {t("apply")}
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="financial-kpi-row">
        <div className="fin-kpi">
          <div className="fin-kpi-icon" style={{ color: "var(--color-green)" }}>
            <Filter size={20} />
          </div>
          <div className="fin-kpi-label">{t("totalDebits")}</div>
          <div className="fin-kpi-value">{formatCurrency(totalDebits)}</div>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon" style={{ color: "var(--color-red)" }}>
            <Filter size={20} />
          </div>
          <div className="fin-kpi-label">{t("totalCredits")}</div>
          <div className="fin-kpi-value">{formatCurrency(totalCredits)}</div>
        </div>
        <div className="fin-kpi">
          <div
            className="fin-kpi-icon"
            style={{
              color: Math.abs(net) < 0.01 ? "var(--color-green)" : "var(--color-amber)",
            }}
          >
            <Filter size={20} />
          </div>
          <div className="fin-kpi-label">{t("ledger.netDebitsCredits")}</div>
          <div
            className="fin-kpi-value"
            style={{
              color: Math.abs(net) < 0.01 ? "var(--color-green)" : "var(--color-red)",
            }}
          >
            {formatCurrency(net)}
          </div>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon" style={{ color: "var(--color-blue)" }}>
            <Filter size={20} />
          </div>
          <div className="fin-kpi-label">{t("ledger.postedEntries")}</div>
          <div className="fin-kpi-value">{totalLines.toLocaleString()}</div>
        </div>
      </div>

      {/* Ledger Table */}
      {lines.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>{t("date")}</th>
                  <th>{t("ledger.jeNumber")}</th>
                  <th>{t("ledger.account")}</th>
                  <th>{t("description")}</th>
                  <th>{t("reference")}</th>
                  <th style={{ textAlign: "right" }}>{t("debit")}</th>
                  <th style={{ textAlign: "right" }}>{t("credit")}</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const je = line.journal_entries;
                  const acct = accountMap[line.account_id];
                  const debitVal = Number(line.debit) || 0;
                  const creditVal = Number(line.credit) || 0;

                  return (
                    <tr key={line.id}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {formatDate(je.entry_date)}
                      </td>
                      <td>
                        <Link
                          href="/financial/general-ledger"
                          style={{
                            fontWeight: 600,
                            color: "var(--color-blue)",
                            textDecoration: "none",
                          }}
                        >
                          {je.entry_number}
                        </Link>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {acct
                          ? `${acct.number} - ${acct.name}`
                          : line.account_id}
                      </td>
                      <td>
                        {line.description || je.description || "--"}
                      </td>
                      <td
                        style={{
                          color: "var(--muted)",
                          fontSize: "0.82rem",
                        }}
                      >
                        {je.reference || "--"}
                      </td>
                      <td
                        className="amount-col"
                        style={{
                          color: debitVal > 0 ? "var(--color-green)" : undefined,
                          fontWeight: debitVal > 0 ? 600 : undefined,
                        }}
                      >
                        {debitVal > 0 ? formatCurrency(debitVal) : "--"}
                      </td>
                      <td
                        className="amount-col"
                        style={{
                          color: creditVal > 0 ? "var(--color-red)" : undefined,
                          fontWeight: creditVal > 0 ? 600 : undefined,
                        }}
                      >
                        {creditVal > 0 ? formatCurrency(creditVal) : "--"}
                      </td>
                    </tr>
                  );
                })}

                {/* Page Totals Row */}
                <tr
                  style={{
                    fontWeight: 700,
                    borderTop: "2px solid var(--border)",
                  }}
                >
                  <td colSpan={5} style={{ fontWeight: 700 }}>
                    {t("ledger.pageTotals")}
                  </td>
                  <td
                    className="amount-col"
                    style={{ fontWeight: 700, color: "var(--color-green)" }}
                  >
                    {formatCurrency(pageDebits)}
                  </td>
                  <td
                    className="amount-col"
                    style={{ fontWeight: 700, color: "var(--color-red)" }}
                  >
                    {formatCurrency(pageCredits)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 12,
                padding: "16px 20px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <button
                className="ui-btn ui-btn-sm ui-btn-secondary"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  opacity: currentPage <= 1 ? 0.5 : 1,
                }}
              >
                <ChevronLeft size={16} />
                {t("ledger.previous")}
              </button>
              <span
                style={{
                  fontSize: "0.85rem",
                  color: "var(--muted)",
                  fontWeight: 500,
                }}
              >
                {t("ledger.pageOf", { current: currentPage, total: totalPages })}
              </span>
              <button
                className="ui-btn ui-btn-sm ui-btn-secondary"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  opacity: currentPage >= totalPages ? 0.5 : 1,
                }}
              >
                {t("ledger.next")}
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <Filter size={48} />
            </div>
            <div className="fin-empty-title">{t("ledger.noEntriesTitle")}</div>
            <div className="fin-empty-desc">
              {accountFilter
                ? t("ledger.noEntriesFilterDesc")
                : t("ledger.noEntriesEmptyDesc")}
            </div>
            <Link
              href="/financial/general-ledger"
              className="ui-btn ui-btn-primary ui-btn-sm"
              style={{ marginTop: 12, textDecoration: "none" }}
            >
              {t("ledger.goToJournalEntries")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
