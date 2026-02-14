"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FileSignature,
  DollarSign,
  Clock,
  Home,
  AlertTriangle,
  Plus,
  X,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Lease {
  id: string;
  tenant_name: string | null;
  tenant_email: string | null;
  tenant_phone: string | null;
  monthly_rent: number | null;
  security_deposit: number | null;
  lease_start: string | null;
  lease_end: string | null;
  status: string;
  auto_renew: boolean | null;
  unit_id?: string | null;
  properties: { name: string } | null;
  units: { unit_number: string } | null;
  created_at: string;
  updated_at: string | null;
}

interface UnitOption {
  id: string;
  unit_number: string;
  property_id: string;
  property_name: string;
}

interface LeasesClientProps {
  leases: Lease[];
  properties: { id: string; name: string }[];
  units: UnitOption[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(date: string | null): string {
  if (!date) return "--";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusBadge(status: string): string {
  switch (status) {
    case "active":
      return "inv-status inv-status-approved";
    case "expired":
    case "terminated":
      return "inv-status inv-status-voided";
    case "pending":
      return "inv-status inv-status-pending";
    default:
      return "inv-status inv-status-draft";
  }
}

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "tenant_name", label: "Tenant Name", required: true },
  { key: "tenant_email", label: "Tenant Email", required: false, type: "email" },
  { key: "tenant_phone", label: "Tenant Phone", required: false },
  { key: "monthly_rent", label: "Monthly Rent ($)", required: false, type: "number" },
  { key: "security_deposit", label: "Security Deposit ($)", required: false, type: "number" },
  { key: "lease_start", label: "Lease Start", required: false, type: "date" },
  { key: "lease_end", label: "Lease End", required: false, type: "date" },
];

const IMPORT_SAMPLE: Record<string, string>[] = [
  { tenant_name: "John Smith", tenant_email: "john@example.com", tenant_phone: "555-0100", monthly_rent: "2500", security_deposit: "5000", lease_start: "2026-01-01", lease_end: "2027-01-01" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LeasesClient({ leases, properties, units }: LeasesClientProps) {
  const router = useRouter();

  const [showImport, setShowImport] = useState(false);

  // ---- State ----
  const [statusFilter, setStatusFilter] = useState("all");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createForm, setCreateForm] = useState({
    unit_id: "",
    tenant_name: "",
    tenant_email: "",
    tenant_phone: "",
    lease_type: "standard",
    monthly_rent: "",
    security_deposit: "",
    lease_start: "",
    lease_end: "",
    payment_day: "1",
    terms: "",
  });

  // Detail / edit modal
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState({
    tenant_name: "",
    tenant_email: "",
    tenant_phone: "",
    monthly_rent: "",
    security_deposit: "",
    lease_start: "",
    lease_end: "",
    status: "active",
    auto_renew: false,
  });

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ---- Derived data ----
  const now = useMemo(() => new Date(), []);
  const in30Days = useMemo(() => new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), [now]);
  const in60Days = useMemo(() => new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000), [now]);

  // KPIs (always computed from all leases, independent of filter)
  const activeLeases = useMemo(() => leases.filter((l) => l.status === "active"), [leases]);
  const totalActive = activeLeases.length;
  const monthlyRentRoll = useMemo(
    () => activeLeases.reduce((sum, l) => sum + (l.monthly_rent ?? 0), 0),
    [activeLeases]
  );
  const expiringSoon = useMemo(
    () =>
      activeLeases.filter((l) => {
        if (!l.lease_end) return false;
        const end = new Date(l.lease_end);
        return end >= now && end <= in60Days;
      }).length,
    [activeLeases, now, in60Days]
  );
  const activeUnitIds = useMemo(
    () => new Set(activeLeases.map((l) => l.unit_id).filter(Boolean)),
    [activeLeases]
  );
  const vacantUnits = Math.max(units.length - activeUnitIds.size, 0);

  // Filtered leases for the table
  const filteredLeases = useMemo(
    () => (statusFilter === "all" ? leases : leases.filter((l) => l.status === statusFilter)),
    [leases, statusFilter]
  );

