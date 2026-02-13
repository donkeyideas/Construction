"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  X,
  FileText,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  Upload,
} from "lucide-react";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";
import type {
  ContractRow,
  ContractStats,
  ContractStatus,
  ContractType,
} from "@/lib/queries/contracts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<ContractStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  active: "Active",
  expired: "Expired",
  terminated: "Terminated",
  completed: "Completed",
};

const TYPE_LABELS: Record<ContractType, string> = {
  subcontractor: "Subcontractor",
  vendor: "Vendor",
  client: "Client",
  lease: "Lease",
};

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  net_30: "Net 30",
  net_60: "Net 60",
  net_90: "Net 90",
  upon_completion: "Upon Completion",
};

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

function formatDateShort(dateStr: string | null) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount: number | null) {
  if (amount === null || amount === undefined) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "title", label: "Title", required: true },
  { key: "contract_type", label: "Type", required: false },
  { key: "party_name", label: "Party Name", required: false },
  { key: "party_email", label: "Party Email", required: false, type: "email" },
  { key: "contract_amount", label: "Amount ($)", required: false, type: "number" },
  { key: "start_date", label: "Start Date", required: false, type: "date" },
  { key: "end_date", label: "End Date", required: false, type: "date" },
  { key: "payment_terms", label: "Payment Terms", required: false },
];

