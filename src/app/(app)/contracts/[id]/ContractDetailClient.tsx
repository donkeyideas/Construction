"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Plus,
  X,
  FileText,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Shield,
} from "lucide-react";
import type {
  ContractRow,
  MilestoneRow,
  ContractStatus,
  ContractType,
} from "@/lib/queries/contracts";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ContractDetailClientProps {
  contract: ContractRow;
  milestones: MilestoneRow[];
  projects: { id: string; name: string }[];
  userId: string;
  companyId: string;
}

export default function ContractDetailClient({
  contract,
  milestones,
  projects,
  userId,
  companyId,
}: ContractDetailClientProps) {
  const router = useRouter();
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  // ---------------------------------------------------------------------------
  // Constants (inside component for translation access)
  // ---------------------------------------------------------------------------

  const STATUS_LABELS: Record<ContractStatus, string> = {
    draft: t("contractStatusDraft"),
    pending_approval: t("contractStatusPendingApproval"),
    active: t("contractStatusActive"),
    expired: t("contractStatusExpired"),
    terminated: t("contractStatusTerminated"),
    completed: t("contractStatusCompleted"),
  };

  const TYPE_LABELS: Record<ContractType, string> = {
    subcontractor: t("contractTypeSubcontractor"),
    vendor: t("contractTypeVendor"),
    client: t("contractTypeClient"),
    lease: t("contractTypeLease"),
  };

  const PAYMENT_TERMS_LABELS: Record<string, string> = {
    net_30: t("paymentTermsNet30"),
    net_60: t("paymentTermsNet60"),
    net_90: t("paymentTermsNet90"),
    upon_completion: t("paymentTermsUponCompletion"),
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString(dateLocale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatCurrency(amount: number | null) {
    if (amount === null || amount === undefined) return "--";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Milestone create state
  const [showMilestoneCreate, setShowMilestoneCreate] = useState(false);
  const [milestoneCreating, setMilestoneCreating] = useState(false);
  const [milestoneError, setMilestoneError] = useState("");
  const [milestoneForm, setMilestoneForm] = useState({
    title: "",
    description: "",
    due_date: "",
    amount: "",
  });

  // Milestone complete state
  const [completingMilestoneId, setCompletingMilestoneId] = useState<string | null>(null);

  // Start editing
  function startEditing() {
    setEditData({
      title: contract.title,
      description: contract.description || "",
      status: contract.status,
      contract_type: contract.contract_type,
      party_name: contract.party_name || "",
      party_email: contract.party_email || "",
      contract_amount: contract.contract_amount ?? "",
      retention_pct: contract.retention_pct ?? "",
      start_date: contract.start_date || "",
      end_date: contract.end_date || "",
      payment_terms: contract.payment_terms || "",
      scope_of_work: contract.scope_of_work || "",
      insurance_required: contract.insurance_required ?? false,
      bond_required: contract.bond_required ?? false,
      project_id: contract.project_id || "",
    });
    setIsEditing(true);
    setSaveError("");
  }

  function cancelEditing() {
    setIsEditing(false);
    setEditData({});
    setSaveError("");
  }

  // Save edits
  async function handleSave() {
    setSaving(true);
    setSaveError("");

    try {
      const payload: Record<string, unknown> = {};
      if (editData.title !== contract.title) payload.title = editData.title;
      if (editData.description !== (contract.description || ""))
        payload.description = editData.description;
      if (editData.status !== contract.status) payload.status = editData.status;
      if (editData.contract_type !== contract.contract_type)
        payload.contract_type = editData.contract_type;
      if (editData.party_name !== (contract.party_name || ""))
        payload.party_name = editData.party_name || null;
      if (editData.party_email !== (contract.party_email || ""))
        payload.party_email = editData.party_email || null;
      if (String(editData.contract_amount) !== String(contract.contract_amount ?? ""))
        payload.contract_amount = editData.contract_amount ? Number(editData.contract_amount) : null;
      if (String(editData.retention_pct) !== String(contract.retention_pct ?? ""))
        payload.retention_pct = editData.retention_pct ? Number(editData.retention_pct) : null;
      if (editData.start_date !== (contract.start_date || ""))
        payload.start_date = editData.start_date || null;
      if (editData.end_date !== (contract.end_date || ""))
        payload.end_date = editData.end_date || null;
      if (editData.payment_terms !== (contract.payment_terms || ""))
        payload.payment_terms = editData.payment_terms || null;
      if (editData.scope_of_work !== (contract.scope_of_work || ""))
        payload.scope_of_work = editData.scope_of_work || null;
      if (editData.insurance_required !== contract.insurance_required)
        payload.insurance_required = editData.insurance_required;
      if (editData.bond_required !== contract.bond_required)
        payload.bond_required = editData.bond_required;
      if (editData.project_id !== (contract.project_id || ""))
        payload.project_id = editData.project_id || null;

      if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        return;
      }

      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToUpdateContract"));
      }

      setIsEditing(false);
      setEditData({});
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("failedToUpdateContract"));
    } finally {
      setSaving(false);
    }
  }

  // Delete contract
  async function handleDelete() {
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToDeleteContract"));
      }

      router.push("/contracts");
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("failedToDeleteContract"));
    } finally {
      setSaving(false);
    }
  }

  // Create milestone
  async function handleCreateMilestone(e: React.FormEvent) {
    e.preventDefault();
    setMilestoneCreating(true);
    setMilestoneError("");

    try {
      const res = await fetch(`/api/contracts/${contract.id}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: milestoneForm.title,
          description: milestoneForm.description || undefined,
          due_date: milestoneForm.due_date || undefined,
          amount: milestoneForm.amount ? Number(milestoneForm.amount) : undefined,
          sort_order: milestones.length,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToCreateMilestone"));
      }

      setMilestoneForm({ title: "", description: "", due_date: "", amount: "" });
      setShowMilestoneCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setMilestoneError(err instanceof Error ? err.message : t("failedToCreateMilestone"));
    } finally {
      setMilestoneCreating(false);
    }
  }

  // Complete milestone
  async function handleCompleteMilestone(milestoneId: string) {
    setCompletingMilestoneId(milestoneId);

    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // dummy to satisfy endpoint
      });

      const milestoneRes = await fetch(`/api/contracts/${contract.id}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _action: "complete",
          milestone_id: milestoneId,
        }),
      });

      router.refresh();
    } catch {
      // Silently handle error
    } finally {
      setCompletingMilestoneId(null);
    }
  }

  return (
    <div className="contracts-detail">
      {/* Back button */}
      <button
        className="contracts-back-btn"
        onClick={() => router.push("/contracts")}
      >
        <ArrowLeft size={16} />
        {t("backToContracts")}
      </button>

      {saveError && (
        <div className="contracts-form-error" style={{ marginBottom: 16 }}>
          {saveError}
        </div>
      )}

      <div className="contracts-detail-layout">
        {/* Left: Main content */}
        <div className="contracts-main">
          {/* Header card */}
          <div className="contracts-main-header">
            <div className="contracts-number-label">{contract.contract_number}</div>

            {!isEditing ? (
              <>
                <h1 className="contracts-detail-title">{contract.title}</h1>
                <div className="contracts-meta-row">
                  <span className={`contracts-status-badge status-${contract.status}`}>
                    {STATUS_LABELS[contract.status] ?? contract.status}
                  </span>
                  <span className="contracts-type-badge">
                    {TYPE_LABELS[contract.contract_type] ?? contract.contract_type}
                  </span>
                </div>
              </>
            ) : (
              <div className="contracts-form" style={{ marginTop: 12 }}>
                <div className="contracts-form-group">
                  <label className="contracts-form-label">{t("titleRequired")}</label>
                  <input
                    type="text"
                    className="contracts-form-input"
                    value={(editData.title as string) || ""}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("status")}</label>
                    <select
                      className="contracts-form-select"
                      value={(editData.status as string) || "draft"}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    >
                      {(Object.keys(STATUS_LABELS) as ContractStatus[]).map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("type")}</label>
                    <select
                      className="contracts-form-select"
                      value={(editData.contract_type as string) || "subcontractor"}
                      onChange={(e) => setEditData({ ...editData, contract_type: e.target.value })}
                    >
                      {(Object.keys(TYPE_LABELS) as ContractType[]).map((ct) => (
                        <option key={ct} value={ct}>{TYPE_LABELS[ct]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("partyName")}</label>
                    <input
                      type="text"
                      className="contracts-form-input"
                      value={(editData.party_name as string) || ""}
                      onChange={(e) => setEditData({ ...editData, party_name: e.target.value })}
                    />
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("partyEmail")}</label>
                    <input
                      type="email"
                      className="contracts-form-input"
                      value={(editData.party_email as string) || ""}
                      onChange={(e) => setEditData({ ...editData, party_email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("amount")}</label>
                    <input
                      type="number"
                      className="contracts-form-input"
                      value={editData.contract_amount as string ?? ""}
                      onChange={(e) => setEditData({ ...editData, contract_amount: e.target.value })}
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("retentionPercent")}</label>
                    <input
                      type="number"
                      className="contracts-form-input"
                      value={editData.retention_pct as string ?? ""}
                      onChange={(e) => setEditData({ ...editData, retention_pct: e.target.value })}
                      step="0.1"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("startDate")}</label>
                    <input
                      type="date"
                      className="contracts-form-input"
                      value={(editData.start_date as string) || ""}
                      onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-label">{t("endDate")}</label>
                    <input
                      type="date"
                      className="contracts-form-input"
                      value={(editData.end_date as string) || ""}
                      onChange={(e) => setEditData({ ...editData, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="contracts-form-group">
                  <label className="contracts-form-label">{t("paymentTerms")}</label>
                  <select
                    className="contracts-form-select"
                    value={(editData.payment_terms as string) || ""}
                    onChange={(e) => setEditData({ ...editData, payment_terms: e.target.value })}
                  >
                    <option value="">{t("selectTermsPlaceholder")}</option>
                    {Object.entries(PAYMENT_TERMS_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="contracts-form-group">
                  <label className="contracts-form-label">{t("project")}</label>
                  <select
                    className="contracts-form-select"
                    value={(editData.project_id as string) || ""}
                    onChange={(e) => setEditData({ ...editData, project_id: e.target.value })}
                  >
                    <option value="">{t("noProject")}</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="contracts-form-row">
                  <div className="contracts-form-group">
                    <label className="contracts-form-checkbox-label">
                      <input
                        type="checkbox"
                        checked={(editData.insurance_required as boolean) ?? false}
                        onChange={(e) => setEditData({ ...editData, insurance_required: e.target.checked })}
                      />
                      {t("insuranceRequired")}
                    </label>
                  </div>
                  <div className="contracts-form-group">
                    <label className="contracts-form-checkbox-label">
                      <input
                        type="checkbox"
                        checked={(editData.bond_required as boolean) ?? false}
                        onChange={(e) => setEditData({ ...editData, bond_required: e.target.checked })}
                      />
                      {t("bondRequired")}
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
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={saving || !(editData.title as string)?.trim()}
                  >
                    {saving ? t("saving") : t("saveChanges")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Description / Scope */}
          {!isEditing && (
            <>
              {contract.description && (
                <div className="contracts-description">
                  <h3>{t("description")}</h3>
                  <p>{contract.description}</p>
                </div>
              )}

              {contract.scope_of_work && (
                <div className="contracts-description">
                  <h3>{t("scopeOfWork")}</h3>
                  <p>{contract.scope_of_work}</p>
                </div>
              )}
            </>
          )}

          {/* Milestones Section */}
          <div className="contracts-milestones">
            <div className="contracts-milestones-header">
              <h3>
                {t("milestones")}{" "}
                <span className="contracts-milestones-count">
                  ({milestones.length})
                </span>
              </h3>
              <button
                className="btn-secondary"
                onClick={() => setShowMilestoneCreate(true)}
                style={{ fontSize: "0.82rem", padding: "6px 12px" }}
              >
                <Plus size={14} />
                {t("addMilestone")}
              </button>
            </div>

            {milestones.length === 0 ? (
              <div className="contracts-milestones-empty">
                <p>{t("noMilestonesYet")}</p>
              </div>
            ) : (
              <div className="contracts-milestones-table-wrap">
                <table className="contracts-milestones-table">
                  <thead>
                    <tr>
                      <th>{t("title")}</th>
                      <th>{t("dueDate")}</th>
                      <th>{t("amount")}</th>
                      <th>{t("status")}</th>
                      <th>{t("action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.map((m) => (
                      <tr key={m.id}>
                        <td className="contracts-milestone-title">{m.title}</td>
                        <td className="contracts-date-cell">{formatDate(m.due_date)}</td>
                        <td className="contracts-amount-cell">{formatCurrency(m.amount)}</td>
                        <td>
                          <span
                            className={`contracts-status-badge ${
                              m.status === "completed"
                                ? "status-completed"
                                : m.status === "in_progress"
                                ? "status-active"
                                : "status-draft"
                            }`}
                          >
                            {m.status === "completed"
                              ? t("milestoneCompleted")
                              : m.status === "in_progress"
                              ? t("milestoneInProgress")
                              : t("milestonePending")}
                          </span>
                        </td>
                        <td>
                          {m.status !== "completed" && (
                            <button
                              className="btn-secondary"
                              style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                              onClick={() => handleCompleteMilestone(m.id)}
                              disabled={completingMilestoneId === m.id}
                            >
                              <CheckCircle2 size={12} />
                              {completingMilestoneId === m.id ? "..." : t("complete")}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Edit / Delete buttons (below milestones when not editing) */}
          {!isEditing && (
            <div className="contracts-detail-actions">
              <button
                type="button"
                className="btn-secondary"
                style={{ color: "var(--color-danger, #dc2626)" }}
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 size={16} />
                {t("deleteContract")}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={startEditing}
              >
                <Edit3 size={16} />
                {t("editContract")}
              </button>
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="contracts-sidebar">
          <div className="contracts-sidebar-section">
            <h4>{t("status")}</h4>
            <span className={`contracts-status-badge status-${contract.status}`}>
              {STATUS_LABELS[contract.status] ?? contract.status}
            </span>
          </div>

          <div className="contracts-sidebar-section">
            <h4>{t("contractType")}</h4>
            <span className="contracts-type-badge">
              {TYPE_LABELS[contract.contract_type] ?? contract.contract_type}
            </span>
          </div>

          <div className="contracts-sidebar-section">
            <h4>{t("partyInformation")}</h4>
            <div className="contracts-sidebar-details">
              <div className="contracts-sidebar-detail">
                <span className="contracts-sidebar-detail-label">
                  <FileText size={13} />
                  {t("name")}
                </span>
                <span className="contracts-sidebar-detail-value">
                  {contract.party_name || "--"}
                </span>
              </div>
              <div className="contracts-sidebar-detail">
                <span className="contracts-sidebar-detail-label">
                  <FileText size={13} />
                  {t("email")}
                </span>
                <span className="contracts-sidebar-detail-value">
                  {contract.party_email || "--"}
                </span>
              </div>
            </div>
          </div>

          <div className="contracts-sidebar-section">
            <h4>{t("financialDetails")}</h4>
            <div className="contracts-sidebar-details">
              <div className="contracts-sidebar-detail">
                <span className="contracts-sidebar-detail-label">
                  <DollarSign size={13} />
                  {t("amount")}
                </span>
                <span className="contracts-sidebar-detail-value">
                  {formatCurrency(contract.contract_amount)}
                </span>
              </div>
              {milestones.length > 0 && (() => {
                const milestoneTotal = milestones.reduce((sum, m) => sum + (m.amount ?? 0), 0);
                if (milestoneTotal > 0) {
                  return (
                    <div className="contracts-sidebar-detail" style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                      <span className="contracts-sidebar-detail-label">
                        <DollarSign size={13} />
                        Milestone Total
                      </span>
                      <span className="contracts-sidebar-detail-value">
                        {formatCurrency(milestoneTotal)}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
              {contract.retention_pct !== null && contract.retention_pct !== undefined && (
                <div className="contracts-sidebar-detail">
                  <span className="contracts-sidebar-detail-label">
                    <DollarSign size={13} />
                    {t("retention")}
                  </span>
                  <span className="contracts-sidebar-detail-value">
                    {contract.retention_pct}%
                  </span>
                </div>
              )}
              <div className="contracts-sidebar-detail">
                <span className="contracts-sidebar-detail-label">
                  <Clock size={13} />
                  {t("paymentTerms")}
                </span>
                <span className="contracts-sidebar-detail-value">
                  {contract.payment_terms
                    ? PAYMENT_TERMS_LABELS[contract.payment_terms] || contract.payment_terms
                    : "--"}
                </span>
              </div>
            </div>
          </div>

          <div className="contracts-sidebar-section">
            <h4>{t("dates")}</h4>
            <div className="contracts-sidebar-details">
              <div className="contracts-sidebar-detail">
                <span className="contracts-sidebar-detail-label">
                  <Calendar size={13} />
                  {t("startDate")}
                </span>
                <span className="contracts-sidebar-detail-value">
                  {formatDate(contract.start_date)}
                </span>
              </div>
              <div className="contracts-sidebar-detail">
                <span className="contracts-sidebar-detail-label">
                  <Calendar size={13} />
                  {t("endDate")}
                </span>
                <span className="contracts-sidebar-detail-value">
                  {formatDate(contract.end_date)}
                </span>
              </div>
              <div className="contracts-sidebar-detail">
                <span className="contracts-sidebar-detail-label">
                  <Calendar size={13} />
                  {t("created")}
                </span>
                <span className="contracts-sidebar-detail-value">
                  {formatDate(contract.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="contracts-sidebar-section">
            <h4>{t("insuranceAndBond")}</h4>
            <div className="contracts-sidebar-details">
              <div className="contracts-sidebar-detail">
                <span className="contracts-sidebar-detail-label">
                  <Shield size={13} />
                  {t("insuranceRequired")}
                </span>
                <span className="contracts-sidebar-detail-value">
                  {contract.insurance_required ? t("yes") : t("no")}
                </span>
              </div>
              <div className="contracts-sidebar-detail">
                <span className="contracts-sidebar-detail-label">
                  <Shield size={13} />
                  {t("bondRequired")}
                </span>
                <span className="contracts-sidebar-detail-value">
                  {contract.bond_required ? t("yes") : t("no")}
                </span>
              </div>
            </div>
          </div>

          {contract.project && (
            <div className="contracts-sidebar-section">
              <h4>{t("project")}</h4>
              <div className="contracts-sidebar-details">
                <div className="contracts-sidebar-detail">
                  <span className="contracts-sidebar-detail-value">
                    {contract.project.name}
                  </span>
                </div>
              </div>
            </div>
          )}

          {contract.creator && (
            <div className="contracts-sidebar-section">
              <h4>{t("createdBy")}</h4>
              <div className="contracts-sidebar-details">
                <div className="contracts-sidebar-detail">
                  <span className="contracts-sidebar-detail-value">
                    {contract.creator.full_name || contract.creator.email}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="contracts-modal-overlay"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="contracts-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 440 }}
          >
            <div className="contracts-modal-header">
              <h3>{t("deleteContract")}</h3>
              <button
                className="contracts-modal-close"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: "1rem 1.5rem" }}>
              <p>
                {t("confirmDeleteContract", { number: contract.contract_number })}
              </p>
            </div>
            <div className="contracts-form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={saving}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ backgroundColor: "var(--color-danger, #dc2626)" }}
                onClick={handleDelete}
                disabled={saving}
              >
                {saving ? t("deleting") : t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Milestone Modal */}
      {showMilestoneCreate && (
        <div
          className="contracts-modal-overlay"
          onClick={() => setShowMilestoneCreate(false)}
        >
          <div className="contracts-modal" onClick={(e) => e.stopPropagation()}>
            <div className="contracts-modal-header">
              <h3>{t("addMilestone")}</h3>
              <button
                className="contracts-modal-close"
                onClick={() => setShowMilestoneCreate(false)}
              >
                <X size={18} />
              </button>
            </div>

            {milestoneError && (
              <div className="contracts-form-error">{milestoneError}</div>
            )}

            <form onSubmit={handleCreateMilestone} className="contracts-form">
              <div className="contracts-form-group">
                <label className="contracts-form-label">{t("titleRequired")}</label>
                <input
                  type="text"
                  className="contracts-form-input"
                  value={milestoneForm.title}
                  onChange={(e) =>
                    setMilestoneForm({ ...milestoneForm, title: e.target.value })
                  }
                  placeholder={t("milestoneTitlePlaceholder")}
                  required
                />
              </div>

              <div className="contracts-form-group">
                <label className="contracts-form-label">{t("description")}</label>
                <textarea
                  className="contracts-form-textarea"
                  value={milestoneForm.description}
                  onChange={(e) =>
                    setMilestoneForm({ ...milestoneForm, description: e.target.value })
                  }
                  placeholder={t("milestoneDescriptionPlaceholder")}
                  rows={3}
                />
              </div>

              <div className="contracts-form-row">
                <div className="contracts-form-group">
                  <label className="contracts-form-label">{t("dueDate")}</label>
                  <input
                    type="date"
                    className="contracts-form-input"
                    value={milestoneForm.due_date}
                    onChange={(e) =>
                      setMilestoneForm({ ...milestoneForm, due_date: e.target.value })
                    }
                  />
                </div>
                <div className="contracts-form-group">
                  <label className="contracts-form-label">{t("amount")}</label>
                  <input
                    type="number"
                    className="contracts-form-input"
                    value={milestoneForm.amount}
                    onChange={(e) =>
                      setMilestoneForm({ ...milestoneForm, amount: e.target.value })
                    }
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div className="contracts-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowMilestoneCreate(false)}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={milestoneCreating || !milestoneForm.title.trim()}
                >
                  {milestoneCreating ? t("creating") : t("addMilestone")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
