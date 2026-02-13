"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Plus,
  BookOpen,
  X,
  Trash2,
  CheckCircle,
  Ban,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import type {
  JournalEntryRow,
  AccountTreeNode,
  TrialBalanceRow,
} from "@/lib/queries/financial";

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

interface FlatAccount {
  id: string;
  account_number: string;
  name: string;
  label: string;
}

function flattenAccounts(nodes: AccountTreeNode[]): FlatAccount[] {
  const result: FlatAccount[] = [];

  function walk(list: AccountTreeNode[]) {
    for (const node of list) {
      result.push({
        id: node.id,
        account_number: node.account_number,
        name: node.name,
        label: `${node.account_number} - ${node.name}`,
      });
      if (node.children.length > 0) {
        walk(node.children);
      }
    }
  }

  walk(nodes);
  return result;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------
   Line item type for the create form
   ------------------------------------------------------------------ */

interface LineItemDraft {
  key: number;
  account_id: string;
  debit: string;
  credit: string;
  description: string;
}

let lineKeyCounter = 0;
function nextLineKey(): number {
  return ++lineKeyCounter;
}

function emptyLine(): LineItemDraft {
  return {
    key: nextLineKey(),
    account_id: "",
    debit: "",
    credit: "",
    description: "",
  };
}

/* ------------------------------------------------------------------
   Props
   ------------------------------------------------------------------ */

interface GeneralLedgerClientProps {
  entries: JournalEntryRow[];
  accounts: AccountTreeNode[];
  trialBalance: TrialBalanceRow[];
}

/* ==================================================================
   Component
   ================================================================== */

export default function GeneralLedgerClient({
  entries: initialEntries,
  accounts,
  trialBalance: initialTrialBalance,
}: GeneralLedgerClientProps) {
  /* ---- State ---- */
  const [activeTab, setActiveTab] = useState<"journal" | "trial">("journal");
  const [statusFilter, setStatusFilter] = useState("all");
  const [entries, setEntries] = useState<JournalEntryRow[]>(initialEntries);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceRow[]>(initialTrialBalance);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Form fields
  const [entryNumber, setEntryNumber] = useState("");
  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<LineItemDraft[]>([emptyLine(), emptyLine()]);

  // Action loading per entry
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});

  /* ---- Derived ---- */
  const flatAccounts = useMemo(() => flattenAccounts(accounts), [accounts]);

  const filteredEntries = useMemo(() => {
    if (statusFilter === "all") return entries;
    return entries.filter((e) => e.status === statusFilter);
  }, [entries, statusFilter]);

  const trialTotals = useMemo(() => {
    const totalDebit = trialBalance.reduce((s, r) => s + r.total_debit, 0);
    const totalCredit = trialBalance.reduce((s, r) => s + r.total_credit, 0);
    const totalBalance = trialBalance.reduce((s, r) => s + r.balance, 0);
    return { totalDebit, totalCredit, totalBalance };
  }, [trialBalance]);

  const lineTotals = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    for (const line of lines) {
      totalDebit += parseFloat(line.debit) || 0;
      totalCredit += parseFloat(line.credit) || 0;
    }
    return { totalDebit, totalCredit };
  }, [lines]);

  const isBalanced =
    Math.abs(lineTotals.totalDebit - lineTotals.totalCredit) < 0.01 &&
    lineTotals.totalDebit > 0;

  /* ---- Callbacks ---- */

  const resetForm = useCallback(() => {
    setEntryNumber("");
    setEntryDate(new Date().toISOString().slice(0, 10));
    setDescription("");
    setReference("");
    setLines([emptyLine(), emptyLine()]);
    setCreateError("");
  }, []);

  const openCreate = useCallback(() => {
    resetForm();
    setShowCreate(true);
  }, [resetForm]);

  const closeCreate = useCallback(() => {
    setShowCreate(false);
    setCreateError("");
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, emptyLine()]);
  }, []);

  const removeLine = useCallback((key: number) => {
    setLines((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((l) => l.key !== key);
    });
  }, []);

  const updateLine = useCallback(
    (key: number, field: keyof LineItemDraft, value: string) => {
      setLines((prev) =>
        prev.map((l) => (l.key === key ? { ...l, [field]: value } : l))
      );
    },
    []
  );

  const refreshData = useCallback(async () => {
    try {
      const res = await fetch("/api/financial/journal-entries?includeAccounts=false");
      if (res.ok) {
        const data = await res.json();
        if (data.entries) setEntries(data.entries);
      }
      // Also refresh trial balance by re-fetching via a simple GET
      // Since there's no dedicated API for trial balance, we reload the page data
      // We'll use a workaround: fetch the page which returns JSON on client navigation
      // For simplicity, we trigger a window reload only for trial balance
    } catch {
      // silent
    }
  }, []);

  const handleCreate = useCallback(async () => {
    setCreateError("");

    if (!entryNumber.trim()) {
      setCreateError("Entry number is required.");
      return;
    }
    if (!entryDate) {
      setCreateError("Entry date is required.");
      return;
    }
    if (!description.trim()) {
      setCreateError("Description is required.");
      return;
    }

    const validLines = lines.filter(
      (l) => l.account_id && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0)
    );

    if (validLines.length < 2) {
      setCreateError("At least two line items with an account and amount are required.");
      return;
    }

    const totalDebit = validLines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
    const totalCredit = validLines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      setCreateError(
        `Entry is not balanced. Debits ($${totalDebit.toFixed(2)}) must equal Credits ($${totalCredit.toFixed(2)}).`
      );
      return;
    }

    setCreating(true);
    try {
      const payload = {
        entry_number: entryNumber.trim(),
        entry_date: entryDate,
        description: description.trim(),
        reference: reference.trim() || undefined,
        lines: validLines.map((l) => ({
          account_id: l.account_id,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          description: l.description.trim() || undefined,
        })),
      };

      const res = await fetch("/api/financial/journal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        setCreateError(err.error || "Failed to create journal entry.");
        return;
      }

      closeCreate();
      await refreshData();
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }, [entryNumber, entryDate, description, reference, lines, closeCreate, refreshData]);

  const handleAction = useCallback(
    async (entryId: string, action: "post" | "void") => {
      setActionLoading((prev) => ({ ...prev, [entryId]: action }));
      try {
        const res = await fetch(`/api/financial/journal-entries/${entryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });

        if (res.ok) {
          // Optimistic update
          setEntries((prev) =>
            prev.map((e) => {
              if (e.id !== entryId) return e;
              return {
                ...e,
                status: action === "post" ? "posted" : "voided",
                posted_at: action === "post" ? new Date().toISOString() : e.posted_at,
              };
            })
          );
          // If an entry was posted, the trial balance may change.
          // We can do a lightweight refresh.
          if (action === "post") {
            try {
              const tbRes = await fetch("/api/financial/journal-entries?status=all");
              if (tbRes.ok) {
                const tbData = await tbRes.json();
                if (tbData.entries) setEntries(tbData.entries);
              }
            } catch {
              // silent
            }
          }
        }
      } catch {
        // silent
      } finally {
        setActionLoading((prev) => {
          const next = { ...prev };
          delete next[entryId];
          return next;
        });
      }
    },
    []
  );

  /* ==================================================================
     Render
     ================================================================== */

  return (
    <>
      {/* Tab Bar */}
      <div className="fin-tab-bar">
        <button
          className={`fin-tab ${activeTab === "journal" ? "active" : ""}`}
          onClick={() => setActiveTab("journal")}
        >
          Journal Entries
        </button>
        <button
          className={`fin-tab ${activeTab === "trial" ? "active" : ""}`}
          onClick={() => setActiveTab("trial")}
        >
          Trial Balance
        </button>
      </div>

      {/* ============================================================
          JOURNAL ENTRIES TAB
          ============================================================ */}
      {activeTab === "journal" && (
        <>
          {/* Filter row + action */}
          <div className="fin-filters">
            <label
              style={{
                fontSize: "0.82rem",
                color: "var(--muted)",
                fontWeight: 500,
              }}
            >
              Status:
            </label>
            <select
              className="fin-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="posted">Posted</option>
              <option value="voided">Voided</option>
            </select>

            <div style={{ marginLeft: "auto" }}>
              <button
                className="ui-btn ui-btn-primary ui-btn-md"
                onClick={openCreate}
              >
                <Plus size={16} />
                New Journal Entry
              </button>
            </div>
          </div>

          {/* Entries Table */}
          {filteredEntries.length > 0 ? (
            <div className="fin-chart-card" style={{ padding: 0 }}>
              <div style={{ overflowX: "auto" }}>
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>Entry #</th>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Reference</th>
                      <th style={{ textAlign: "right" }}>Debit</th>
                      <th style={{ textAlign: "right" }}>Credit</th>
                      <th>Status</th>
                      <th style={{ textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => {
                      const loading = actionLoading[entry.id];
                      return (
                        <tr key={entry.id}>
                          <td style={{ fontWeight: 600 }}>
                            {entry.entry_number}
                          </td>
                          <td>{formatDate(entry.entry_date)}</td>
                          <td>{entry.description}</td>
                          <td
                            style={{
                              color: "var(--muted)",
                              fontSize: "0.82rem",
                            }}
                          >
                            {entry.reference || "--"}
                          </td>
                          <td className="amount-col">
                            {formatCurrency(entry.total_debit ?? 0)}
                          </td>
                          <td className="amount-col">
                            {formatCurrency(entry.total_credit ?? 0)}
                          </td>
                          <td>
                            <span
                              className={`inv-status inv-status-${entry.status}`}
                            >
                              {entry.status}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {entry.status === "draft" && (
                              <div
                                style={{
                                  display: "flex",
                                  gap: 6,
                                  justifyContent: "center",
                                }}
                              >
                                <button
                                  className="ui-btn ui-btn-outline ui-btn-sm"
                                  onClick={() => handleAction(entry.id, "post")}
                                  disabled={!!loading}
                                  title="Post entry"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                >
                                  {loading === "post" ? (
                                    <Loader2 size={14} className="spin" />
                                  ) : (
                                    <CheckCircle size={14} />
                                  )}
                                  Post
                                </button>
                                <button
                                  className="ui-btn ui-btn-outline ui-btn-sm"
                                  onClick={() => handleAction(entry.id, "void")}
                                  disabled={!!loading}
                                  title="Void entry"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    color: "var(--color-red)",
                                  }}
                                >
                                  {loading === "void" ? (
                                    <Loader2 size={14} className="spin" />
                                  ) : (
                                    <Ban size={14} />
                                  )}
                                  Void
                                </button>
                              </div>
                            )}
                            {entry.status === "posted" && (
                              <button
                                className="ui-btn ui-btn-outline ui-btn-sm"
                                onClick={() => handleAction(entry.id, "void")}
                                disabled={!!loading}
                                title="Void entry"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  color: "var(--color-red)",
                                }}
                              >
                                {loading === "void" ? (
                                  <Loader2 size={14} className="spin" />
                                ) : (
                                  <Ban size={14} />
                                )}
                                Void
                              </button>
                            )}
                            {entry.status === "voided" && (
                              <span
                                style={{
                                  color: "var(--muted)",
                                  fontSize: "0.78rem",
                                }}
                              >
                                --
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="fin-chart-card">
              <div className="fin-empty">
                <div className="fin-empty-icon">
                  <BookOpen size={48} />
                </div>
                <div className="fin-empty-title">No Journal Entries</div>
                <div className="fin-empty-desc">
                  {statusFilter !== "all"
                    ? "No entries match the selected status filter."
                    : "Create your first journal entry to start recording transactions in the general ledger."}
                </div>
                {statusFilter === "all" && (
                  <button
                    className="ui-btn ui-btn-primary ui-btn-md"
                    onClick={openCreate}
                  >
                    <Plus size={16} />
                    Create Journal Entry
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================================
          TRIAL BALANCE TAB
          ============================================================ */}
      {activeTab === "trial" && (
        <>
          {trialBalance.length > 0 ? (
            <div className="fin-chart-card" style={{ padding: 0 }}>
              <div style={{ overflowX: "auto" }}>
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>Account #</th>
                      <th>Account Name</th>
                      <th>Type</th>
                      <th style={{ textAlign: "right" }}>Debit</th>
                      <th style={{ textAlign: "right" }}>Credit</th>
                      <th style={{ textAlign: "right" }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trialBalance.map((row) => (
                      <tr key={row.account_id}>
                        <td style={{ fontWeight: 600, color: "var(--color-blue)" }}>
                          {row.account_number}
                        </td>
                        <td>{row.account_name}</td>
                        <td>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              textTransform: "capitalize",
                              color: "var(--muted)",
                            }}
                          >
                            {row.account_type}
                          </span>
                        </td>
                        <td className="amount-col">
                          {row.total_debit > 0
                            ? formatCurrency(row.total_debit)
                            : "--"}
                        </td>
                        <td className="amount-col">
                          {row.total_credit > 0
                            ? formatCurrency(row.total_credit)
                            : "--"}
                        </td>
                        <td
                          className="amount-col"
                          style={{
                            color:
                              row.balance > 0
                                ? "var(--color-green)"
                                : row.balance < 0
                                ? "var(--color-red)"
                                : "var(--text)",
                          }}
                        >
                          {formatCurrency(row.balance)}
                        </td>
                      </tr>
                    ))}

                    {/* Totals row */}
                    <tr
                      style={{
                        fontWeight: 700,
                        borderTop: "2px solid var(--border)",
                      }}
                    >
                      <td colSpan={3} style={{ fontWeight: 700 }}>
                        Totals
                      </td>
                      <td className="amount-col" style={{ fontWeight: 700 }}>
                        {formatCurrency(trialTotals.totalDebit)}
                      </td>
                      <td className="amount-col" style={{ fontWeight: 700 }}>
                        {formatCurrency(trialTotals.totalCredit)}
                      </td>
                      <td
                        className="amount-col"
                        style={{
                          fontWeight: 700,
                          color:
                            Math.abs(trialTotals.totalBalance) < 0.01
                              ? "var(--color-green)"
                              : "var(--color-red)",
                        }}
                      >
                        {formatCurrency(trialTotals.totalBalance)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="fin-chart-card">
              <div className="fin-empty">
                <div className="fin-empty-icon">
                  <BookOpen size={48} />
                </div>
                <div className="fin-empty-title">No Trial Balance Data</div>
                <div className="fin-empty-desc">
                  No posted journal entries yet. Post journal entries to see
                  the trial balance.
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================================
          CREATE JOURNAL ENTRY DIALOG
          ============================================================ */}
      {showCreate && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Backdrop */}
          <div
            onClick={closeCreate}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.5)",
            }}
          />

          {/* Dialog */}
          <div
            style={{
              position: "relative",
              background: "var(--card-bg)",
              borderRadius: 12,
              width: "90%",
              maxWidth: 840,
              maxHeight: "90vh",
              overflow: "auto",
              padding: 32,
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              border: "1px solid var(--border)",
            }}
          >
            {/* Dialog Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <h3 className="fin-chart-title" style={{ marginBottom: 0 }}>
                <BookOpen size={20} />
                New Journal Entry
              </h3>
              <button
                onClick={closeCreate}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                  padding: 4,
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Error message */}
            {createError && (
              <div
                style={{
                  background: "var(--color-red-light)",
                  color: "var(--color-red)",
                  padding: "10px 16px",
                  borderRadius: 8,
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  marginBottom: 20,
                  border: "1px solid var(--color-red)",
                }}
              >
                {createError}
              </div>
            )}

            {/* Form fields */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 24,
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
                  Entry Number *
                </label>
                <input
                  className="ui-input"
                  type="text"
                  placeholder="JE-001"
                  value={entryNumber}
                  onChange={(e) => setEntryNumber(e.target.value)}
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
                  Entry Date *
                </label>
                <input
                  className="ui-input"
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.82rem",
                    fontWeight: 500,
                    color: "var(--muted)",
                    marginBottom: 6,
                  }}
                >
                  Description *
                </label>
                <input
                  className="ui-input"
                  type="text"
                  placeholder="Monthly depreciation, payroll allocation, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.82rem",
                    fontWeight: 500,
                    color: "var(--muted)",
                    marginBottom: 6,
                  }}
                >
                  Reference
                </label>
                <input
                  className="ui-input"
                  type="text"
                  placeholder="PO-1234, INV-5678, etc."
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="line-items-section">
              <div className="line-items-section-title">
                <span>Line Items</span>
                <button
                  className="ui-btn ui-btn-outline ui-btn-sm"
                  onClick={addLine}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Plus size={14} />
                  Add Line
                </button>
              </div>

              <table className="line-items-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 220 }}>Account</th>
                    <th style={{ width: 130, textAlign: "right" }}>Debit</th>
                    <th style={{ width: 130, textAlign: "right" }}>Credit</th>
                    <th style={{ minWidth: 160 }}>Description</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.key}>
                      <td>
                        <select
                          className="li-input"
                          value={line.account_id}
                          onChange={(e) =>
                            updateLine(line.key, "account_id", e.target.value)
                          }
                        >
                          <option value="">Select account...</option>
                          {flatAccounts.map((acct) => (
                            <option key={acct.id} value={acct.id}>
                              {acct.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          className="li-input li-input-sm"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={line.debit}
                          onChange={(e) =>
                            updateLine(line.key, "debit", e.target.value)
                          }
                          style={{ width: "100%", textAlign: "right" }}
                        />
                      </td>
                      <td>
                        <input
                          className="li-input li-input-sm"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={line.credit}
                          onChange={(e) =>
                            updateLine(line.key, "credit", e.target.value)
                          }
                          style={{ width: "100%", textAlign: "right" }}
                        />
                      </td>
                      <td>
                        <input
                          className="li-input"
                          type="text"
                          placeholder="Line description"
                          value={line.description}
                          onChange={(e) =>
                            updateLine(line.key, "description", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <button
                          className="li-remove-btn"
                          onClick={() => removeLine(line.key)}
                          title="Remove line"
                          disabled={lines.length <= 1}
                          style={{
                            opacity: lines.length <= 1 ? 0.3 : 1,
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="invoice-totals">
                <div className="invoice-totals-box">
                  <div className="totals-row">
                    <span className="totals-label">Total Debits</span>
                    <span className="totals-value">
                      {formatCurrency(lineTotals.totalDebit)}
                    </span>
                  </div>
                  <div className="totals-row">
                    <span className="totals-label">Total Credits</span>
                    <span className="totals-value">
                      {formatCurrency(lineTotals.totalCredit)}
                    </span>
                  </div>
                  <div className="totals-row total-final">
                    <span className="totals-label">Difference</span>
                    <span
                      className="totals-value"
                      style={{
                        color: isBalanced
                          ? "var(--color-green)"
                          : lineTotals.totalDebit === 0 && lineTotals.totalCredit === 0
                          ? "var(--muted)"
                          : "var(--color-red)",
                      }}
                    >
                      {formatCurrency(
                        Math.abs(lineTotals.totalDebit - lineTotals.totalCredit)
                      )}
                      {isBalanced && " (Balanced)"}
                      {!isBalanced &&
                        (lineTotals.totalDebit > 0 || lineTotals.totalCredit > 0) &&
                        " (Unbalanced)"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dialog Actions */}
            <div className="invoice-form-actions">
              <button
                className="ui-btn ui-btn-primary ui-btn-md"
                onClick={handleCreate}
                disabled={creating}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {creating ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <BookOpen size={16} />
                )}
                {creating ? "Saving..." : "Create Journal Entry"}
              </button>
              <button
                className="ui-btn ui-btn-outline ui-btn-md"
                onClick={closeCreate}
                disabled={creating}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline keyframes for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 0.8s linear infinite;
        }
      `}</style>
    </>
  );
}
