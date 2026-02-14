"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
} from "lucide-react";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils/format";
import ImportModal from "@/components/ImportModal";
import { Upload } from "lucide-react";
import type { ImportColumn } from "@/lib/utils/csv-parser";

const AP_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "amount", label: "Amount ($)", required: true, type: "number" },
  { key: "tax_amount", label: "Tax ($)", required: false, type: "number" },
  { key: "due_date", label: "Due Date", required: false, type: "date" },
  { key: "description", label: "Description", required: false },
  { key: "status", label: "Status", required: false },
];

const AP_IMPORT_SAMPLE: Record<string, string>[] = [
  { amount: "48500", tax_amount: "4122.50", due_date: "2026-01-30", description: "Hill Country Lumber - January delivery", status: "approved" },
  { amount: "32000", tax_amount: "2720", due_date: "2026-01-30", description: "Texas Ready Mix - 147 CY concrete", status: "paid" },
];

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

interface APClientProps {
  invoices: InvoiceRow[];
  totalApBalance: number;
  overdueAmount: number;
  pendingApprovalCount: number;
  paidThisMonth: number;
  activeStatus: string | undefined;
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const statuses = [
  { label: "Active", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Overdue", value: "overdue" },
  { label: "Paid", value: "paid" },
];

function buildUrl(status?: string): string {
  const p = new URLSearchParams();
  if (status && status !== "all") p.set("status", status);
  const qs = p.toString();
  return `/financial/ap${qs ? `?${qs}` : ""}`;
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
}: APClientProps) {
  const router = useRouter();
  const now = new Date();

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
    if (!res.ok) throw new Error(data.error || "Import failed");
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
        throw new Error(data.error || "Failed to update invoice");
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to update");
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
        throw new Error(data.error || "Failed to void invoice");
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to void");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Accounts Payable</h2>
          <p className="fin-header-sub">Manage vendor bills, subcontractor payments, and retainage</p>
        </div>
        <div className="fin-header-actions">
          <button className="ui-btn ui-btn-ghost ui-btn-md" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            Import CSV
          </button>
          <Link href="/financial/invoices/new" className="ui-btn ui-btn-primary ui-btn-md">
            <Receipt size={16} />
            New Bill
          </Link>
        </div>
      </div>

      {/* KPI Row */}
      <div className="financial-kpi-row" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber"><DollarSign size={18} /></div>
          <span className="fin-kpi-label">Total AP Balance</span>
          <span className="fin-kpi-value">{formatCompactCurrency(totalApBalance)}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon red"><FileWarning size={18} /></div>
          <span className="fin-kpi-label">Overdue Amount</span>
          <span className={`fin-kpi-value ${overdueAmount > 0 ? "negative" : ""}`}>
            {formatCompactCurrency(overdueAmount)}
          </span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue"><Clock size={18} /></div>
          <span className="fin-kpi-label">Pending Approval</span>
          <span className="fin-kpi-value">{pendingApprovalCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon green"><CheckCircle size={18} /></div>
          <span className="fin-kpi-label">Paid This Month</span>
          <span className="fin-kpi-value positive">{formatCompactCurrency(paidThisMonth)}</span>
        </div>
      </div>

      {/* Status Filters */}
      <div className="fin-filters">
        <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500 }}>Status:</label>
        {statuses.map((s) => (
          <Link
            key={s.value}
            href={buildUrl(s.value)}
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
                  <th>Vendor Name</th>
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
                  const isOverdue = inv.status === "overdue";
                  const dueDate = new Date(inv.due_date);
                  const isPastDue = dueDate < now && inv.status !== "paid" && inv.status !== "voided";

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
            <div className="fin-empty-icon"><Receipt size={48} /></div>
            <div className="fin-empty-title">No Invoices Found</div>
            <div className="fin-empty-desc">
              {activeStatus
                ? "No payable invoices match the current filter. Try adjusting your filter or create a new bill."
                : "No outstanding payable invoices. Create a new bill to start tracking vendor payments."}
            </div>
            <Link href="/financial/invoices/new" className="ui-btn ui-btn-primary ui-btn-md">
              <Receipt size={16} />
              Create Bill
            </Link>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="ticket-modal-overlay" onClick={closeDetail}>
          <div className="ticket-modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{isEditing ? "Edit Bill" : `Bill ${selectedInvoice.invoice_number}`}</h3>
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
                    Are you sure you want to void this bill? This action cannot be undone.
                  </p>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button
                      className="ui-btn ui-btn-outline ui-btn-sm"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      className="ui-btn ui-btn-primary ui-btn-sm"
                      style={{ background: "var(--color-red)", borderColor: "var(--color-red)" }}
                      onClick={handleDelete}
                      disabled={saving}
                    >
                      {saving ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                      {saving ? "Voiding..." : "Void Bill"}
                    </button>
                  </div>
                </div>
              )}

              {!isEditing ? (
                <>
                  {/* Read-only view */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>Vendor</div>
                      <div style={{ fontWeight: 500 }}>{selectedInvoice.vendor_name || "--"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>Status</div>
                      <span className={`inv-status inv-status-${selectedInvoice.status}`}>
                        {selectedInvoice.status}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>Invoice Date</div>
                      <div>{formatDate(selectedInvoice.invoice_date)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>Due Date</div>
                      <div style={{
                        color: new Date(selectedInvoice.due_date) < now && selectedInvoice.status !== "paid"
                          ? "var(--color-red)" : "var(--text)",
                        fontWeight: new Date(selectedInvoice.due_date) < now && selectedInvoice.status !== "paid" ? 600 : 400,
                      }}>
                        {formatDate(selectedInvoice.due_date)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>Total Amount</div>
                      <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>
                        {formatCurrency(selectedInvoice.total_amount)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>Balance Due</div>
                      <div style={{
                        fontWeight: 600, fontSize: "1.1rem",
                        color: selectedInvoice.balance_due > 0 ? "var(--color-red)" : "var(--color-green)",
                      }}>
                        {formatCurrency(selectedInvoice.balance_due)}
                      </div>
                    </div>
                    {selectedInvoice.projects?.name && (
                      <div style={{ gridColumn: "span 2" }}>
                        <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>Project</div>
                        <div>{selectedInvoice.projects.name}</div>
                      </div>
                    )}
                    {selectedInvoice.notes && (
                      <div style={{ gridColumn: "span 2" }}>
                        <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>Notes</div>
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
                          Void
                        </button>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Link
                        href={`/financial/invoices/${selectedInvoice.id}`}
                        className="ui-btn ui-btn-outline ui-btn-sm"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        <ExternalLink size={14} />
                        View Full Detail
                      </Link>
                      {selectedInvoice.status !== "voided" && (
                        <button
                          className="ui-btn ui-btn-primary ui-btn-sm"
                          onClick={startEditing}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                        >
                          <Edit3 size={14} />
                          Edit
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
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>Vendor</div>
                      <div style={{ fontWeight: 500 }}>{selectedInvoice.vendor_name || "--"}</div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>
                        Status
                      </label>
                      <select
                        className="fin-filter-select"
                        value={editData.status}
                        onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                      >
                        <option value="draft">Draft</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="overdue">Overdue</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>Total Amount</div>
                      <div style={{ fontWeight: 600 }}>{formatCurrency(selectedInvoice.total_amount)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>Balance Due</div>
                      <div style={{ fontWeight: 600 }}>{formatCurrency(selectedInvoice.balance_due)}</div>
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={{ display: "block", fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>
                        Notes
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
                      Cancel
                    </button>
                    <button
                      className="ui-btn ui-btn-primary ui-btn-sm"
                      onClick={handleSave}
                      disabled={saving}
                      style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      {saving ? <Loader2 size={14} className="spin" /> : null}
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </>
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
          entityName="Payable Invoices"
          columns={AP_IMPORT_COLUMNS}
          sampleData={AP_IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
