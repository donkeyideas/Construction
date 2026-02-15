"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Plus,
  BookOpen,
  X,
  Trash2,
  CheckCircle,
  Ban,
  Loader2,
  Upload,
  Eye,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";
import type {
  JournalEntryRow,
  JournalEntryDetail,
  JournalEntryLineRow,
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
   Import columns
   ------------------------------------------------------------------ */

const jeImportColumns: ImportColumn[] = [
  { key: "entry_number", label: "Entry Number", required: true },
  { key: "entry_date", label: "Entry Date (YYYY-MM-DD)", required: true },
  { key: "description", label: "Description", required: true },
  { key: "reference", label: "Reference", required: false },
  { key: "account_number", label: "Account Number", required: true },
  { key: "debit", label: "Debit", required: false, type: "number" },
  { key: "credit", label: "Credit", required: false, type: "number" },
  { key: "line_description", label: "Line Description", required: false },
];

const jeSampleData = [
  { entry_number: "JE-001", entry_date: "2025-01-15", description: "Monthly rent", reference: "INV-100", account_number: "6100", debit: "5000", credit: "", line_description: "Rent expense" },
  { entry_number: "JE-001", entry_date: "2025-01-15", description: "Monthly rent", reference: "INV-100", account_number: "1000", debit: "", credit: "5000", line_description: "Cash payment" },
  { entry_number: "JE-002", entry_date: "2025-01-20", description: "Material purchase", reference: "PO-200", account_number: "1400", debit: "12000", credit: "", line_description: "Lumber" },
  { entry_number: "JE-002", entry_date: "2025-01-20", description: "Material purchase", reference: "PO-200", account_number: "2000", debit: "", credit: "12000", line_description: "AP" },
];

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
  const router = useRouter();
  const t = useTranslations("financial");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(dateLocale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  /* ---- State ---- */
  const [activeTab, setActiveTab] = useState<"journal" | "trial">("journal");
  const [statusFilter, setStatusFilter] = useState("all");
  const [entries, setEntries] = useState<JournalEntryRow[]>(initialEntries);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceRow[]>(initialTrialBalance);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Import modal
  const [showImport, setShowImport] = useState(false);

  // Detail modal
  const [selectedEntry, setSelectedEntry] = useState<JournalEntryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
    } catch {
      // silent
    }
  }, []);

  const openDetail = useCallback(async (entryId: string) => {
    setDetailLoading(true);
    setShowDeleteConfirm(false);
    try {
      const res = await fetch(`/api/financial/journal-entries/${entryId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedEntry(data.entry);
      }
    } catch {
      // silent
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedEntry(null);
    setShowDeleteConfirm(false);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!selectedEntry) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/financial/journal-entries/${selectedEntry.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        closeDetail();
        await refreshData();
        router.refresh();
      }
    } catch {
      // silent
    } finally {
      setDeleteLoading(false);
    }
  }, [selectedEntry, closeDetail, refreshData, router]);

  const handleCreate = useCallback(async () => {
    setCreateError("");

    if (!entryNumber.trim()) {
      setCreateError(t("errorEntryNumberRequired"));
      return;
    }
    if (!entryDate) {
      setCreateError(t("errorEntryDateRequired"));
      return;
    }
    if (!description.trim()) {
      setCreateError(t("errorDescriptionRequired"));
      return;
    }

    const validLines = lines.filter(
      (l) => l.account_id && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0)
    );

    if (validLines.length < 2) {
      setCreateError(t("errorMinTwoLines"));
      return;
    }

    const totalDebit = validLines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
    const totalCredit = validLines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      setCreateError(
        t("errorNotBalanced", { debits: `$${totalDebit.toFixed(2)}`, credits: `$${totalCredit.toFixed(2)}` })
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
        setCreateError(err.error || t("errorFailedToCreate"));
        return;
      }

      closeCreate();
      await refreshData();
    } catch {
      setCreateError(t("errorNetwork"));
    } finally {
      setCreating(false);
    }
  }, [entryNumber, entryDate, description, reference, lines, closeCreate, refreshData, t]);

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
          {t("journalEntries")}
        </button>
        <button
          className={`fin-tab ${activeTab === "trial" ? "active" : ""}`}
          onClick={() => setActiveTab("trial")}
        >
          {t("trialBalance")}
        </button>
      </div>

      {/* ============================================================
          JOURNAL ENTRIES TAB
          ============================================================ */}
      {activeTab === "journal" && (
        <>
          {/* Filter row + actions */}
          <div className="fin-filters">
            <label
              style={{
                fontSize: "0.82rem",
                color: "var(--muted)",
                fontWeight: 500,
              }}
            >
              {t("statusLabel")}
            </label>
            <select
              className="fin-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t("statusAll")}</option>
              <option value="draft">{t("statusDraft")}</option>
              <option value="posted">{t("statusPosted")}</option>
              <option value="voided">{t("statusVoided")}</option>
            </select>

            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button
                className="ui-btn ui-btn-outline ui-btn-md"
                onClick={() => setShowImport(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Upload size={16} />
                {t("importCsv")}
              </button>
              <button
                className="ui-btn ui-btn-primary ui-btn-md"
                onClick={openCreate}
              >
                <Plus size={16} />
                {t("newJournalEntry")}
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
                      <th>{t("entryNumber")}</th>
                      <th>{t("date")}</th>
                      <th>{t("description")}</th>
                      <th>{t("reference")}</th>
                      <th style={{ textAlign: "right" }}>{t("debit")}</th>
                      <th style={{ textAlign: "right" }}>{t("credit")}</th>
                      <th>{t("status")}</th>
                      <th style={{ textAlign: "center" }}>{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => {
                      const loading = actionLoading[entry.id];
                      return (
                        <tr
                          key={entry.id}
                          style={{ cursor: "pointer" }}
                          onClick={() => openDetail(entry.id)}
                        >
                          <td style={{ fontWeight: 600, color: "var(--color-blue)" }}>
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
                          <td
                            style={{ textAlign: "center" }}
                            onClick={(e) => e.stopPropagation()}
                          >
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
                                  title={t("postEntry")}
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
                                  {t("post")}
                                </button>
                                <button
                                  className="ui-btn ui-btn-outline ui-btn-sm"
                                  onClick={() => handleAction(entry.id, "void")}
                                  disabled={!!loading}
                                  title={t("voidEntry")}
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
                                  {t("void")}
                                </button>
                              </div>
                            )}
                            {entry.status === "posted" && (
                              <button
                                className="ui-btn ui-btn-outline ui-btn-sm"
                                onClick={() => openDetail(entry.id)}
                                title={t("viewEntry")}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <Eye size={14} />
                                {t("view")}
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
                <div className="fin-empty-title">{t("noJournalEntries")}</div>
                <div className="fin-empty-desc">
                  {statusFilter !== "all"
                    ? t("noEntriesMatchFilter")
                    : t("noEntriesDescription")}
                </div>
                {statusFilter === "all" && (
                  <button
                    className="ui-btn ui-btn-primary ui-btn-md"
                    onClick={openCreate}
                  >
                    <Plus size={16} />
                    {t("createJournalEntry")}
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
                      <th>{t("accountNumber")}</th>
                      <th>{t("accountName")}</th>
                      <th>{t("type")}</th>
                      <th style={{ textAlign: "right" }}>{t("debit")}</th>
                      <th style={{ textAlign: "right" }}>{t("credit")}</th>
                      <th style={{ textAlign: "right" }}>{t("balance")}</th>
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
                        {t("totals")}
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
                <div className="fin-empty-title">{t("noTrialBalanceData")}</div>
                <div className="fin-empty-desc">
                  {t("noTrialBalanceDescription")}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================================
          DETAIL MODAL
          ============================================================ */}
      {(selectedEntry || detailLoading) && (
        <div className="ticket-modal-overlay" onClick={closeDetail}>
          <div
            className="ticket-modal"
            style={{ maxWidth: 720 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ticket-modal-header">
              <h3>
                {detailLoading
                  ? t("loading")
                  : t("journalEntryTitle", { number: selectedEntry?.entry_number ?? "" })}
              </h3>
              <button className="ticket-modal-close" onClick={closeDetail}>
                <X size={18} />
              </button>
            </div>

            {detailLoading ? (
              <div style={{ padding: 40, textAlign: "center" }}>
                <Loader2 size={24} className="spin" style={{ color: "var(--muted)" }} />
              </div>
            ) : selectedEntry ? (
              <div className="ticket-detail-body">
                {/* Entry Info */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>{t("entryDate")}</div>
                    <div style={{ fontWeight: 500 }}>{formatDate(selectedEntry.entry_date)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>{t("status")}</div>
                    <span className={`inv-status inv-status-${selectedEntry.status}`}>
                      {selectedEntry.status}
                    </span>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>{t("description")}</div>
                    <div style={{ fontWeight: 500 }}>{selectedEntry.description}</div>
                  </div>
                  {selectedEntry.reference && (
                    <div style={{ gridColumn: "span 2" }}>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>{t("reference")}</div>
                      <div>{selectedEntry.reference}</div>
                    </div>
                  )}
                  {selectedEntry.posted_at && (
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>{t("postedDate")}</div>
                      <div>{formatDate(selectedEntry.posted_at)}</div>
                    </div>
                  )}
                </div>

                {/* Line Items Table */}
                <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 10, color: "var(--muted)" }}>
                  {t("lineItems")}
                </div>
                <div style={{ overflowX: "auto", marginBottom: 20 }}>
                  <table className="invoice-table" style={{ fontSize: "0.85rem" }}>
                    <thead>
                      <tr>
                        <th>{t("account")}</th>
                        <th>{t("description")}</th>
                        <th style={{ textAlign: "right" }}>{t("debit")}</th>
                        <th style={{ textAlign: "right" }}>{t("credit")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEntry.lines.map((line: JournalEntryLineRow) => (
                        <tr key={line.id}>
                          <td style={{ fontWeight: 500 }}>
                            {line.account_number
                              ? `${line.account_number} - ${line.account_name}`
                              : line.account_id}
                          </td>
                          <td style={{ color: "var(--muted)" }}>
                            {line.description || "--"}
                          </td>
                          <td className="amount-col">
                            {line.debit > 0 ? formatCurrency(line.debit) : "--"}
                          </td>
                          <td className="amount-col">
                            {line.credit > 0 ? formatCurrency(line.credit) : "--"}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ fontWeight: 700, borderTop: "2px solid var(--border)" }}>
                        <td colSpan={2} style={{ fontWeight: 700 }}>{t("totals")}</td>
                        <td className="amount-col" style={{ fontWeight: 700 }}>
                          {formatCurrency(selectedEntry.lines.reduce((s: number, l: JournalEntryLineRow) => s + l.debit, 0))}
                        </td>
                        <td className="amount-col" style={{ fontWeight: 700 }}>
                          {formatCurrency(selectedEntry.lines.reduce((s: number, l: JournalEntryLineRow) => s + l.credit, 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                  <div>
                    {(selectedEntry.status === "draft" || selectedEntry.status === "voided") && (
                      showDeleteConfirm ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: "0.85rem", color: "var(--color-red)" }}>
                            {t("deleteConfirmation")}
                          </span>
                          <button
                            className="ui-btn ui-btn-outline ui-btn-sm"
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={deleteLoading}
                          >
                            {t("cancel")}
                          </button>
                          <button
                            className="ui-btn ui-btn-primary ui-btn-sm"
                            style={{ background: "var(--color-red)", borderColor: "var(--color-red)" }}
                            onClick={handleDelete}
                            disabled={deleteLoading}
                          >
                            {deleteLoading ? t("deleting") : t("confirmDelete")}
                          </button>
                        </div>
                      ) : (
                        <button
                          className="ui-btn ui-btn-outline ui-btn-sm"
                          onClick={() => setShowDeleteConfirm(true)}
                          style={{ color: "var(--color-red)", display: "inline-flex", alignItems: "center", gap: 4 }}
                        >
                          <Trash2 size={14} />
                          {t("delete")}
                        </button>
                      )
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {selectedEntry.status === "draft" && (
                      <>
                        <button
                          className="ui-btn ui-btn-outline ui-btn-sm"
                          onClick={() => {
                            handleAction(selectedEntry.id, "void");
                            closeDetail();
                          }}
                          style={{ color: "var(--color-red)", display: "inline-flex", alignItems: "center", gap: 4 }}
                        >
                          <Ban size={14} />
                          {t("void")}
                        </button>
                        <button
                          className="ui-btn ui-btn-primary ui-btn-sm"
                          onClick={() => {
                            handleAction(selectedEntry.id, "post");
                            closeDetail();
                          }}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                        >
                          <CheckCircle size={14} />
                          {t("post")}
                        </button>
                      </>
                    )}
                    {selectedEntry.status === "posted" && (
                      <button
                        className="ui-btn ui-btn-outline ui-btn-sm"
                        onClick={() => {
                          handleAction(selectedEntry.id, "void");
                          closeDetail();
                        }}
                        style={{ color: "var(--color-red)", display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        <Ban size={14} />
                        {t("void")}
                      </button>
                    )}
                    <button
                      className="ui-btn ui-btn-outline ui-btn-sm"
                      onClick={closeDetail}
                    >
                      {t("close")}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
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
                {t("newJournalEntry")}
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
                  {t("entryNumberLabel")}
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
                  {t("entryDateLabel")}
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
                  {t("descriptionLabel")}
                </label>
                <input
                  className="ui-input"
                  type="text"
                  placeholder={t("descriptionPlaceholder")}
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
                  {t("reference")}
                </label>
                <input
                  className="ui-input"
                  type="text"
                  placeholder={t("referencePlaceholder")}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="line-items-section">
              <div className="line-items-section-title">
                <span>{t("lineItems")}</span>
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
                  {t("addLine")}
                </button>
              </div>

              <table className="line-items-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 220 }}>{t("account")}</th>
                    <th style={{ width: 130, textAlign: "right" }}>{t("debit")}</th>
                    <th style={{ width: 130, textAlign: "right" }}>{t("credit")}</th>
                    <th style={{ minWidth: 160 }}>{t("description")}</th>
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
                          <option value="">{t("selectAccount")}</option>
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
                          placeholder={t("lineDescription")}
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
                          title={t("removeLine")}
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
                    <span className="totals-label">{t("totalDebits")}</span>
                    <span className="totals-value">
                      {formatCurrency(lineTotals.totalDebit)}
                    </span>
                  </div>
                  <div className="totals-row">
                    <span className="totals-label">{t("totalCredits")}</span>
                    <span className="totals-value">
                      {formatCurrency(lineTotals.totalCredit)}
                    </span>
                  </div>
                  <div className="totals-row total-final">
                    <span className="totals-label">{t("difference")}</span>
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
                      {isBalanced && ` (${t("balanced")})`}
                      {!isBalanced &&
                        (lineTotals.totalDebit > 0 || lineTotals.totalCredit > 0) &&
                        ` (${t("unbalanced")})`}
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
                {creating ? t("saving") : t("createJournalEntry")}
              </button>
              <button
                className="ui-btn ui-btn-outline ui-btn-md"
                onClick={closeCreate}
                disabled={creating}
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          IMPORT CSV MODAL
          ============================================================ */}
      {showImport && (
        <ImportModal
          entityName={t("journalEntries")}
          columns={jeImportColumns}
          sampleData={jeSampleData}
          onImport={async (rows) => {
            const res = await fetch("/api/import", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                entity: "journal_entries",
                rows,
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || t("importFailed"));
            await refreshData();
            router.refresh();
            return { success: data.success, errors: data.errors };
          }}
          onClose={() => setShowImport(false)}
        />
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