const IMPORT_SAMPLE: Record<string, string>[] = [
  { title: "Concrete subcontract", contract_type: "subcontractor", party_name: "ABC Concrete", party_email: "info@abcconcrete.com", contract_amount: "250000", start_date: "2026-01-01", end_date: "2026-06-30", payment_terms: "net_30" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ContractsClientProps {
  contracts: ContractRow[];
  stats: ContractStats;
  projects: { id: string; name: string }[];
  userId: string;
  companyId: string;
}

export default function ContractsClient({
  contracts,
  stats,
  projects,
  userId,
  companyId,
}: ContractsClientProps) {
  const router = useRouter();

  // Filters
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ContractType | "all">("all");
  const [search, setSearch] = useState("");

  const [showImport, setShowImport] = useState(false);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    contract_type: "subcontractor" as ContractType,
    party_name: "",
    party_email: "",
    contract_amount: "",
    start_date: "",
    end_date: "",
    payment_terms: "",
    scope_of_work: "",
    insurance_required: false,
    project_id: "",
  });

  // Detail / Edit / Delete modal state
  const [selectedContract, setSelectedContract] = useState<ContractRow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Filtered contracts
  const filtered = useMemo(() => {
    let result = contracts;

    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (typeFilter !== "all") {
      result = result.filter((c) => c.contract_type === typeFilter);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(term) ||
          c.contract_number.toLowerCase().includes(term) ||
          (c.party_name && c.party_name.toLowerCase().includes(term))
      );
    }

    return result;
  }, [contracts, statusFilter, typeFilter, search]);

  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "contracts", rows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Import failed");
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  // Create contract handler
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          contract_type: formData.contract_type,
          party_name: formData.party_name || undefined,
          party_email: formData.party_email || undefined,
          contract_amount: formData.contract_amount
            ? Number(formData.contract_amount)
            : undefined,
          start_date: formData.start_date || undefined,
          end_date: formData.end_date || undefined,
          payment_terms: formData.payment_terms || undefined,
          scope_of_work: formData.scope_of_work || undefined,
          insurance_required: formData.insurance_required,
          project_id: formData.project_id || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create contract");
      }

      // Reset form and close modal
      setFormData({
        title: "",
        contract_type: "subcontractor",
        party_name: "",
        party_email: "",
        contract_amount: "",
        start_date: "",
        end_date: "",
        payment_terms: "",
        scope_of_work: "",
        insurance_required: false,
        project_id: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create contract");
    } finally {
      setCreating(false);
    }
  }

  // Open detail modal
  function openDetail(contract: ContractRow) {
    setSelectedContract(contract);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  // Close detail modal
  function closeDetail() {
    setSelectedContract(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  // Enter edit mode
  function startEditing() {
    if (!selectedContract) return;
    setEditData({
      title: selectedContract.title,
      description: selectedContract.description || "",
      status: selectedContract.status,
      contract_type: selectedContract.contract_type,
      party_name: selectedContract.party_name || "",
      party_email: selectedContract.party_email || "",
      contract_amount: selectedContract.contract_amount ?? "",
      start_date: selectedContract.start_date || "",
      end_date: selectedContract.end_date || "",
      payment_terms: selectedContract.payment_terms || "",
      scope_of_work: selectedContract.scope_of_work || "",
      insurance_required: selectedContract.insurance_required ?? false,
      bond_required: selectedContract.bond_required ?? false,
      project_id: selectedContract.project_id || "",
    });
    setIsEditing(true);
    setSaveError("");
  }

  // Cancel edit mode
  function cancelEditing() {
    setIsEditing(false);
    setEditData({});
    setSaveError("");
  }

  // Save edits via PATCH
  async function handleSave() {
    if (!selectedContract) return;
    setSaving(true);
    setSaveError("");

    try {
      // Build payload with only changed fields
      const payload: Record<string, unknown> = {};
      if (editData.title !== selectedContract.title) payload.title = editData.title;
      if (editData.description !== (selectedContract.description || ""))
        payload.description = editData.description;
      if (editData.status !== selectedContract.status) payload.status = editData.status;
      if (editData.contract_type !== selectedContract.contract_type)
        payload.contract_type = editData.contract_type;
      if (editData.party_name !== (selectedContract.party_name || ""))
        payload.party_name = editData.party_name || null;
      if (editData.party_email !== (selectedContract.party_email || ""))
        payload.party_email = editData.party_email || null;

      const existingAmount = selectedContract.contract_amount ?? "";
      if (String(editData.contract_amount) !== String(existingAmount))
        payload.contract_amount = editData.contract_amount ? Number(editData.contract_amount) : null;

      if (editData.start_date !== (selectedContract.start_date || ""))
        payload.start_date = editData.start_date || null;
      if (editData.end_date !== (selectedContract.end_date || ""))
        payload.end_date = editData.end_date || null;
      if (editData.payment_terms !== (selectedContract.payment_terms || ""))
        payload.payment_terms = editData.payment_terms || null;
      if (editData.scope_of_work !== (selectedContract.scope_of_work || ""))
        payload.scope_of_work = editData.scope_of_work || null;
      if (editData.insurance_required !== selectedContract.insurance_required)
        payload.insurance_required = editData.insurance_required;
      if (editData.bond_required !== selectedContract.bond_required)
        payload.bond_required = editData.bond_required;
      if (editData.project_id !== (selectedContract.project_id || ""))
        payload.project_id = editData.project_id || null;

      if (Object.keys(payload).length === 0) {
        // Nothing changed
        setIsEditing(false);
        return;
      }

      const res = await fetch(`/api/contracts/${selectedContract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update contract");
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to update contract");
    } finally {
      setSaving(false);
    }
  }

  // Delete contract via DELETE
  async function handleDelete() {
    if (!selectedContract) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(`/api/contracts/${selectedContract.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete contract");
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to delete contract");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="contracts-page">
      {/* Header */}
      <div className="contracts-header">
        <div>
          <h2>Contracts</h2>
          <p className="contracts-header-sub">
            {stats.total} contract{stats.total !== 1 ? "s" : ""} total
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            Import CSV
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            New Contract
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="contracts-stats">
        <div className="contracts-stat-card stat-total">
          <div className="contracts-stat-icon">
            <FileText size={20} />
          </div>
          <div className="contracts-stat-info">
            <span className="contracts-stat-value">{stats.total}</span>
            <span className="contracts-stat-label">Total Contracts</span>
          </div>
        </div>
        <div className="contracts-stat-card stat-active">
          <div className="contracts-stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="contracts-stat-info">
            <span className="contracts-stat-value">{stats.active}</span>
            <span className="contracts-stat-label">Active</span>
          </div>
        </div>
        <div className="contracts-stat-card stat-expired">
          <div className="contracts-stat-icon">
            <AlertCircle size={20} />
          </div>
          <div className="contracts-stat-info">
            <span className="contracts-stat-value">{stats.expired}</span>
            <span className="contracts-stat-label">Expired</span>
          </div>
        </div>
        <div className="contracts-stat-card stat-value">
          <div className="contracts-stat-icon">
            <DollarSign size={20} />
          </div>
          <div className="contracts-stat-info">
            <span className="contracts-stat-value">
              {formatCurrency(stats.total_value)}
            </span>
            <span className="contracts-stat-label">Total Value</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="contracts-filters">
        <div className="contracts-search">
          <Search size={16} className="contracts-search-icon" />
          <input
            type="text"
            placeholder="Search contracts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="contracts-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ContractStatus | "all")}
        >
          <option value="all">All Status</option>
          {(Object.keys(STATUS_LABELS) as ContractStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          className="contracts-filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ContractType | "all")}
        >
          <option value="all">All Types</option>
          {(Object.keys(TYPE_LABELS) as ContractType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="contracts-empty">
          <div className="contracts-empty-icon">
            <FileText size={28} />
          </div>
          {contracts.length === 0 ? (
            <>
              <h3>No contracts yet</h3>
              <p>Create your first contract to get started.</p>
              <button className="btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={16} />
                New Contract
              </button>
            </>
          ) : (
            <>
              <h3>No matching contracts</h3>
              <p>Try adjusting your search or filter criteria.</p>
            </>
          )}
        </div>
      ) : (
        <div className="contracts-table-wrap">
          <table className="contracts-table">
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Title</th>
                <th>Type</th>
                <th>Party</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>End Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((contract) => (
                <tr
                  key={contract.id}
                  onClick={() => openDetail(contract)}
                  className="contracts-table-row"
                >
                  <td className="contracts-number-cell">{contract.contract_number}</td>
                  <td className="contracts-title-cell">{contract.title}</td>
                  <td>
                    <span className="contracts-type-badge">
                      {TYPE_LABELS[contract.contract_type] ?? contract.contract_type}
                    </span>
                  </td>
                  <td className="contracts-party-cell">
                    {contract.party_name || "--"}
                  </td>
                  <td className="contracts-amount-cell">
                    {formatCurrency(contract.contract_amount)}
                  </td>
                  <td>
                    <span className={`contracts-status-badge status-${contract.status}`}>
                      {STATUS_LABELS[contract.status] ?? contract.status}
                    </span>
                  </td>
                  <td className="contracts-date-cell">
                    {formatDateShort(contract.start_date)}
                  </td>
                  <td className="contracts-date-cell">
                    {formatDateShort(contract.end_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Contract Modal */}
      {showCreate && (
        <div className="contracts-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="contracts-modal" onClick={(e) => e.stopPropagation()}>
            <div className="contracts-modal-header">
              <h3>Create New Contract</h3>
              <button
                className="contracts-modal-close"
                onClick={() => setShowCreate(false)}
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="contracts-form-error">{createError}</div>
            )}

            <form onSubmit={handleCreate} className="contracts-form">
              <div className="contracts-form-group">
                <label className="contracts-form-label">Title *</label>
                <input
                  type="text"
                  className="contracts-form-input"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Contract title"
                  required
                />
              </div>

              <div className="contracts-form-row">
                <div className="contracts-form-group">
                  <label className="contracts-form-label">Contract Type</label>
                  <select
                    className="contracts-form-select"
                    value={formData.contract_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contract_type: e.target.value as ContractType,
                      })
                    }
                  >
                    {(Object.keys(TYPE_LABELS) as ContractType[]).map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="contracts-form-group">
                  <label className="contracts-form-label">Project</label>
                  <select
                    className="contracts-form-select"
                    value={formData.project_id}
                    onChange={(e) =>
                      setFormData({ ...formData, project_id: e.target.value })
                    }
                  >
                    <option value="">No project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="contracts-form-row">
                <div className="contracts-form-group">
                  <label className="contracts-form-label">Party Name</label>
                  <input
                    type="text"
                    className="contracts-form-input"
                    value={formData.party_name}
                    onChange={(e) =>
                      setFormData({ ...formData, party_name: e.target.value })
                    }
                    placeholder="Company or individual name"
                  />
                </div>

                <div className="contracts-form-group">
                  <label className="contracts-form-label">Party Email</label>
                  <input
                    type="email"
                    className="contracts-form-input"
                    value={formData.party_email}
                    onChange={(e) =>
                      setFormData({ ...formData, party_email: e.target.value })
                    }
                    placeholder="contact@example.com"
                  />
                </div>
              </div>

              <div className="contracts-form-row">
                <div className="contracts-form-group">
                  <label className="contracts-form-label">Contract Amount</label>
                  <input
                    type="number"
                    className="contracts-form-input"
                    value={formData.contract_amount}
                    onChange={(e) =>
                      setFormData({ ...formData, contract_amount: e.target.value })
                    }
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="contracts-form-group">
                  <label className="contracts-form-label">Payment Terms</label>
                  <select
                    className="contracts-form-select"
                    value={formData.payment_terms}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_terms: e.target.value })
                    }
                  >
                    <option value="">Select terms...</option>
                    {Object.entries(PAYMENT_TERMS_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="contracts-form-row">
                <div className="contracts-form-group">
                  <label className="contracts-form-label">Start Date</label>
                  <input
                    type="date"
                    className="contracts-form-input"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />
                </div>

                <div className="contracts-form-group">
                  <label className="contracts-form-label">End Date</label>
                  <input
                    type="date"
                    className="contracts-form-input"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="contracts-form-group">
                <label className="contracts-form-label">Scope of Work</label>
                <textarea
                  className="contracts-form-textarea"
                  value={formData.scope_of_work}
                  onChange={(e) =>
                    setFormData({ ...formData, scope_of_work: e.target.value })
                  }
                  placeholder="Describe the scope of work..."
                  rows={4}
                />
              </div>

              <div className="contracts-form-group">
                <label className="contracts-form-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.insurance_required}
                    onChange={(e) =>
                      setFormData({ ...formData, insurance_required: e.target.checked })
                    }
                  />
                  Insurance Required
                </label>
              </div>

              <div className="contracts-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating || !formData.title.trim()}
                >
                  {creating ? "Creating..." : "Create Contract"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail / Edit / Delete Modal */}
      {selectedContract && (
        <div className="contracts-modal-overlay" onClick={closeDetail}>
          <div className="contracts-modal" onClick={(e) => e.stopPropagation()}>
            <div className="contracts-modal-header">
              <h3>
                {isEditing
                  ? `Edit ${selectedContract.contract_number}`
                  : selectedContract.contract_number}
              </h3>
              <button className="contracts-modal-close" onClick={closeDetail}>
                <X size={18} />
              </button>
            </div>

            {saveError && (
              <div className="contracts-form-error">{saveError}</div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div
                className="contracts-modal-overlay"
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  position: "absolute",
                  zIndex: 1000,
                  borderRadius: "inherit",
                }}
              >
                <div
                  className="contracts-modal"
                  onClick={(e) => e.stopPropagation()}
                  style={{ maxWidth: 440 }}
                >
                  <div className="contracts-modal-header">
                    <h3>Delete Contract</h3>
                    <button
                      className="contracts-modal-close"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div style={{ padding: "1rem 1.5rem" }}>
                    <p>
                      Are you sure you want to delete contract{" "}
                      <strong>{selectedContract.contract_number}</strong>? This action
                      cannot be undone.
                    </p>
                  </div>
                  <div className="contracts-form-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ backgroundColor: "var(--color-danger, #dc2626)" }}
                      onClick={handleDelete}
                      disabled={saving}
                    >
                      {saving ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Read-only detail view */}
            {!isEditing && (
              <div className="contracts-form" style={{ pointerEvents: showDeleteConfirm ? "none" : "auto" }}>
                <div className="contracts-form-group">
                  <label className="contracts-form-label">Title</label>
                  <div className="contracts-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                    {selectedContract.title}
                  </div>
                </div>

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">Status</label>
                    <div className="contracts-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                      <span className={`contracts-status-badge status-${selectedContract.status}`}>
                        {STATUS_LABELS[selectedContract.status] ?? selectedContract.status}
                      </span>
                    </div>
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">Type</label>
                    <div className="contracts-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                      <span className="contracts-type-badge">
                        {TYPE_LABELS[selectedContract.contract_type] ?? selectedContract.contract_type}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">Party Name</label>
                    <div className="contracts-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                      {selectedContract.party_name || "--"}
                    </div>
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">Party Email</label>
                    <div className="contracts-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                      {selectedContract.party_email || "--"}
                    </div>
                  </div>
                </div>

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">Amount</label>
                    <div className="contracts-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                      {formatCurrency(selectedContract.contract_amount)}
                    </div>
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">Payment Terms</label>
                    <div className="contracts-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                      {selectedContract.payment_terms
                        ? PAYMENT_TERMS_LABELS[selectedContract.payment_terms] || selectedContract.payment_terms
                        : "--"}
                    </div>
                  </div>
                </div>

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">Start Date</label>
                    <div className="contracts-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                      {formatDate(selectedContract.start_date)}
                    </div>
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">End Date</label>
                    <div className="contracts-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                      {formatDate(selectedContract.end_date)}
                    </div>
                  </div>
                </div>

                {selectedContract.scope_of_work && (
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">Scope of Work</label>
                    <div
                      className="contracts-form-textarea"
                      style={{
                        background: "var(--color-bg-tertiary, #f3f4f6)",
                        cursor: "default",
                        minHeight: 60,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {selectedContract.scope_of_work}
                    </div>
                  </div>
                )}

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">Insurance Required</label>
                    <div className="contracts-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                      {selectedContract.insurance_required ? "Yes" : "No"}
                    </div>
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">Bond Required</label>
                    <div className="contracts-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                      {selectedContract.bond_required ? "Yes" : "No"}
                    </div>
                  </div>
                </div>

                {selectedContract.project && (
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">Project</label>
                    <div className="contracts-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                      {selectedContract.project.name}
                    </div>
                  </div>
                )}

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">Created</label>
                    <div className="contracts-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                      {formatDate(selectedContract.created_at)}
                    </div>
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">Updated</label>
                    <div className="contracts-form-input" style={{ background: "var(--color-bg-tertiary, #f3f4f6)", cursor: "default" }}>
                      {formatDate(selectedContract.updated_at)}
                    </div>
                  </div>
                </div>

                <div className="contracts-form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ color: "var(--color-danger, #dc2626)" }}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={closeDetail}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={startEditing}
                  >
                    <Edit3 size={16} />
                    Edit
                  </button>
                </div>
              </div>
            )}

            {/* Edit view */}
            {isEditing && (
              <div className="contracts-form">
                <div className="contracts-form-group">
                  <label className="contracts-form-label">Title *</label>
                  <input
                    type="text"
                    className="contracts-form-input"
                    value={(editData.title as string) || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, title: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="contracts-form-group">
                  <label className="contracts-form-label">Description</label>
                  <textarea
                    className="contracts-form-textarea"
                    value={(editData.description as string) || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">Status</label>
                    <select
                      className="contracts-form-select"
                      value={(editData.status as string) || "draft"}
                      onChange={(e) =>
                        setEditData({ ...editData, status: e.target.value })
                      }
                    >
                      {(Object.keys(STATUS_LABELS) as ContractStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">Type</label>
                    <select
                      className="contracts-form-select"
                      value={(editData.contract_type as string) || "subcontractor"}
                      onChange={(e) =>
                        setEditData({ ...editData, contract_type: e.target.value })
                      }
                    >
                      {(Object.keys(TYPE_LABELS) as ContractType[]).map((t) => (
                        <option key={t} value={t}>
                          {TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">Party Name</label>
                    <input
                      type="text"
                      className="contracts-form-input"
                      value={(editData.party_name as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, party_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">Party Email</label>
                    <input
                      type="email"
                      className="contracts-form-input"
                      value={(editData.party_email as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, party_email: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">Amount</label>
                    <input
                      type="number"
                      className="contracts-form-input"
                      value={editData.contract_amount as string ?? ""}
                      onChange={(e) =>
                        setEditData({ ...editData, contract_amount: e.target.value })
                      }
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">Payment Terms</label>
                    <select
                      className="contracts-form-select"
                      value={(editData.payment_terms as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, payment_terms: e.target.value })
                      }
                    >
                      <option value="">Select terms...</option>
                      {Object.entries(PAYMENT_TERMS_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">Start Date</label>
                    <input
                      type="date"
                      className="contracts-form-input"
                      value={(editData.start_date as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, start_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">End Date</label>
                    <input
                      type="date"
                      className="contracts-form-input"
                      value={(editData.end_date as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, end_date: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="contracts-form-group">
                  <label className="contracts-form-label">Scope of Work</label>
                  <textarea
                    className="contracts-form-textarea"
                    value={(editData.scope_of_work as string) || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, scope_of_work: e.target.value })
                    }
                    rows={4}
                  />
                </div>

                <div className="contracts-form-group">
                  <label className="contracts-form-label">Project</label>
                  <select
                    className="contracts-form-select"
                    value={(editData.project_id as string) || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, project_id: e.target.value })
                    }
                  >
                    <option value="">No project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-checkbox-label">
                      <input
                        type="checkbox"
                        checked={(editData.insurance_required as boolean) ?? false}
                        onChange={(e) =>
                          setEditData({ ...editData, insurance_required: e.target.checked })
                        }
                      />
                      Insurance Required
                    </label>
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-checkbox-label">
                      <input
                        type="checkbox"
                        checked={(editData.bond_required as boolean) ?? false}
                        onChange={(e) =>
                          setEditData({ ...editData, bond_required: e.target.checked })
                        }
                      />
                      Bond Required
                    </label>
                  </div>
                </div>

                <div className="contracts-form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={cancelEditing}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={saving || !(editData.title as string)?.trim()}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showImport && (
        <ImportModal
          entityName="Contracts"
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
