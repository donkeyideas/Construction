"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  HandCoins,
  AlertCircle,
  DollarSign,
  FileText,
  TrendingUp,
  Clock,
  X,
  Edit3,
  Trash2,
  ExternalLink,
  Loader2,
  CheckSquare,
  CreditCard,
  CheckCircle,
  BookOpen,
} from "lucide-react";
import { formatCurrency, formatCompactCurrency, formatDateSafe } from "@/lib/utils/format";
import ImportModal from "@/components/ImportModal";
import { Upload } from "lucide-react";
import type { ImportColumn } from "@/lib/utils/csv-parser";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

interface InvoiceRow {
  id: string;
  invoice_number: string;
  client_name: string | null;
  vendor_name: string | null;
  project_id: string | null;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  balance_due: number;
  status: string;
  notes: string | null;
  projects: { name: string } | null;
}

interface LinkedJE {
  id: string;
  entry_number: string;
}

interface BankAccount {
  id: string;
  name: string;
  bank_name: string | null;
  account_number_last4: string | null;
  is_default: boolean;
}

interface AgingBuckets {
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days90plus: number;
}

interface TopClient {
  name: string;
  amount: number;
}

interface GLSourceEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  reference: string | null;
  debit: number;
  credit: number;
}

interface ARClientProps {
  invoices: InvoiceRow[];
  totalArBalance: number;
  overdueAmount: number;
  billedThisMonth: number;
  collectedThisMonth: number;
  activeStatus: string | undefined;
  linkedJEs?: Record<string, LinkedJE[]>;
  initialStartDate?: string;
  initialEndDate?: string;
  glBalance?: number;
  serverToday?: string;
  agingBuckets?: AgingBuckets;
  topClients?: TopClient[];
  bankAccounts?: BankAccount[];
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function buildUrl(status?: string, start?: string, end?: string): string {
  const p = new URLSearchParams();
  if (status) p.set("status", status);
  if (start) p.set("start", start);
  if (end) p.set("end", end);
  const qs = p.toString();
  return `/financial/ar${qs ? `?${qs}` : ""}`;
}

/* ==================================================================
   Component
   ================================================================== */

export default function ARClient({
  invoices,
  totalArBalance,
  overdueAmount,
  billedThisMonth,
  collectedThisMonth,
  activeStatus,
  linkedJEs = {},
  initialStartDate,
  initialEndDate,
  glBalance,
  serverToday,
  agingBuckets = { current: 0, days30: 0, days60: 0, days90: 0, days90plus: 0 },
  topClients = [],
  bankAccounts = [],
}: ARClientProps) {
  const router = useRouter();
  const t = useTranslations("financial");
  const [filterStart, setFilterStart] = useState(initialStartDate || "");
  const [filterEnd, setFilterEnd] = useState(initialEndDate || "");
  const today = serverToday || new Date().toISOString().split("T")[0];

  function formatDate(dateStr: string) {
    return formatDateSafe(dateStr);
  }

  const statuses = [
    { label: "All", value: "all" },
    { label: t("statusActive"), value: "active" },
    { label: t("statusDraft"), value: "draft" },
    { label: t("statusPending"), value: "pending" },
    { label: t("statusApproved"), value: "approved" },
    { label: t("statusOverdue"), value: "overdue" },
    { label: t("statusPaid"), value: "paid" },
    { label: t("statusVoided") || "Voided", value: "voided" },
  ];

  const AR_IMPORT_COLUMNS: ImportColumn[] = [
    { key: "amount", label: t("importAmountColumn"), required: true, type: "number" },
    { key: "tax_amount", label: t("importTaxColumn"), required: false, type: "number" },
    { key: "due_date", label: t("dueDate"), required: false, type: "date" },
    { key: "description", label: t("description"), required: false },
    { key: "status", label: t("status"), required: false },
    { key: "client_name", label: t("clientName"), required: false },
    { key: "project_name", label: t("projectName"), required: false },
  ];

  const AR_IMPORT_SAMPLE: Record<string, string>[] = [
    { amount: "75000", tax_amount: "0", due_date: "2026-02-28", description: "Progress payment - Phase 1", status: "pending" },
    { amount: "150000", tax_amount: "0", due_date: "2026-04-01", description: "Milestone 3 completion", status: "draft" },
  ];

  // Import modal state
  const [showImport, setShowImport] = useState(false);

  // Bulk selection + bulk receive state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkReceive, setShowBulkReceive] = useState(false);
  const [bulkReceiveData, setBulkReceiveData] = useState({
    payment_date: today,
    bank_account_id: "",
    method: "check",
    reference_number: "",
    notes: "",
  });
  const [bulkReceiveProcessing, setBulkReceiveProcessing] = useState(false);
  const [bulkReceiveResults, setBulkReceiveResults] = useState<Array<{
    invoice_number: string;
    amount: number;
    success: boolean;
    error?: string;
  }>>([]);
  const [bulkReceiveDone, setBulkReceiveDone] = useState(false);

  // GL sources toggle — shows JE-sourced AR entries not in the invoice subledger
  const [showGLSources, setShowGLSources] = useState(false);
  const [glSourceEntries, setGLSourceEntries] = useState<GLSourceEntry[]>([]);
  const [glSourcesLoading, setGLSourcesLoading] = useState(false);

  // Restore persisted GL sources preference on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("buildwrk_ar_gl_sources");
    if (saved !== "true") return;
    setShowGLSources(true);
    setGLSourcesLoading(true);
    fetch("/api/financial/gl-sources?type=ar")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setGLSourceEntries(data))
      .catch(() => {})
      .finally(() => setGLSourcesLoading(false));
  }, []);

  async function handleToggleGLSources() {
    const next = !showGLSources;
    if (next && glSourceEntries.length === 0) {
      setGLSourcesLoading(true);
      try {
        const res = await fetch("/api/financial/gl-sources?type=ar");
        if (res.ok) setGLSourceEntries(await res.json());
      } catch { /* silent */ }
      setGLSourcesLoading(false);
    }
    setShowGLSources(next);
    if (typeof window !== "undefined") {
      if (next) localStorage.setItem("buildwrk_ar_gl_sources", "true");
      else localStorage.removeItem("buildwrk_ar_gl_sources");
    }
  }

  async function handleImport(rows: Record<string, string>[]) {
    // Force all rows to receivable type
    const arRows = rows.map((r) => ({ ...r, invoice_type: "receivable" }));
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "invoices", rows: arRows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("importFailed"));
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  // Detail modal state
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"void" | "hard">("void");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [editData, setEditData] = useState({
    status: "",
    notes: "",
  });

  function openDetail(inv: InvoiceRow) {
    setSelectedInvoice(inv);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
  }

  function closeDetail() {
    setSelectedInvoice(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
  }

  function startEditing() {
    if (!selectedInvoice) return;
    setEditData({
      status: selectedInvoice.status,
      notes: selectedInvoice.notes || "",
    });
    setIsEditing(true);
    setSaveError("");
  }

  async function handleSave() {
    if (!selectedInvoice) return;
    setSaving(true);
    setSaveError("");

    try {
      const payload: Record<string, unknown> = {};
      if (editData.status !== selectedInvoice.status) payload.status = editData.status;
      if (editData.notes !== (selectedInvoice.notes || "")) payload.notes = editData.notes || null;

      if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        return;
      }

      const res = await fetch(`/api/financial/invoices/${selectedInvoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToUpdateInvoice"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("failedToUpdate"));
    } finally {
      setSaving(false);
    }
  }

  async function handleVoid() {
    if (!selectedInvoice) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(`/api/financial/invoices/${selectedInvoice.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToVoidInvoice"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("failedToVoid"));
    } finally {
      setSaving(false);
    }
  }

  async function handleHardDelete() {
    if (!selectedInvoice) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(`/api/financial/invoices/${selectedInvoice.id}?hard=true`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToDeleteInvoice"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("failedToDelete"));
    } finally {
      setSaving(false);
    }
  }

  // Bulk selection helpers
  const selectableInvoices = invoices.filter(
    (inv) => inv.balance_due > 0 && inv.status !== "paid" && inv.status !== "voided"
  );
  const allSelected = selectableInvoices.length > 0 && selectableInvoices.every((inv) => selectedIds.has(inv.id));
  const someSelected = !allSelected && selectableInvoices.some((inv) => selectedIds.has(inv.id));
  const selectedList = invoices.filter((inv) => selectedIds.has(inv.id));
  const selectedTotal = selectedList.reduce((sum, inv) => sum + inv.balance_due, 0);

  async function handleBulkReceive() {
    if (selectedIds.size === 0 || bulkReceiveProcessing) return;
    setBulkReceiveProcessing(true);
    setBulkReceiveResults([]);
    const selected = invoices.filter((inv) => selectedIds.has(inv.id));
    const results: Array<{ invoice_number: string; amount: number; success: boolean; error?: string }> = [];
    for (const inv of selected) {
      try {
        const res = await fetch("/api/financial/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoice_id: inv.id,
            payment_date: bulkReceiveData.payment_date,
            amount: inv.balance_due,
            method: bulkReceiveData.method,
            bank_account_id: bulkReceiveData.bank_account_id || undefined,
            reference_number: bulkReceiveData.reference_number || undefined,
            notes: bulkReceiveData.notes || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          results.push({ invoice_number: inv.invoice_number, amount: inv.balance_due, success: false, error: data.error || "Failed" });
        } else {
          results.push({ invoice_number: inv.invoice_number, amount: inv.balance_due, success: true });
        }
      } catch {
        results.push({ invoice_number: inv.invoice_number, amount: inv.balance_due, success: false, error: "Network error" });
      }
    }
    setBulkReceiveResults(results);
    setBulkReceiveProcessing(false);
    setBulkReceiveDone(true);
    if (results.some((r) => r.success)) {
      setSelectedIds(new Set());
      router.refresh();
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>{t("accountsReceivable")}</h2>
          <p className="fin-header-sub">{t("accountsReceivableDesc")}</p>
        </div>
        <div className="fin-header-actions">
          <button className="ui-btn ui-btn-secondary ui-btn-md" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            {t("importCsv")}
          </button>
          <Link href="/financial/invoices/new?type=receivable" className="ui-btn ui-btn-primary ui-btn-md">
            <FileText size={16} />
            {t("newInvoice")}
          </Link>
        </div>
      </div>

      {/* Date Range Controls */}
      <div className="fs-date-controls">
        <div className="fs-date-field">
          <label>{t("from")}</label>
          <input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} />
        </div>
        <div className="fs-date-field">
          <label>{t("to")}</label>
          <input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} />
        </div>
        <button
          className="ui-btn ui-btn-primary ui-btn-md"
          onClick={() => {
            router.push(buildUrl(activeStatus, filterStart || undefined, filterEnd || undefined));
          }}
        >
          {t("apply")}
        </button>
      </div>

      {/* KPI Row */}
      <div className="financial-kpi-row" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue"><DollarSign size={18} /></div>
          <span className="fin-kpi-label">{t("totalArBalance")}</span>
          <span className="fin-kpi-value">
            {formatCompactCurrency(showGLSources && glBalance != null ? glBalance : totalArBalance)}
          </span>
          {glBalance != null && !showGLSources && (
            <span className="fin-kpi-sub" style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
              GL: {formatCompactCurrency(glBalance)}
            </span>
          )}
          {showGLSources && (
            <span className="fin-kpi-sub" style={{ fontSize: "0.7rem", color: "var(--color-green, #22c55e)" }}>
              All sources included
            </span>
          )}
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon red"><Clock size={18} /></div>
          <span className="fin-kpi-label">{t("overdueAmount")}</span>
          <span className={`fin-kpi-value ${overdueAmount > 0 ? "negative" : ""}`}>
            {formatCompactCurrency(overdueAmount)}
          </span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber"><TrendingUp size={18} /></div>
          <span className="fin-kpi-label">{t("billedThisMonth")}</span>
          <span className="fin-kpi-value">{formatCompactCurrency(billedThisMonth)}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon green"><HandCoins size={18} /></div>
          <span className="fin-kpi-label">{t("collectedThisMonth")}</span>
          <span className="fin-kpi-value positive">{formatCompactCurrency(collectedThisMonth)}</span>
        </div>
      </div>

      {/* GL Reconciliation Warning — shown when GL ≠ subledger and GL sources are hidden */}
      {glBalance != null && Math.abs(glBalance - totalArBalance) > 100 && !showGLSources && (
        <div className="fin-alert" style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.75rem 1rem", borderRadius: "var(--radius-md, 8px)",
          background: "var(--warning-bg, #fff3cd)", border: "1px solid var(--warning-border, #ffc107)",
          color: "var(--warning-text, #856404)", fontSize: "0.82rem", marginBottom: "0.5rem"
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>
            {t("glMismatchAr", { glBalance: formatCurrency(glBalance), subledgerBalance: formatCurrency(totalArBalance), difference: formatCurrency(Math.abs(glBalance - totalArBalance)) })}
            <a href="/financial/audit" style={{ marginLeft: "0.5rem", textDecoration: "underline" }}>{t("runAudit")}</a>
          </span>
          <button
            className="ui-btn ui-btn-sm ui-btn-outline"
            style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, borderColor: "var(--warning-border, #ffc107)", color: "var(--warning-text, #856404)" }}
            onClick={handleToggleGLSources}
            disabled={glSourcesLoading}
          >
            {glSourcesLoading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <BookOpen size={13} />}
            Include Project &amp; Property AR
          </button>
        </div>
      )}

      {/* GL Sources active banner */}
      {showGLSources && glBalance != null && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.75rem 1rem", borderRadius: "var(--radius-md, 8px)",
          background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)",
          color: "var(--color-green, #22c55e)", fontSize: "0.82rem", marginBottom: "0.5rem"
        }}>
          <BookOpen size={16} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>
            {glSourceEntries.length > 0
              ? (() => {
                  const glSourcesTotal = glSourceEntries.reduce((sum, e) => sum + ((e.debit || 0) - (e.credit || 0)), 0);
                  return <>
                    Including {glSourceEntries.length} GL entr{glSourceEntries.length === 1 ? "y" : "ies"}{" "}
                    from projects &amp; properties ({formatCurrency(Math.abs(glSourcesTotal))}). GL balance: {formatCurrency(glBalance)}.
                  </>;
                })()
              : <>No additional GL entries found. GL balance: {formatCurrency(glBalance)}.</>
            }
          </span>
          <button
            className="ui-btn ui-btn-sm ui-btn-outline"
            style={{ flexShrink: 0 }}
            onClick={() => {
              setShowGLSources(false);
              if (typeof window !== "undefined") localStorage.removeItem("buildwrk_ar_gl_sources");
            }}
          >
            Subledger Only
          </button>
        </div>
      )}

      {/* AR Aging Chart + Top Clients Row */}
      {(agingBuckets.current + agingBuckets.days30 + agingBuckets.days60 + agingBuckets.days90 + agingBuckets.days90plus) > 0 && (() => {
        const agingTotal = agingBuckets.current + agingBuckets.days30 + agingBuckets.days60 + agingBuckets.days90 + agingBuckets.days90plus;
        const agingSegments = [
          { label: "Current", value: agingBuckets.current, color: "var(--color-green, #22c55e)" },
          { label: "1-30", value: agingBuckets.days30, color: "var(--color-blue, #3b82f6)" },
          { label: "31-60", value: agingBuckets.days60, color: "var(--color-amber, #f59e0b)" },
          { label: "61-90", value: agingBuckets.days90, color: "var(--color-orange, #f97316)" },
          { label: "90+", value: agingBuckets.days90plus, color: "var(--color-red, #ef4444)" },
        ];
        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div className="fin-chart-card" style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: 12 }}>AR Aging</div>
              <div style={{ display: "flex", height: 24, borderRadius: 6, overflow: "hidden", marginBottom: 12 }}>
                {agingSegments.map((seg) => {
                  const pct = agingTotal > 0 ? (seg.value / agingTotal) * 100 : 0;
                  if (pct < 0.5) return null;
                  return (
                    <div
                      key={seg.label}
                      title={`${seg.label}: ${formatCurrency(seg.value)} (${pct.toFixed(0)}%)`}
                      style={{ width: `${pct}%`, background: seg.color, minWidth: pct > 0 ? 4 : 0 }}
                    />
                  );
                })}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px" }}>
                {agingSegments.map((seg) => (
                  <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
                    <span style={{ color: "var(--muted)" }}>{seg.label}</span>
                    <span style={{ fontWeight: 600 }}>{formatCompactCurrency(seg.value)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="fin-chart-card" style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: 12 }}>Top Clients by AR Balance</div>
              {topClients.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {topClients.map((c, i) => {
                    const pct = totalArBalance > 0 ? (c.amount / totalArBalance) * 100 : 0;
                    return (
                      <div key={i}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 3 }}>
                          <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>{c.name}</span>
                          <span style={{ fontWeight: 600 }}>{formatCompactCurrency(c.amount)}</span>
                        </div>
                        <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: "var(--color-blue, #3b82f6)", borderRadius: 3 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>No outstanding balances</div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Status Filters */}
      <div className="fin-filters">
        <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500 }}>{t("status")}:</label>
        {statuses.map((s) => (
          <Link
            key={s.value}
            href={buildUrl(s.value, filterStart || undefined, filterEnd || undefined)}
            className={`ui-btn ui-btn-sm ${
              activeStatus === s.value || (!activeStatus && s.value === "active")
                ? "ui-btn-primary"
                : "ui-btn-outline"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Bulk Selection Action Bar */}
      {selectedIds.size > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 16px", marginBottom: 8,
          background: "rgba(59,130,246,0.08)",
          borderRadius: "var(--radius-md, 8px)",
          border: "1px solid var(--color-blue, #3b82f6)",
          fontSize: "0.85rem",
        }}>
          <CheckSquare size={16} style={{ color: "var(--color-blue)", flexShrink: 0 }} />
          <span style={{ fontWeight: 600, color: "var(--color-blue)" }}>
            {selectedIds.size} invoice{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <span style={{ color: "var(--muted)" }}>—</span>
          <span style={{ fontWeight: 600 }}>Total: {formatCurrency(selectedTotal)}</span>
          <div style={{ flex: 1 }} />
          <button
            className="ui-btn ui-btn-sm ui-btn-outline"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </button>
          <button
            className="ui-btn ui-btn-sm ui-btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={() => {
              setBulkReceiveDone(false);
              setBulkReceiveResults([]);
              setBulkReceiveData({
                payment_date: today,
                bank_account_id: bankAccounts.find((b) => b.is_default)?.id || bankAccounts[0]?.id || "",
                method: "check",
                reference_number: "",
                notes: "",
              });
              setShowBulkReceive(true);
            }}
          >
            <CreditCard size={14} />
            Receive Payment ({selectedIds.size})
          </button>
        </div>
      )}

      {/* Invoice Table */}
      {(invoices.length > 0 || (showGLSources && glSourceEntries.length > 0)) ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th style={{ width: 36, padding: "8px 4px 8px 16px" }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => {
                        if (allSelected || someSelected) {
                          setSelectedIds(new Set());
                        } else {
                          setSelectedIds(new Set(selectableInvoices.map((inv) => inv.id)));
                        }
                      }}
                      style={{ cursor: "pointer", accentColor: "var(--color-blue)" }}
                      title={allSelected ? "Deselect all" : "Select all outstanding invoices"}
                    />
                  </th>
                  <th>{t("invoiceNumber")}</th>
                  <th>{t("clientName")}</th>
                  <th>{t("project")}</th>
                  <th>{t("date")}</th>
                  <th>{t("dueDate")}</th>
                  <th style={{ textAlign: "right" }}>{t("amount")}</th>
                  <th style={{ textAlign: "right" }}>{t("balanceDue")}</th>
                  <th>{t("status")}</th>
                  <th>{t("jeColumnHeader")}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const isPastDue = inv.due_date < today && inv.status !== "paid" && inv.status !== "voided";
                  const isOverdue = isPastDue || inv.status === "overdue";

                  return (
                    <tr
                      key={inv.id}
                      className={isOverdue ? "invoice-row-overdue" : ""}
                      style={{
                        cursor: "pointer",
                        background: selectedIds.has(inv.id) ? "rgba(59,130,246,0.07)" : undefined,
                      }}
                      onClick={() => openDetail(inv)}
                    >
                      <td style={{ width: 36, padding: "8px 4px 8px 16px" }} onClick={(e) => e.stopPropagation()}>
                        {inv.balance_due > 0 && inv.status !== "paid" && inv.status !== "voided" && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(inv.id)}
                            onChange={() => {
                              setSelectedIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(inv.id)) next.delete(inv.id);
                                else next.add(inv.id);
                                return next;
                              });
                            }}
                            style={{ cursor: "pointer", accentColor: "var(--color-blue)" }}
                          />
                        )}
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--color-blue)" }}>
                        {inv.invoice_number}
                      </td>
                      <td>{inv.client_name ?? "--"}</td>
                      <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                        {inv.projects?.name ?? "--"}
                      </td>
                      <td>{formatDate(inv.invoice_date)}</td>
                      <td>
                        <span style={{
                          color: isPastDue ? "var(--color-red)" : "var(--text)",
                          fontWeight: isPastDue ? 600 : 400,
                        }}>
                          {formatDate(inv.due_date)}
                          {isPastDue && (
                            <AlertCircle size={12} style={{ marginLeft: "4px", verticalAlign: "middle" }} />
                          )}
                        </span>
                      </td>
                      <td className="amount-col">{formatCurrency(inv.total_amount)}</td>
                      <td className={`amount-col ${isOverdue ? "overdue" : ""}`}>
                        {formatCurrency(inv.balance_due)}
                      </td>
                      <td>
                        <span className={`inv-status inv-status-${inv.status}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td>
                        {linkedJEs[inv.id]?.length ? (
                          linkedJEs[inv.id].map((je) => (
                            <Link
                              key={je.id}
                              href={`/financial/general-ledger?entry=${je.entry_number}`}
                              className="je-link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {je.entry_number}
                            </Link>
                          ))
                        ) : inv.status !== "draft" && inv.status !== "voided" ? (
                          <span className="je-missing" title="No journal entry found">
                            <AlertCircle size={12} />
                          </span>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>--</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* GL-sourced AR rows — entries not backed by invoices */}
                {showGLSources && glSourceEntries.map((entry) => {
                  const net = entry.debit - entry.credit;
                  return (
                    <tr key={`gl-${entry.id}`} style={{ background: "rgba(59,130,246,0.04)", borderLeft: "3px solid var(--color-blue, #3b82f6)" }}>
                      <td style={{ width: 36, padding: "8px 4px 8px 16px" }} />
                      <td style={{ fontWeight: 600, color: "var(--color-blue)" }}>
                        <Link href={`/financial/general-ledger?entry=${entry.entry_number}`} className="je-link" onClick={(e) => e.stopPropagation()}>
                          {entry.entry_number}
                        </Link>
                      </td>
                      <td style={{ color: "var(--muted)", fontSize: "0.82rem", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.description || "Journal Entry"}
                      </td>
                      <td>
                        <span style={{ fontSize: "0.72rem", color: "var(--color-blue)", fontWeight: 600 }}>
                          GL Entry
                        </span>
                      </td>
                      <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{entry.entry_date.slice(0, 10)}</td>
                      <td style={{ color: "var(--muted)" }}>—</td>
                      <td className="amount-col">{formatCurrency(Math.abs(net))}</td>
                      <td className="amount-col" style={{ color: "var(--color-blue)" }}>{formatCurrency(net > 0 ? net : 0)}</td>
                      <td>
                        <span style={{ fontSize: "0.72rem", color: "var(--color-blue)", fontWeight: 600 }}>
                          posted
                        </span>
                      </td>
                      <td>
                        <Link href={`/financial/general-ledger?entry=${entry.entry_number}`} className="je-link" onClick={(e) => e.stopPropagation()}>
                          {entry.entry_number}
                        </Link>
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
            <div className="fin-empty-icon"><HandCoins size={48} /></div>
            <div className="fin-empty-title">{t("noInvoicesFound")}</div>
            <div className="fin-empty-desc">
              {activeStatus
                ? t("noArFilteredDesc")
                : t("noArEmptyDesc")}
            </div>
            <Link href="/financial/invoices/new?type=receivable" className="ui-btn ui-btn-primary ui-btn-md">
              <FileText size={16} />
              {t("createInvoice")}
            </Link>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="ticket-modal-overlay" onClick={closeDetail}>
          <div className="ticket-modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{isEditing ? t("editInvoice") : t("invoiceTitle", { number: selectedInvoice.invoice_number })}</h3>
              <button className="ticket-modal-close" onClick={closeDetail}>
                <X size={18} />
              </button>
            </div>

            {saveError && (
              <div style={{
                background: "var(--color-red-light)", color: "var(--color-red)",
                padding: "10px 16px", borderRadius: 8, fontSize: "0.85rem",
                fontWeight: 500, margin: "0 24px", border: "1px solid var(--color-red)",
              }}>
                {saveError}
              </div>
            )}

            <div className="ticket-detail-body">
              {/* Delete/Void Confirmation */}
              {showDeleteConfirm && (
                <div style={{
                  background: "var(--surface)", borderRadius: 8, padding: 16,
                  marginBottom: 16, border: "1px solid var(--color-red)",
                }}>
                  <p style={{ fontSize: "0.85rem", marginBottom: 12 }}>
                    {deleteMode === "hard"
                      ? t("hardDeleteInvoiceConfirm")
                      : t("voidInvoiceConfirmGeneric")}
                  </p>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button
                      className="ui-btn ui-btn-outline ui-btn-sm"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={saving}
                    >
                      {t("cancel")}
                    </button>
                    <button
                      className="ui-btn ui-btn-primary ui-btn-sm"
                      style={{ background: "var(--color-red)", borderColor: "var(--color-red)" }}
                      onClick={deleteMode === "hard" ? handleHardDelete : handleVoid}
                      disabled={saving}
                    >
                      {saving ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                      {saving ? (deleteMode === "hard" ? t("deleting") : t("voiding")) : (deleteMode === "hard" ? t("deletePermanently") : t("voidInvoice"))}
                    </button>
                  </div>
                </div>
              )}

              {!isEditing ? (
                <>
                  {/* Read-only view */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>{t("client")}</div>
                      <div style={{ fontWeight: 500 }}>{selectedInvoice.client_name || "--"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>{t("status")}</div>
                      <span className={`inv-status inv-status-${selectedInvoice.status}`}>
                        {selectedInvoice.status}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>{t("invoiceDate")}</div>
                      <div>{formatDate(selectedInvoice.invoice_date)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>{t("dueDate")}</div>
                      <div style={{
                        color: selectedInvoice.due_date < today && selectedInvoice.status !== "paid"
                          ? "var(--color-red)" : "var(--text)",
                        fontWeight: selectedInvoice.due_date < today && selectedInvoice.status !== "paid" ? 600 : 400,
                      }}>
                        {formatDate(selectedInvoice.due_date)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>{t("totalAmount")}</div>
                      <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>
                        {formatCurrency(selectedInvoice.total_amount)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>{t("balanceDue")}</div>
                      <div style={{
                        fontWeight: 600, fontSize: "1.1rem",
                        color: selectedInvoice.balance_due > 0 ? "var(--color-red)" : "var(--color-green)",
                      }}>
                        {formatCurrency(selectedInvoice.balance_due)}
                      </div>
                    </div>
                    {selectedInvoice.projects?.name && (
                      <div style={{ gridColumn: "span 2" }}>
                        <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>{t("project")}</div>
                        <div>{selectedInvoice.projects.name}</div>
                      </div>
                    )}
                    {selectedInvoice.notes && (
                      <div style={{ gridColumn: "span 2" }}>
                        <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>{t("notes")}</div>
                        <div style={{ fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>{selectedInvoice.notes}</div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    paddingTop: 16, borderTop: "1px solid var(--border)",
                  }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      {selectedInvoice.status !== "voided" && selectedInvoice.status !== "paid" && (
                        <button
                          className="ui-btn ui-btn-outline ui-btn-sm"
                          onClick={() => { setDeleteMode("void"); setShowDeleteConfirm(true); }}
                          style={{ color: "var(--color-red)", display: "inline-flex", alignItems: "center", gap: 4 }}
                        >
                          <Trash2 size={14} />
                          {t("void")}
                        </button>
                      )}
                      <button
                        className="ui-btn ui-btn-danger ui-btn-sm"
                        onClick={() => { setDeleteMode("hard"); setShowDeleteConfirm(true); }}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        <Trash2 size={14} />
                        {t("delete")}
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Link
                        href={`/financial/invoices/${selectedInvoice.id}`}
                        className="ui-btn ui-btn-outline ui-btn-sm"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        <ExternalLink size={14} />
                        {t("viewFullDetail")}
                      </Link>
                      {selectedInvoice.status !== "voided" && (
                        <button
                          className="ui-btn ui-btn-primary ui-btn-sm"
                          onClick={startEditing}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                        >
                          <Edit3 size={14} />
                          {t("edit")}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Edit view */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>{t("client")}</div>
                      <div style={{ fontWeight: 500 }}>{selectedInvoice.client_name || "--"}</div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>
                        {t("status")}
                      </label>
                      <select
                        className="fin-filter-select"
                        value={editData.status}
                        onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                      >
                        <option value="draft">{t("statusDraft")}</option>
                        <option value="pending">{t("statusPending")}</option>
                        <option value="approved">{t("statusApproved")}</option>
                        <option value="overdue">{t("statusOverdue")}</option>
                        <option value="paid">{t("statusPaid")}</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>{t("totalAmount")}</div>
                      <div style={{ fontWeight: 600 }}>{formatCurrency(selectedInvoice.total_amount)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>{t("balanceDue")}</div>
                      <div style={{ fontWeight: 600 }}>{formatCurrency(selectedInvoice.balance_due)}</div>
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={{ display: "block", fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>
                        {t("notes")}
                      </label>
                      <textarea
                        className="ui-input"
                        value={editData.notes}
                        onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                        rows={3}
                        style={{ resize: "vertical", minHeight: 60, width: "100%" }}
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                    <button
                      className="ui-btn ui-btn-outline ui-btn-sm"
                      onClick={() => setIsEditing(false)}
                      disabled={saving}
                    >
                      {t("cancel")}
                    </button>
                    <button
                      className="ui-btn ui-btn-primary ui-btn-sm"
                      onClick={handleSave}
                      disabled={saving}
                      style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      {saving ? <Loader2 size={14} className="spin" /> : null}
                      {saving ? t("saving") : t("saveChanges")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Receive Payment Modal */}
      {showBulkReceive && (
        <div className="ticket-modal-overlay" onClick={bulkReceiveDone ? () => setShowBulkReceive(false) : undefined}>
          <div
            className="ticket-modal"
            style={{ maxWidth: 560, maxHeight: "90vh", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ticket-modal-header">
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CreditCard size={18} />
                Receive Payment — {selectedList.length} Invoice{selectedList.length !== 1 ? "s" : ""}
              </h3>
              <button className="ticket-modal-close" onClick={() => setShowBulkReceive(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="ticket-detail-body" style={{ flex: 1, overflowY: "auto" }}>
              {!bulkReceiveDone ? (
                <>
                  {/* Selected invoices list */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, marginBottom: 8 }}>
                      Invoices to Collect
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflowY: "auto" }}>
                      {selectedList.map((inv) => (
                        <div key={inv.id} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "6px 10px", background: "var(--surface)", borderRadius: 6, fontSize: "0.82rem",
                        }}>
                          <div>
                            <span style={{ fontWeight: 600, color: "var(--color-blue)" }}>{inv.invoice_number}</span>
                            <span style={{ color: "var(--muted)", marginLeft: 8 }}>{inv.client_name || "--"}</span>
                          </div>
                          <span style={{ fontWeight: 600 }}>{formatCurrency(inv.balance_due)}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      padding: "8px 10px", marginTop: 4,
                      borderTop: "1px solid var(--border)", fontSize: "0.85rem", fontWeight: 700,
                    }}>
                      <span>Total to Receive</span>
                      <span style={{ color: "var(--color-green)" }}>{formatCurrency(selectedTotal)}</span>
                    </div>
                  </div>

                  {/* Payment fields */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={{ display: "block", fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, marginBottom: 4 }}>
                        Deposit To (Bank Account)
                      </label>
                      <select
                        className="fin-filter-select"
                        style={{ width: "100%" }}
                        value={bulkReceiveData.bank_account_id}
                        onChange={(e) => setBulkReceiveData((p) => ({ ...p, bank_account_id: e.target.value }))}
                      >
                        <option value="">— Use Default Bank —</option>
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}{b.bank_name ? ` — ${b.bank_name}` : ""}{b.account_number_last4 ? ` (...${b.account_number_last4})` : ""}{b.is_default ? " ★" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, marginBottom: 4 }}>
                        Payment Date
                      </label>
                      <input
                        type="date"
                        className="ui-input"
                        value={bulkReceiveData.payment_date}
                        onChange={(e) => setBulkReceiveData((p) => ({ ...p, payment_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, marginBottom: 4 }}>
                        Method
                      </label>
                      <select
                        className="fin-filter-select"
                        style={{ width: "100%" }}
                        value={bulkReceiveData.method}
                        onChange={(e) => setBulkReceiveData((p) => ({ ...p, method: e.target.value }))}
                      >
                        {["check", "ach", "wire", "credit_card", "cash"].map((m) => (
                          <option key={m} value={m}>
                            {{ check: "Check", ach: "ACH", wire: "Wire", credit_card: "Credit Card", cash: "Cash" }[m] || m}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, marginBottom: 4 }}>
                        Reference #
                      </label>
                      <input
                        type="text"
                        className="ui-input"
                        placeholder="Optional"
                        value={bulkReceiveData.reference_number}
                        onChange={(e) => setBulkReceiveData((p) => ({ ...p, reference_number: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, marginBottom: 4 }}>
                        Notes
                      </label>
                      <input
                        type="text"
                        className="ui-input"
                        placeholder="Optional"
                        value={bulkReceiveData.notes}
                        onChange={(e) => setBulkReceiveData((p) => ({ ...p, notes: e.target.value }))}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 12 }}>Payment Results</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {bulkReceiveResults.map((r, i) => (
                      <div key={i} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "8px 12px", borderRadius: 6, fontSize: "0.82rem",
                        background: r.success ? "rgba(34,197,94,0.08)" : "var(--color-red-light, #fef2f2)",
                        border: `1px solid ${r.success ? "var(--color-green, #22c55e)" : "var(--color-red, #ef4444)"}`,
                      }}>
                        <div>
                          <span style={{ fontWeight: 600 }}>{r.invoice_number}</span>
                          {r.error && <span style={{ color: "var(--color-red)", marginLeft: 8 }}>{r.error}</span>}
                        </div>
                        <span style={{ fontWeight: 600, color: r.success ? "var(--color-green)" : "var(--color-red)" }}>
                          {r.success ? `✓ ${formatCurrency(r.amount)} received` : "✗ Failed"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{
              display: "flex", justifyContent: "flex-end", gap: 8,
              padding: "12px 24px", borderTop: "1px solid var(--border)", flexShrink: 0,
            }}>
              {!bulkReceiveDone ? (
                <>
                  <button
                    className="ui-btn ui-btn-outline ui-btn-sm"
                    onClick={() => setShowBulkReceive(false)}
                    disabled={bulkReceiveProcessing}
                  >
                    Cancel
                  </button>
                  <button
                    className="ui-btn ui-btn-primary ui-btn-sm"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    onClick={handleBulkReceive}
                    disabled={bulkReceiveProcessing}
                  >
                    {bulkReceiveProcessing
                      ? <><Loader2 size={14} className="spin" /> Processing ({bulkReceiveResults.length}/{selectedList.length})…</>
                      : <><CheckCircle size={14} /> Record {selectedList.length} Payment{selectedList.length !== 1 ? "s" : ""}</>
                    }
                  </button>
                </>
              ) : (
                <button className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => setShowBulkReceive(false)}>
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>

      {showImport && (
        <ImportModal
          entityName={t("receivableInvoices")}
          columns={AR_IMPORT_COLUMNS}
          sampleData={AR_IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
