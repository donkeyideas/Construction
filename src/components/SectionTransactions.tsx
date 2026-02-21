"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  Receipt,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  BookOpen,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import JournalEntryModal from "@/components/JournalEntryModal";
import type { SectionTransactionSummary, SectionTransaction } from "@/lib/queries/section-transactions";

interface Props {
  data: SectionTransactionSummary;
  sectionName: string;
}

type SortField = "date" | "description" | "source" | "debit" | "credit";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 25;

export default function SectionTransactions({ data, sectionName }: Props) {
  const router = useRouter();
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  // JE Modal state
  const [modalJeId, setModalJeId] = useState<string | null>(null);
  const [modalJeNumber, setModalJeNumber] = useState<string>("");

  // Backfill state
  const [backfilling, setBackfilling] = useState(false);
  const [backfillDone, setBackfillDone] = useState(false);

  const missingJeCount = useMemo(
    () => data.transactions.filter((t) => !t.jeNumber && t.jeExpected !== false).length,
    [data.transactions]
  );

  async function handleBackfill() {
    setBackfilling(true);
    try {
      const res = await fetch("/api/admin/backfill-journal-entries", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        const total = (data.coGenerated || 0) + (data.invGenerated || 0) +
          (data.contractsGenerated || 0) + (data.rfisGenerated || 0) +
          (data.equipPurchaseGenerated || 0) + (data.depreciationGenerated || 0) +
          (data.payrollGenerated || 0) + (data.maintenanceGenerated || 0) +
          (data.leaseScheduled || 0) + (data.rentPaymentGenerated || 0);
        if (total > 0) {
          setBackfillDone(true);
        }
        router.refresh();
      }
    } catch {
      // ignore
    } finally {
      setBackfilling(false);
    }
  }

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
          cmp = a.date.localeCompare(b.date);
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

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, totalPages || 1);
  const displayed = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset page when filter/sort changes
  const handleFilterChange = (val: string) => {
    setSourceFilter(val);
    setPage(1);
  };

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1);
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return null;
    return sortDir === "desc"
      ? <ChevronDown size={12} style={{ marginLeft: 2 }} />
      : <ChevronUp size={12} style={{ marginLeft: 2 }} />;
  }

  function openJeModal(jeId: string, jeNumber: string) {
    setModalJeId(jeId);
    setModalJeNumber(jeNumber);
  }

  // Compute filtered totals
  const filteredDebits = filtered.reduce((s, t) => s + t.debit, 0);
  const filteredCredits = filtered.reduce((s, t) => s + t.credit, 0);

  // Page numbers to show
  const pageNumbers: number[] = [];
  const maxPageButtons = 7;
  if (totalPages <= maxPageButtons) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    let start = Math.max(2, safePage - 2);
    let end = Math.min(totalPages - 1, safePage + 2);
    if (safePage <= 3) { start = 2; end = 5; }
    if (safePage >= totalPages - 2) { start = totalPages - 4; end = totalPages - 1; }
    if (start > 2) pageNumbers.push(-1); // ellipsis
    for (let i = start; i <= end; i++) pageNumbers.push(i);
    if (end < totalPages - 1) pageNumbers.push(-2); // ellipsis
    pageNumbers.push(totalPages);
  }

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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {missingJeCount > 0 && !backfillDone && (
              <button
                className="btn btn-primary"
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", padding: "6px 14px" }}
                onClick={handleBackfill}
                disabled={backfilling}
              >
                {backfilling ? (
                  <RefreshCw size={14} className="spin" />
                ) : (
                  <BookOpen size={14} />
                )}
                {backfilling ? "Generating..." : `Generate ${missingJeCount} Missing JE${missingJeCount !== 1 ? "s" : ""}`}
              </button>
            )}
            {sources.length > 1 && (
              <div className="section-txn-filter">
                <Filter size={13} />
                <select
                  value={sourceFilter}
                  onChange={(e) => handleFilterChange(e.target.value)}
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
                    <TxnRow key={txn.id} txn={txn} onJeClick={openJeModal} />
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="section-txn-pagination">
                <button
                  className="section-txn-page-btn"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                >
                  <ChevronLeft size={14} />
                </button>
                {pageNumbers.map((pn, i) =>
                  pn < 0 ? (
                    <span key={`ell-${i}`} className="section-txn-page-ellipsis">...</span>
                  ) : (
                    <button
                      key={pn}
                      className={`section-txn-page-btn${pn === safePage ? " active" : ""}`}
                      onClick={() => setPage(pn)}
                    >
                      {pn}
                    </button>
                  )
                )}
                <button
                  className="section-txn-page-btn"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(safePage + 1)}
                >
                  <ChevronRight size={14} />
                </button>
                <span className="section-txn-page-info">
                  {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="section-txn-empty">
            No financial transactions found for {sectionName}.
          </div>
        )}
      </div>

      {/* JE Detail Modal */}
      <JournalEntryModal
        jeId={modalJeId ?? ""}
        jeNumber={modalJeNumber}
        isOpen={!!modalJeId}
        onClose={() => setModalJeId(null)}
      />
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

function TxnRow({ txn, onJeClick }: { txn: SectionTransaction; onJeClick: (id: string, num: string) => void }) {
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
        {txn.jeNumber && txn.jeId ? (
          <button
            className="je-link"
            onClick={() => onJeClick(txn.jeId!, txn.jeNumber!)}
          >
            {txn.jeNumber}
          </button>
        ) : (
          <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>—</span>
        )}
      </td>
    </tr>
  );
}
