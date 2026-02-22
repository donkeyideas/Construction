"use client";

import { useState } from "react";
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
  CreditCard,
  Users,
} from "lucide-react";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils/format";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";
import type { APPaymentRow, VendorPaymentSummary } from "@/lib/queries/financial";

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
  payment_terms: string | null;
  projects: { name: string } | null;
}

interface LinkedJE {
  id: string;
  entry_number: string;
}

interface APClientProps {
  invoices: InvoiceRow[];
  totalApBalance: number;
  overdueAmount: number;
  pendingApprovalCount: number;
  paidThisMonth: number;
  activeStatus: string | undefined;
  activeTab: string;
  linkedJEs?: Record<string, LinkedJE[]>;
  initialStartDate?: string;
  initialEndDate?: string;
  paymentHistory: APPaymentRow[];
  vendorSummary: VendorPaymentSummary[];
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function buildUrl(status?: string, start?: string, end?: string, tab?: string): string {
  const p = new URLSearchParams();
  if (status && status !== "all") p.set("status", status);
  if (start) p.set("start", start);
  if (end) p.set("end", end);
  if (tab && tab !== "outstanding") p.set("tab", tab);
  const qs = p.toString();
  return `/financial/ap${qs ? `?${qs}` : ""}`;
}

function getAgingBucket(dueDate: string): { label: string; className: string; days: number } {
  const now = new Date();
  const due = new Date(dueDate);
  const days = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

  if (days <= 0) return { label: "Current", className: "aging-current", days: 0 };
  if (days <= 30) return { label: "1-30", className: "aging-30", days };
  if (days <= 60) return { label: "31-60", className: "aging-60", days };
  if (days <= 90) return { label: "61-90", className: "aging-90", days };
  return { label: "90+", className: "aging-90plus", days };
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

function getMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    check: "Check",
    ach: "ACH",
    wire: "Wire Transfer",
    credit_card: "Credit Card",
    cash: "Cash",
    bank_transfer: "Bank Transfer",
  };
  return labels[method] || method;
}

/* ==================================================================
   Component
   ================================================================== */

