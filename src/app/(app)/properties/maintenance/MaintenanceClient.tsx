"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Wrench,
  ClipboardList,
  CheckCircle2,
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

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string;
  status: string;
  assigned_to: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  scheduled_date: string | null;
  completed_at: string | null;
  notes: string | null;
  property_id: string;
  properties: { name: string } | null;
  units: { unit_number: string } | null;
  created_at: string;
  updated_at: string | null;
}

interface PropertyOption {
  id: string;
  name: string;
}

interface MemberOption {
  user_id: string;
  role: string;
  full_name: string | null;
  email: string | null;
}

interface MaintenanceClientProps {
  requests: MaintenanceRequest[];
  properties: PropertyOption[];
  members: MemberOption[];
}

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

function getCategoryBadge(cat: string): string {
  switch (cat) {
    case "plumbing":
      return "badge badge-blue";
    case "electrical":
      return "badge badge-amber";
    case "hvac":
      return "badge badge-green";
    case "appliance":
      return "badge badge-blue";
    case "structural":
      return "badge badge-red";
    default:
      return "badge badge-amber";
  }
}

function getPriorityBadge(p: string): string {
  switch (p) {
    case "emergency":
      return "badge badge-red";
    case "high":
      return "badge badge-amber";
    case "medium":
      return "badge badge-blue";
    case "low":
      return "badge badge-green";
    default:
      return "badge badge-blue";
  }
}

