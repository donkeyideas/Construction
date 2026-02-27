"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  FileEdit,
  Hash,
  Clock,
  CheckCircle2,
  DollarSign,
  Plus,
  X,
  Upload,
  AlertCircle,
} from "lucide-react";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils/format";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChangeOrder {
  id: string;
  co_number: string;
  title: string;
  description: string | null;
  status: string;
  reason: string | null;
  amount: number | null;
  schedule_impact_days: number | null;
  requested_by: string | null;
  approved_by: string | null;
  created_at: string;
  projects: { name: string; code: string } | null;
}

interface Project {
  id: string;
  name: string;
  code: string | null;
}

interface KpiData {
  totalCount: number;
  pendingValue: number;
  approvedValue: number;
  awaitingApproval: number;
}

interface LinkedJE {
  id: string;
  entry_number: string;
}

interface ChangeOrdersClientProps {
  rows: ChangeOrder[];
  kpi: KpiData;
  userMap: Record<string, string>;
  projects: Project[];
  activeStatus: string | undefined;
  linkedJEs?: Record<string, LinkedJE[]>;
}

// ---------------------------------------------------------------------------
// Constants (non-translatable)
// ---------------------------------------------------------------------------

const REASON_BADGE: Record<string, string> = {
  owner_request: "badge-blue",
  design_change: "badge-amber",
  unforeseen_condition: "badge-red",
  value_engineering: "badge-green",
  scope_change: "badge-blue",
  design_error: "badge-amber",
  site_condition: "badge-red",
  other: "badge-blue",
};

const STATUS_BADGE: Record<string, string> = {
  draft: "inv-status inv-status-draft",
  submitted: "inv-status inv-status-pending",
  approved: "inv-status inv-status-approved",
  rejected: "inv-status inv-status-voided",
};

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "title", label: "Title", required: true },
  { key: "description", label: "Description", required: false },
  { key: "reason", label: "Reason", required: false },
  { key: "amount", label: "Amount ($)", required: false, type: "number" },
  { key: "schedule_impact_days", label: "Schedule Impact (days)", required: false, type: "number" },
  { key: "project_name", label: "Project Name", required: false },
];

const IMPORT_SAMPLE: Record<string, string>[] = [
  { title: "Additional electrical outlets", description: "Owner requested 12 additional outlets in suite 200", reason: "owner_request", amount: "4500", schedule_impact_days: "3" },
  { title: "Unforeseen rock removal", description: "Rock encountered during excavation at grid B-4", reason: "unforeseen_condition", amount: "18500", schedule_impact_days: "5" },
  { title: "Upgraded lobby finishes", description: "Replace VCT with porcelain tile in main lobby", reason: "design_change", amount: "12000", schedule_impact_days: "0" },
];

