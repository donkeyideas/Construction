"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  Receipt,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import type { SectionTransactionSummary, SectionTransaction } from "@/lib/queries/section-transactions";

interface Props {
  data: SectionTransactionSummary;
  sectionName: string;
}

type SortField = "date" | "description" | "source" | "debit" | "credit";
type SortDir = "asc" | "desc";

export default function SectionTransactions({ data, sectionName }: Props) {
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showAll, setShowAll] = useState(false);

  // Unique sources for filter
  const sources = useMemo(() => {
    const set = new Set(data.transactions.map((t) => t.source));
    return Array.from(set).sort();
  }, [data.transactions]);

  // Filtered + sorted transactions
  const filtered = useMemo(() => {
    let txns = data.transactions;
    if (sourceFilter !== "all") {
      txns = txns.filter((t) => t.source === sourceFilter);
    }

    txns = [...txns].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "description":
          cmp = a.description.localeCompare(b.description);
          break;
        case "source":
          cmp = a.source.localeCompare(b.source);
          break;
        case "debit":
          cmp = a.debit - b.debit;
          break;
        case "credit":
          cmp = a.credit - b.credit;
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return txns;
  }, [data.transactions, sourceFilter, sortField, sortDir]);

  const displayed = showAll ? filtered : filtered.slice(0, 25);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return null;
    return sortDir === "desc"
      ? <ChevronDown size={12} style={{ marginLeft: 2 }} />
      : <ChevronUp size={12} style={{ marginLeft: 2 }} />;
  }

  // Compute filtered totals
  const filteredDebits = filtered.reduce((s, t) => s + t.debit, 0);
  const filteredCredits = filtered.reduce((s, t) => s + t.credit, 0);

  return (
    <div className="section-txn-wrapper">
      {/* KPI Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 20 }}>
        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">Total Transactions</span>
            <span className="kpi-value">{data.totalTransactions}</span>
          </div>
          <div className="kpi-icon">
            <Receipt size={22} />
          </div>
        </div>
        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">Total Debits</span>
            <span className="kpi-value" style={{ color: "var(--color-red)", fontSize: "1.4rem" }}>
              {formatCurrency(data.totalDebits)}
            </span>
          </div>
          <div className="kpi-icon" style={{ color: "var(--color-red)" }}>
            <ArrowUpRight size={22} />
          </div>
        </div>
        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">Total Credits</span>
            <span className="kpi-value" style={{ color: "var(--color-green)", fontSize: "1.4rem" }}>
              {formatCurrency(data.totalCredits)}
            </span>
          </div>
          <div className="kpi-icon" style={{ color: "var(--color-green)" }}>
            <ArrowDownLeft size={22} />
          </div>
        </div>
        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">Net Amount</span>
            <span
              className="kpi-value"
              style={{
                color: data.netAmount >= 0 ? "var(--color-red)" : "var(--color-green)",
                fontSize: "1.4rem",
              }}
            >
              {formatCurrency(Math.abs(data.netAmount))}
            </span>
          </div>
          <div className="kpi-icon">
            <TrendingUp size={22} />
          </div>
        </div>
      </div>

      {/* Transactions Table Card */}
      <div className="card" style={{ padding: 0 }}>
        <div className="section-txn-header">
          <div className="card-title" style={{ marginBottom: 0 }}>
            <DollarSign size={16} style={{ color: "var(--color-blue)" }} />
            {sectionName} Transactions
          </div>
          {sources.length > 1 && (
            <div className="section-txn-filter">
              <Filter size={13} />
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="section-txn-select"
              >
                <option value="all">All Sources</option>
                {sources.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {displayed.length > 0 ? (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="invoice-table section-txn-table">
                <thead>
                  <tr>
                    <th onClick={() => toggleSort("date")} style={{ cursor: "pointer", whiteSpace: "nowrap" }}>
                      Date <SortIcon field="date" />
                    </th>
                    <th onClick={() => toggleSort("description")} style={{ cursor: "pointer" }}>
                      Description <SortIcon field="description" />
                    </th>
                    <th>Reference</th>
                    <th onClick={() => toggleSort("source")} style={{ cursor: "pointer" }}>
                      Source <SortIcon field="source" />
                    </th>
                    <th onClick={() => toggleSort("debit")} style={{ cursor: "pointer", textAlign: "right" }}>
                      Debit <SortIcon field="debit" />
                    </th>
                    <th onClick={() => toggleSort("credit")} style={{ cursor: "pointer", textAlign: "right" }}>
                      Credit <SortIcon field="credit" />
                    </th>
                    <th>JE</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((txn) => (
                    <TxnRow key={txn.id} txn={txn} />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="section-txn-totals">
                    <td colSpan={4} style={{ fontWeight: 600 }}>
                      Totals ({filtered.length} transactions)
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--color-red)" }}>
                      {formatCurrency(filteredDebits)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--color-green)" }}>
                      {formatCurrency(filteredCredits)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            {filtered.length > 25 && !showAll && (
              <div className="section-txn-show-more">
                <button onClick={() => setShowAll(true)} className="ui-btn ui-btn-outline ui-btn-sm">
                  Show all {filtered.length} transactions
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="section-txn-empty">
            No financial transactions found for {sectionName}.
          </div>
        )}
      </div>
    </div>
  );
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Parse ISO date string without timezone conversion to avoid server/client mismatch */
function formatDateSafe(iso: string): string {
  const parts = (iso || "").split("T")[0].split("-");
  if (parts.length < 3) return iso || "";
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  return `${MONTHS[m]} ${d}, ${parts[0]}`;
}

function TxnRow({ txn }: { txn: SectionTransaction }) {
  const dateStr = formatDateSafe(txn.date);

  return (
    <tr>
      <td style={{ whiteSpace: "nowrap", fontSize: "0.82rem" }}>{dateStr}</td>
      <td>
        <Link href={txn.sourceHref} className="section-txn-desc-link">
          {txn.description}
        </Link>
      </td>
      <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{txn.reference}</td>
      <td>
        <span className="section-txn-source-badge">{txn.source}</span>
      </td>
      <td style={{ textAlign: "right", fontWeight: 600, color: txn.debit > 0 ? "var(--color-red)" : "var(--muted)" }}>
        {txn.debit > 0 ? formatCurrency(txn.debit) : "—"}
      </td>
      <td style={{ textAlign: "right", fontWeight: 600, color: txn.credit > 0 ? "var(--color-green)" : "var(--muted)" }}>
        {txn.credit > 0 ? formatCurrency(txn.credit) : "—"}
      </td>
      <td>
        {txn.jeNumber ? (
          <Link
            href={`/financial/general-ledger?entry=${txn.jeNumber}`}
            className="je-link"
          >
            {txn.jeNumber}
          </Link>
        ) : (
          <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>—</span>
        )}
      </td>
    </tr>
  );
}
