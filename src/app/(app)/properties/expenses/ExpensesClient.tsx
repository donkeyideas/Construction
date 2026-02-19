"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  DollarSign,
  Building2,
  TrendingUp,
  Receipt,
  Plus,
  X,
  Pencil,
  Trash2,
  Upload,
  Filter,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PropertyExpense {
  id: string;
  property_id: string;
  expense_type: string;
  description: string | null;
  amount: number;
  frequency: string;
  effective_date: string | null;
  end_date: string | null;
  vendor_name: string | null;
  notes: string | null;
  properties: { name: string } | null;
  created_at: string;
}

interface PropertyOption {
  id: string;
  name: string;
}

interface ExpensesClientProps {
  expenses: PropertyExpense[];
  properties: PropertyOption[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXPENSE_TYPE_OPTIONS = [
  { value: "cam", label: "Common Area Maintenance" },
  { value: "property_tax", label: "Property Taxes" },
  { value: "insurance", label: "Insurance" },
  { value: "utilities", label: "Utilities" },
  { value: "management_fee", label: "Management Fees" },
  { value: "capital_expense", label: "Capital Expenditures" },
  { value: "hoa_fee", label: "HOA / Association Fees" },
  { value: "marketing", label: "Leasing & Marketing" },
  { value: "legal", label: "Legal & Professional" },
  { value: "other", label: "Other" },
];

const FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi_annual", label: "Semi-Annual" },
  { value: "annual", label: "Annual" },
  { value: "one_time", label: "One-Time" },
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  EXPENSE_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

const FREQ_LABELS: Record<string, string> = Object.fromEntries(
  FREQUENCY_OPTIONS.map((o) => [o.value, o.label])
);

function getTypeBadge(t: string): string {
  switch (t) {
    case "cam": return "badge badge-blue";
    case "property_tax": return "badge badge-red";
    case "insurance": return "badge badge-amber";
    case "utilities": return "badge badge-green";
    case "management_fee": return "badge badge-blue";
    case "capital_expense": return "badge badge-red";
    case "hoa_fee": return "badge badge-amber";
    case "marketing": return "badge badge-green";
    case "legal": return "badge badge-blue";
    default: return "badge badge-amber";
  }
}

function toMonthly(amount: number, frequency: string): number {
  switch (frequency) {
    case "monthly": return amount;
    case "quarterly": return amount / 3;
    case "semi_annual": return amount / 6;
    case "annual": return amount / 12;
    default: return 0;
  }
}

// ---------------------------------------------------------------------------
// Import columns
// ---------------------------------------------------------------------------

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "property_name", label: "Property Name", required: true },
  { key: "expense_type", label: "Expense Type", required: true },
  { key: "description", label: "Description", required: false },
  { key: "amount", label: "Amount", required: true },
  { key: "frequency", label: "Frequency", required: false },
  { key: "effective_date", label: "Effective Date", required: false },
  { key: "end_date", label: "End Date", required: false },
  { key: "vendor_name", label: "Vendor Name", required: false },
  { key: "notes", label: "Notes", required: false },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExpensesClient({
  expenses,
  properties,
}: ExpensesClientProps) {
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";
  const router = useRouter();

  // Filters
  const [activeType, setActiveType] = useState<string>("all");
  const [activeProperty, setActiveProperty] = useState<string>("all");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createForm, setCreateForm] = useState({
    property_id: "",
    expense_type: "cam",
    description: "",
    amount: "",
    frequency: "monthly",
    effective_date: "",
    end_date: "",
    vendor_name: "",
    notes: "",
  });

  // Detail/Edit modal
  const [selected, setSelected] = useState<PropertyExpense | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<PropertyExpense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Import
  const [showImport, setShowImport] = useState(false);

  // Filtering
  const filtered = expenses.filter((e) => {
    if (activeType !== "all" && e.expense_type !== activeType) return false;
    if (activeProperty !== "all" && e.property_id !== activeProperty) return false;
    return true;
  });

  // KPI calculations
  const totalMonthly = expenses.reduce(
    (sum, e) => sum + toMonthly(e.amount, e.frequency), 0
  );
  const totalAnnual = totalMonthly * 12;
  const uniqueProperties = new Set(expenses.map((e) => e.property_id)).size;
  const uniqueTypes = new Set(expenses.map((e) => e.expense_type)).size;