  // ---- Row highlight ----
  function getRowHighlight(leaseEnd: string | null): string {
    if (!leaseEnd) return "";
    const end = new Date(leaseEnd);
    if (end < now) return "";
    if (end <= in30Days) return "invoice-row-overdue";
    if (end <= in60Days) return "invoice-row-warning";
    return "";
  }

  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "leases", rows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Import failed");
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  // ---- Create handlers ----
  function openCreate() {
    setCreateForm({
      unit_id: "",
      tenant_name: "",
      tenant_email: "",
      tenant_phone: "",
      lease_type: "standard",
      monthly_rent: "",
      security_deposit: "",
      lease_start: "",
      lease_end: "",
      payment_day: "1",
      terms: "",
    });
    setCreateError("");
    setShowCreate(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/properties/leases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_id: createForm.unit_id,
          tenant_name: createForm.tenant_name,
          tenant_email: createForm.tenant_email || undefined,
          tenant_phone: createForm.tenant_phone || undefined,
          monthly_rent: createForm.monthly_rent,
          security_deposit: createForm.security_deposit || undefined,
          lease_start: createForm.lease_start,
          lease_end: createForm.lease_end,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create lease");
      }

      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create lease");
    } finally {
      setCreating(false);
    }
  }

  // ---- Detail / Edit handlers ----
  function openDetail(lease: Lease) {
    setSelectedLease(lease);
    setEditing(false);
    setEditError("");
    setShowDeleteConfirm(false);
  }

  function startEditing() {
    if (!selectedLease) return;
    setEditForm({
      tenant_name: selectedLease.tenant_name ?? "",
      tenant_email: selectedLease.tenant_email ?? "",
      tenant_phone: selectedLease.tenant_phone ?? "",
      monthly_rent: selectedLease.monthly_rent != null ? String(selectedLease.monthly_rent) : "",
      security_deposit:
        selectedLease.security_deposit != null ? String(selectedLease.security_deposit) : "",
      lease_start: selectedLease.lease_start ?? "",
      lease_end: selectedLease.lease_end ?? "",
      status: selectedLease.status,
      auto_renew: selectedLease.auto_renew ?? false,
    });
    setEditError("");
    setEditing(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLease) return;
    setSaving(true);
    setEditError("");

    try {
      const res = await fetch("/api/properties/leases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedLease.id,
          tenant_name: editForm.tenant_name,
          tenant_email: editForm.tenant_email || null,
          tenant_phone: editForm.tenant_phone || null,
          monthly_rent: editForm.monthly_rent ? Number(editForm.monthly_rent) : null,
          security_deposit: editForm.security_deposit ? Number(editForm.security_deposit) : null,
          lease_start: editForm.lease_start || null,
          lease_end: editForm.lease_end || null,
          status: editForm.status,
          auto_renew: editForm.auto_renew,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update lease");
      }

      setSelectedLease(null);
      router.refresh();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to update lease");
    } finally {
      setSaving(false);
    }
  }

  // ---- Delete handler ----
  async function handleDelete() {
    if (!selectedLease) return;
    setDeleting(true);

    try {
      const res = await fetch("/api/properties/leases", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedLease.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete lease");
      }

      setSelectedLease(null);
      setShowDeleteConfirm(false);
      router.refresh();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to delete lease");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  // ---- Status filter options ----
  const statuses = [
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Expired", value: "expired" },
    { label: "Pending", value: "pending" },
    { label: "Terminated", value: "terminated" },
  ];

  // ---- Render ----
  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Lease Management</h2>
          <p className="fin-header-sub">
            Track leases, renewals, rent schedules, and tenant information
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            Import CSV
          </button>
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} />
            New Lease
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="financial-kpi-row">
        <div className="fin-kpi">
          <div className="fin-kpi-icon green">
            <FileSignature size={18} />
          </div>
          <span className="fin-kpi-label">Active Leases</span>
          <span className="fin-kpi-value">{totalActive}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <DollarSign size={18} />
          </div>
          <span className="fin-kpi-label">Monthly Rent Roll</span>
          <span className="fin-kpi-value">{formatCurrency(monthlyRentRoll)}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <Clock size={18} />
          </div>
          <span className="fin-kpi-label">Expiring Soon (60d)</span>
          <span className="fin-kpi-value">{expiringSoon}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon red">
            <Home size={18} />
          </div>
          <span className="fin-kpi-label">Vacant Units</span>
          <span className="fin-kpi-value">{vacantUnits}</span>
        </div>
      </div>

      {/* Status Filters */}
      <div className="fin-filters">
        <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500 }}>
          Status:
        </label>
        {statuses.map((s) => (
          <button
            key={s.value}
            className={`ui-btn ui-btn-sm ${
              statusFilter === s.value ? "ui-btn-primary" : "ui-btn-outline"
            }`}
            onClick={() => setStatusFilter(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Lease Table */}
      {filteredLeases.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Tenant Name</th>
                  <th>Property</th>
                  <th>Unit #</th>
                  <th>Lease Start</th>
                  <th>Lease End</th>
                  <th style={{ textAlign: "right" }}>Monthly Rent</th>
                  <th style={{ textAlign: "right" }}>Security Deposit</th>
                  <th>Auto-Renew</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeases.map((lease) => {
                  const property = lease.properties;
                  const unit = lease.units;
                  const rowClass = getRowHighlight(lease.lease_end);
                  const isExpiringSoon =
                    lease.lease_end &&
                    new Date(lease.lease_end) >= now &&
                    new Date(lease.lease_end) <= in60Days;

                  return (
                    <tr
                      key={lease.id}
                      className={rowClass}
                      style={{ cursor: "pointer" }}
                      onClick={() => openDetail(lease)}
                    >
                      <td style={{ fontWeight: 600 }}>
                        {lease.tenant_name ?? "--"}
                        {lease.tenant_email && (
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--muted)",
                              fontWeight: 400,
                            }}
                          >
                            {lease.tenant_email}
                          </div>
                        )}
                      </td>
                      <td>{property?.name ?? "--"}</td>
                      <td>{unit?.unit_number ?? "--"}</td>
                      <td>{fmtDate(lease.lease_start)}</td>
                      <td>
                        <span
                          style={{
                            color: isExpiringSoon ? "var(--color-red)" : "var(--text)",
                            fontWeight: isExpiringSoon ? 600 : 400,
                          }}
                        >
                          {fmtDate(lease.lease_end)}
                          {isExpiringSoon && (
                            <AlertTriangle
                              size={12}
                              style={{ marginLeft: "4px", verticalAlign: "middle" }}
                            />
                          )}
                        </span>
                      </td>
                      <td className="amount-col">
                        {lease.monthly_rent != null ? formatCurrency(lease.monthly_rent) : "--"}
                      </td>
                      <td className="amount-col">
                        {lease.security_deposit != null
                          ? formatCurrency(lease.security_deposit)
                          : "--"}
                      </td>
                      <td>
                        <span
                          className={
                            lease.auto_renew ? "badge badge-green" : "badge badge-amber"
                          }
                        >
                          {lease.auto_renew ? "Yes" : "No"}
                        </span>
                      </td>
                      <td>
                        <span className={getStatusBadge(lease.status)}>{lease.status}</span>
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
              <FileSignature size={48} />
            </div>
            <div className="fin-empty-title">No Leases Found</div>
            <div className="fin-empty-desc">
              {statusFilter !== "all"
                ? "No leases match the current filter. Try adjusting your status filter."
                : "No leases have been created yet. Add your first lease to start tracking tenants and rent schedules."}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* CREATE MODAL                                                       */}
      {/* ================================================================== */}
      {showCreate && (
        <div className="ticket-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>Create New Lease</h3>
              <button className="ticket-modal-close" onClick={() => setShowCreate(false)}>
                <X size={18} />
              </button>
            </div>

            {createError && <div className="ticket-form-error">{createError}</div>}

            <form onSubmit={handleCreate} className="ticket-form">
              <div className="ticket-form-group">
                <label className="ticket-form-label">Unit *</label>
                <select
                  className="ticket-form-select"
                  value={createForm.unit_id}
                  onChange={(e) => setCreateForm({ ...createForm, unit_id: e.target.value })}
                  required
                >
                  <option value="">Select a unit...</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.property_name} - Unit {u.unit_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Tenant Name *</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={createForm.tenant_name}
                  onChange={(e) => setCreateForm({ ...createForm, tenant_name: e.target.value })}
                  placeholder="Full name of tenant"
                  required
                />
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Tenant Email</label>
                  <input
                    type="email"
                    className="ticket-form-input"
                    value={createForm.tenant_email}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, tenant_email: e.target.value })
                    }
                    placeholder="tenant@email.com"
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Tenant Phone</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={createForm.tenant_phone}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, tenant_phone: e.target.value })
                    }
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Monthly Rent *</label>
                  <input
                    type="number"
                    className="ticket-form-input"
                    value={createForm.monthly_rent}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, monthly_rent: e.target.value })
                    }
                    placeholder="0.00"
                    min={0}
                    step="0.01"
                    required
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Security Deposit</label>
                  <input
                    type="number"
                    className="ticket-form-input"
                    value={createForm.security_deposit}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, security_deposit: e.target.value })
                    }
                    placeholder="0.00"
                    min={0}
                    step="0.01"
                  />
                </div>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Lease Start *</label>
                  <input
                    type="date"
                    className="ticket-form-input"
                    value={createForm.lease_start}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, lease_start: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Lease End *</label>
                  <input
                    type="date"
                    className="ticket-form-input"
                    value={createForm.lease_end}
                    onChange={(e) => setCreateForm({ ...createForm, lease_end: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="ticket-form-actions">
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
                  disabled={
                    creating ||
                    !createForm.tenant_name.trim() ||
                    !createForm.unit_id ||
                    !createForm.monthly_rent
                  }
                >
                  {creating ? "Creating..." : "Create Lease"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* DETAIL / EDIT MODAL                                                */}
      {/* ================================================================== */}
      {selectedLease && (
        <div className="ticket-modal-overlay" onClick={() => setSelectedLease(null)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{editing ? "Edit Lease" : "Lease Details"}</h3>
              <button
                className="ticket-modal-close"
                onClick={() => setSelectedLease(null)}
              >
                <X size={18} />
              </button>
            </div>

            {editError && <div className="ticket-form-error">{editError}</div>}

            {/* ------ Delete confirmation ------ */}
            {showDeleteConfirm && (
              <div style={{ padding: "1rem 1.5rem", background: "var(--color-red-bg, #fef2f2)", borderBottom: "1px solid var(--border)" }}>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-red, #dc2626)" }}>
                  Are you sure you want to delete this lease for{" "}
                  <strong>{selectedLease.tenant_name ?? "this tenant"}</strong>?
                </p>
                <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
                  <button
                    className="btn-primary"
                    style={{ background: "var(--color-red, #dc2626)" }}
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting..." : "Yes, Delete"}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!editing ? (
              /* ---------- VIEW MODE ---------- */
              <div style={{ padding: "1.25rem" }}>
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">Tenant Name</label>
                    <div className="detail-value">{selectedLease.tenant_name ?? "--"}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">Status</label>
                    <div className="detail-value">
                      <span className={getStatusBadge(selectedLease.status)}>
                        {selectedLease.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-row" style={{ marginTop: "1rem" }}>
                  <div className="detail-group">
                    <label className="detail-label">Email</label>
                    <div className="detail-value">{selectedLease.tenant_email ?? "--"}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">Phone</label>
                    <div className="detail-value">{selectedLease.tenant_phone ?? "--"}</div>
                  </div>
                </div>

                <div className="detail-row" style={{ marginTop: "1rem" }}>
                  <div className="detail-group">
                    <label className="detail-label">Property</label>
                    <div className="detail-value">{selectedLease.properties?.name ?? "--"}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">Unit</label>
                    <div className="detail-value">{selectedLease.units?.unit_number ?? "--"}</div>
                  </div>
                </div>

                <div className="detail-row" style={{ marginTop: "1rem" }}>
                  <div className="detail-group">
                    <label className="detail-label">Monthly Rent</label>
                    <div className="detail-value">
                      {selectedLease.monthly_rent != null
                        ? formatCurrency(selectedLease.monthly_rent)
                        : "--"}
                    </div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">Security Deposit</label>
                    <div className="detail-value">
                      {selectedLease.security_deposit != null
                        ? formatCurrency(selectedLease.security_deposit)
                        : "--"}
                    </div>
                  </div>
                </div>

                <div className="detail-row" style={{ marginTop: "1rem" }}>
                  <div className="detail-group">
                    <label className="detail-label">Lease Start</label>
                    <div className="detail-value">{fmtDate(selectedLease.lease_start)}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">Lease End</label>
                    <div className="detail-value">{fmtDate(selectedLease.lease_end)}</div>
                  </div>
                </div>

                <div className="detail-row" style={{ marginTop: "1rem" }}>
                  <div className="detail-group">
                    <label className="detail-label">Auto Renew</label>
                    <div className="detail-value">
                      <span
                        className={
                          selectedLease.auto_renew ? "badge badge-green" : "badge badge-amber"
                        }
                      >
                        {selectedLease.auto_renew ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="ticket-form-actions" style={{ marginTop: "1.5rem" }}>
                  <button className="btn-secondary" onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 size={14} />
                    Delete
                  </button>
                  <button className="btn-primary" onClick={startEditing}>
                    <Pencil size={14} />
                    Edit
                  </button>
                </div>
              </div>
            ) : (
              /* ---------- EDIT MODE ---------- */
              <form onSubmit={handleSaveEdit} className="ticket-form">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Tenant Name *</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={editForm.tenant_name}
                    onChange={(e) => setEditForm({ ...editForm, tenant_name: e.target.value })}
                    required
                  />
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Tenant Email</label>
                    <input
                      type="email"
                      className="ticket-form-input"
                      value={editForm.tenant_email}
                      onChange={(e) =>
                        setEditForm({ ...editForm, tenant_email: e.target.value })
                      }
                      placeholder="tenant@email.com"
                    />
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Tenant Phone</label>
                    <input
                      type="text"
                      className="ticket-form-input"
                      value={editForm.tenant_phone}
                      onChange={(e) =>
                        setEditForm({ ...editForm, tenant_phone: e.target.value })
                      }
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Monthly Rent *</label>
                    <input
                      type="number"
                      className="ticket-form-input"
                      value={editForm.monthly_rent}
                      onChange={(e) =>
                        setEditForm({ ...editForm, monthly_rent: e.target.value })
                      }
                      min={0}
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Security Deposit</label>
                    <input
                      type="number"
                      className="ticket-form-input"
                      value={editForm.security_deposit}
                      onChange={(e) =>
                        setEditForm({ ...editForm, security_deposit: e.target.value })
                      }
                      min={0}
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Lease Start</label>
                    <input
                      type="date"
                      className="ticket-form-input"
                      value={editForm.lease_start}
                      onChange={(e) =>
                        setEditForm({ ...editForm, lease_start: e.target.value })
                      }
                    />
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Lease End</label>
                    <input
                      type="date"
                      className="ticket-form-input"
                      value={editForm.lease_end}
                      onChange={(e) =>
                        setEditForm({ ...editForm, lease_end: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Status</label>
                    <select
                      className="ticket-form-select"
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    >
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="pending">Pending</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </div>
                  <div className="ticket-form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingTop: "1.5rem" }}>
                    <input
                      type="checkbox"
                      id="auto-renew-checkbox"
                      checked={editForm.auto_renew}
                      onChange={(e) =>
                        setEditForm({ ...editForm, auto_renew: e.target.checked })
                      }
                    />
                    <label htmlFor="auto-renew-checkbox" className="ticket-form-label" style={{ margin: 0 }}>
                      Auto Renew
                    </label>
                  </div>
                </div>

                <div className="ticket-form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showImport && (
        <ImportModal
          entityName="Leases"
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