function getStatusBadge(s: string): string {
  switch (s) {
    case "submitted":
      return "inv-status inv-status-pending";
    case "assigned":
      return "inv-status inv-status-draft";
    case "in_progress":
      return "inv-status inv-status-pending";
    case "completed":
      return "inv-status inv-status-approved";
    case "closed":
      return "inv-status inv-status-paid";
    default:
      return "inv-status inv-status-draft";
  }
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MaintenanceClient({
  requests,
  properties,
  members,
}: MaintenanceClientProps) {
  const router = useRouter();
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  // ---------------------------------------------------------------------------
  // Filter config (inside component so t() is available)
  // ---------------------------------------------------------------------------

  const statusFilters = [
    { label: t("statusAll"), value: "all" },
    { label: t("maintStatusSubmitted"), value: "submitted" },
    { label: t("maintStatusAssigned"), value: "assigned" },
    { label: t("maintStatusInProgress"), value: "in_progress" },
    { label: t("maintStatusCompleted"), value: "completed" },
    { label: t("maintStatusClosed"), value: "closed" },
  ];

  const priorityFilters = [
    { label: t("allPriorities"), value: "all" },
    { label: t("priorityEmergency"), value: "emergency" },
    { label: t("priorityHigh"), value: "high" },
    { label: t("priorityMedium"), value: "medium" },
    { label: t("priorityLow"), value: "low" },
  ];

  const categoryOptions = [
    { label: t("selectCategory"), value: "" },
    { label: t("categoryPlumbing"), value: "plumbing" },
    { label: t("categoryElectrical"), value: "electrical" },
    { label: t("categoryHvac"), value: "hvac" },
    { label: t("categoryStructural"), value: "structural" },
    { label: t("categoryCosmetic"), value: "cosmetic" },
    { label: t("categoryAppliance"), value: "appliance" },
    { label: t("categoryPestControl"), value: "pest_control" },
    { label: t("categoryGeneral"), value: "general" },
    { label: t("categoryOther"), value: "other" },
  ];

  const priorityOptions = [
    { label: t("priorityLow"), value: "low" },
    { label: t("priorityMedium"), value: "medium" },
    { label: t("priorityHigh"), value: "high" },
    { label: t("priorityEmergency"), value: "emergency" },
  ];

  const statusOptions = [
    { label: t("maintStatusSubmitted"), value: "submitted" },
    { label: t("maintStatusAssigned"), value: "assigned" },
    { label: t("maintStatusInProgress"), value: "in_progress" },
    { label: t("maintStatusCompleted"), value: "completed" },
    { label: t("maintStatusClosed"), value: "closed" },
  ];

  const IMPORT_COLUMNS: ImportColumn[] = [
    { key: "title", label: t("title"), required: true },
    { key: "property_name", label: t("propertyName"), required: false },
    { key: "description", label: t("description"), required: false },
    { key: "priority", label: t("priority"), required: false },
    { key: "category", label: t("category"), required: false },
    { key: "scheduled_date", label: t("scheduledDate"), required: false, type: "date" },
    { key: "estimated_cost", label: t("estimatedCostDollar"), required: false, type: "number" },
  ];

  const IMPORT_SAMPLE: Record<string, string>[] = [
    { title: "HVAC filter replacement", property_name: "Sunset Ridge Apartments", description: "Replace all HVAC filters in Building A", priority: "medium", category: "HVAC", scheduled_date: "2026-02-15", estimated_cost: "350" },
    { title: "Roof leak repair - Unit 204", property_name: "Sunset Ridge Apartments", description: "Water intrusion at northeast corner near skylight", priority: "high", category: "Roofing", scheduled_date: "2026-02-10", estimated_cost: "1200" },
    { title: "Parking lot striping", property_name: "Congress Avenue Office Park", description: "Re-stripe all parking spaces and handicap zones", priority: "low", category: "Exterior", scheduled_date: "2026-03-01", estimated_cost: "800" },
  ];

  // Filters (client-side)
  const [activeStatus, setActiveStatus] = useState("all");
  const [activePriority, setActivePriority] = useState("all");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createForm, setCreateForm] = useState({
    property_id: "",
    title: "",
    description: "",
    priority: "medium",
    category: "",
    scheduled_date: "",
    estimated_cost: "",
  });

  // Detail / Edit modal
  const [selectedRequest, setSelectedRequest] =
    useState<MaintenanceRequest | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    category: "",
    priority: "",
    status: "",
    assigned_to: "",
    estimated_cost: "",
    actual_cost: "",
    scheduled_date: "",
    notes: "",
  });

  // Import modal
  const [showImport, setShowImport] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceRequest | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------

  const filtered = requests.filter((r) => {
    if (activeStatus !== "all" && r.status !== activeStatus) return false;
    if (activePriority !== "all" && r.priority !== activePriority) return false;
    return true;
  });

  // KPIs (always computed from the full dataset)
  const totalRequests = requests.length;
  const openStatuses = ["submitted", "assigned", "in_progress"];
  const openCount = requests.filter((r) =>
    openStatuses.includes(r.status)
  ).length;
  const completedCount = requests.filter(
    (r) => r.status === "completed" || r.status === "closed"
  ).length;
  const emergencyCount = requests.filter(
    (r) => r.priority === "emergency"
  ).length;

  // ---------------------------------------------------------------------------
  // Create handler
  // ---------------------------------------------------------------------------

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/properties/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: createForm.property_id,
          title: createForm.title,
          description: createForm.description || undefined,
          priority: createForm.priority,
          category: createForm.category || undefined,
          scheduled_date: createForm.scheduled_date || undefined,
          estimated_cost: createForm.estimated_cost || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToCreateRequest"));
      }

      setCreateForm({
        property_id: "",
        title: "",
        description: "",
        priority: "medium",
        category: "",
        scheduled_date: "",
        estimated_cost: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : t("failedToCreateRequest")
      );
    } finally {
      setCreating(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Detail / Edit handlers
  // ---------------------------------------------------------------------------

  function openDetail(req: MaintenanceRequest) {
    setSelectedRequest(req);
    setEditing(false);
    setEditError("");
    setEditForm({
      title: req.title,
      description: req.description ?? "",
      category: req.category ?? "",
      priority: req.priority,
      status: req.status,
      assigned_to: req.assigned_to ?? "",
      estimated_cost:
        req.estimated_cost != null ? String(req.estimated_cost) : "",
      actual_cost: req.actual_cost != null ? String(req.actual_cost) : "",
      scheduled_date: req.scheduled_date ?? "",
      notes: req.notes ?? "",
    });
  }

  function startEdit() {
    setEditing(true);
    setEditError("");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRequest) return;
    setSaving(true);
    setEditError("");

    try {
      const res = await fetch("/api/properties/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRequest.id,
          title: editForm.title,
          description: editForm.description || null,
          category: editForm.category || null,
          priority: editForm.priority,
          status: editForm.status,
          assigned_to: editForm.assigned_to || null,
          estimated_cost: editForm.estimated_cost
            ? Number(editForm.estimated_cost)
            : null,
          actual_cost: editForm.actual_cost
            ? Number(editForm.actual_cost)
            : null,
          scheduled_date: editForm.scheduled_date || null,
          notes: editForm.notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToUpdateRequest"));
      }

      setSelectedRequest(null);
      setEditing(false);
      router.refresh();
    } catch (err: unknown) {
      setEditError(
        err instanceof Error ? err.message : t("failedToUpdateRequest")
      );
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Delete handler
  // ---------------------------------------------------------------------------

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch("/api/properties/maintenance", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToDeleteRequest"));
      }

      setDeleteTarget(null);
      setSelectedRequest(null);
      router.refresh();
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : t("failedToDeleteRequest")
      );
    } finally {
      setDeleting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Import handler
  // ---------------------------------------------------------------------------

  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "maintenance", rows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("importFailed"));
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  // ---------------------------------------------------------------------------
  // Helper: find member display name
  // ---------------------------------------------------------------------------

  function memberName(userId: string | null): string {
    if (!userId) return "--";
    const m = members.find((mem) => mem.user_id === userId);
    if (!m) return "--";
    return m.full_name || m.email || "--";
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>{t("maintenanceRequests")}</h2>
          <p className="fin-header-sub">
            {t("maintenanceRequestsDesc")}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            {t("importCsv")}
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            {t("newRequest")}
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="financial-kpi-row">
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <ClipboardList size={18} />
          </div>
          <span className="fin-kpi-label">{t("totalRequests")}</span>
          <span className="fin-kpi-value">{totalRequests}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <Wrench size={18} />
          </div>
          <span className="fin-kpi-label">{t("maintOpen")}</span>
          <span className="fin-kpi-value">{openCount}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon green">
            <CheckCircle2 size={18} />
          </div>
          <span className="fin-kpi-label">{t("maintCompleted")}</span>
          <span className="fin-kpi-value">{completedCount}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon red">
            <AlertTriangle size={18} />
          </div>
          <span className="fin-kpi-label">{t("maintEmergency")}</span>
          <span className="fin-kpi-value">{emergencyCount}</span>
        </div>
      </div>

      {/* Status Filters */}
      <div className="fin-filters">
        <label
          style={{
            fontSize: "0.82rem",
            color: "var(--muted)",
            fontWeight: 500,
          }}
        >
          {t("statusLabel")}:
        </label>
        {statusFilters.map((s) => (
          <button
            key={s.value}
            className={`ui-btn ui-btn-sm ${
              activeStatus === s.value ? "ui-btn-primary" : "ui-btn-outline"
            }`}
            onClick={() => setActiveStatus(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Priority Filters */}
      <div className="fin-filters" style={{ marginTop: "0" }}>
        <label
          style={{
            fontSize: "0.82rem",
            color: "var(--muted)",
            fontWeight: 500,
          }}
        >
          {t("priority")}:
        </label>
        {priorityFilters.map((p) => (
          <button
            key={p.value}
            className={`ui-btn ui-btn-sm ${
              activePriority === p.value ? "ui-btn-primary" : "ui-btn-outline"
            }`}
            onClick={() => setActivePriority(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Maintenance Table */}
      {filtered.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>{t("title")}</th>
                  <th>{t("property")}</th>
                  <th>{t("category")}</th>
                  <th>{t("priority")}</th>
                  <th>{t("status")}</th>
                  <th>{t("assignedTo")}</th>
                  <th>{t("scheduledDate")}</th>
                  <th style={{ textAlign: "right" }}>{t("estimatedCost")}</th>
                  <th style={{ textAlign: "right" }}>{t("actualCost")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((req) => {
                  const property = req.properties;
                  const unit = req.units;
                  const isEmergency = req.priority === "emergency";

                  return (
                    <tr
                      key={req.id}
                      className={isEmergency ? "invoice-row-overdue" : ""}
                      style={{ cursor: "pointer" }}
                      onClick={() => openDetail(req)}
                    >
                      <td style={{ fontWeight: 600 }}>
                        {req.title}
                        {req.description && (
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--muted)",
                              fontWeight: 400,
                              maxWidth: "240px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {req.description}
                          </div>
                        )}
                      </td>
                      <td>
                        {property?.name ?? "--"}
                        {unit?.unit_number && (
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--muted)",
                            }}
                          >
                            {t("unitLabel", { number: unit.unit_number })}
                          </div>
                        )}
                      </td>
                      <td>
                        {req.category ? (
                          <span className={getCategoryBadge(req.category)}>
                            {req.category}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td>
                        <span className={getPriorityBadge(req.priority)}>
                          {req.priority}
                        </span>
                      </td>
                      <td>
                        <span className={getStatusBadge(req.status)}>
                          {formatStatus(req.status)}
                        </span>
                      </td>
                      <td>{memberName(req.assigned_to)}</td>
                      <td>
                        {req.scheduled_date
                          ? new Date(req.scheduled_date).toLocaleDateString(
                              dateLocale,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )
                          : "--"}
                      </td>
                      <td className="amount-col">
                        {req.estimated_cost != null
                          ? formatCurrency(req.estimated_cost)
                          : "--"}
                      </td>
                      <td className="amount-col">
                        {req.actual_cost != null
                          ? formatCurrency(req.actual_cost)
                          : "--"}
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
              <Wrench size={48} />
            </div>
            <div className="fin-empty-title">{t("noMaintenanceRequestsFound")}</div>
            <div className="fin-empty-desc">
              {activeStatus !== "all" || activePriority !== "all"
                ? t("noRequestsMatchFilters")
                : t("noRequestsSubmittedYet")}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Create Modal                                                      */}
      {/* ================================================================= */}
      {showCreate && (
        <div
          className="ticket-modal-overlay"
          onClick={() => setShowCreate(false)}
        >
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{t("newMaintenanceRequest")}</h3>
              <button
                className="ticket-modal-close"
                onClick={() => setShowCreate(false)}
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="ticket-form-error">{createError}</div>
            )}

            <form onSubmit={handleCreate} className="ticket-form">
              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("property")} *</label>
                <select
                  className="ticket-form-select"
                  value={createForm.property_id}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      property_id: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">{t("selectAProperty")}</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("title")} *</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={createForm.title}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, title: e.target.value })
                  }
                  placeholder={t("briefDescriptionOfIssue")}
                  required
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("description")}</label>
                <textarea
                  className="ticket-form-textarea"
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      description: e.target.value,
                    })
                  }
                  placeholder={t("provideMoreDetailsAboutMaintenance")}
                  rows={4}
                />
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("priority")}</label>
                  <select
                    className="ticket-form-select"
                    value={createForm.priority}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        priority: e.target.value,
                      })
                    }
                  >
                    {priorityOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("category")}</label>
                  <select
                    className="ticket-form-select"
                    value={createForm.category}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        category: e.target.value,
                      })
                    }
                  >
                    {categoryOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("scheduledDate")}</label>
                  <input
                    type="date"
                    className="ticket-form-input"
                    value={createForm.scheduled_date}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        scheduled_date: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("estimatedCost")}</label>
                  <input
                    type="number"
                    className="ticket-form-input"
                    value={createForm.estimated_cost}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        estimated_cost: e.target.value,
                      })
                    }
                    placeholder="0.00"
                    min={0}
                    step="0.01"
                  />
                </div>
              </div>

              <div className="ticket-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    creating ||
                    !createForm.title.trim() ||
                    !createForm.property_id
                  }
                >
                  {creating ? t("creating") : t("createRequest")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Detail / Edit Modal                                               */}
      {/* ================================================================= */}
      {selectedRequest && (
        <div
          className="ticket-modal-overlay"
          onClick={() => {
            setSelectedRequest(null);
            setEditing(false);
          }}
        >
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{editing ? t("editRequest") : t("requestDetails")}</h3>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                {!editing && (
                  <>
                    <button
                      className="btn-secondary"
                      onClick={startEdit}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                      }}
                    >
                      <Pencil size={14} />
                      {t("edit")}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setDeleteTarget(selectedRequest)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        color: "var(--danger, #ef4444)",
                      }}
                    >
                      <Trash2 size={14} />
                      {t("delete")}
                    </button>
                  </>
                )}
                <button
                  className="ticket-modal-close"
                  onClick={() => {
                    setSelectedRequest(null);
                    setEditing(false);
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {editing ? (
              /* ---------- Edit Mode ---------- */
              <>
                {editError && (
                  <div className="ticket-form-error">{editError}</div>
                )}

                <form onSubmit={handleSaveEdit} className="ticket-form">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("title")} *</label>
                    <input
                      type="text"
                      className="ticket-form-input"
                      value={editForm.title}
                      onChange={(e) =>
                        setEditForm({ ...editForm, title: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("description")}</label>
                    <textarea
                      className="ticket-form-textarea"
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                    />
                  </div>

                  <div className="ticket-form-row">
                    <div className="ticket-form-group">
                      <label className="ticket-form-label">{t("category")}</label>
                      <select
                        className="ticket-form-select"
                        value={editForm.category}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            category: e.target.value,
                          })
                        }
                      >
                        {categoryOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="ticket-form-group">
                      <label className="ticket-form-label">{t("priority")}</label>
                      <select
                        className="ticket-form-select"
                        value={editForm.priority}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            priority: e.target.value,
                          })
                        }
                      >
                        {priorityOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="ticket-form-row">
                    <div className="ticket-form-group">
                      <label className="ticket-form-label">{t("status")}</label>
                      <select
                        className="ticket-form-select"
                        value={editForm.status}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            status: e.target.value,
                          })
                        }
                      >
                        {statusOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="ticket-form-group">
                      <label className="ticket-form-label">{t("assignedTo")}</label>
                      <select
                        className="ticket-form-select"
                        value={editForm.assigned_to}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            assigned_to: e.target.value,
                          })
                        }
                      >
                        <option value="">{t("unassigned")}</option>
                        {members.map((m) => (
                          <option key={m.user_id} value={m.user_id}>
                            {m.full_name || m.email || m.user_id}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="ticket-form-row">
                    <div className="ticket-form-group">
                      <label className="ticket-form-label">
                        {t("estimatedCost")}
                      </label>
                      <input
                        type="number"
                        className="ticket-form-input"
                        value={editForm.estimated_cost}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            estimated_cost: e.target.value,
                          })
                        }
                        placeholder="0.00"
                        min={0}
                        step="0.01"
                      />
                    </div>

                    <div className="ticket-form-group">
                      <label className="ticket-form-label">{t("actualCost")}</label>
                      <input
                        type="number"
                        className="ticket-form-input"
                        value={editForm.actual_cost}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            actual_cost: e.target.value,
                          })
                        }
                        placeholder="0.00"
                        min={0}
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("scheduledDate")}</label>
                    <input
                      type="date"
                      className="ticket-form-input"
                      value={editForm.scheduled_date}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          scheduled_date: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("notes")}</label>
                    <textarea
                      className="ticket-form-textarea"
                      value={editForm.notes}
                      onChange={(e) =>
                        setEditForm({ ...editForm, notes: e.target.value })
                      }
                      rows={3}
                    />
                  </div>

                  <div className="ticket-form-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setEditing(false)}
                    >
                      {t("cancel")}
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={saving || !editForm.title.trim()}
                    >
                      {saving ? t("saving") : t("saveChanges")}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* ---------- View Mode ---------- */
              <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="detail-group">
                  <label className="detail-label">{t("title")}</label>
                  <div className="detail-value">{selectedRequest.title}</div>
                </div>

                <div className="detail-group">
                  <label className="detail-label">{t("description")}</label>
                  <div className={selectedRequest.description ? "detail-value detail-value--multiline" : "detail-value"}>
                    {selectedRequest.description || (
                      <span style={{ color: "var(--muted)" }}>
                        {t("noDescription")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("property")}</label>
                    <div className="detail-value">
                      {selectedRequest.properties?.name ?? "--"}
                      {selectedRequest.units?.unit_number && (
                        <span style={{ color: "var(--muted)", marginLeft: "0.5rem" }}>
                          {t("unitLabel", { number: selectedRequest.units.unit_number })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="detail-group">
                    <label className="detail-label">{t("category")}</label>
                    <div className="detail-value">
                      {selectedRequest.category ? (
                        <span
                          className={getCategoryBadge(
                            selectedRequest.category
                          )}
                        >
                          {selectedRequest.category}
                        </span>
                      ) : (
                        "--"
                      )}
                    </div>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("priority")}</label>
                    <div className="detail-value">
                      <span
                        className={getPriorityBadge(selectedRequest.priority)}
                      >
                        {selectedRequest.priority}
                      </span>
                    </div>
                  </div>

                  <div className="detail-group">
                    <label className="detail-label">{t("status")}</label>
                    <div className="detail-value">
                      <span
                        className={getStatusBadge(selectedRequest.status)}
                      >
                        {formatStatus(selectedRequest.status)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("assignedTo")}</label>
                    <div className="detail-value">{memberName(selectedRequest.assigned_to)}</div>
                  </div>

                  <div className="detail-group">
                    <label className="detail-label">{t("scheduledDate")}</label>
                    <div className="detail-value">
                      {selectedRequest.scheduled_date
                        ? new Date(
                            selectedRequest.scheduled_date
                          ).toLocaleDateString(dateLocale, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "--"}
                    </div>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("estimatedCost")}</label>
                    <div className="detail-value">
                      {selectedRequest.estimated_cost != null
                        ? formatCurrency(selectedRequest.estimated_cost)
                        : "--"}
                    </div>
                  </div>

                  <div className="detail-group">
                    <label className="detail-label">{t("actualCost")}</label>
                    <div className="detail-value">
                      {selectedRequest.actual_cost != null
                        ? formatCurrency(selectedRequest.actual_cost)
                        : "--"}
                    </div>
                  </div>
                </div>

                {selectedRequest.completed_at && (
                  <div className="detail-group">
                    <label className="detail-label">{t("completedAt")}</label>
                    <div className="detail-value">
                      {new Date(
                        selectedRequest.completed_at
                      ).toLocaleDateString(dateLocale, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                )}

                <div className="detail-group">
                  <label className="detail-label">{t("notes")}</label>
                  <div className={selectedRequest.notes ? "detail-value detail-value--multiline" : "detail-value"}>
                    {selectedRequest.notes || (
                      <span style={{ color: "var(--muted)" }}>{t("noNotes")}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Delete Confirmation Modal                                         */}
      {/* ================================================================= */}
      {deleteTarget && (
        <div
          className="ticket-modal-overlay"
          onClick={() => {
            setDeleteTarget(null);
            setDeleteError("");
          }}
        >
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{t("deleteRequest")}</h3>
              <button
                className="ticket-modal-close"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError("");
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="ticket-form" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <p>
                {t("confirmDeleteRequest", { title: deleteTarget.title })}
              </p>

              {deleteError && (
                <div className="ticket-form-error">{deleteError}</div>
              )}

              <div className="ticket-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setDeleteTarget(null);
                    setDeleteError("");
                  }}
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ backgroundColor: "var(--danger, #ef4444)" }}
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? t("deleting") : t("delete")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <ImportModal
          entityName={t("maintenanceRequest")}
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => { setShowImport(false); router.refresh(); }}
        />
      )}
    </div>
  );
}
