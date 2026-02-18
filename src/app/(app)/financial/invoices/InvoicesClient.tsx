"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  FileText,
  Plus,
  AlertCircle,
  X,
  Edit3,
  Trash2,
  Upload,
} from "lucide-react";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";
import { formatCurrency } from "@/lib/utils/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InvoiceRow {
  id: string;
  invoice_number: string;
  invoice_type: "payable" | "receivable";
  vendor_name: string | null;
  client_name: string | null;
  project_id: string | null;
  project_name: string | null;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  notes: string | null;
  created_at: string;
}

interface LinkedJE {
  id: string;
  entry_number: string;
}

interface InvoicesClientProps {
  invoices: InvoiceRow[];
  activeType: string | undefined;
  activeStatus: string | undefined;
  linkedJEs?: Record<string, LinkedJE[]>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildUrl(type?: string, status?: string): string {
  const p = new URLSearchParams();
  if (type) p.set("type", type);
  if (status && status !== "all") p.set("status", status);
  const qs = p.toString();
  return `/financial/invoices${qs ? `?${qs}` : ""}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InvoicesClient({
  invoices,
  activeType,
  activeStatus,
  linkedJEs = {},
}: InvoicesClientProps) {
  const router = useRouter();
  const t = useTranslations("financial");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";
  const now = new Date();

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString(dateLocale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const tabs = [
    { label: t("all"), value: undefined as string | undefined },
    { label: t("payableAp"), value: "payable" },
    { label: t("receivableAr"), value: "receivable" },
  ];

  const statuses = [
    { label: t("allStatuses"), value: "all" },
    { label: t("statusDraft"), value: "draft" },
    { label: t("statusPending"), value: "pending" },
    { label: t("statusApproved"), value: "approved" },
    { label: t("statusPaid"), value: "paid" },
    { label: t("statusOverdue"), value: "overdue" },
    { label: t("statusVoided"), value: "voided" },
  ];

  const IMPORT_COLUMNS: ImportColumn[] = [
    { key: "invoice_type", label: t("importTypeColumn"), required: false },
    { key: "amount", label: t("importAmountColumn"), required: true, type: "number" },
    { key: "tax_amount", label: t("importTaxColumn"), required: false, type: "number" },
    { key: "due_date", label: t("dueDate"), required: false, type: "date" },
    { key: "description", label: t("description"), required: false },
    { key: "status", label: t("status"), required: false },
    { key: "vendor_name", label: t("vendorName"), required: false },
    { key: "client_name", label: t("clientName"), required: false },
    { key: "project_name", label: t("projectName"), required: false },
  ];

  const IMPORT_SAMPLE: Record<string, string>[] = [
    { invoice_type: "receivable", amount: "75000", tax_amount: "0", due_date: "2026-02-28", description: "Progress payment - Phase 1", status: "draft" },
    { invoice_type: "payable", amount: "12500", tax_amount: "625", due_date: "2026-03-15", description: "Lumber delivery - PO #4521", status: "pending" },
    { invoice_type: "receivable", amount: "150000", tax_amount: "0", due_date: "2026-04-01", description: "Milestone 3 - Substantial completion", status: "draft" },
  ];

  // Detail / Edit / Delete modal state
  const [selectedInv, setSelectedInv] = useState<InvoiceRow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showImport, setShowImport] = useState(false);

  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "invoices", rows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("importFailed"));
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  function openDetail(inv: InvoiceRow) {
    setSelectedInv(inv);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
  }

  function closeDetail() {
    setSelectedInv(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setEditData({});
    setSaveError("");
  }

  function startEditing() {
    if (!selectedInv) return;
    setEditData({
      status: selectedInv.status,
      vendor_name: selectedInv.vendor_name || "",
      client_name: selectedInv.client_name || "",
      due_date: selectedInv.due_date ? selectedInv.due_date.split("T")[0] : "",
      notes: selectedInv.notes || "",
    });
    setIsEditing(true);
    setSaveError("");
  }

  async function handleSave() {
    if (!selectedInv) return;
    setSaving(true);
    setSaveError("");

    try {
      const payload: Record<string, unknown> = {};
      if (editData.status !== selectedInv.status) payload.status = editData.status;
      if (editData.vendor_name !== (selectedInv.vendor_name || ""))
        payload.vendor_name = editData.vendor_name || null;
      if (editData.client_name !== (selectedInv.client_name || ""))
        payload.client_name = editData.client_name || null;
      if (editData.due_date !== (selectedInv.due_date ? selectedInv.due_date.split("T")[0] : ""))
        payload.due_date = editData.due_date;
      if (editData.notes !== (selectedInv.notes || ""))
        payload.notes = editData.notes || null;

      if (Object.keys(payload).length === 0) {
        closeDetail();
        return;
      }

      const res = await fetch(`/api/financial/invoices/${selectedInv.id}`, {
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
      setSaveError(err instanceof Error ? err.message : t("failedToUpdateInvoice"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedInv) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(`/api/financial/invoices/${selectedInv.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToVoidInvoice"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("failedToVoidInvoice"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>{t("invoices")}</h2>
          <p className="fin-header-sub">
            {t("invoicesDesc")}
          </p>
        </div>
        <div className="fin-header-actions" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            {t("importCsv")}
          </button>
          <Link href="/financial/invoices/new" className="ui-btn ui-btn-primary ui-btn-md">
            <Plus size={16} />
            {t("newInvoice")}
          </Link>
        </div>
      </div>

      {/* Tab Filter */}
      <div className="fin-tab-bar">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={buildUrl(tab.value, activeStatus)}
            className={`fin-tab ${activeType === tab.value ? "active" : !activeType && !tab.value ? "active" : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Status Filter */}
      <div className="fin-filters">
        <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500 }}>
          {t("status")}:
        </label>
        {statuses.map((s) => (
          <Link
            key={s.value}
            href={buildUrl(activeType, s.value)}
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
                  <th>{t("type")}</th>
                  <th>{t("vendorClient")}</th>
                  <th>{t("project")}</th>
                  <th>{t("date")}</th>
                  <th>{t("dueDate")}</th>
                  <th style={{ textAlign: "right" }}>{t("amount")}</th>
                  <th style={{ textAlign: "right" }}>{t("balanceDue")}</th>
                  <th>{t("status")}</th>
                  <th>JE</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const dueDate = new Date(inv.due_date);
                  const isPastDue = dueDate < now && inv.status !== "paid" && inv.status !== "voided";
                  const isOverdue = isPastDue || inv.status === "overdue";
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
                      <td>
                        <span className={`inv-type inv-type-${inv.invoice_type}`}>
                          {inv.invoice_type === "payable" ? t("ap") : t("ar")}
                        </span>
                      </td>
                      <td>
                        {inv.invoice_type === "payable"
                          ? inv.vendor_name ?? "--"
                          : inv.client_name ?? "--"}
                      </td>
                      <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                        {inv.project_name ?? "--"}
                      </td>
                      <td>{formatDate(inv.invoice_date)}</td>
                      <td>
                        <span
                          style={{
                            color: isOverdue ? "var(--color-red)" : "var(--text)",
                            fontWeight: isOverdue ? 600 : 400,
                          }}
                        >
                          {formatDate(inv.due_date)}
                          {isOverdue && (
                            <AlertCircle
                              size={12}
                              style={{ marginLeft: "4px", verticalAlign: "middle" }}
                            />
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
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <FileText size={48} />
            </div>
            <div className="fin-empty-title">{t("noInvoicesFound")}</div>
            <div className="fin-empty-desc">
              {activeType || activeStatus
                ? t("noInvoicesFilteredDesc")
                : t("noInvoicesEmptyDesc")}
            </div>
            <Link href="/financial/invoices/new" className="ui-btn ui-btn-primary ui-btn-md">
              <Plus size={16} />
              {t("createInvoice")}
            </Link>
          </div>
        </div>
      )}

      {/* Detail / Edit / Delete Modal */}
      {showImport && (
        <ImportModal
          entityName={t("invoices")}
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}

      {selectedInv && (
        <div className="ticket-modal-overlay" onClick={closeDetail}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{isEditing ? t("editInvoice") : t("invoiceTitle", { number: selectedInv.invoice_number })}</h3>
              <button className="ticket-modal-close" onClick={closeDetail}>
                <X size={18} />
              </button>
            </div>

            {saveError && <div className="ticket-form-error">{saveError}</div>}

            {showDeleteConfirm && (
              <div className="ticket-delete-confirm">
                <p>
                  {t("voidInvoiceConfirm", { number: selectedInv.invoice_number })}
                </p>
                <div className="ticket-delete-actions">
                  <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={saving}>
                    {t("cancel")}
                  </button>
                  <button className="btn-danger" onClick={handleDelete} disabled={saving}>
                    {saving ? t("voiding") : t("voidInvoice")}
                  </button>
                </div>
              </div>
            )}

            <div style={{ pointerEvents: showDeleteConfirm ? "none" : "auto" }}>
              {!isEditing ? (
                /* Read-only detail */
                <div className="ticket-detail-body">
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">{t("invoiceNumber")}</span>
                    <span>{selectedInv.invoice_number}</span>
                  </div>
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">{t("type")}</span>
                    <span className={`inv-type inv-type-${selectedInv.invoice_type}`}>
                      {selectedInv.invoice_type === "payable" ? t("accountsPayable") : t("accountsReceivable")}
                    </span>
                  </div>
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">
                      {selectedInv.invoice_type === "payable" ? t("vendor") : t("client")}
                    </span>
                    <span>
                      {selectedInv.invoice_type === "payable"
                        ? selectedInv.vendor_name || "--"
                        : selectedInv.client_name || "--"}
                    </span>
                  </div>
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">{t("invoiceDate")}</span>
                    <span>{formatDate(selectedInv.invoice_date)}</span>
                  </div>
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">{t("dueDate")}</span>
                    <span>{formatDate(selectedInv.due_date)}</span>
                  </div>
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">{t("totalAmount")}</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(selectedInv.total_amount)}</span>
                  </div>
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">{t("amountPaid")}</span>
                    <span>{formatCurrency(selectedInv.amount_paid)}</span>
                  </div>
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">{t("balanceDue")}</span>
                    <span style={{ fontWeight: 600, color: selectedInv.balance_due > 0 ? "var(--color-red)" : "var(--color-green)" }}>
                      {formatCurrency(selectedInv.balance_due)}
                    </span>
                  </div>
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">{t("status")}</span>
                    <span className={`inv-status inv-status-${selectedInv.status}`}>
                      {selectedInv.status}
                    </span>
                  </div>
                  {selectedInv.notes && (
                    <div className="ticket-detail-row">
                      <span className="ticket-detail-label">{t("notes")}</span>
                      <span>{selectedInv.notes}</span>
                    </div>
                  )}

                  <div className="ticket-detail-actions">
                    <button className="btn-secondary" onClick={startEditing}>
                      <Edit3 size={14} /> {t("edit")}
                    </button>
                    <button className="btn-danger-outline" onClick={() => setShowDeleteConfirm(true)}>
                      <Trash2 size={14} /> {t("void")}
                    </button>
                  </div>
                </div>
              ) : (
                /* Edit form */
                <div className="ticket-form">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("status")}</label>
                    <select
                      className="ticket-form-select"
                      value={editData.status || ""}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    >
                      <option value="draft">{t("statusDraft")}</option>
                      <option value="pending">{t("statusPending")}</option>
                      <option value="approved">{t("statusApproved")}</option>
                      <option value="paid">{t("statusPaid")}</option>
                      <option value="overdue">{t("statusOverdue")}</option>
                      <option value="voided">{t("statusVoided")}</option>
                    </select>
                  </div>
                  <div className="ticket-form-row">
                    <div className="ticket-form-group">
                      <label className="ticket-form-label">{t("vendorName")}</label>
                      <input
                        type="text"
                        className="ticket-form-input"
                        value={editData.vendor_name || ""}
                        onChange={(e) => setEditData({ ...editData, vendor_name: e.target.value })}
                      />
                    </div>
                    <div className="ticket-form-group">
                      <label className="ticket-form-label">{t("clientName")}</label>
                      <input
                        type="text"
                        className="ticket-form-input"
                        value={editData.client_name || ""}
                        onChange={(e) => setEditData({ ...editData, client_name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("dueDate")}</label>
                    <input
                      type="date"
                      className="ticket-form-input"
                      value={editData.due_date || ""}
                      onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                    />
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("notes")}</label>
                    <textarea
                      className="ticket-form-textarea"
                      value={editData.notes || ""}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="ticket-form-actions">
                    <button className="btn-secondary" onClick={() => setIsEditing(false)}>
                      {t("cancel")}
                    </button>
                    <button className="btn-primary" onClick={handleSave} disabled={saving}>
                      {saving ? t("saving") : t("saveChanges")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
