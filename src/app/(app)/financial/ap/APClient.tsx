"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  Receipt,
  AlertCircle,
  DollarSign,
  Clock,
  CheckCircle,
  FileWarning,
  X,
  Edit3,
  Trash2,
  ExternalLink,
  Loader2,
  Upload,
  Plus,
  ChevronRight,
  BookOpen,
  CreditCard,
  Save,
  Ban,
} from "lucide-react";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils/format";
import ImportModal from "@/components/ImportModal";
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
  amount_paid: number;
  balance_due: number;
  status: string;
  notes: string | null;
  payment_terms: string | null;
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

interface TopVendor {
  name: string;
  amount: number;
}

interface APClientProps {
  invoices: InvoiceRow[];
  totalApBalance: number;
  overdueAmount: number;
  overdueCount: number;
  pendingApprovalCount: number;
  paidThisMonth: number;
  activeStatus: string | undefined;
  linkedJEs?: Record<string, LinkedJE[]>;
  initialStartDate?: string;
  initialEndDate?: string;
  glBalance?: number;
  agingBuckets: AgingBuckets;
  topVendors: TopVendor[];
  bankAccounts: BankAccount[];
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
  return `/financial/ap${qs ? `?${qs}` : ""}`;
}

function getTermsLabel(terms: string | null): string {
  if (!terms) return "--";
  const labels: Record<string, string> = {
    due_on_receipt: "Due on Receipt",
    net_10: "Net 10",
    net_15: "Net 15",
    net_30: "Net 30",
    net_45: "Net 45",
    net_60: "Net 60",
    net_90: "Net 90",
  };
  return labels[terms] || terms;
}

const PAYMENT_METHODS = ["check", "ach", "wire", "credit_card", "cash"];

function methodLabel(m: string): string {
  const map: Record<string, string> = {
    check: "Check", ach: "ACH", wire: "Wire",
    credit_card: "Credit Card", cash: "Cash",
  };
  return map[m] || m;
}

/* ==================================================================
   Component
   ================================================================== */

