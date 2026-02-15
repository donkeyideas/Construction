"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  ArrowLeft,
  Search,
  Plus,
  X,
  Edit3,
  Trash2,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  DollarSign,
  CreditCard,
} from "lucide-react";
import type {
  BankAccountRow,
  BankTransactionRow,
  TransactionCategory,
} from "@/lib/queries/banking";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_KEYS: { value: TransactionCategory; key: string }[] = [
  { value: "payroll", key: "categoryPayroll" },
  { value: "materials", key: "categoryMaterials" },
  { value: "subcontractor", key: "categorySubcontractor" },
  { value: "equipment", key: "categoryEquipment" },
  { value: "insurance", key: "categoryInsurance" },
  { value: "tax", key: "categoryTax" },
  { value: "revenue", key: "categoryRevenue" },
  { value: "transfer", key: "categoryTransfer" },
  { value: "other", key: "categoryOther" },
];

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface BankTransactionsClientProps {
  account: BankAccountRow;
  transactions: BankTransactionRow[];
  companyId: string;
}

export default function BankTransactionsClient({
  account,
  transactions,
  companyId,
}: BankTransactionsClientProps) {
  const router = useRouter();
  const t = useTranslations("financial");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString(dateLocale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "debit" | "credit">(
    "all"
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [reconciledFilter, setReconciledFilter] = useState<
    "all" | "yes" | "no"
  >("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split("T")[0],
    description: "",
    transaction_type: "debit" as "debit" | "credit",
    amount: "",
    category: "",
    reference: "",
    notes: "",
  });

  // Detail / Edit / Delete modal
  const [selectedTxn, setSelectedTxn] = useState<BankTransactionRow | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Filtered transactions
  const filtered = useMemo(() => {
    let result = transactions;

    if (typeFilter !== "all") {
      result = result.filter((t) => t.transaction_type === typeFilter);
    }

    if (categoryFilter !== "all") {
      result = result.filter((t) => t.category === categoryFilter);
    }

    if (reconciledFilter === "yes") {
      result = result.filter((t) => t.is_reconciled);
    } else if (reconciledFilter === "no") {
      result = result.filter((t) => !t.is_reconciled);
    }

    if (startDate) {
      result = result.filter((t) => t.transaction_date >= startDate);
    }

    if (endDate) {
      result = result.filter((t) => t.transaction_date <= endDate);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(term) ||
          (t.reference && t.reference.toLowerCase().includes(term)) ||
          (t.notes && t.notes.toLowerCase().includes(term))
      );
    }

    return result;
  }, [
    transactions,
    typeFilter,
    categoryFilter,
    reconciledFilter,
    startDate,
    endDate,
    search,
  ]);

  // Create transaction handler
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/financial/banking/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_account_id: account.id,
          transaction_date: formData.transaction_date,
          description: formData.description.trim(),
          transaction_type: formData.transaction_type,
          amount: parseFloat(formData.amount),
          category: formData.category || undefined,
          reference: formData.reference.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToCreateTransaction"));
      }

      setFormData({
        transaction_date: new Date().toISOString().split("T")[0],
        description: "",
        transaction_type: "debit",
        amount: "",
        category: "",
        reference: "",
        notes: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : t("failedToCreateTransaction")
      );
    } finally {
      setCreating(false);
    }
  }

  // Open detail modal
  function openDetail(txn: BankTransactionRow) {
    setSelectedTxn(txn);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  function closeDetail() {
    setSelectedTxn(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setSaveError("");
    setEditData({});
  }

  function startEditing() {
    if (!selectedTxn) return;
    setEditData({
      transaction_date: selectedTxn.transaction_date,
      description: selectedTxn.description,
      transaction_type: selectedTxn.transaction_type,
      amount: selectedTxn.amount.toString(),
      category: selectedTxn.category || "",
      reference: selectedTxn.reference || "",
      notes: selectedTxn.notes || "",
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
    if (!selectedTxn) return;
    setSaving(true);
    setSaveError("");

    try {
      const payload: Record<string, unknown> = {};
      if (editData.transaction_date !== selectedTxn.transaction_date)
        payload.transaction_date = editData.transaction_date;
      if (editData.description !== selectedTxn.description)
        payload.description = editData.description;
      if (editData.transaction_type !== selectedTxn.transaction_type)
        payload.transaction_type = editData.transaction_type;
      const newAmount = parseFloat(editData.amount as string) || 0;
      if (newAmount !== selectedTxn.amount) payload.amount = newAmount;
      if (editData.category !== (selectedTxn.category || ""))
        payload.category = (editData.category as string) || null;
      if (editData.reference !== (selectedTxn.reference || ""))
        payload.reference = (editData.reference as string) || null;
      if (editData.notes !== (selectedTxn.notes || ""))
        payload.notes = (editData.notes as string) || null;

      if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        return;
      }

      const res = await fetch(
        `/api/financial/banking/transactions/${selectedTxn.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToUpdateTransaction"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : t("failedToUpdateTransaction")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedTxn) return;
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch(
        `/api/financial/banking/transactions/${selectedTxn.id}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToDeleteTransaction"));
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : t("failedToDeleteTransaction")
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

      {/* Account Header */}
      <div className="banking-account-header">
        <div className="banking-account-header-left">
          <div className="banking-account-header-icon">
            <Landmark size={24} />
          </div>
          <div>
            <h2>{account.name}</h2>
            <div className="banking-account-header-meta">
              <span>{account.bank_name}</span>
              <span className={accountTypeBadgeClass(account.account_type)}>
                {account.account_type}
              </span>
              {account.account_number_last4 && (
                <span className="banking-account-header-last4">
                  ****{account.account_number_last4}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="banking-account-header-balance">
          <span className="banking-account-header-balance-label">
            {t("currentBalance")}
          </span>
          <span className="banking-account-header-balance-value">
            {formatCurrency(account.current_balance)}
          </span>
        </div>
      </div>

      {/* Header with actions */}
      <div className="banking-header" style={{ marginTop: 24 }}>
        <div>
          <h3 style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}>
            {t("transactions")}
          </h3>
          <p className="banking-header-sub">
            {t("transactionCount", { count: transactions.length })}
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowCreate(true)}
        >
          <Plus size={16} />
          {t("addTransaction")}
        </button>
      </div>

      {/* Filters */}
      <div className="banking-filters">
        <div className="banking-search">
          <Search size={16} className="banking-search-icon" />
          <input
            type="text"
            placeholder={t("searchTransactions")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <input
          type="date"
          className="banking-filter-select"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          title={t("startDate")}
        />

        <input
          type="date"
          className="banking-filter-select"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          title={t("endDate")}
        />

        <select
          className="banking-filter-select"
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value as "all" | "debit" | "credit")
          }
        >
          <option value="all">{t("allTypes")}</option>
          <option value="debit">{t("debit")}</option>
          <option value="credit">{t("creditType")}</option>
        </select>

        <select
          className="banking-filter-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">{t("allCategories")}</option>
          {CATEGORY_KEYS.map((c) => (
            <option key={c.value} value={c.value}>
              {t(c.key)}
            </option>
          ))}
        </select>

        <select
          className="banking-filter-select"
          value={reconciledFilter}
          onChange={(e) =>
            setReconciledFilter(e.target.value as "all" | "yes" | "no")
          }
        >
          <option value="all">{t("allStatus")}</option>
          <option value="yes">{t("reconciled")}</option>
          <option value="no">{t("unreconciled")}</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="banking-empty">
          <div className="banking-empty-icon">
            <CreditCard size={28} />
          </div>
          {transactions.length === 0 ? (
            <>
              <h3>{t("noTransactionsYet")}</h3>
              <p>{t("recordFirstTransaction")}</p>
              <button
                className="btn-primary"
                onClick={() => setShowCreate(true)}
              >
                <Plus size={16} />
                {t("addTransaction")}
              </button>
            </>
          ) : (
            <>
              <h3>{t("noMatchingTransactions")}</h3>
              <p>{t("tryAdjustingFilters")}</p>
            </>
          )}
        </div>
      ) : (
        <div className="banking-table-wrap">
          <table className="banking-table">
            <thead>
              <tr>
                <th>{t("date")}</th>
                <th>{t("description")}</th>
                <th>{t("reference")}</th>
                <th>{t("category")}</th>
                <th>{t("debit")}</th>
                <th>{t("creditType")}</th>
                <th>{t("balance")}</th>
                <th>{t("reconciledColumn")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((txn) => (
                <tr
                  key={txn.id}
                  onClick={() => openDetail(txn)}
                  className="banking-table-row"
                >
                  <td className="banking-date-cell">
                    {formatDate(txn.transaction_date)}
                  </td>
                  <td className="banking-desc-cell">{txn.description}</td>
                  <td className="banking-ref-cell">
                    {txn.reference || "--"}
                  </td>
                  <td className="banking-category-cell">
                    {txn.category ? (
                      <span className="banking-category-badge">
                        {txn.category}
                      </span>
                    ) : (
                      "--"
                    )}
                  </td>
                  <td className="banking-amount-cell banking-debit">
                    {txn.transaction_type === "debit" ? (
                      <span className="banking-amount-debit">
                        <ArrowDownRight size={14} />
                        {formatCurrency(txn.amount)}
                      </span>
                    ) : (
                      ""
                    )}
                  </td>
                  <td className="banking-amount-cell banking-credit">
                    {txn.transaction_type === "credit" ? (
                      <span className="banking-amount-credit">
                        <ArrowUpRight size={14} />
                        {formatCurrency(txn.amount)}
                      </span>
                    ) : (
                      ""
                    )}
                  </td>
                  <td className="banking-balance-cell">
                    {formatCurrency(txn.running_balance)}
                  </td>
                  <td className="banking-reconciled-cell">
                    {txn.is_reconciled ? (
                      <span className="banking-reconciled-check">
                        <Check size={16} />
                      </span>
                    ) : (
                      <span className="banking-reconciled-pending">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Transaction Modal */}
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
              <h3>{t("addTransaction")}</h3>
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
              <div className="banking-form-row">
                <div className="banking-form-group">
                  <label className="banking-form-label">{t("dateRequired")}</label>
                  <input
                    type="date"
                    className="banking-form-input"
                    value={formData.transaction_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        transaction_date: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="banking-form-group">
                  <label className="banking-form-label">{t("typeRequired")}</label>
                  <select
                    className="banking-form-select"
                    value={formData.transaction_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        transaction_type: e.target.value as
                          | "debit"
                          | "credit",
                      })
                    }
                  >
                    <option value="debit">{t("debitMoneyOut")}</option>
                    <option value="credit">{t("creditMoneyIn")}</option>
                  </select>
                </div>
              </div>

              <div className="banking-form-group">
                <label className="banking-form-label">{t("descriptionRequired")}</label>
                <input
                  type="text"
                  className="banking-form-input"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  placeholder={t("transactionDescriptionPlaceholder")}
                  required
                />
              </div>

              <div className="banking-form-row">
                <div className="banking-form-group">
                  <label className="banking-form-label">{t("amountRequired")}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="banking-form-input"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="banking-form-group">
                  <label className="banking-form-label">{t("category")}</label>
                  <select
                    className="banking-form-select"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value,
                      })
                    }
                  >
                    <option value="">{t("selectCategory")}</option>
                    {CATEGORY_KEYS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {t(c.key)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="banking-form-group">
                <label className="banking-form-label">{t("reference")}</label>
                <input
                  type="text"
                  className="banking-form-input"
                  value={formData.reference}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reference: e.target.value,
                    })
                  }
                  placeholder={t("referencePlaceholder")}
                />
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
                    !formData.description.trim() ||
                    !formData.amount
                  }
                >
                  {creating ? t("creating") : t("addTransaction")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail / Edit / Delete Modal */}
      {selectedTxn && (
        <div className="banking-modal-overlay" onClick={closeDetail}>
          <div
            className="banking-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="banking-modal-header">
              <h3>
                {isEditing ? t("editTransaction") : t("transactionDetails")}
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
                    <h3>{t("deleteTransaction")}</h3>
                    <button
                      className="banking-modal-close"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div style={{ padding: "1rem 1.5rem" }}>
                    <p>
                      {t("deleteTransactionConfirm")}
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
                <div className="banking-form-row">
                  <div className="banking-form-group">
                    <label className="banking-form-label">{t("date")}</label>
                    <div
                      className="banking-form-input"
                      style={{
                        background: "var(--surface)",
                        cursor: "default",
                      }}
                    >
                      {formatDate(selectedTxn.transaction_date)}
                    </div>
                  </div>
                  <div className="banking-form-group">
                    <label className="banking-form-label">{t("type")}</label>
                    <div
                      className="banking-form-input"
                      style={{
                        background: "var(--surface)",
                        cursor: "default",
                      }}
                    >
                      <span
                        className={
                          selectedTxn.transaction_type === "debit"
                            ? "banking-amount-debit"
                            : "banking-amount-credit"
                        }
                      >
                        {selectedTxn.transaction_type === "debit"
                          ? t("debit")
                          : t("creditType")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="banking-form-group">
                  <label className="banking-form-label">{t("description")}</label>
                  <div
                    className="banking-form-input"
                    style={{
                      background: "var(--surface)",
                      cursor: "default",
                    }}
                  >
                    {selectedTxn.description}
                  </div>
                </div>

                <div className="banking-form-row">
                  <div className="banking-form-group">
                    <label className="banking-form-label">{t("amount")}</label>
                    <div
                      className="banking-form-input"
                      style={{
                        background: "var(--surface)",
                        cursor: "default",
                        fontWeight: 600,
                      }}
                    >
                      {formatCurrency(selectedTxn.amount)}
                    </div>
                  </div>
                  <div className="banking-form-group">
                    <label className="banking-form-label">{t("category")}</label>
                    <div
                      className="banking-form-input"
                      style={{
                        background: "var(--surface)",
                        cursor: "default",
                      }}
                    >
                      {selectedTxn.category || "--"}
                    </div>
                  </div>
                </div>

                <div className="banking-form-row">
                  <div className="banking-form-group">
                    <label className="banking-form-label">{t("reference")}</label>
                    <div
                      className="banking-form-input"
                      style={{
                        background: "var(--surface)",
                        cursor: "default",
                      }}
                    >
                      {selectedTxn.reference || "--"}
                    </div>
                  </div>
                  <div className="banking-form-group">
                    <label className="banking-form-label">{t("reconciledColumn")}</label>
                    <div
                      className="banking-form-input"
                      style={{
                        background: "var(--surface)",
                        cursor: "default",
                      }}
                    >
                      {selectedTxn.is_reconciled ? t("yes") : t("no")}
                    </div>
                  </div>
                </div>

                {selectedTxn.notes && (
                  <div className="banking-form-group">
                    <label className="banking-form-label">{t("notes")}</label>
                    <div
                      className="banking-form-input"
                      style={{
                        background: "var(--surface)",
                        cursor: "default",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {selectedTxn.notes}
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
                    <label className="banking-form-label">{t("dateRequired")}</label>
                    <input
                      type="date"
                      className="banking-form-input"
                      value={(editData.transaction_date as string) || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          transaction_date: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="banking-form-group">
                    <label className="banking-form-label">{t("typeRequired")}</label>
                    <select
                      className="banking-form-select"
                      value={
                        (editData.transaction_type as string) || "debit"
                      }
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          transaction_type: e.target.value,
                        })
                      }
                    >
                      <option value="debit">{t("debitMoneyOut")}</option>
                      <option value="credit">{t("creditMoneyIn")}</option>
                    </select>
                  </div>
                </div>

                <div className="banking-form-group">
                  <label className="banking-form-label">{t("descriptionRequired")}</label>
                  <input
                    type="text"
                    className="banking-form-input"
                    value={(editData.description as string) || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        description: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="banking-form-row">
                  <div className="banking-form-group">
                    <label className="banking-form-label">{t("amountRequired")}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="banking-form-input"
                      value={(editData.amount as string) || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          amount: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="banking-form-group">
                    <label className="banking-form-label">{t("category")}</label>
                    <select
                      className="banking-form-select"
                      value={(editData.category as string) || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          category: e.target.value,
                        })
                      }
                    >
                      <option value="">{t("selectCategory")}</option>
                      {CATEGORY_KEYS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {t(c.key)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="banking-form-group">
                  <label className="banking-form-label">{t("reference")}</label>
                  <input
                    type="text"
                    className="banking-form-input"
                    value={(editData.reference as string) || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        reference: e.target.value,
                      })
                    }
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
                    disabled={
                      saving ||
                      !(editData.description as string)?.trim()
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
    </div>
  );
}