function buildUrl(status?: string): string {
  if (!status || status === "all") return "/projects/change-orders";
  return `/projects/change-orders?status=${status}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChangeOrdersClient({
  rows,
  kpi,
  userMap,
  projects,
  activeStatus,
  linkedJEs = {},
}: ChangeOrdersClientProps) {
  const router = useRouter();
  const t = useTranslations("projects");

  // Translatable constants
  const REASON_LABELS: Record<string, string> = useMemo(() => ({
    owner_request: t("changeOrders.reasonOwnerRequest"),
    design_change: t("changeOrders.reasonDesignChange"),
    unforeseen_condition: t("changeOrders.reasonUnforeseen"),
    value_engineering: t("changeOrders.reasonValueEng"),
    scope_change: t("changeOrders.reasonScopeChange"),
    design_error: t("changeOrders.reasonDesignError"),
    site_condition: t("changeOrders.reasonSiteCondition"),
    other: t("changeOrders.reasonOther"),
  }), [t]);

  const REASON_OPTIONS = useMemo(() => [
    { value: "scope_change", label: t("changeOrders.reasonScopeChange") },
    { value: "design_error", label: t("changeOrders.reasonDesignError") },
    { value: "site_condition", label: t("changeOrders.reasonSiteCondition") },
    { value: "owner_request", label: t("changeOrders.reasonOwnerRequest") },
    { value: "value_engineering", label: t("changeOrders.reasonValueEngineering") },
    { value: "design_change", label: t("changeOrders.reasonDesignChange") },
    { value: "unforeseen_condition", label: t("changeOrders.reasonUnforeseenCondition") },
    { value: "other", label: t("changeOrders.reasonOther") },
  ], [t]);

  const statuses = useMemo(() => [
    { label: t("changeOrders.statusAll"), value: "all" },
    { label: t("changeOrders.statusDraft"), value: "draft" },
    { label: t("changeOrders.statusSubmitted"), value: "submitted" },
    { label: t("changeOrders.statusApproved"), value: "approved" },
    { label: t("changeOrders.statusRejected"), value: "rejected" },
  ], [t]);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    project_id: "",
    title: "",
    description: "",
    reason: "",
    amount: "",
    schedule_impact_days: "",
  });

  const [showImport, setShowImport] = useState(false);
  const [importProjectId, setImportProjectId] = useState("");

  // Detail / Edit / Delete modal state
  const [selectedCo, setSelectedCo] = useState<ChangeOrder | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "change_orders", rows, project_id: importProjectId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("changeOrders.importFailed"));
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  // ------- Handlers -------

  function openDetail(co: ChangeOrder) {
    setSelectedCo(co);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
  }

  function closeDetail() {
    setSelectedCo(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setEditData({});
    setSaveError("");
  }

  function startEditing() {
    if (!selectedCo) return;
    setEditData({
      title: selectedCo.title,
      description: selectedCo.description || "",
      reason: selectedCo.reason || "",
      status: selectedCo.status,
      amount: selectedCo.amount != null ? String(selectedCo.amount) : "",
      schedule_impact_days:
        selectedCo.schedule_impact_days != null
          ? String(selectedCo.schedule_impact_days)
          : "",
    });
    setIsEditing(true);
    setSaveError("");
  }

  async function handleSave() {
    if (!selectedCo) return;
    setSaving(true);
    setSaveError("");

    try {
      const payload: Record<string, unknown> = { id: selectedCo.id };

      if (editData.title !== undefined) payload.title = editData.title;
      if (editData.description !== undefined)
        payload.description = editData.description;
      if (editData.reason !== undefined) payload.reason = editData.reason;
      if (editData.status !== undefined) payload.status = editData.status;
      if (editData.amount !== undefined && editData.amount !== "")
        payload.amount = Number(editData.amount);
      if (editData.schedule_impact_days !== undefined && editData.schedule_impact_days !== "")
        payload.schedule_impact_days = Number(editData.schedule_impact_days);

      const res = await fetch("/api/projects/change-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("changeOrders.updateFailed"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : t("changeOrders.updateFailed")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedCo) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch("/api/projects/change-orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedCo.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("changeOrders.deleteFailed"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : t("changeOrders.deleteFailed")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/projects/change-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: formData.project_id,
          title: formData.title,
          description: formData.description || undefined,
          reason: formData.reason || undefined,
          amount: formData.amount !== "" ? Number(formData.amount) : 0,
          schedule_impact_days:
            formData.schedule_impact_days !== ""
              ? Number(formData.schedule_impact_days)
              : 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("changeOrders.createFailed"));
      }

      // Reset form and close modal
      setFormData({
        project_id: "",
        title: "",
        description: "",
        reason: "",
        amount: "",
        schedule_impact_days: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : t("changeOrders.createFailed")
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>{t("changeOrders.title")}</h2>
          <p className="fin-header-sub">
            {t("changeOrders.subtitle")}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            {t("changeOrders.importCsv")}
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            {t("changeOrders.newChangeOrder")}
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="financial-kpi-row">
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <Hash size={18} />
          </div>
          <span className="fin-kpi-label">{t("changeOrders.totalCOs")}</span>
          <span className="fin-kpi-value">{kpi.totalCount}</span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <DollarSign size={18} />
          </div>
          <span className="fin-kpi-label">{t("changeOrders.pendingValue")}</span>
          <span className="fin-kpi-value">
            {formatCompactCurrency(kpi.pendingValue)}
          </span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon green">
            <CheckCircle2 size={18} />
          </div>
          <span className="fin-kpi-label">{t("changeOrders.approvedValue")}</span>
          <span className="fin-kpi-value positive">
            {formatCompactCurrency(kpi.approvedValue)}
          </span>
        </div>
        <div className="fin-kpi">
          <div className="fin-kpi-icon red">
            <Clock size={18} />
          </div>
          <span className="fin-kpi-label">{t("changeOrders.awaitingApproval")}</span>
          <span className="fin-kpi-value">{kpi.awaitingApproval}</span>
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
          {t("changeOrders.statusLabel")}
        </label>
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

      {/* Table */}
      {rows.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>{t("changeOrders.coNumber")}</th>
                  <th>{t("changeOrders.titleLabel")}</th>
                  <th>{t("changeOrders.project")}</th>
                  <th>{t("changeOrders.reason")}</th>
                  <th style={{ textAlign: "right" }}>{t("changeOrders.amount")}</th>
                  <th style={{ textAlign: "right" }}>{t("changeOrders.scheduleImpact")}</th>
                  <th>{t("changeOrders.requestedBy")}</th>
                  <th>{t("changeOrders.status")}</th>
                  <th>{t("changeOrders.jeColumn")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((co) => {
                  const project = co.projects;
                  const amount = co.amount;
                  const isNegative = amount != null && amount < 0;
                  const isLarge = amount != null && amount > 100000;

                  return (
                    <tr
                      key={co.id}
                      onClick={() => openDetail(co)}
                      style={{ cursor: "pointer" }}
                    >
                      <td
                        style={{
                          fontWeight: 600,
                          fontSize: "0.82rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {co.co_number}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{co.title}</div>
                        {co.description && (
                          <div
                            style={{
                              fontSize: "0.78rem",
                              color: "var(--muted)",
                              marginTop: 2,
                              maxWidth: 300,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {co.description}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          fontSize: "0.82rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {project ? (
                          <span style={{ color: "var(--muted)" }}>
                            <strong>{project.code}</strong>
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td>
                        {co.reason ? (
                          <span
                            className={`badge ${
                              REASON_BADGE[co.reason] ?? "badge-blue"
                            }`}
                          >
                            {REASON_LABELS[co.reason] ?? co.reason}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td className="amount-col">
                        {amount != null ? (
                          <span
                            style={{
                              color: isNegative
                                ? "var(--color-green)"
                                : isLarge
                                ? "var(--color-red)"
                                : "var(--text)",
                              fontWeight:
                                isNegative || isLarge ? 600 : 400,
                            }}
                          >
                            {formatCurrency(amount)}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td className="amount-col">
                        {co.schedule_impact_days != null ? (
                          <span
                            style={{
                              color:
                                co.schedule_impact_days > 0
                                  ? "var(--color-red)"
                                  : co.schedule_impact_days < 0
                                  ? "var(--color-green)"
                                  : "var(--text)",
                              fontWeight:
                                co.schedule_impact_days !== 0 ? 600 : 400,
                            }}
                          >
                            {co.schedule_impact_days > 0 ? "+" : ""}
                            {co.schedule_impact_days}d
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {co.requested_by
                          ? userMap[co.requested_by] ?? "--"
                          : "--"}
                      </td>
                      <td>
                        <span
                          className={
                            STATUS_BADGE[co.status] ?? "inv-status"
                          }
                        >
                          {co.status}
                        </span>
                      </td>
                      <td>
                        {linkedJEs[co.id]?.length ? (
                          linkedJEs[co.id].map((je) => (
                            <Link
                              key={je.id}
                              href={`/financial/general-ledger?entry=${je.entry_number}`}
                              className="je-link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {je.entry_number}
                            </Link>
                          ))
                        ) : co.status === "approved" ? (
                          <span className="je-missing" title={t("changeOrders.noJeFound")}>
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
              <FileEdit size={48} />
            </div>
            <div className="fin-empty-title">{t("changeOrders.emptyTitle")}</div>
            <div className="fin-empty-desc">
              {activeStatus && activeStatus !== "all"
                ? t("changeOrders.emptyFilterDesc")
                : t("changeOrders.emptyDesc")}
            </div>
          </div>
        </div>
      )}

      {/* Create Change Order Modal */}
      {showCreate && (
        <div
          className="ticket-modal-overlay"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="ticket-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ticket-modal-header">
              <h3>{t("changeOrders.createTitle")}</h3>
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
                <label className="ticket-form-label">{t("changeOrders.projectRequired")}</label>
                <select
                  className="ticket-form-select"
                  value={formData.project_id}
                  onChange={(e) =>
                    setFormData({ ...formData, project_id: e.target.value })
                  }
                  required
                >
                  <option value="">{t("changeOrders.selectProject")}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code ? `${p.code} - ` : ""}
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("changeOrders.titleRequired")}</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder={t("changeOrders.titlePlaceholder")}
                  required
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("changeOrders.description")}</label>
                <textarea
                  className="ticket-form-textarea"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  placeholder={t("changeOrders.descriptionPlaceholder")}
                  rows={3}
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("changeOrders.reason")}</label>
                <select
                  className="ticket-form-select"
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                >
                  <option value="">{t("changeOrders.selectReason")}</option>
                  {REASON_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">
                    {t("changeOrders.costImpact")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="ticket-form-input"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    placeholder={t("changeOrders.costPlaceholder")}
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">
                    {t("changeOrders.scheduleImpactDays")}
                  </label>
                  <input
                    type="number"
                    className="ticket-form-input"
                    value={formData.schedule_impact_days}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        schedule_impact_days: e.target.value,
                      })
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="ticket-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  {t("changeOrders.cancel")}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    creating ||
                    !formData.title.trim() ||
                    !formData.project_id
                  }
                >
                  {creating ? t("changeOrders.creating") : t("changeOrders.createChangeOrder")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail / Edit / Delete Modal */}
      {selectedCo && (
        <div className="ticket-modal-overlay" onClick={closeDetail}>
          <div
            className="ticket-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ticket-modal-header">
              <h3>
                {showDeleteConfirm
                  ? t("changeOrders.deleteTitle")
                  : isEditing
                  ? t("changeOrders.editTitle")
                  : t("changeOrders.coDetailTitle", { number: selectedCo.co_number })}
              </h3>
              <button className="ticket-modal-close" onClick={closeDetail}>
                <X size={18} />
              </button>
            </div>

            {saveError && (
              <div className="ticket-form-error">{saveError}</div>
            )}

            {/* ---------- Delete Confirmation ---------- */}
            {showDeleteConfirm && (
              <div style={{ padding: "1.25rem" }}>
                <p style={{ marginBottom: "1.25rem", fontSize: "0.92rem" }}>
                  {t("changeOrders.deleteConfirm")}{" "}
                  <strong>{selectedCo.co_number}</strong>? {t("changeOrders.deleteWarning")}
                </p>
                <div className="ticket-form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={saving}
                  >
                    {t("changeOrders.cancel")}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ background: "var(--color-red)", borderColor: "var(--color-red)" }}
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    {saving ? t("changeOrders.deleting") : t("changeOrders.delete")}
                  </button>
                </div>
              </div>
            )}

            {/* ---------- Edit Mode ---------- */}
            {isEditing && !showDeleteConfirm && (
              <div style={{ padding: "1.25rem" }}>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("changeOrders.titleLabel")}</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={(editData.title as string) ?? ""}
                    onChange={(e) =>
                      setEditData({ ...editData, title: e.target.value })
                    }
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("changeOrders.description")}</label>
                  <textarea
                    className="ticket-form-textarea"
                    value={(editData.description as string) ?? ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("changeOrders.reason")}</label>
                  <select
                    className="ticket-form-select"
                    value={(editData.reason as string) ?? ""}
                    onChange={(e) =>
                      setEditData({ ...editData, reason: e.target.value })
                    }
                  >
                    <option value="">{t("changeOrders.selectReason")}</option>
                    {REASON_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("changeOrders.status")}</label>
                  <select
                    className="ticket-form-select"
                    value={(editData.status as string) ?? ""}
                    onChange={(e) =>
                      setEditData({ ...editData, status: e.target.value })
                    }
                  >
                    <option value="draft">{t("changeOrders.statusDraft")}</option>
                    <option value="submitted">{t("changeOrders.statusSubmitted")}</option>
                    <option value="approved">{t("changeOrders.statusApproved")}</option>
                    <option value="rejected">{t("changeOrders.statusRejected")}</option>
                  </select>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">
                      {t("changeOrders.costImpact")}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="ticket-form-input"
                      value={(editData.amount as string) ?? ""}
                      onChange={(e) =>
                        setEditData({ ...editData, amount: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>

                  <div className="ticket-form-group">
                    <label className="ticket-form-label">
                      {t("changeOrders.scheduleImpactDays")}
                    </label>
                    <input
                      type="number"
                      className="ticket-form-input"
                      value={(editData.schedule_impact_days as string) ?? ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          schedule_impact_days: e.target.value,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="ticket-form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                  >
                    {t("changeOrders.cancel")}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? t("changeOrders.saving") : t("changeOrders.saveChanges")}
                  </button>
                </div>
              </div>
            )}

            {/* ---------- View Mode ---------- */}
            {!isEditing && !showDeleteConfirm && (
              <div style={{ padding: "1.25rem" }}>
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("changeOrders.coNumberLabel")}</label>
                    <div className="detail-value">
                      {selectedCo.co_number}
                    </div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("changeOrders.status")}</label>
                    <div className="detail-value">
                      <span
                        className={
                          STATUS_BADGE[selectedCo.status] ?? "inv-status"
                        }
                      >
                        {selectedCo.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-group">
                  <label className="detail-label">{t("changeOrders.titleLabel")}</label>
                  <div className="detail-value">
                    {selectedCo.title}
                  </div>
                </div>

                {selectedCo.description && (
                  <div className="detail-group">
                    <label className="detail-label">{t("changeOrders.description")}</label>
                    <div className="detail-value--multiline">
                      {selectedCo.description}
                    </div>
                  </div>
                )}

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("changeOrders.project")}</label>
                    <div className="detail-value">
                      {selectedCo.projects
                        ? `${selectedCo.projects.code} - ${selectedCo.projects.name}`
                        : "--"}
                    </div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("changeOrders.reason")}</label>
                    <div className="detail-value">
                      {selectedCo.reason ? (
                        <span
                          className={`badge ${
                            REASON_BADGE[selectedCo.reason] ?? "badge-blue"
                          }`}
                        >
                          {REASON_LABELS[selectedCo.reason] ??
                            selectedCo.reason}
                        </span>
                      ) : (
                        "--"
                      )}
                    </div>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("changeOrders.amount")}</label>
                    <div className="detail-value">
                      {selectedCo.amount != null
                        ? formatCurrency(selectedCo.amount)
                        : "--"}
                    </div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">
                      {t("changeOrders.scheduleImpact")}
                    </label>
                    <div className="detail-value">
                      {selectedCo.schedule_impact_days != null
                        ? `${selectedCo.schedule_impact_days > 0 ? "+" : ""}${selectedCo.schedule_impact_days} ${t("changeOrders.days")}`
                        : "--"}
                    </div>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("changeOrders.requestedBy")}</label>
                    <div className="detail-value">
                      {selectedCo.requested_by
                        ? userMap[selectedCo.requested_by] ?? "--"
                        : "--"}
                    </div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">{t("changeOrders.approvedBy")}</label>
                    <div className="detail-value">
                      {selectedCo.approved_by
                        ? userMap[selectedCo.approved_by] ?? "--"
                        : "--"}
                    </div>
                  </div>
                </div>

                <div className="ticket-form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ color: "var(--color-red)" }}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    {t("changeOrders.delete")}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={closeDetail}
                  >
                    {t("changeOrders.close")}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={startEditing}
                  >
                    {t("changeOrders.edit")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showImport && (
        <ImportModal
          entityName={t("changeOrders.title")}
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => { setShowImport(false); setImportProjectId(""); }}
          projects={projects}
          selectedProjectId={importProjectId}
          onProjectChange={setImportProjectId}
        />
      )}
    </div>
  );
}
