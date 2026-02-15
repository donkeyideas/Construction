"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Landmark,
  DollarSign,
  CreditCard,
  Plus,
  X,
  Edit3,
  Trash2,
  AlertTriangle,
  Upload,
} from "lucide-react";
import type { BankAccountRow, BankingStats } from "@/lib/queries/banking";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";

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

function accountTypeBadgeClass(type: string): string {
  switch (type) {
    case "checking":
      return "banking-type-badge type-checking";
    case "savings":
      return "banking-type-badge type-savings";
    case "credit":
      return "banking-type-badge type-credit";
    default:
      return "banking-type-badge type-other";
  }
}

const IMPORT_SAMPLE: Record<string, string>[] = [
  { name: "Operating Account", bank_name: "Chase", account_type: "checking", account_number_last4: "4567", routing_number_last4: "1234", current_balance: "125000" },
  { name: "Payroll Account", bank_name: "Chase", account_type: "checking", account_number_last4: "8901", routing_number_last4: "1234", current_balance: "45000" },
  { name: "Reserve Fund", bank_name: "Wells Fargo", account_type: "savings", account_number_last4: "3456", routing_number_last4: "5678", current_balance: "250000" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface BankingClientProps {
  accounts: BankAccountRow[];
  stats: BankingStats;
  companyId: string;
}

export default function BankingClient({
  accounts,
  stats,
  companyId,
}: BankingClientProps) {
  const router = useRouter();
  const t = useTranslations("financial");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const IMPORT_COLUMNS: ImportColumn[] = [
    { key: "name", label: t("importAccountName"), required: true },
    { key: "bank_name", label: t("importBankName"), required: true },
    { key: "account_type", label: t("importAccountType"), required: false },
    { key: "account_number_last4", label: t("importLast4Account"), required: false },
    { key: "routing_number_last4", label: t("importLast4Routing"), required: false },
    { key: "current_balance", label: t("importCurrentBalance"), required: false, type: "number" },
  ];

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    bank_name: "",
    account_type: "checking",
    account_number_last4: "",
    routing_number_last4: "",
    current_balance: "",
  });

  // Import modal state
  const [showImport, setShowImport] = useState(false);

  // Detail / Edit / Delete modal
  const [selectedAccount, setSelectedAccount] = useState<BankAccountRow | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Import handler
  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "bank_accounts", rows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("importFailed"));
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  // Create account handler
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/financial/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          bank_name: formData.bank_name.trim(),
          account_type: formData.account_type,
          account_number_last4: formData.account_number_last4.trim() || undefined,
          routing_number_last4: formData.routing_number_last4.trim() || undefined,
          current_balance: parseFloat(formData.current_balance) || 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToCreateBankAccount"));
      }

      setFormData({
        name: "",
        bank_name: "",
        account_type: "checking",
        account_number_last4: "",
        routing_number_last4: "",
        current_balance: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : t("failedToCreateBankAccount")
      );
    } finally {
      setCreating(false);
    }
  }

  // Open detail modal (right-click or button, but NOT card click which navigates)
  function openDetail(e: React.MouseEvent, account: BankAccountRow) {
    e.stopPropagation();
    setSelectedAccount(account);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  function closeDetail() {
    setSelectedAccount(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  function startEditing() {
    if (!selectedAccount) return;
    setEditData({
      name: selectedAccount.name,
      bank_name: selectedAccount.bank_name,
      account_type: selectedAccount.account_type,
      account_number_last4: selectedAccount.account_number_last4 || "",
      routing_number_last4: selectedAccount.routing_number_last4 || "",
      current_balance: selectedAccount.current_balance.toString(),
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
    if (!selectedAccount) return;
    setSaving(true);
    setSaveError("");

    try {
      const payload: Record<string, unknown> = {};
      if (editData.name !== selectedAccount.name) payload.name = editData.name;
      if (editData.bank_name !== selectedAccount.bank_name)
        payload.bank_name = editData.bank_name;
      if (editData.account_type !== selectedAccount.account_type)
        payload.account_type = editData.account_type;
      if (
        editData.account_number_last4 !==
        (selectedAccount.account_number_last4 || "")
      )
        payload.account_number_last4 =
          (editData.account_number_last4 as string) || null;
      if (
        editData.routing_number_last4 !==
        (selectedAccount.routing_number_last4 || "")
      )
        payload.routing_number_last4 =
          (editData.routing_number_last4 as string) || null;
      const newBalance = parseFloat(editData.current_balance as string) || 0;
      if (newBalance !== selectedAccount.current_balance)
        payload.current_balance = newBalance;

      if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        return;
      }

      const res = await fetch(`/api/financial/bank-accounts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedAccount.id, ...payload }),
      });

      if (!res.ok) {
        // Fallback: try direct supabase update via a different approach
        // Use the bank account update endpoint
        const directRes = await fetch(`/api/financial/banking/transactions`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            _action: "update_account",
            accountId: selectedAccount.id,
            ...payload,
          }),
        });
        if (!directRes.ok) {
          const data = await res.json();
          throw new Error(data.error || t("failedToUpdateBankAccount"));
        }
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : t("failedToUpdateBankAccount")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedAccount) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(`/api/financial/bank-accounts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedAccount.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToDeleteBankAccount"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : t("failedToDeleteBankAccount")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="banking-page">
      {/* Header */}
      <div className="banking-header">
        <div>
          <h2>{t("banking")}</h2>
          <p className="banking-header-sub">
            {t("bankingSubtitle")}
          </p>
        </div>
        <div className="banking-header-actions">
          <button
            className="btn-secondary"
            onClick={() =>
              router.push("/financial/banking/reconciliation")
            }
          >
            {t("reconciliation")}
          </button>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            {t("importCsv")}
          </button>
          <button
            className="btn-primary"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={16} />
            {t("addBankAccount")}
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="banking-stats">
        <div className="banking-stat-card stat-balance">
          <div className="banking-stat-icon">
            <DollarSign size={20} />
          </div>
          <div className="banking-stat-info">
            <span className="banking-stat-value">
              {formatCurrency(stats.totalBalance)}
            </span>
            <span className="banking-stat-label">{t("totalCashPosition")}</span>
          </div>
        </div>
        <div className="banking-stat-card stat-accounts">
          <div className="banking-stat-icon">
            <Landmark size={20} />
          </div>
          <div className="banking-stat-info">
            <span className="banking-stat-value">{stats.accountCount}</span>
            <span className="banking-stat-label">{t("bankAccounts")}</span>
          </div>
        </div>
        <div className="banking-stat-card stat-unreconciled">
          <div className="banking-stat-icon">
            <AlertTriangle size={20} />
          </div>
          <div className="banking-stat-info">
            <span className="banking-stat-value">
              {stats.unreconciledCount}
            </span>
            <span className="banking-stat-label">{t("unreconciledTxns")}</span>
          </div>
        </div>
      </div>

      {/* Account Cards Grid */}
      {accounts.length === 0 ? (
        <div className="banking-empty">
          <div className="banking-empty-icon">
            <Landmark size={28} />
          </div>
          <h3>{t("noBankAccountsYet")}</h3>
          <p>{t("addFirstBankAccount")}</p>
          <button
            className="btn-primary"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={16} />
            {t("addBankAccount")}
          </button>
        </div>
      ) : (
        <div className="banking-accounts-grid">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="banking-account-card"
              onClick={() =>
                router.push(`/financial/banking/${account.id}`)
              }
            >
              <div className="banking-account-card-header">
                <div className="banking-account-card-name">
                  {account.name}
                </div>
                <button
                  className="banking-account-card-menu"
                  onClick={(e) => openDetail(e, account)}
                  title={t("editDelete")}
                >
                  <Edit3 size={14} />
                </button>
              </div>
              <div className="banking-account-card-bank">
                {account.bank_name}
              </div>
              <div className="banking-account-card-meta">
                <span className={accountTypeBadgeClass(account.account_type)}>
                  {account.account_type}
                </span>
                {account.account_number_last4 && (
                  <span className="banking-account-card-last4">
                    ****{account.account_number_last4}
                  </span>
                )}
              </div>
              <div className="banking-account-card-balance">
                {formatCurrency(account.current_balance)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Bank Account Modal */}
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
              <h3>{t("addBankAccount")}</h3>
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
                <label className="banking-form-label">{t("accountNameRequired")}</label>
                <input
                  type="text"
                  className="banking-form-input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={t("accountNamePlaceholder")}
                  required
                />
              </div>

              <div className="banking-form-group">
                <label className="banking-form-label">{t("bankNameRequired")}</label>
                <input
                  type="text"
                  className="banking-form-input"
                  value={formData.bank_name}
                  onChange={(e) =>
                    setFormData({ ...formData, bank_name: e.target.value })
                  }
                  placeholder={t("bankNamePlaceholder")}
                  required
                />
              </div>

              <div className="banking-form-row">
                <div className="banking-form-group">
                  <label className="banking-form-label">{t("accountTypeRequired")}</label>
                  <select
                    className="banking-form-select"
                    value={formData.account_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        account_type: e.target.value,
                      })
                    }
                  >
                    <option value="checking">{t("checking")}</option>
                    <option value="savings">{t("savings")}</option>
                    <option value="credit">{t("credit")}</option>
                  </select>
                </div>

                <div className="banking-form-group">
                  <label className="banking-form-label">
                    {t("openingBalance")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="banking-form-input"
                    value={formData.current_balance}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        current_balance: e.target.value,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="banking-form-row">
                <div className="banking-form-group">
                  <label className="banking-form-label">
                    {t("accountNumberLast4")}
                  </label>
                  <input
                    type="text"
                    className="banking-form-input"
                    maxLength={4}
                    value={formData.account_number_last4}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        account_number_last4: e.target.value,
                      })
                    }
                    placeholder="1234"
                  />
                </div>

                <div className="banking-form-group">
                  <label className="banking-form-label">
                    {t("routingNumberLast4")}
                  </label>
                  <input
                    type="text"
                    className="banking-form-input"
                    maxLength={4}
                    value={formData.routing_number_last4}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        routing_number_last4: e.target.value,
                      })
                    }
                    placeholder="5678"
                  />
                </div>
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
                    !formData.name.trim() ||
                    !formData.bank_name.trim()
                  }
                >
                  {creating ? t("creating") : t("addAccount")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail / Edit / Delete Modal */}
      {selectedAccount && (
        <div className="banking-modal-overlay" onClick={closeDetail}>
          <div
            className="banking-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="banking-modal-header">
              <h3>
                {isEditing
                  ? t("editAccountName", { name: selectedAccount.name })
                  : selectedAccount.name}
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
                    <h3>{t("deleteBankAccount")}</h3>
                    <button
                      className="banking-modal-close"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div style={{ padding: "1rem 1.5rem" }}>
                    <p>
                      {t("deleteBankAccountConfirm", { name: selectedAccount.name })}
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

            {/* Read-only detail view */}
            {!isEditing && (
              <div
                className="banking-form"
                style={{
                  pointerEvents: showDeleteConfirm ? "none" : "auto",
                }}
              >
                <div className="banking-form-row">
                  <div className="banking-form-group">
                    <label className="banking-form-label">{t("accountName")}</label>
                    <div
                      className="banking-form-input"
                      style={{
                        background: "var(--color-bg-tertiary, #f3f4f6)",
                        cursor: "default",
                      }}
                    >
                      {selectedAccount.name}
                    </div>
                  </div>
                  <div className="banking-form-group">
                    <label className="banking-form-label">{t("bankName")}</label>
                    <div
                      className="banking-form-input"
                      style={{
                        background: "var(--color-bg-tertiary, #f3f4f6)",
                        cursor: "default",
                      }}
                    >
                      {selectedAccount.bank_name}
                    </div>
                  </div>
                </div>

                <div className="banking-form-row">
                  <div className="banking-form-group">
                    <label className="banking-form-label">{t("accountType")}</label>
                    <div
                      className="banking-form-input"
                      style={{
                        background: "var(--color-bg-tertiary, #f3f4f6)",
                        cursor: "default",
                      }}
                    >
                      <span
                        className={accountTypeBadgeClass(
                          selectedAccount.account_type
                        )}
                      >
                        {selectedAccount.account_type}
                      </span>
                    </div>
                  </div>
                  <div className="banking-form-group">
                    <label className="banking-form-label">{t("balance")}</label>
                    <div
                      className="banking-form-input"
                      style={{
                        background: "var(--color-bg-tertiary, #f3f4f6)",
                        cursor: "default",
                        fontWeight: 600,
                      }}
                    >
                      {formatCurrency(selectedAccount.current_balance)}
                    </div>
                  </div>
                </div>

                <div className="banking-form-row">
                  <div className="banking-form-group">
                    <label className="banking-form-label">
                      {t("accountNumberLast4")}
                    </label>
                    <div
                      className="banking-form-input"
                      style={{
                        background: "var(--color-bg-tertiary, #f3f4f6)",
                        cursor: "default",
                      }}
                    >
                      {selectedAccount.account_number_last4
                        ? `****${selectedAccount.account_number_last4}`
                        : "--"}
                    </div>
                  </div>
                  <div className="banking-form-group">
                    <label className="banking-form-label">
                      {t("routingNumberLast4")}
                    </label>
                    <div
                      className="banking-form-input"
                      style={{
                        background: "var(--color-bg-tertiary, #f3f4f6)",
                        cursor: "default",
                      }}
                    >
                      {selectedAccount.routing_number_last4
                        ? `****${selectedAccount.routing_number_last4}`
                        : "--"}
                    </div>
                  </div>
                </div>

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
                      {t("accountNameRequired")}
                    </label>
                    <input
                      type="text"
                      className="banking-form-input"
                      value={(editData.name as string) || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="banking-form-group">
                    <label className="banking-form-label">{t("bankNameRequired")}</label>
                    <input
                      type="text"
                      className="banking-form-input"
                      value={(editData.bank_name as string) || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          bank_name: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="banking-form-row">
                  <div className="banking-form-group">
                    <label className="banking-form-label">{t("accountType")}</label>
                    <select
                      className="banking-form-select"
                      value={(editData.account_type as string) || "checking"}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          account_type: e.target.value,
                        })
                      }
                    >
                      <option value="checking">{t("checking")}</option>
                      <option value="savings">{t("savings")}</option>
                      <option value="credit">{t("credit")}</option>
                    </select>
                  </div>
                  <div className="banking-form-group">
                    <label className="banking-form-label">{t("balance")}</label>
                    <input
                      type="number"
                      step="0.01"
                      className="banking-form-input"
                      value={(editData.current_balance as string) || "0"}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          current_balance: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="banking-form-row">
                  <div className="banking-form-group">
                    <label className="banking-form-label">
                      {t("accountNumberLast4")}
                    </label>
                    <input
                      type="text"
                      className="banking-form-input"
                      maxLength={4}
                      value={
                        (editData.account_number_last4 as string) || ""
                      }
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          account_number_last4: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="banking-form-group">
                    <label className="banking-form-label">
                      {t("routingNumberLast4")}
                    </label>
                    <input
                      type="text"
                      className="banking-form-input"
                      maxLength={4}
                      value={
                        (editData.routing_number_last4 as string) || ""
                      }
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          routing_number_last4: e.target.value,
                        })
                      }
                    />
                  </div>
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
                    disabled={
                      saving || !(editData.name as string)?.trim()
                    }
                  >
                    {saving ? t("saving") : t("saveChanges")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showImport && (
        <ImportModal
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          entityName={t("bankAccountsEntity")}
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
