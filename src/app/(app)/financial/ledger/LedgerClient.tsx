"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
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
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

  function handlePageChange(page: number) {
    const url = buildUrl(filterStart, filterEnd, filterAccount || undefined, page);
    router.push(url);
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>
            <BookOpen size={24} style={{ verticalAlign: "middle", marginRight: 8 }} />
            General Ledger
          </h2>
          <p className="fin-header-sub">
            All posted journal entry lines by account
          </p>
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
            Start Date
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
            End Date
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
            Account
          </label>
          <select
            className="equipment-form-select"
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
          >
            <option value="">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_number} - {a.name}
              </option>
            ))}
          </select>
        </div>
        <button className="ui-btn ui-btn-primary ui-btn-sm" onClick={handleApply}>
          Apply
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="financial-kpi-row">
        <div className="fin-kpi">
          <div className="fin-kpi-icon" style={{ color: "var(--color-green)" }}>
            <BookOpen size={20} />
          </div>
          <div className="fin-kpi-label">Total Debits</div>
          <div className="fin-kpi-value">{formatCurrency(totalDebits)}</div>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon" style={{ color: "var(--color-red)" }}>
            <BookOpen size={20} />
          </div>
          <div className="fin-kpi-label">Total Credits</div>
          <div className="fin-kpi-value">{formatCurrency(totalCredits)}</div>
        </div>
        <div className="fin-kpi">
          <div
            className="fin-kpi-icon"
            style={{
              color: Math.abs(net) < 0.01 ? "var(--color-green)" : "var(--color-amber)",
            }}
          >
            <BookOpen size={20} />
          </div>
          <div className="fin-kpi-label">Net (Debits - Credits)</div>
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
            <BookOpen size={20} />
          </div>
          <div className="fin-kpi-label">Posted Entries</div>
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
                  <th>Date</th>
                  <th>JE #</th>
                  <th>Account</th>
                  <th>Description</th>
                  <th>Reference</th>
                  <th style={{ textAlign: "right" }}>Debit</th>
                  <th style={{ textAlign: "right" }}>Credit</th>
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
                    Page Totals
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
                Previous
              </button>
              <span
                style={{
                  fontSize: "0.85rem",
                  color: "var(--muted)",
                  fontWeight: 500,
                }}
              >
                Page {currentPage} of {totalPages}
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
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <BookOpen size={48} />
            </div>
            <div className="fin-empty-title">No Ledger Entries Found</div>
            <div className="fin-empty-desc">
              {accountFilter
                ? "No posted journal entry lines match the selected account and date range. Try adjusting your filters."
                : "No posted journal entries exist for the selected date range. Create and post journal entries from the Journal Entries page."}
            </div>
            <Link
              href="/financial/general-ledger"
              className="ui-btn ui-btn-primary ui-btn-sm"
              style={{ marginTop: 12, textDecoration: "none" }}
            >
              Go to Journal Entries
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