export default function APClient({
  invoices,
  totalApBalance,
  overdueAmount,
  overdueCount,
  pendingApprovalCount,
  paidThisMonth,
  activeStatus,
  linkedJEs = {},
  initialStartDate,
  initialEndDate,
  glBalance,
  agingBuckets,
  topVendors,
  bankAccounts,
}: APClientProps) {
  const router = useRouter();
  const t = useTranslations("financial");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const [filterStart, setFilterStart] = useState(initialStartDate || "");
  const [filterEnd, setFilterEnd] = useState(initialEndDate || "");

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(dateLocale, {
      month: "short", day: "numeric", year: "numeric",
    });
  }

  const statuses = [
    { label: "All", value: "all" },
    { label: t("statusActive"), value: "active" },
    { label: t("statusDraft"), value: "draft" },
    { label: t("statusPending"), value: "pending" },
    { label: "Submitted", value: "submitted" },
    { label: t("statusApproved"), value: "approved" },
    { label: t("statusOverdue"), value: "overdue" },
    { label: t("statusPaid"), value: "paid" },
    { label: t("statusVoided") || "Voided", value: "voided" },
  ];

  // Import config
  const AP_IMPORT_COLUMNS: ImportColumn[] = [
    { key: "amount", label: t("importAmountColumn"), required: true, type: "number" },
    { key: "tax_amount", label: t("importTaxColumn"), required: false, type: "number" },
    { key: "due_date", label: t("dueDate"), required: false, type: "date" },
    { key: "description", label: t("description"), required: false },
    { key: "status", label: t("status"), required: false },
    { key: "vendor_name", label: t("vendorName"), required: false },
    { key: "project_name", label: t("projectName"), required: false },
  ];

  const AP_IMPORT_SAMPLE: Record<string, string>[] = [
    { amount: "48500", tax_amount: "4122.50", due_date: "2026-01-30", description: "Hill Country Lumber - January delivery", status: "approved" },
    { amount: "32000", tax_amount: "2720", due_date: "2026-01-30", description: "Texas Ready Mix - 147 CY concrete", status: "paid" },
  ];

  const [showImport, setShowImport] = useState(false);

  async function handleImport(rows: Record<string, string>[]) {
    const apRows = rows.map((r) => ({ ...r, invoice_type: "payable" }));
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "invoices", rows: apRows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("importFailed"));
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  // ---------------------------------------------------------------
  // Detail panel state
  // ---------------------------------------------------------------
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"void" | "hard">("void");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [editData, setEditData] = useState({
    vendor_name: "",
    status: "",
    invoice_date: "",
    due_date: "",
    payment_terms: "",
    subtotal: "",
    tax_amount: "",
    notes: "",
  });

  // Payment form state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: "",
    payment_date: todayStr,
    bank_account_id: "",
    method: "check",
    reference_number: "",
    notes: "",
  });
  const [savingPayment, setSavingPayment] = useState(false);

  // Payment inline edit/delete state
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaymentData, setEditPaymentData] = useState({ method: "", bank_account_id: "", reference_number: "", notes: "" });
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [confirmDeletePaymentId, setConfirmDeletePaymentId] = useState<string | null>(null);

  // Invoice detail data (fetched when opening panel)
  const [detailPayments, setDetailPayments] = useState<Array<{
    id: string; payment_date: string; amount: number; method: string;
    reference_number: string | null; bank_account_id: string | null;
    bank_account_name: string | null; notes: string | null;
  }>>([]);
  const [detailJEs, setDetailJEs] = useState<Array<{
    id: string; entry_number: string; entry_date: string;
    description: string; status: string; total_debit: number;
  }>>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ---------------------------------------------------------------
  // Detail panel actions
  // ---------------------------------------------------------------

  const openDetail = useCallback(async (inv: InvoiceRow) => {
    setSelectedInvoice(inv);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setShowPaymentForm(false);
    setSaveError("");
    setConfirmDeletePaymentId(null);
    setEditingPaymentId(null);
    setLoadingDetail(true);

    try {
      // Fetch full invoice detail (payments + JEs)
      const res = await fetch(`/api/financial/invoices/${inv.id}`);
      if (res.ok) {
        const data = await res.json();
        const invoice = data.invoice;
        setDetailPayments(Array.isArray(invoice?.payments) ? invoice.payments : []);
      }
    } catch { /* ignore */ }

    // Use linked JEs from server props
    setDetailJEs([]);
    setLoadingDetail(false);
  }, []);

  function closeDetail() {
    setSelectedInvoice(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setShowPaymentForm(false);
    setSaveError("");
  }

  function startEditing() {
    if (!selectedInvoice) return;
    const sub = selectedInvoice.total_amount - 0; // approx subtotal
    setEditData({
      vendor_name: selectedInvoice.vendor_name || "",
      status: selectedInvoice.status,
      invoice_date: selectedInvoice.invoice_date?.split("T")[0] || "",
      due_date: selectedInvoice.due_date?.split("T")[0] || "",
      payment_terms: selectedInvoice.payment_terms || "",
      subtotal: String(selectedInvoice.total_amount || ""),
      tax_amount: "0",
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
      if (editData.vendor_name !== (selectedInvoice.vendor_name || "")) payload.vendor_name = editData.vendor_name || null;
      if (editData.status !== selectedInvoice.status) payload.status = editData.status;
      if (editData.invoice_date !== (selectedInvoice.invoice_date?.split("T")[0] || "")) payload.invoice_date = editData.invoice_date;
      if (editData.due_date !== (selectedInvoice.due_date?.split("T")[0] || "")) payload.due_date = editData.due_date;
      if (editData.payment_terms !== (selectedInvoice.payment_terms || "")) payload.payment_terms = editData.payment_terms || null;
      if (editData.notes !== (selectedInvoice.notes || "")) payload.notes = editData.notes || null;

      const newSubtotal = parseFloat(editData.subtotal);
      const newTax = parseFloat(editData.tax_amount) || 0;
      const newTotal = (isNaN(newSubtotal) ? selectedInvoice.total_amount : newSubtotal) + newTax;
      if (Math.abs(newTotal - selectedInvoice.total_amount) > 0.005) {
        payload.subtotal = isNaN(newSubtotal) ? selectedInvoice.total_amount : newSubtotal;
        payload.tax_amount = newTax;
        payload.total_amount = newTotal;
      }

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

  // ---------------------------------------------------------------
  // Payment actions
  // ---------------------------------------------------------------

  function openPaymentForm() {
    if (!selectedInvoice) return;
    const defaultBank = bankAccounts.find((b) => b.is_default);
    setPaymentData({
      amount: String(selectedInvoice.balance_due > 0 ? selectedInvoice.balance_due : ""),
      payment_date: todayStr,
      bank_account_id: defaultBank?.id || "",
      method: "check",
      reference_number: "",
      notes: "",
    });
    setShowPaymentForm(true);
    setSaveError("");
  }

  async function handleRecordPayment() {
    if (!selectedInvoice) return;
    setSavingPayment(true);
    setSaveError("");

    try {
      const amount = parseFloat(paymentData.amount);
      if (isNaN(amount) || amount <= 0) throw new Error("Enter a valid amount");
      if (amount > selectedInvoice.balance_due + 0.01) throw new Error(`Amount exceeds balance due (${formatCurrency(selectedInvoice.balance_due)})`);

      const res = await fetch("/api/financial/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: selectedInvoice.id,
          payment_date: paymentData.payment_date,
          amount,
          method: paymentData.method,
          bank_account_id: paymentData.bank_account_id || null,
          reference_number: paymentData.reference_number || null,
          notes: paymentData.notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record payment");
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleDeletePayment(paymentId: string) {
    setDeletingPaymentId(paymentId);
    setSaveError("");
    try {
      const res = await fetch(`/api/financial/payments/${paymentId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete payment");
      }
      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to delete payment");
    } finally {
      setDeletingPaymentId(null);
      setConfirmDeletePaymentId(null);
    }
  }

  function startEditPayment(p: typeof detailPayments[0]) {
    setEditingPaymentId(p.id);
    setEditPaymentData({
      method: p.method || "check",
      bank_account_id: p.bank_account_id || "",
      reference_number: p.reference_number || "",
      notes: p.notes || "",
    });
  }

  async function handleSavePaymentEdit(paymentId: string) {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/financial/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: editPaymentData.method,
          bank_account_id: editPaymentData.bank_account_id || null,
          reference_number: editPaymentData.reference_number || null,
          notes: editPaymentData.notes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update payment");
      }
      setEditingPaymentId(null);
      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to update payment");
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------
  // Void / Delete invoice
  // ---------------------------------------------------------------

  async function handleVoid() {
    if (!selectedInvoice) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/financial/invoices/${selectedInvoice.id}`, { method: "DELETE" });
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
      const res = await fetch(`/api/financial/invoices/${selectedInvoice.id}?hard=true`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToDeleteBill"));
      }
      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("failedToDelete"));
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------
  // Aging chart helpers
  // ---------------------------------------------------------------

  const agingTotal = agingBuckets.current + agingBuckets.days30 + agingBuckets.days60 + agingBuckets.days90 + agingBuckets.days90plus;
  const agingSegments = [
    { label: "Current", value: agingBuckets.current, color: "var(--color-green, #22c55e)" },
    { label: "1-30", value: agingBuckets.days30, color: "var(--color-blue, #3b82f6)" },
    { label: "31-60", value: agingBuckets.days60, color: "var(--color-amber, #f59e0b)" },
    { label: "61-90", value: agingBuckets.days90, color: "var(--color-orange, #f97316)" },
    { label: "90+", value: agingBuckets.days90plus, color: "var(--color-red, #ef4444)" },
  ];

  // Computed total for edit form
  const editTotal = (parseFloat(editData.subtotal) || 0) + (parseFloat(editData.tax_amount) || 0);

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>{t("accountsPayable")}</h2>
          <p className="fin-header-sub">{t("accountsPayableDesc")}</p>
        </div>
        <div className="fin-header-actions">
          <button className="ui-btn ui-btn-ghost ui-btn-md" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            {t("importCsv")}
          </button>
          <Link href="/financial/invoices/new?type=payable" className="ui-btn ui-btn-primary ui-btn-md">
            <Receipt size={16} />
            {t("newBill")}
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
          onClick={() => router.push(buildUrl(activeStatus, filterStart || undefined, filterEnd || undefined))}
        >
          {t("apply")}
        </button>
      </div>

      {/* KPI Row */}
      <div className="financial-kpi-row" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber"><DollarSign size={18} /></div>
          <span className="fin-kpi-label">{t("totalApBalance")}</span>
          <span className="fin-kpi-value">{formatCompactCurrency(totalApBalance)}</span>
          {glBalance != null && (
            <span className="fin-kpi-sub" style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
              GL: {formatCompactCurrency(glBalance)}
            </span>
          )}
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon red"><FileWarning size={18} /></div>
          <span className="fin-kpi-label">{t("overdueAmount")}</span>
          <span className={`fin-kpi-value ${overdueAmount > 0 ? "negative" : ""}`}>
            {formatCompactCurrency(overdueAmount)}
          </span>
          {overdueCount > 0 && (
            <span className="fin-kpi-sub" style={{ fontSize: "0.7rem", color: "var(--color-red)" }}>
              {overdueCount} invoice{overdueCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue"><Clock size={18} /></div>
          <span className="fin-kpi-label">{t("pendingApproval")}</span>
          <span className="fin-kpi-value">{pendingApprovalCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon green"><CheckCircle size={18} /></div>
          <span className="fin-kpi-label">{t("paidThisMonth")}</span>
          <span className="fin-kpi-value positive">{formatCompactCurrency(paidThisMonth)}</span>
        </div>
      </div>

      {/* GL Reconciliation Warning */}
      {glBalance != null && Math.abs(glBalance - totalApBalance) > 1 && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.75rem 1rem", borderRadius: "var(--radius-md, 8px)",
          background: "var(--warning-bg, #fff3cd)", border: "1px solid var(--warning-border, #ffc107)",
          color: "var(--warning-text, #856404)", fontSize: "0.82rem", marginBottom: "0.75rem",
        }}>
          <AlertCircle size={16} />
          <span>
            {t("glMismatchAp", { glBalance: formatCurrency(glBalance), subledgerBalance: formatCurrency(totalApBalance), difference: formatCurrency(Math.abs(glBalance - totalApBalance)) })}
            <a href="/financial/audit" style={{ marginLeft: "0.5rem", textDecoration: "underline" }}>{t("runAudit")}</a>
          </span>
        </div>
      )}

      {/* Aging Chart + Top Vendors Row */}
      {agingTotal > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          {/* Aging Bar Chart */}
          <div className="fin-chart-card" style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: 12 }}>AP Aging</div>
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

          {/* Top Vendors */}
          <div className="fin-chart-card" style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: 12 }}>Top Vendors by AP Balance</div>
            {topVendors.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {topVendors.map((v, i) => {
                  const pct = totalApBalance > 0 ? (v.amount / totalApBalance) * 100 : 0;
                  return (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 3 }}>
                        <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>{v.name}</span>
                        <span style={{ fontWeight: 600 }}>{formatCompactCurrency(v.amount)}</span>
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
      )}

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

      {/* Invoice Table */}
      {invoices.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>{t("invoiceNumber")}</th>
                  <th>{t("vendorName")}</th>
                  <th>{t("project")}</th>
                  <th>{t("date")}</th>
                  <th>{t("dueDate")}</th>
                  <th style={{ textAlign: "right" }}>{t("amount")}</th>
                  <th style={{ textAlign: "right" }}>Paid</th>
                  <th style={{ textAlign: "right" }}>{t("balanceDue")}</th>
                  <th>{t("status")}</th>
                  <th>{t("jeColumnHeader")}</th>
                  <th style={{ width: 32 }}></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const dueDate = new Date(inv.due_date);
                  const isPastDue = dueDate < now && inv.status !== "paid" && inv.status !== "voided";
                  const isOverdue = isPastDue || inv.status === "overdue";
                  const isSelected = selectedInvoice?.id === inv.id;

                  return (
                    <tr
                      key={inv.id}
                      className={isOverdue ? "invoice-row-overdue" : ""}
                      style={{
                        cursor: "pointer",
                        background: isSelected ? "var(--color-blue-light, rgba(59,130,246,0.08))" : undefined,
                      }}
                      onClick={() => openDetail(inv)}
                    >
                      <td style={{ fontWeight: 600, color: "var(--color-blue)" }}>
                        {inv.invoice_number}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{
                            width: 26, height: 26, borderRadius: "50%",
                            background: "var(--color-blue-light, rgba(59,130,246,0.12))",
                            color: "var(--color-blue)", display: "flex",
                            alignItems: "center", justifyContent: "center",
                            fontSize: "0.72rem", fontWeight: 700, flexShrink: 0,
                          }}>
                            {(inv.vendor_name || "?")[0].toUpperCase()}
                          </span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
                            {inv.vendor_name ?? "--"}
                          </span>
                        </div>
                      </td>
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
                          {isPastDue && <AlertCircle size={12} style={{ marginLeft: 4, verticalAlign: "middle" }} />}
                        </span>
                      </td>
                      <td className="amount-col">{formatCurrency(inv.total_amount)}</td>
                      <td className="amount-col" style={{ color: inv.amount_paid > 0 ? "var(--color-green)" : "var(--muted)" }}>
                        {inv.amount_paid > 0 ? formatCurrency(inv.amount_paid) : "--"}
                      </td>
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
                      <td>
                        <ChevronRight size={14} style={{ color: "var(--muted)" }} />
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
            <div className="fin-empty-icon"><Receipt size={48} /></div>
            <div className="fin-empty-title">{t("noInvoicesFound")}</div>
            <div className="fin-empty-desc">
              {activeStatus ? t("noApFilteredDesc") : t("noApEmptyDesc")}
            </div>
            <Link href="/financial/invoices/new?type=payable" className="ui-btn ui-btn-primary ui-btn-md">
              <Receipt size={16} />
              {t("createBill")}
            </Link>
          </div>
        </div>
      )}

      {/* ============================================================
          Slide-out Detail Panel
          ============================================================ */}
      {selectedInvoice && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
              zIndex: 998, transition: "opacity 0.2s",
            }}
            onClick={closeDetail}
          />
          {/* Panel */}
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0,
            width: "100%", maxWidth: 680, background: "var(--card-bg, #fff)",
            zIndex: 999, boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
            display: "flex", flexDirection: "column",
            animation: "slideInRight 0.25s ease-out",
          }}>
            {/* Panel Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 24px", borderBottom: "1px solid var(--border)",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                  {selectedInvoice.invoice_number}
                </h3>
                <span className={`inv-status inv-status-${selectedInvoice.status}`}>
                  {selectedInvoice.status}
                </span>
              </div>
              <button
                onClick={closeDetail}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: 6, borderRadius: 6, color: "var(--muted)",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Error Banner */}
            {saveError && (
              <div style={{
                background: "var(--color-red-light, #fef2f2)", color: "var(--color-red, #ef4444)",
                padding: "10px 24px", fontSize: "0.85rem", fontWeight: 500,
                borderBottom: "1px solid var(--color-red, #ef4444)",
              }}>
                {saveError}
              </div>
            )}

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

              {/* Delete/Void Confirmation */}
              {showDeleteConfirm && (
                <div style={{
                  background: "var(--color-red-light, #fef2f2)", borderRadius: 8, padding: 16,
                  marginBottom: 16, border: "1px solid var(--color-red, #ef4444)",
                }}>
                  <p style={{ fontSize: "0.85rem", marginBottom: 4, fontWeight: 600, color: "var(--color-red)" }}>
                    {deleteMode === "hard" ? "Permanently Delete Bill?" : "Void This Bill?"}
                  </p>
                  <p style={{ fontSize: "0.82rem", marginBottom: 12, color: "var(--text)" }}>
                    {deleteMode === "hard"
                      ? "This will permanently delete the invoice, all payments, and journal entries. This cannot be undone."
                      : detailPayments.length > 0
                        ? `This will void the invoice, reverse ${detailPayments.length} payment(s) totaling ${formatCurrency(detailPayments.reduce((s, p) => s + p.amount, 0))}, restore bank balances, and void all journal entries.`
                        : "This will void the invoice and mark all related journal entries as voided."}
                  </p>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button className="ui-btn ui-btn-outline ui-btn-sm" onClick={() => setShowDeleteConfirm(false)} disabled={saving}>
                      {t("cancel")}
                    </button>
                    <button
                      className="ui-btn ui-btn-sm"
                      style={{ background: "var(--color-red)", borderColor: "var(--color-red)", color: "#fff" }}
                      onClick={deleteMode === "hard" ? handleHardDelete : handleVoid}
                      disabled={saving}
                    >
                      {saving && <Loader2 size={14} className="spin" />}
                      {deleteMode === "hard" ? "Delete Permanently" : "Void Bill"}
                    </button>
                  </div>
                </div>
              )}

              {loadingDetail ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
                  <Loader2 size={24} className="spin" />
                </div>
              ) : (
                <>
                  {/* ── Section 1: Invoice Details ── */}
                  <div className="fin-chart-card" style={{ padding: "16px 20px", marginBottom: 16 }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      marginBottom: 12,
                    }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                        <Receipt size={14} />
                        Invoice Details
                      </div>
                      {!isEditing && selectedInvoice.status !== "voided" && (
                        <button className="ui-btn ui-btn-ghost ui-btn-sm" onClick={startEditing} style={{ gap: 4 }}>
                          <Edit3 size={13} />
                          Edit
                        </button>
                      )}
                    </div>

                    {!isEditing ? (
                      /* Read-only grid */
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}>
                        <div>
                          <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 2 }}>Vendor</div>
                          <div style={{ fontWeight: 500 }}>{selectedInvoice.vendor_name || "--"}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 2 }}>Project</div>
                          <div>{selectedInvoice.projects?.name || "--"}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 2 }}>Invoice Date</div>
                          <div>{formatDate(selectedInvoice.invoice_date)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 2 }}>Due Date</div>
                          <div style={{
                            color: new Date(selectedInvoice.due_date) < now && selectedInvoice.status !== "paid" && selectedInvoice.status !== "voided"
                              ? "var(--color-red)" : "var(--text)",
                            fontWeight: new Date(selectedInvoice.due_date) < now && selectedInvoice.status !== "paid" && selectedInvoice.status !== "voided" ? 600 : 400,
                          }}>
                            {formatDate(selectedInvoice.due_date)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 2 }}>Terms</div>
                          <div>{getTermsLabel(selectedInvoice.payment_terms)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 2 }}>Status</div>
                          <span className={`inv-status inv-status-${selectedInvoice.status}`}>{selectedInvoice.status}</span>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 2 }}>Total Amount</div>
                          <div style={{ fontWeight: 600, fontSize: "1.05rem" }}>{formatCurrency(selectedInvoice.total_amount)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 2 }}>Balance Due</div>
                          <div style={{
                            fontWeight: 600, fontSize: "1.05rem",
                            color: selectedInvoice.balance_due > 0 ? "var(--color-red)" : "var(--color-green)",
                          }}>
                            {formatCurrency(selectedInvoice.balance_due)}
                          </div>
                        </div>
                        {selectedInvoice.notes && (
                          <div style={{ gridColumn: "span 2" }}>
                            <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 2 }}>Notes</div>
                            <div style={{ fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>{selectedInvoice.notes}</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Edit form */
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
                        <div>
                          <label className="ap-field-label">Vendor Name</label>
                          <input className="ui-input" value={editData.vendor_name} onChange={(e) => setEditData({ ...editData, vendor_name: e.target.value })} style={{ width: "100%", height: 34, fontSize: "0.85rem" }} />
                        </div>
                        <div>
                          <label className="ap-field-label">Status</label>
                          <select className="fin-filter-select" value={editData.status} onChange={(e) => setEditData({ ...editData, status: e.target.value })} style={{ width: "100%", height: 34 }}>
                            <option value="draft">{t("statusDraft")}</option>
                            <option value="pending">{t("statusPending")}</option>
                            <option value="submitted">Submitted</option>
                            <option value="approved">{t("statusApproved")}</option>
                          </select>
                        </div>
                        <div>
                          <label className="ap-field-label">Invoice Date</label>
                          <input type="date" className="ui-input" value={editData.invoice_date} onChange={(e) => setEditData({ ...editData, invoice_date: e.target.value })} style={{ width: "100%", height: 34, fontSize: "0.85rem" }} />
                        </div>
                        <div>
                          <label className="ap-field-label">Due Date</label>
                          <input type="date" className="ui-input" value={editData.due_date} onChange={(e) => setEditData({ ...editData, due_date: e.target.value })} style={{ width: "100%", height: 34, fontSize: "0.85rem" }} />
                        </div>
                        <div>
                          <label className="ap-field-label">Payment Terms</label>
                          <select className="fin-filter-select" value={editData.payment_terms} onChange={(e) => setEditData({ ...editData, payment_terms: e.target.value })} style={{ width: "100%", height: 34 }}>
                            <option value="">--</option>
                            <option value="due_on_receipt">Due on Receipt</option>
                            <option value="net_10">Net 10</option>
                            <option value="net_15">Net 15</option>
                            <option value="net_30">Net 30</option>
                            <option value="net_45">Net 45</option>
                            <option value="net_60">Net 60</option>
                            <option value="net_90">Net 90</option>
                          </select>
                        </div>
                        <div>
                          <label className="ap-field-label">Subtotal</label>
                          <input type="number" className="ui-input" value={editData.subtotal} onChange={(e) => setEditData({ ...editData, subtotal: e.target.value })} step="0.01" min="0" style={{ width: "100%", height: 34, fontSize: "0.85rem" }} />
                        </div>
                        <div>
                          <label className="ap-field-label">Tax Amount</label>
                          <input type="number" className="ui-input" value={editData.tax_amount} onChange={(e) => setEditData({ ...editData, tax_amount: e.target.value })} step="0.01" min="0" style={{ width: "100%", height: 34, fontSize: "0.85rem" }} />
                        </div>
                        <div>
                          <label className="ap-field-label">Total</label>
                          <div style={{ fontWeight: 600, lineHeight: "34px", fontSize: "1rem" }}>{formatCurrency(editTotal)}</div>
                        </div>
                        <div style={{ gridColumn: "span 2" }}>
                          <label className="ap-field-label">Notes</label>
                          <textarea className="ui-input" value={editData.notes} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} rows={3} style={{ resize: "vertical", minHeight: 60, width: "100%" }} />
                        </div>
                        <div style={{ gridColumn: "span 2", display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 8 }}>
                          <button className="ui-btn ui-btn-outline ui-btn-sm" onClick={() => setIsEditing(false)} disabled={saving}>{t("cancel")}</button>
                          <button className="ui-btn ui-btn-primary ui-btn-sm" onClick={handleSave} disabled={saving} style={{ gap: 4 }}>
                            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                            {saving ? t("saving") : t("saveChanges")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Section 2: Payments ── */}
                  <div className="fin-chart-card" style={{ padding: 0, marginBottom: 16 }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "12px 20px", borderBottom: "1px solid var(--border)",
                    }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                        <CreditCard size={14} />
                        Payments
                        {detailPayments.length > 0 && (
                          <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 400 }}>
                            ({detailPayments.length})
                          </span>
                        )}
                      </div>
                      {selectedInvoice.status !== "voided" && selectedInvoice.status !== "paid" && selectedInvoice.balance_due > 0 && !showPaymentForm && (
                        <button className="ui-btn ui-btn-primary ui-btn-sm" onClick={openPaymentForm} style={{ gap: 4 }}>
                          <Plus size={13} />
                          Record Payment
                        </button>
                      )}
                    </div>

                    {/* Inline Payment Form */}
                    {showPaymentForm && (
                      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface, #f9fafb)" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
                          <div>
                            <label className="ap-field-label">Amount</label>
                            <input type="number" className="ui-input" value={paymentData.amount} onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })} step="0.01" min="0" style={{ width: "100%", height: 34, fontSize: "0.85rem" }} />
                          </div>
                          <div>
                            <label className="ap-field-label">Payment Date</label>
                            <input type="date" className="ui-input" value={paymentData.payment_date} onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })} style={{ width: "100%", height: 34, fontSize: "0.85rem" }} />
                          </div>
                          <div>
                            <label className="ap-field-label">Bank Account</label>
                            <select className="fin-filter-select" value={paymentData.bank_account_id} onChange={(e) => setPaymentData({ ...paymentData, bank_account_id: e.target.value })} style={{ width: "100%", height: 34 }}>
                              <option value="">Select bank account</option>
                              {bankAccounts.map((ba) => (
                                <option key={ba.id} value={ba.id}>
                                  {ba.name}{ba.bank_name ? ` (${ba.bank_name})` : ""}{ba.account_number_last4 ? ` •••${ba.account_number_last4}` : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="ap-field-label">Method</label>
                            <select className="fin-filter-select" value={paymentData.method} onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })} style={{ width: "100%", height: 34 }}>
                              {PAYMENT_METHODS.map((m) => (
                                <option key={m} value={m}>{methodLabel(m)}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="ap-field-label">Reference #</label>
                            <input className="ui-input" value={paymentData.reference_number} onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })} placeholder="Check #, ACH ref..." style={{ width: "100%", height: 34, fontSize: "0.85rem" }} />
                          </div>
                          <div>
                            <label className="ap-field-label">Notes</label>
                            <input className="ui-input" value={paymentData.notes} onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })} placeholder="Optional" style={{ width: "100%", height: 34, fontSize: "0.85rem" }} />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
                          <button className="ui-btn ui-btn-outline ui-btn-sm" onClick={() => setShowPaymentForm(false)} disabled={savingPayment}>{t("cancel")}</button>
                          <button className="ui-btn ui-btn-primary ui-btn-sm" onClick={handleRecordPayment} disabled={savingPayment} style={{ gap: 4 }}>
                            {savingPayment ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />}
                            {savingPayment ? "Saving..." : "Save Payment"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Payment List */}
                    {detailPayments.length > 0 ? (
                      <div>
                        {detailPayments.map((p) => (
                          <div key={p.id} style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
                            {editingPaymentId === p.id ? (
                              /* Inline edit */
                              <div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px", marginBottom: 10 }}>
                                  <div>
                                    <label className="ap-field-label">Method</label>
                                    <select className="fin-filter-select" value={editPaymentData.method} onChange={(e) => setEditPaymentData({ ...editPaymentData, method: e.target.value })} style={{ width: "100%", height: 32 }}>
                                      {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{methodLabel(m)}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="ap-field-label">Bank Account</label>
                                    <select className="fin-filter-select" value={editPaymentData.bank_account_id} onChange={(e) => setEditPaymentData({ ...editPaymentData, bank_account_id: e.target.value })} style={{ width: "100%", height: 32 }}>
                                      <option value="">--</option>
                                      {bankAccounts.map((ba) => <option key={ba.id} value={ba.id}>{ba.name}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="ap-field-label">Reference #</label>
                                    <input className="ui-input" value={editPaymentData.reference_number} onChange={(e) => setEditPaymentData({ ...editPaymentData, reference_number: e.target.value })} style={{ width: "100%", height: 32, fontSize: "0.82rem" }} />
                                  </div>
                                  <div>
                                    <label className="ap-field-label">Notes</label>
                                    <input className="ui-input" value={editPaymentData.notes} onChange={(e) => setEditPaymentData({ ...editPaymentData, notes: e.target.value })} style={{ width: "100%", height: 32, fontSize: "0.82rem" }} />
                                  </div>
                                </div>
                                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                  <button className="ui-btn ui-btn-outline ui-btn-sm" onClick={() => setEditingPaymentId(null)} style={{ fontSize: "0.78rem" }}>{t("cancel")}</button>
                                  <button className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => handleSavePaymentEdit(p.id)} disabled={saving} style={{ fontSize: "0.78rem", gap: 4 }}>
                                    {saving && <Loader2 size={12} className="spin" />}
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : confirmDeletePaymentId === p.id ? (
                              /* Delete confirmation */
                              <div style={{
                                background: "var(--color-red-light, #fef2f2)", borderRadius: 6, padding: 12,
                                border: "1px solid var(--color-red, #ef4444)",
                              }}>
                                <p style={{ fontSize: "0.82rem", marginBottom: 8 }}>
                                  Delete this {formatCurrency(p.amount)} payment? This will reverse the invoice balance and remove the payment journal entry.
                                </p>
                                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                  <button className="ui-btn ui-btn-outline ui-btn-sm" onClick={() => setConfirmDeletePaymentId(null)} style={{ fontSize: "0.78rem" }}>{t("cancel")}</button>
                                  <button
                                    className="ui-btn ui-btn-sm"
                                    style={{ background: "var(--color-red)", borderColor: "var(--color-red)", color: "#fff", fontSize: "0.78rem", gap: 4 }}
                                    onClick={() => handleDeletePayment(p.id)}
                                    disabled={deletingPaymentId === p.id}
                                  >
                                    {deletingPaymentId === p.id && <Loader2 size={12} className="spin" />}
                                    Delete Payment
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Payment row */
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", gap: 16, alignItems: "center", flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: "0.82rem" }}>
                                    {new Date(p.payment_date).toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" })}
                                  </div>
                                  <div style={{ fontSize: "0.82rem", textTransform: "capitalize", color: "var(--muted)" }}>
                                    {methodLabel(p.method)}
                                  </div>
                                  {p.bank_account_name && (
                                    <div style={{ fontSize: "0.78rem", color: "var(--color-blue)" }}>
                                      {p.bank_account_name}
                                    </div>
                                  )}
                                  {p.reference_number && (
                                    <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                                      Ref: {p.reference_number}
                                    </div>
                                  )}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontWeight: 600, color: "var(--color-green)", fontSize: "0.9rem" }}>
                                    {formatCurrency(p.amount)}
                                  </span>
                                  <button
                                    onClick={() => startEditPayment(p)}
                                    style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--muted)", borderRadius: 4 }}
                                    title="Edit payment"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeletePaymentId(p.id)}
                                    style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--muted)", borderRadius: 4 }}
                                    title="Delete payment"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)", fontSize: "0.82rem" }}>
                        No payments recorded
                      </div>
                    )}
                  </div>

                  {/* ── Section 3: Journal Entries ── */}
                  <div className="fin-chart-card" style={{ padding: 0, marginBottom: 16 }}>
                    <div style={{
                      padding: "12px 20px", borderBottom: "1px solid var(--border)",
                      fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <BookOpen size={14} />
                      Journal Entries
                    </div>
                    {linkedJEs[selectedInvoice.id]?.length ? (
                      <div style={{ padding: "8px 20px" }}>
                        {linkedJEs[selectedInvoice.id].map((je) => (
                          <div key={je.id} style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "6px 0", borderBottom: "1px solid var(--border)",
                          }}>
                            <Link
                              href={`/financial/general-ledger?entry=${je.entry_number}`}
                              className="je-link"
                              style={{ fontWeight: 500 }}
                            >
                              {je.entry_number}
                            </Link>
                            <ExternalLink size={12} style={{ color: "var(--muted)" }} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: "16px 20px", textAlign: "center", color: "var(--muted)", fontSize: "0.82rem" }}>
                        {selectedInvoice.status === "draft" || selectedInvoice.status === "voided"
                          ? "Journal entries are created when an invoice is posted."
                          : "No journal entries found. This may indicate a posting issue."}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Panel Footer */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 24px", borderTop: "1px solid var(--border)",
              flexShrink: 0, background: "var(--surface, #f9fafb)",
            }}>
              <div style={{ display: "flex", gap: 8 }}>
                {selectedInvoice.status !== "voided" && (
                  <button
                    className="ui-btn ui-btn-outline ui-btn-sm"
                    onClick={() => { setDeleteMode("void"); setShowDeleteConfirm(true); }}
                    style={{ color: "var(--color-red)", borderColor: "var(--color-red)", gap: 4 }}
                  >
                    <Ban size={13} />
                    Void
                  </button>
                )}
                {(selectedInvoice.status === "draft" || selectedInvoice.status === "voided") && (
                  <button
                    className="ui-btn ui-btn-outline ui-btn-sm"
                    onClick={() => { setDeleteMode("hard"); setShowDeleteConfirm(true); }}
                    style={{ color: "var(--color-red)", borderColor: "var(--color-red)", gap: 4 }}
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                )}
              </div>
              <Link
                href={`/financial/invoices/${selectedInvoice.id}`}
                className="ui-btn ui-btn-outline ui-btn-sm"
                style={{ gap: 4 }}
              >
                <ExternalLink size={13} />
                View Full Detail
              </Link>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .ap-field-label {
          display: block;
          font-size: 0.72rem;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
          margin-bottom: 3px;
          font-weight: 500;
        }
      `}</style>

      {showImport && (
        <ImportModal
          entityName={t("payableInvoices")}
          columns={AP_IMPORT_COLUMNS}
          sampleData={AP_IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
