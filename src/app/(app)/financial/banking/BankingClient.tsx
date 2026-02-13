"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Landmark,
  DollarSign,
  CreditCard,
  Plus,
  X,
  Edit3,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import type { BankAccountRow, BankingStats } from "@/lib/queries/banking";

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

  // Detail / Edit / Delete modal
  const [selectedAccount, setSelectedAccount] = useState<BankAccountRow | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

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
        throw new Error(data.error || "Failed to create bank account");
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
        err instanceof Error ? err.message : "Failed to create bank account"
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
          throw new Error(data.error || "Failed to update bank account");
        }
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to update bank account"
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
        throw new Error(data.error || "Failed to delete bank account");
      }

      closeDetail();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to delete bank account"
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
          <h2>Banking</h2>
          <p className="banking-header-sub">
            Manage bank accounts, transactions, and reconciliations
          </p>
        </div>
        <div className="banking-header-actions">
          <button
            className="btn-secondary"
            onClick={() =>
              router.push("/financial/banking/reconciliation")
            }
          >
            Reconciliation
          </button>
          <button
            className="btn-primary"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={16} />
            Add Bank Account
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
            <span className="banking-stat-label">Total Cash Position</span>
          </div>
        </div>
        <div className="banking-stat-card stat-accounts">
          <div className="banking-stat-icon">
            <Landmark size={20} />
          </div>
          <div className="banking-stat-info">
            <span className="banking-stat-value">{stats.accountCount}</span>
            <span className="banking-stat-label">Bank Accounts</span>
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
            <span className="banking-stat-label">Unreconciled Txns</span>
          </div>
        </div>
      </div>

      {/* Account Cards Grid */}
      {accounts.length === 0 ? (
        <div className="banking-empty">
          <div className="banking-empty-icon">
            <Landmark size={28} />
          </div>
          <h3>No bank accounts yet</h3>
          <p>Add your first bank account to start tracking finances.</p>
          <button
            className="btn-primary"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={16} />
            Add Bank Account
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
                  title="Edit / Delete"
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
              <h3>Add Bank Account</h3>
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
                <label className="banking-form-label">Account Name *</label>
                <input
                  type="text"
                  className="banking-form-input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Main Operating Account"
                  required
                />
              </div>

              <div className="banking-form-group">
                <label className="banking-form-label">Bank Name *</label>
                <input
                  type="text"
                  className="banking-form-input"
                  value={formData.bank_name}
                  onChange={(e) =>
                    setFormData({ ...formData, bank_name: e.target.value })
                  }
                  placeholder="e.g. Chase, Wells Fargo"
                  required
                />
              </div>

              <div className="banking-form-row">
                <div className="banking-form-group">
                  <label className="banking-form-label">Account Type *</label>
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
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>

                <div className="banking-form-group">
                  <label className="banking-form-label">
                    Opening Balance
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
                    Account # (last 4)
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
                    Routing # (last 4)
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
                  Cancel
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
                  {creating ? "Creating..." : "Add Account"}
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
                  ? `Edit ${selectedAccount.name}`
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
                    <h3>Delete Bank Account</h3>
                    <button
                      className="banking-modal-close"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div style={{ padding: "1rem 1.5rem" }}>
                    <p>
                      Are you sure you want to delete{" "}
                      <strong>{selectedAccount.name}</strong>? This will
                      also remove all associated transactions. This action
                      cannot be undone.
                    </p>
                  </div>
                  <div className="banking-form-actions">
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
                      style={{
                        backgroundColor: "var(--color-danger, #dc2626)",
                      }}
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
              <div
                className="banking-form"
                style={{
                  pointerEvents: showDeleteConfirm ? "none" : "auto",
                }}
              >
                <div className="banking-form-row">
                  <div className="banking-form-group">
                    <label className="banking-form-label">Account Name</label>
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
                    <label className="banking-form-label">Bank Name</label>
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
                    <label className="banking-form-label">Account Type</label>
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
                    <label className="banking-form-label">Balance</label>
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
                      Account # (last 4)
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
                      Routing # (last 4)
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
              <div className="banking-form">
                <div className="banking-form-row">
                  <div className="banking-form-group">
                    <label className="banking-form-label">
                      Account Name *
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
                    <label className="banking-form-label">Bank Name *</label>
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
                    <label className="banking-form-label">Account Type</label>
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
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                      <option value="credit">Credit</option>
                    </select>
                  </div>
                  <div className="banking-form-group">
                    <label className="banking-form-label">Balance</label>
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
                      Account # (last 4)
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
                      Routing # (last 4)
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
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={
                      saving || !(editData.name as string)?.trim()
                    }
                  >
                    {saving ? "Saving..." : "Save Changes"}
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
