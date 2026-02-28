"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Plus,
  X,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  Landmark,
  FileCheck,
} from "lucide-react";
import { formatDateSafe } from "@/lib/utils/format";
import type {
  BankReconciliationRow,
  BankAccountRow,
} from "@/lib/queries/banking";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ReconciliationClientProps {
  reconciliations: BankReconciliationRow[];
  accounts: BankAccountRow[];
  companyId: string;
  userId: string;
}

export default function ReconciliationClient({
  reconciliations,
  accounts,
  companyId,
  userId,
}: ReconciliationClientProps) {
  const router = useRouter();
  const t = useTranslations("financial");

  function formatDate(dateStr: string | null) {
    return formatDateSafe(dateStr);
  }

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    bank_account_id: "",
    statement_date: new Date().toISOString().split("T")[0],
    statement_ending_balance: "",
    notes: "",
  });

  // Detail / Edit / Delete modal
  const [selectedRecon, setSelectedRecon] =
    useState<BankReconciliationRow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Create reconciliation handler
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/financial/banking/reconciliations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_account_id: formData.bank_account_id,
          statement_date: formData.statement_date,
          statement_ending_balance:
            parseFloat(formData.statement_ending_balance) || 0,
          notes: formData.notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToCreateReconciliation"));
      }

      setFormData({
        bank_account_id: "",
        statement_date: new Date().toISOString().split("T")[0],
        statement_ending_balance: "",
        notes: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error
          ? err.message
          : t("failedToCreateReconciliation")
      );
    } finally {
      setCreating(false);
    }
  }

  function openDetail(recon: BankReconciliationRow) {
    setSelectedRecon(recon);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  function closeDetail() {
    setSelectedRecon(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  function startEditing() {
    if (!selectedRecon) return;
    setEditData({
      statement_date: selectedRecon.statement_date,
      statement_ending_balance:
        selectedRecon.statement_ending_balance.toString(),
      status: selectedRecon.status,
      notes: selectedRecon.notes || "",
    });
    setIsEditing(true);
    setSaveError("");
  }

  function cancelEditing() {
    setIsEditing(false);
    setEditData({});
    setSaveError("");
  }

  async function handleSave() {
    if (!selectedRecon) return;
    setSaving(true);
    setSaveError("");

    try {
      const payload: Record<string, unknown> = {};
      if (editData.statement_date !== selectedRecon.statement_date)
        payload.statement_date = editData.statement_date;
      const newBalance =
        parseFloat(editData.statement_ending_balance as string) || 0;
      if (newBalance !== selectedRecon.statement_ending_balance)
        payload.statement_ending_balance = newBalance;
      if (editData.status !== selectedRecon.status)
        payload.status = editData.status;
      if (editData.notes !== (selectedRecon.notes || ""))
        payload.notes = (editData.notes as string) || null;

      if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        return;
      }

      const res = await fetch(
        `/api/financial/banking/reconciliations/${selectedRecon.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToUpdateReconciliation"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error
          ? err.message
          : t("failedToUpdateReconciliation")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedRecon) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(
        `/api/financial/banking/reconciliations/${selectedRecon.id}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToDeleteReconciliation"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error
          ? err.message
          : t("failedToDeleteReconciliation")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="banking-page">
      {/* Back button */}
      <button
        className="banking-back-btn"
        onClick={() => router.push("/financial/banking")}
      >
        <ArrowLeft size={16} />
        {t("backToBanking")}
      </button>

      {/* Header */}
      <div className="banking-header">
        <div>
          <h2>{t("bankReconciliation")}</h2>
          <p className="banking-header-sub">
            {t("reconciliationCount", { count: reconciliations.length })}
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowCreate(true)}
        >
          <Plus size={16} />
          {t("newReconciliation")}
        </button>
      </div>

      {/* Table */}
      {reconciliations.length === 0 ? (
        <div className="banking-empty">
          <div className="banking-empty-icon">
            <FileCheck size={28} />
          </div>
          <h3>{t("noReconciliationsYet")}</h3>
          <p>{t("startFirstReconciliation")}</p>
          <button
            className="btn-primary"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={16} />
            {t("newReconciliation")}
          </button>
        </div>
      ) : (
        <div className="banking-table-wrap">
          <table className="banking-table">
            <thead>
              <tr>
                <th>{t("account")}</th>
                <th>{t("statementDate")}</th>
                <th>{t("statementBalance")}</th>
                <th>{t("bookBalance")}</th>
                <th>{t("difference")}</th>
                <th>{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {reconciliations.map((recon) => (
                <tr
                  key={recon.id}
                  onClick={() => openDetail(recon)}
                  className="banking-table-row"
                >
                  <td className="banking-desc-cell">
                    {recon.bank_account?.name || t("unknownAccount")}
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--muted)",
                      }}
                    >
                      {recon.bank_account?.bank_name || ""}
                    </div>
                  </td>
                  <td className="banking-date-cell">
                    {formatDate(recon.statement_date)}
                  </td>
                  <td className="banking-balance-cell">
                    {formatCurrency(recon.statement_ending_balance)}
                  </td>
                  <td className="banking-balance-cell">
                    {formatCurrency(recon.book_balance)}
                  </td>
                  <td
                    className="banking-balance-cell"
                    style={{
                      color:
                        Math.abs(recon.difference) < 0.01
                          ? "var(--color-green)"
                          : "var(--color-red)",
                      fontWeight: 600,
                    }}
                  >
                    {formatCurrency(recon.difference)}
                  </td>
                  <td>
                    <span
                      className={`banking-recon-status-badge status-${recon.status}`}
                    >
                      {recon.status === "completed" ? (
                        <>
                          <CheckCircle2 size={12} />
                          {t("completed")}
                        </>
                      ) : (
                        <>
                          <Clock size={12} />
                          {t("inProgress")}
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Reconciliation Modal */}
      {showCreate && (
        <div
          className="banking-modal-overlay"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="banking-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="banking-modal-header">
              <h3>{t("newReconciliation")}</h3>
              <button
                className="banking-modal-close"
                onClick={() => setShowCreate(false)}
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="banking-form-error">{createError}</div>
            )}

            <form onSubmit={handleCreate} className="banking-form">
              <div className="banking-form-group">
                <label className="banking-form-label">
                  {t("bankAccountRequired")}
                </label>
                <select
                  className="banking-form-select"
                  value={formData.bank_account_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bank_account_id: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">{t("selectBankAccount")}</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} - {acc.bank_name} (
                      {formatCurrency(acc.current_balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="banking-form-row">
                <div className="banking-form-group">
                  <label className="banking-form-label">
                    {t("statementDateRequired")}
                  </label>
                  <input
                    type="date"
                    className="banking-form-input"
                    value={formData.statement_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        statement_date: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="banking-form-group">
                  <label className="banking-form-label">
                    {t("statementEndingBalanceRequired")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="banking-form-input"
                    value={formData.statement_ending_balance}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        statement_ending_balance: e.target.value,
                      })
                    }
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="banking-form-group">
                <label className="banking-form-label">{t("notes")}</label>
                <textarea
                  className="banking-form-input"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder={t("additionalNotes")}
                  rows={3}
                  style={{ resize: "vertical", minHeight: 60 }}
                />
              </div>

              <div className="banking-form-actions">
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
                    !formData.bank_account_id ||
                    !formData.statement_ending_balance
                  }
                >
                  {creating ? t("creating") : t("startReconciliation")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail / Edit / Delete Modal */}
      {selectedRecon && (
        <div className="banking-modal-overlay" onClick={closeDetail}>
          <div
            className="banking-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="banking-modal-header">
              <h3>
                {isEditing
                  ? t("editReconciliation")
                  : t("reconciliationDetails")}
              </h3>
              <button className="banking-modal-close" onClick={closeDetail}>
                <X size={18} />
              </button>
            </div>

            {saveError && (
              <div className="banking-form-error">{saveError}</div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div
                className="banking-modal-overlay"
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  position: "absolute",
                  zIndex: 1000,
                  borderRadius: "inherit",
                }}
              >
                <div
                  className="banking-modal"
                  onClick={(e) => e.stopPropagation()}
                  style={{ maxWidth: 440 }}
                >
                  <div className="banking-modal-header">
                    <h3>{t("deleteReconciliation")}</h3>
                    <button
                      className="banking-modal-close"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div style={{ padding: "1rem 1.5rem" }}>
                    <p>
                      {t("deleteReconciliationConfirm")}
                    </p>
                  </div>
                  <div className="banking-form-actions">
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
                      style={{
                        backgroundColor: "var(--color-danger, #dc2626)",
                      }}
                      onClick={handleDelete}
                      disabled={saving}
                    >
                      {saving ? t("deleting") : t("delete")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Read-only view */}
            {!isEditing && (
              <div
                className="banking-form"
                style={{
                  pointerEvents: showDeleteConfirm ? "none" : "auto",
                }}
              >
                <div className="banking-form-group">
                  <label className="banking-form-label">{t("account")}</label>
                  <div
                    className="banking-form-input"
                    style={{
                      background: "var(--color-bg-tertiary, #f3f4f6)",
                      cursor: "default",
                    }}
                  >
                    {selectedRecon.bank_account?.name || t("unknown")} -{" "}
                    {selectedRecon.bank_account?.bank_name || ""}
                  </div>
                </div>

                <div className="banking-form-row">
                  <div className="banking-form-group">
                    <label className="banking-form-label">
                      {t("statementDate")}
                    </label>
                    <div
                      className="banking-form-input"
                      style={{
                        background: "var(--color-bg-tertiary, #f3f4f6)",
                        cursor: "default",
                      }}
                    >
                      {formatDate(selectedRecon.statement_date)}
                    </div>
                  </div>
                  <div className="banking-form-group">
                    <label className="banking-form-label">{t("status")}</label>
                    <div
                      className="banking-form-input"
                      style={{
                        background: "var(--color-bg-tertiary, #f3f4f6)",
                        cursor: "default",
                      }}
                    >
                      <span
                        className={`banking-recon-status-badge status-${selectedRecon.status}`}
                      >
                        {selectedRecon.status === "completed"
                          ? t("completed")
                          : t("inProgress")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="banking-form-row">
                  <div className="banking-form-group">
                    <label className="banking-form-label">
                      {t("statementBalance")}
                    </label>
                    <div
                      className="banking-form-input"
                      style={{
                        background: "var(--color-bg-tertiary, #f3f4f6)",
                        cursor: "default",
                        fontWeight: 600,
                      }}
                    >
                      {formatCurrency(
                        selectedRecon.statement_ending_balance
                      )}
                    </div>
                  </div>
                  <div className="banking-form-group">
                    <label className="banking-form-label">
                      {t("bookBalance")}
                    </label>
                    <div
                      className="banking-form-input"
                      style={{
                        background: "var(--color-bg-tertiary, #f3f4f6)",
                        cursor: "default",
                        fontWeight: 600,
                      }}
                    >
                      {formatCurrency(selectedRecon.book_balance)}
                    </div>
                  </div>
                </div>

                <div className="banking-form-group">
                  <label className="banking-form-label">{t("difference")}</label>
                  <div
                    className="banking-form-input"
                    style={{
                      background: "var(--color-bg-tertiary, #f3f4f6)",
                      cursor: "default",
                      fontWeight: 700,
                      color:
                        Math.abs(selectedRecon.difference) < 0.01
                          ? "var(--color-green)"
                          : "var(--color-red)",
                    }}
                  >
                    {formatCurrency(selectedRecon.difference)}
                  </div>
                </div>

                {selectedRecon.notes && (
                  <div className="banking-form-group">
                    <label className="banking-form-label">{t("notes")}</label>
                    <div
                      className="banking-form-input"
                      style={{
                        background: "var(--color-bg-tertiary, #f3f4f6)",
                        cursor: "default",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {selectedRecon.notes}
                    </div>
                  </div>
                )}

                <div className="banking-form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ color: "var(--color-danger, #dc2626)" }}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 size={16} />
                    {t("delete")}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={closeDetail}
                  >
                    {t("close")}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={startEditing}
                  >
                    <Edit3 size={16} />
                    {t("edit")}
                  </button>
                </div>
              </div>
            )}

            {/* Edit view */}
            {isEditing && (
              <div className="banking-form">
                <div className="banking-form-row">
                  <div className="banking-form-group">
                    <label className="banking-form-label">
                      {t("statementDateRequired")}
                    </label>
                    <input
                      type="date"
                      className="banking-form-input"
                      value={(editData.statement_date as string) || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          statement_date: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="banking-form-group">
                    <label className="banking-form-label">{t("status")}</label>
                    <select
                      className="banking-form-select"
                      value={(editData.status as string) || "in_progress"}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          status: e.target.value,
                        })
                      }
                    >
                      <option value="in_progress">{t("inProgress")}</option>
                      <option value="completed">{t("completed")}</option>
                    </select>
                  </div>
                </div>

                <div className="banking-form-group">
                  <label className="banking-form-label">
                    {t("statementEndingBalanceRequired")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="banking-form-input"
                    value={
                      (editData.statement_ending_balance as string) || ""
                    }
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        statement_ending_balance: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="banking-form-group">
                  <label className="banking-form-label">{t("notes")}</label>
                  <textarea
                    className="banking-form-input"
                    value={(editData.notes as string) || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        notes: e.target.value,
                      })
                    }
                    rows={3}
                    style={{ resize: "vertical", minHeight: 60 }}
                  />
                </div>

                <div className="banking-form-actions">
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
                    disabled={saving}
                  >
                    {saving ? t("saving") : t("saveChanges")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