export default function APClient({
  invoices,
  totalApBalance,
  overdueAmount,
  pendingApprovalCount,
  paidThisMonth,
  activeStatus,
  activeTab,
  linkedJEs = {},
  initialStartDate,
  initialEndDate,
  paymentHistory,
  vendorSummary,
}: APClientProps) {
  const router = useRouter();
  const t = useTranslations("financial");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";
  const now = new Date();
  const [filterStart, setFilterStart] = useState(initialStartDate || "");
  const [filterEnd, setFilterEnd] = useState(initialEndDate || "");
  const [currentTab, setCurrentTab] = useState(activeTab);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(dateLocale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const statuses = [
    { label: t("statusActive"), value: "all" },
    { label: t("statusDraft"), value: "draft" },
    { label: t("statusPending"), value: "pending" },
    { label: "Submitted", value: "submitted" },
    { label: t("statusApproved"), value: "approved" },
    { label: t("statusOverdue"), value: "overdue" },
    { label: t("statusPaid"), value: "paid" },
  ];

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

  // Import modal state
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

  // Detail modal state
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [editData, setEditData] = useState({
    status: "",
    notes: "",
  });

  // Record payment modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [payInvoice, setPayInvoice] = useState<InvoiceRow | null>(null);
  const [payData, setPayData] = useState({
    amount: "",
    method: "check",
    reference_number: "",
    payment_date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");


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

  function openPayModal(inv: InvoiceRow) {
    setPayInvoice(inv);
    setPayData({
      amount: String(inv.balance_due),
      method: "check",
      reference_number: "",
      payment_date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setPayError("");
    setShowPayModal(true);
  }

  function closePayModal() {
    setShowPayModal(false);
    setPayInvoice(null);
    setPayError("");
  }

  async function handleRecordPayment() {
    if (!payInvoice) return;
    setPaying(true);
    setPayError("");

    try {
      const res = await fetch("/api/financial/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: payInvoice.id,
          payment_date: payData.payment_date,
          amount: parseFloat(payData.amount),
          method: payData.method,
          reference_number: payData.reference_number || undefined,
          notes: payData.notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record payment");
      }

      closePayModal();
      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setPaying(false);
    }
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

  async function handleDelete() {
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

  function switchTab(tab: string) {
    setCurrentTab(tab);
    router.push(buildUrl(activeStatus, filterStart || undefined, filterEnd || undefined, tab));
  }

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
          <Link href="/financial/invoices/new" className="ui-btn ui-btn-primary ui-btn-md">
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
          onClick={() => {
            router.push(buildUrl(activeStatus, filterStart || undefined, filterEnd || undefined, currentTab));
          }}
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
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon red"><FileWarning size={18} /></div>
          <span className="fin-kpi-label">{t("overdueAmount")}</span>
          <span className={`fin-kpi-value ${overdueAmount > 0 ? "negative" : ""}`}>
            {formatCompactCurrency(overdueAmount)}
          </span>
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

      {/* Tabs */}
      <div className="ap-tabs">
        <button
          className={`ap-tab ${currentTab === "outstanding" ? "active" : ""}`}
          onClick={() => switchTab("outstanding")}
        >
          {t("tabOutstanding")}
        </button>
        <button
          className={`ap-tab ${currentTab === "payments" ? "active" : ""}`}
          onClick={() => switchTab("payments")}
        >
          {t("tabPaymentHistory")}
        </button>
        <button
          className={`ap-tab ${currentTab === "vendors" ? "active" : ""}`}
          onClick={() => switchTab("vendors")}
        >
          {t("tabVendorSummary")}
        </button>
      </div>

      {/* ============ OUTSTANDING TAB ============ */}
      {currentTab === "outstanding" && (
        <>
          {/* Status Filters */}
          <div className="fin-filters">
            <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500 }}>{t("status")}:</label>
            {statuses.map((s) => (
              <Link
                key={s.value}
                href={buildUrl(s.value, filterStart || undefined, filterEnd || undefined, "outstanding")}
                className={`ui-btn ui-btn-sm ${
                  activeStatus === s.value || (!activeStatus && s.value === "all")
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
                      <th>{t("terms")}</th>
                      <th style={{ textAlign: "right" }}>{t("amount")}</th>
                      <th style={{ textAlign: "right" }}>{t("balanceDue")}</th>
                      <th>{t("aging")}</th>
                      <th>{t("status")}</th>
                      <th>JE</th>
                      <th>{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => {
                      const dueDate = new Date(inv.due_date);
                      const isPastDue = dueDate < now && inv.status !== "paid" && inv.status !== "voided";
                      const isOverdue = isPastDue || inv.status === "overdue";
                      const aging = inv.status !== "paid" && inv.status !== "voided" && inv.status !== "draft"
                        ? getAgingBucket(inv.due_date)
                        : null;

                      return (
                        <tr
                          key={inv.id}
                          className={isOverdue ? "invoice-row-overdue" : ""}
                          style={{ cursor: "pointer" }}
                          onClick={() => openDetail(inv)}
                        >
                          <td style={{ fontWeight: 600, color: "var(--color-blue)" }}>
                            {inv.invoice_number}
                          </td>
                          <td>{inv.vendor_name ?? "--"}</td>
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
                          <td style={{ fontSize: "0.8rem" }}>
                            {getTermsLabel(inv.payment_terms)}
                          </td>
                          <td className="amount-col">{formatCurrency(inv.total_amount)}</td>
                          <td className={`amount-col ${isOverdue ? "overdue" : ""}`}>
                            {formatCurrency(inv.balance_due)}
                          </td>
                          <td>
                            {aging ? (
                              <span className={`aging-badge ${aging.className}`}>
                                {aging.label}
                              </span>
                            ) : (
                              <span style={{ color: "var(--muted)" }}>--</span>
                            )}
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
                          <td onClick={(e) => e.stopPropagation()}>
                            {inv.status !== "paid" && inv.status !== "voided" && (
                              <button
                                className="ui-btn ui-btn-primary ui-btn-sm"
                                onClick={() => openPayModal(inv)}
                                style={{ fontSize: "0.75rem", padding: "4px 10px" }}
                              >
                                {t("pay")}
                              </button>
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
                <div className="fin-empty-icon"><Receipt size={48} /></div>
                <div className="fin-empty-title">{t("noInvoicesFound")}</div>
                <div className="fin-empty-desc">
                  {activeStatus
                    ? t("noApFilteredDesc")
                    : t("noApEmptyDesc")}
                </div>
                <Link href="/financial/invoices/new" className="ui-btn ui-btn-primary ui-btn-md">
                  <Receipt size={16} />
                  {t("createBill")}
                </Link>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============ PAYMENT HISTORY TAB ============ */}
      {currentTab === "payments" && (
        <>
          {paymentHistory.length > 0 ? (
            <div className="fin-chart-card" style={{ padding: 0 }}>
              <div style={{ overflowX: "auto" }}>
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>{t("date")}</th>
                      <th>{t("vendorName")}</th>
                      <th>{t("invoiceNumber")}</th>
                      <th style={{ textAlign: "right" }}>{t("amount")}</th>
                      <th>{t("method")}</th>
                      <th>{t("reference")}</th>
                      <th>{t("terms")}</th>
                      <th>JE</th>
                      <th>{t("bankAccount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((pmt) => (
                      <tr key={pmt.id}>
                        <td>{formatDate(pmt.payment_date)}</td>
                        <td style={{ fontWeight: 500 }}>{pmt.vendor_name}</td>
                        <td style={{ fontWeight: 600, color: "var(--color-blue)" }}>
                          {pmt.invoice_number}
                        </td>
                        <td className="amount-col" style={{ color: "var(--color-green)" }}>
                          {formatCurrency(pmt.amount)}
                        </td>
                        <td>{getMethodLabel(pmt.method)}</td>
                        <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                          {pmt.reference_number || "--"}
                        </td>
                        <td style={{ fontSize: "0.82rem" }}>
                          {getTermsLabel(pmt.payment_terms)}
                        </td>
                        <td>
                          {pmt.je_entry_number ? (
                            <Link
                              href={`/financial/general-ledger?entry=${pmt.je_entry_number}`}
                              className="je-link"
                            >
                              {pmt.je_entry_number}
                            </Link>
                          ) : (
                            <span style={{ color: "var(--muted)" }}>--</span>
                          )}
                        </td>
                        <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                          {pmt.bank_account_name || "--"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="fin-chart-card">
              <div className="fin-empty">
                <div className="fin-empty-icon"><CreditCard size={48} /></div>
                <div className="fin-empty-title">{t("noPaymentsFound")}</div>
                <div className="fin-empty-desc">{t("noPaymentsDesc")}</div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============ VENDOR SUMMARY TAB ============ */}
      {currentTab === "vendors" && (
        <>
          {vendorSummary.length > 0 ? (
            <div className="fin-chart-card" style={{ padding: 0 }}>
              <div style={{ overflowX: "auto" }}>
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>{t("vendorName")}</th>
                      <th style={{ textAlign: "right" }}>{t("totalOwed")}</th>
                      <th style={{ textAlign: "right" }}>{t("totalPaid")}</th>
                      <th style={{ textAlign: "center" }}>{t("invoices")}</th>
                      <th>{t("lastPayment")}</th>
                      <th style={{ textAlign: "center" }}>{t("avgDaysToPay")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorSummary.map((vs) => (
                      <tr key={vs.vendor_id}>
                        <td style={{ fontWeight: 600 }}>{vs.vendor_name}</td>
                        <td className="amount-col">
                          <span style={{ color: vs.total_owed > 0 ? "var(--color-red)" : "var(--text)" }}>
                            {formatCurrency(vs.total_owed)}
                          </span>
                        </td>
                        <td className="amount-col" style={{ color: "var(--color-green)" }}>
                          {formatCurrency(vs.total_paid)}
                        </td>
                        <td style={{ textAlign: "center" }}>{vs.invoice_count}</td>
                        <td>
                          {vs.last_payment_date
                            ? formatDate(vs.last_payment_date)
                            : <span style={{ color: "var(--muted)" }}>--</span>
                          }
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {vs.avg_days_to_pay !== null ? (
                            <span style={{
                              color: vs.avg_days_to_pay > 45 ? "var(--color-red)"
                                : vs.avg_days_to_pay > 30 ? "var(--color-amber, #d97706)"
                                : "var(--color-green)",
                              fontWeight: 600,
                            }}>
                              {vs.avg_days_to_pay}d
                            </span>
                          ) : (
                            <span style={{ color: "var(--muted)" }}>--</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="fin-chart-card">
              <div className="fin-empty">
                <div className="fin-empty-icon"><Users size={48} /></div>
                <div className="fin-empty-title">{t("noVendorData")}</div>
                <div className="fin-empty-desc">{t("noVendorDataDesc")}</div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="ticket-modal-overlay" onClick={closeDetail}>
          <div className="ticket-modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{isEditing ? t("editBill") : t("billTitle", { number: selectedInvoice.invoice_number })}</h3>
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
              {/* Delete Confirmation */}
              {showDeleteConfirm && (
                <div style={{
                  background: "var(--surface)", borderRadius: 8, padding: 16,
                  marginBottom: 16, border: "1px solid var(--color-red)",
                }}>
                  <p style={{ fontSize: "0.85rem", marginBottom: 12 }}>
                    {t("voidBillConfirm")}
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
                      onClick={handleDelete}
                      disabled={saving}
                    >
                      {saving ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                      {saving ? t("voiding") : t("voidBill")}
                    </button>
                  </div>
                </div>
              )}

              {!isEditing ? (
                <>
                  {/* Read-only view */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>{t("vendor")}</div>
                      <div style={{ fontWeight: 500 }}>{selectedInvoice.vendor_name || "--"}</div>
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
                        color: new Date(selectedInvoice.due_date) < now && selectedInvoice.status !== "paid"
                          ? "var(--color-red)" : "var(--text)",
                        fontWeight: new Date(selectedInvoice.due_date) < now && selectedInvoice.status !== "paid" ? 600 : 400,
                      }}>
                        {formatDate(selectedInvoice.due_date)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>{t("terms")}</div>
                      <div>{getTermsLabel(selectedInvoice.payment_terms)}</div>
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
                      <div>
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
                          onClick={() => setShowDeleteConfirm(true)}
                          style={{ color: "var(--color-red)", display: "inline-flex", alignItems: "center", gap: 4 }}
                        >
                          <Trash2 size={14} />
                          {t("void")}
                        </button>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {selectedInvoice.status !== "paid" && selectedInvoice.status !== "voided" && (
                        <>
                          <button
                            className="ui-btn ui-btn-outline ui-btn-sm"
                            onClick={() => { closeDetail(); openPayModal(selectedInvoice); }}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--color-green)" }}
                          >
                            <DollarSign size={14} />
                            {t("recordPayment")}
                          </button>
                        </>
                      )}
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
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>{t("vendor")}</div>
                      <div style={{ fontWeight: 500 }}>{selectedInvoice.vendor_name || "--"}</div>
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
                        <option value="submitted">Submitted</option>
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

      {/* Record Payment Modal */}
      {showPayModal && payInvoice && (
        <div className="ticket-modal-overlay" onClick={closePayModal}>
          <div className="ticket-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{t("recordPayment")} - {payInvoice.invoice_number}</h3>
              <button className="ticket-modal-close" onClick={closePayModal}>
                <X size={18} />
              </button>
            </div>

            {payError && (
              <div style={{
                background: "rgba(220, 38, 38, 0.08)", color: "var(--color-red)",
                padding: "10px 16px", borderRadius: 8, fontSize: "0.85rem",
                fontWeight: 500, margin: "0 24px 12px", border: "1px solid var(--color-red)",
              }}>
                {payError}
              </div>
            )}

            <div className="ticket-detail-body">
              <div style={{ marginBottom: 16, padding: "12px 16px", background: "var(--surface)", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{t("vendorName")}</span>
                  <span style={{ fontWeight: 500 }}>{payInvoice.vendor_name}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{t("balanceDue")}</span>
                  <span style={{ fontWeight: 700, color: "var(--color-red)" }}>{formatCurrency(payInvoice.balance_due)}</span>
                </div>
              </div>

              <div className="ap-pay-form">
                <div className="vendor-form-field">
                  <label>{t("paymentAmount")}</label>
                  <input
                    type="number"
                    className="ui-input"
                    step="0.01"
                    min="0.01"
                    max={payInvoice.balance_due}
                    value={payData.amount}
                    onChange={(e) => setPayData({ ...payData, amount: e.target.value })}
                  />
                </div>
                <div className="vendor-form-field">
                  <label>{t("paymentDate")}</label>
                  <input
                    type="date"
                    className="ui-input"
                    value={payData.payment_date}
                    onChange={(e) => setPayData({ ...payData, payment_date: e.target.value })}
                  />
                </div>
                <div className="vendor-form-field">
                  <label>{t("method")}</label>
                  <select
                    className="ui-input"
                    value={payData.method}
                    onChange={(e) => setPayData({ ...payData, method: e.target.value })}
                  >
                    <option value="check">Check</option>
                    <option value="ach">ACH</option>
                    <option value="wire">Wire Transfer</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
                <div className="vendor-form-field">
                  <label>{t("referenceNumber")}</label>
                  <input
                    type="text"
                    className="ui-input"
                    placeholder="Check #, ACH ref, etc."
                    value={payData.reference_number}
                    onChange={(e) => setPayData({ ...payData, reference_number: e.target.value })}
                  />
                </div>
                <div className="vendor-form-field full-width">
                  <label>{t("notes")}</label>
                  <textarea
                    className="ui-input"
                    rows={2}
                    value={payData.notes}
                    onChange={(e) => setPayData({ ...payData, notes: e.target.value })}
                    style={{ resize: "vertical", minHeight: 40, width: "100%" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 16, borderTop: "1px solid var(--border)", marginTop: 16 }}>
                <button
                  className="ui-btn ui-btn-outline ui-btn-sm"
                  onClick={closePayModal}
                  disabled={paying}
                >
                  {t("cancel")}
                </button>
                <button
                  className="ui-btn ui-btn-primary ui-btn-sm"
                  onClick={handleRecordPayment}
                  disabled={paying || !payData.amount || parseFloat(payData.amount) <= 0}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  {paying ? <Loader2 size={14} className="spin" /> : <DollarSign size={14} />}
                  {paying ? t("processing") : t("recordPayment")}
                </button>
              </div>
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