  // Handlers
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/properties/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) {
        const data = await res.json();
        setCreateError(data.error || "Failed to create expense.");
        return;
      }
      setShowCreate(false);
      setCreateForm({
        property_id: "",
        expense_type: "cam",
        description: "",
        amount: "",
        frequency: "monthly",
        effective_date: "",
        end_date: "",
        vendor_name: "",
        notes: "",
      });
      router.refresh();
    } catch {
      setCreateError("Network error.");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(exp: PropertyExpense) {
    setSelected(exp);
    setEditing(true);
    setEditForm({
      property_id: exp.property_id,
      expense_type: exp.expense_type,
      description: exp.description || "",
      amount: String(exp.amount),
      frequency: exp.frequency,
      effective_date: exp.effective_date?.slice(0, 10) || "",
      end_date: exp.end_date?.slice(0, 10) || "",
      vendor_name: exp.vendor_name || "",
      notes: exp.notes || "",
    });
    setEditError("");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setEditError("");
    try {
      const res = await fetch("/api/properties/expenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, ...editForm }),
      });
      if (!res.ok) {
        const data = await res.json();
        setEditError(data.error || "Failed to update.");
        return;
      }
      setSelected(null);
      setEditing(false);
      router.refresh();
    } catch {
      setEditError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/properties/expenses?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error || "Failed to delete.");
        return;
      }
      setDeleteTarget(null);
      setSelected(null);
      router.refresh();
    } catch {
      setDeleteError("Network error.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "property_expenses", rows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Import failed");
    router.refresh();
    return data;
  }

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString(dateLocale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Property Expenses</h2>
          <p className="fin-header-sub">
            Track operating expenses across all properties: CAM, taxes, insurance, utilities, and more.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} /> Import CSV
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Expense
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="financial-kpi-row">
        <div className="fin-kpi">
          <div className="fin-kpi-icon" style={{ background: "var(--color-blue-light)", color: "var(--color-blue)" }}>
            <DollarSign size={20} />
          </div>
          <div className="fin-kpi-label">MONTHLY TOTAL</div>
          <div className="fin-kpi-value">{formatCurrency(totalMonthly)}</div>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon" style={{ background: "var(--color-green-light)", color: "var(--color-green)" }}>
            <TrendingUp size={20} />
          </div>
          <div className="fin-kpi-label">ANNUAL TOTAL</div>
          <div className="fin-kpi-value">{formatCurrency(totalAnnual)}</div>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon" style={{ background: "var(--color-amber-light)", color: "var(--color-amber)" }}>
            <Building2 size={20} />
          </div>
          <div className="fin-kpi-label">PROPERTIES</div>
          <div className="fin-kpi-value">{uniqueProperties}</div>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon" style={{ background: "var(--color-red-light)", color: "var(--color-red)" }}>
            <Receipt size={20} />
          </div>
          <div className="fin-kpi-label">EXPENSE TYPES</div>
          <div className="fin-kpi-value">{uniqueTypes}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
        <div className="dash-filter">
          <Filter size={14} />
          <select
            className="dash-filter-select"
            value={activeType}
            onChange={(e) => setActiveType(e.target.value)}
          >
            <option value="all">All Expense Types</option>
            {EXPENSE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        {properties.length > 1 && (
          <div className="dash-filter">
            <Building2 size={14} />
            <select
              className="dash-filter-select"
              value={activeProperty}
              onChange={(e) => setActiveProperty(e.target.value)}
            >
              <option value="all">All Properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="fin-chart-card" style={{ marginTop: 16 }}>
        {filtered.length === 0 ? (
          <div className="fin-empty">
            <div className="fin-empty-title">No Expenses Found</div>
            <div className="fin-empty-desc">
              Add operating expenses to track your property costs.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Vendor</th>
                  <th>Frequency</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th style={{ textAlign: "right" }}>Monthly Equiv.</th>
                  <th>Effective</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((exp) => (
                  <tr key={exp.id}>
                    <td>{exp.properties?.name ?? "—"}</td>
                    <td>
                      <span className={getTypeBadge(exp.expense_type)}>
                        {TYPE_LABELS[exp.expense_type] ?? exp.expense_type}
                      </span>
                    </td>
                    <td>{exp.description || "—"}</td>
                    <td>{exp.vendor_name || "—"}</td>
                    <td>
                      <span className="inv-status inv-status-draft">
                        {FREQ_LABELS[exp.frequency] ?? exp.frequency}
                      </span>
                    </td>
                    <td className="amount-col">{formatCurrency(exp.amount)}</td>
                    <td className="amount-col">{formatCurrency(toMonthly(exp.amount, exp.frequency))}</td>
                    <td>{formatDate(exp.effective_date)}</td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <button
                          className="btn-icon"
                          title="Edit"
                          onClick={() => openEdit(exp)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-blue)", padding: 4 }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="btn-icon"
                          title="Delete"
                          onClick={() => setDeleteTarget(exp)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-red)", padding: 4 }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="ticket-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>New Property Expense</h3>
              <button className="ticket-modal-close" onClick={() => setShowCreate(false)}>
                <X size={18} />
              </button>
            </div>
            <form className="ticket-form" onSubmit={handleCreate}>
              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Property *</label>
                  <select
                    className="ticket-form-select"
                    value={createForm.property_id}
                    onChange={(e) => setCreateForm({ ...createForm, property_id: e.target.value })}
                    required
                  >
                    <option value="">Select property...</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Expense Type *</label>
                  <select
                    className="ticket-form-select"
                    value={createForm.expense_type}
                    onChange={(e) => setCreateForm({ ...createForm, expense_type: e.target.value })}
                  >
                    {EXPENSE_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="ticket-form-group">
                <label className="ticket-form-label">Description</label>
                <input
                  className="ticket-form-input"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="e.g., Annual property insurance premium"
                />
              </div>
              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Amount *</label>
                  <input
                    className="ticket-form-input"
                    type="number"
                    step="0.01"
                    value={createForm.amount}
                    onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                    required
                    placeholder="0.00"
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Frequency</label>
                  <select
                    className="ticket-form-select"
                    value={createForm.frequency}
                    onChange={(e) => setCreateForm({ ...createForm, frequency: e.target.value })}
                  >
                    {FREQUENCY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Effective Date</label>
                  <input
                    className="ticket-form-input"
                    type="date"
                    value={createForm.effective_date}
                    onChange={(e) => setCreateForm({ ...createForm, effective_date: e.target.value })}
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">End Date</label>
                  <input
                    className="ticket-form-input"
                    type="date"
                    value={createForm.end_date}
                    onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="ticket-form-group">
                <label className="ticket-form-label">Vendor Name</label>
                <input
                  className="ticket-form-input"
                  value={createForm.vendor_name}
                  onChange={(e) => setCreateForm({ ...createForm, vendor_name: e.target.value })}
                  placeholder="e.g., State Farm Commercial"
                />
              </div>
              <div className="ticket-form-group">
                <label className="ticket-form-label">Notes</label>
                <textarea
                  className="ticket-form-textarea"
                  rows={2}
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                />
              </div>
              {createError && <div className="ticket-form-error">{createError}</div>}
              <div className="ticket-form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? "Creating..." : "Create Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && selected && (
        <div className="ticket-modal-overlay" onClick={() => { setEditing(false); setSelected(null); }}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>Edit Expense</h3>
              <button className="ticket-modal-close" onClick={() => { setEditing(false); setSelected(null); }}>
                <X size={18} />
              </button>
            </div>
            <form className="ticket-form" onSubmit={handleSaveEdit}>
              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Property *</label>
                  <select
                    className="ticket-form-select"
                    value={editForm.property_id}
                    onChange={(e) => setEditForm({ ...editForm, property_id: e.target.value })}
                    required
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Expense Type *</label>
                  <select
                    className="ticket-form-select"
                    value={editForm.expense_type}
                    onChange={(e) => setEditForm({ ...editForm, expense_type: e.target.value })}
                  >
                    {EXPENSE_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="ticket-form-group">
                <label className="ticket-form-label">Description</label>
                <input
                  className="ticket-form-input"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>
              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Amount *</label>
                  <input
                    className="ticket-form-input"
                    type="number"
                    step="0.01"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Frequency</label>
                  <select
                    className="ticket-form-select"
                    value={editForm.frequency}
                    onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value })}
                  >
                    {FREQUENCY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Effective Date</label>
                  <input
                    className="ticket-form-input"
                    type="date"
                    value={editForm.effective_date}
                    onChange={(e) => setEditForm({ ...editForm, effective_date: e.target.value })}
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">End Date</label>
                  <input
                    className="ticket-form-input"
                    type="date"
                    value={editForm.end_date}
                    onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="ticket-form-group">
                <label className="ticket-form-label">Vendor Name</label>
                <input
                  className="ticket-form-input"
                  value={editForm.vendor_name}
                  onChange={(e) => setEditForm({ ...editForm, vendor_name: e.target.value })}
                />
              </div>
              <div className="ticket-form-group">
                <label className="ticket-form-label">Notes</label>
                <textarea
                  className="ticket-form-textarea"
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>
              {editError && <div className="ticket-form-error">{editError}</div>}
              <div className="ticket-form-actions">
                <button type="button" className="btn-secondary" onClick={() => { setEditing(false); setSelected(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="ticket-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="ticket-modal-header">
              <h3>Delete Expense</h3>
              <button className="ticket-modal-close" onClick={() => setDeleteTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: "16px 24px" }}>
              <p>
                Are you sure you want to delete this{" "}
                <strong>{TYPE_LABELS[deleteTarget.expense_type] ?? deleteTarget.expense_type}</strong>{" "}
                expense of <strong>{formatCurrency(deleteTarget.amount)}</strong>?
              </p>
              <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 8 }}>
                This action cannot be undone.
              </p>
              {deleteError && <div className="ticket-form-error" style={{ marginTop: 8 }}>{deleteError}</div>}
              <div className="ticket-form-actions" style={{ marginTop: 16 }}>
                <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  style={{ background: "var(--color-red)" }}
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          entityName="property_expenses"
          columns={IMPORT_COLUMNS}
          onClose={() => setShowImport(false)}
          onImport={handleImport}
        />
      )}
    </div>
  );
}
