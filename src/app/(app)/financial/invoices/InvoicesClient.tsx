"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "invoice_type", label: "Type (receivable/payable)", required: false },
  { key: "amount", label: "Amount ($)", required: true, type: "number" },
  { key: "tax_amount", label: "Tax ($)", required: false, type: "number" },
  { key: "due_date", label: "Due Date", required: false, type: "date" },
  { key: "description", label: "Description", required: false },
  { key: "status", label: "Status", required: false },
  { key: "vendor_name", label: "Vendor Name", required: false },
  { key: "client_name", label: "Client Name", required: false },
  { key: "project_name", label: "Project Name", required: false },
];

const IMPORT_SAMPLE: Record<string, string>[] = [
  { invoice_type: "receivable", amount: "75000", tax_amount: "0", due_date: "2026-02-28", description: "Progress payment - Phase 1", status: "draft" },
  { invoice_type: "payable", amount: "12500", tax_amount: "625", due_date: "2026-03-15", description: "Lumber delivery - PO #4521", status: "pending" },
  { invoice_type: "receivable", amount: "150000", tax_amount: "0", due_date: "2026-04-01", description: "Milestone 3 - Substantial completion", status: "draft" },
];

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

interface InvoicesClientProps {
  invoices: InvoiceRow[];
  activeType: string | undefined;
  activeStatus: string | undefined;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const tabs = [
  { label: "All", value: undefined as string | undefined },
  { label: "Payable (AP)", value: "payable" },
  { label: "Receivable (AR)", value: "receivable" },
];

const statuses = [
  { label: "All Statuses", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
  { label: "Voided", value: "voided" },
];

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
}: InvoicesClientProps) {
  const router = useRouter();
  const now = new Date();

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
    if (!res.ok) throw new Error(data.error || "Import failed");
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
        throw new Error(data.error || "Failed to update invoice");
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to update invoice");
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
        throw new Error(data.error || "Failed to void invoice");
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to void invoice");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Invoices</h2>
          <p className="fin-header-sub">
            Manage your accounts payable and receivable.
          </p>
        </div>
        <div className="fin-header-actions" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            Import CSV
          </button>
          <Link href="/financial/invoices/new" className="ui-btn ui-btn-primary ui-btn-md">
            <Plus size={16} />
            New Invoice
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
          Status:
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
                  <th>Invoice #</th>
                  <th>Type</th>
                  <th>Vendor / Client</th>
                  <th>Project</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th style={{ textAlign: "right" }}>Balance Due</th>
                  <th>Status</th>
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
                          {inv.invoice_type === "payable" ? "AP" : "AR"}
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
            <div className="fin-empty-title">No Invoices Found</div>
            <div className="fin-empty-desc">
              {activeType || activeStatus
                ? "No invoices match the current filters. Try adjusting your filters or create a new invoice."
                : "Get started by creating your first invoice to track payments and receivables."}
            </div>
            <Link href="/financial/invoices/new" className="ui-btn ui-btn-primary ui-btn-md">
              <Plus size={16} />
              Create Invoice
            </Link>
          </div>
        </div>
      )}

      {/* Detail / Edit / Delete Modal */}
      {showImport && (
        <ImportModal
          entityName="Invoices"
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
              <h3>{isEditing ? "Edit Invoice" : `Invoice ${selectedInv.invoice_number}`}</h3>
              <button className="ticket-modal-close" onClick={closeDetail}>
                <X size={18} />
              </button>
            </div>

            {saveError && <div className="ticket-form-error">{saveError}</div>}

            {showDeleteConfirm && (
              <div className="ticket-delete-confirm">
                <p>
                  Are you sure you want to void invoice{" "}
                  <strong>{selectedInv.invoice_number}</strong>? This action cannot be undone.
                </p>
                <div className="ticket-delete-actions">
                  <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={saving}>
                    Cancel
                  </button>
                  <button className="btn-danger" onClick={handleDelete} disabled={saving}>
                    {saving ? "Voiding..." : "Void Invoice"}
                  </button>
                </div>
              </div>
            )}

            <div style={{ pointerEvents: showDeleteConfirm ? "none" : "auto" }}>
              {!isEditing ? (
                /* Read-only detail */
                <div className="ticket-detail-body">
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">Invoice #</span>
                    <span>{selectedInv.invoice_number}</span>
                  </div>
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">Type</span>
                    <span className={`inv-type inv-type-${selectedInv.invoice_type}`}>
                      {selectedInv.invoice_type === "payable" ? "Accounts Payable" : "Accounts Receivable"}
                    </span>
                  </div>
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">
                      {selectedInv.invoice_type === "payable" ? "Vendor" : "Client"}
                    </span>
                    <span>
                      {selectedInv.invoice_type === "payable"
                        ? selectedInv.vendor_name || "--"
                        : selectedInv.client_name || "--"}
                    </span>
                  </div>
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">Invoice Date</span>
                    <span>{formatDate(selectedInv.invoice_date)}</span>
                  </div>
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">Due Date</span>
                    <span>{formatDate(selectedInv.due_date)}</span>
                  </div>
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">Total Amount</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(selectedInv.total_amount)}</span>
                  </div>
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">Amount Paid</span>
                    <span>{formatCurrency(selectedInv.amount_paid)}</span>
                  </div>
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">Balance Due</span>
                    <span style={{ fontWeight: 600, color: selectedInv.balance_due > 0 ? "var(--color-red)" : "var(--color-green)" }}>
                      {formatCurrency(selectedInv.balance_due)}
                    </span>
                  </div>
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">Status</span>
                    <span className={`inv-status inv-status-${selectedInv.status}`}>
                      {selectedInv.status}
                    </span>
                  </div>
                  {selectedInv.notes && (
                    <div className="ticket-detail-row">
                      <span className="ticket-detail-label">Notes</span>
                      <span>{selectedInv.notes}</span>
                    </div>
                  )}

                  <div className="ticket-detail-actions">
                    <button className="btn-secondary" onClick={startEditing}>
                      <Edit3 size={14} /> Edit
                    </button>
                    <button className="btn-danger-outline" onClick={() => setShowDeleteConfirm(true)}>
                      <Trash2 size={14} /> Void
                    </button>
                  </div>
                </div>
              ) : (
                /* Edit form */
                <div className="ticket-form">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Status</label>
                    <select
                      className="ticket-form-select"
                      value={editData.status || ""}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    >
                      <option value="draft">Draft</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="voided">Voided</option>
                    </select>
                  </div>
                  <div className="ticket-form-row">
                    <div className="ticket-form-group">
                      <label className="ticket-form-label">Vendor Name</label>
                      <input
                        type="text"
                        className="ticket-form-input"
                        value={editData.vendor_name || ""}
                        onChange={(e) => setEditData({ ...editData, vendor_name: e.target.value })}
                      />
                    </div>
                    <div className="ticket-form-group">
                      <label className="ticket-form-label">Client Name</label>
                      <input
                        type="text"
                        className="ticket-form-input"
                        value={editData.client_name || ""}
                        onChange={(e) => setEditData({ ...editData, client_name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Due Date</label>
                    <input
                      type="date"
                      className="ticket-form-input"
                      value={editData.due_date || ""}
                      onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                    />
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Notes</label>
                    <textarea
                      className="ticket-form-textarea"
                      value={editData.notes || ""}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="ticket-form-actions">
                    <button className="btn-secondary" onClick={() => setIsEditing(false)}>
                      Cancel
                    </button>
                    <button className="btn-primary" onClick={handleSave} disabled={saving}>
                      {saving ? "Saving..." : "Save Changes"}
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
