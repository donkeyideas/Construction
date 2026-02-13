"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ChevronRight,
  Layers,
  CreditCard,
  Scale,
  TrendingUp,
  TrendingDown,
  X,
  Loader2,
  Landmark,
  Upload,
} from "lucide-react";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";
import type { AccountTreeNode } from "@/lib/queries/financial";

interface AccountsClientProps {
  accounts: AccountTreeNode[];
}

const accountTypeLabels: Record<string, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  revenue: "Revenue",
  expense: "Expenses",
};

const accountTypeIcons: Record<string, React.ReactNode> = {
  asset: <Layers size={18} />,
  liability: <CreditCard size={18} />,
  equity: <Scale size={18} />,
  revenue: <TrendingUp size={18} />,
  expense: <TrendingDown size={18} />,
};

const accountTypeOrder = ["asset", "liability", "equity", "revenue", "expense"];

function flattenAccounts(nodes: AccountTreeNode[]): { id: string; label: string }[] {
  const result: { id: string; label: string }[] = [];

  function walk(node: AccountTreeNode, depth: number) {
    const indent = "\u00A0\u00A0".repeat(depth);
    result.push({
      id: node.id,
      label: `${indent}${node.account_number} - ${node.name}`,
    });
    for (const child of node.children) {
      walk(child, depth + 1);
    }
  }

  for (const node of nodes) {
    walk(node, 0);
  }

  return result;
}

function formatSubType(subType: string): string {
  return subType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function AccountNode({
  account,
  depth,
}: {
  account: AccountTreeNode;
  depth: number;
}) {
  const hasChildren = account.children.length > 0;
  const indentClass =
    depth === 0
      ? ""
      : depth === 1
        ? "account-indent-1"
        : "account-indent-2";

  return (
    <>
      <div
        className={`account-row ${hasChildren ? "account-row-parent" : ""} ${indentClass}`}
      >
        {hasChildren ? (
          <span className="account-toggle open">
            <ChevronRight size={14} />
          </span>
        ) : (
          <span
            style={{ width: "20px", marginRight: "6px", flexShrink: 0 }}
          />
        )}
        <span className="account-number">{account.account_number}</span>
        <span className="account-name">{account.name}</span>
        <span className="account-value">
          {formatCurrency(account.balance)}
        </span>
        {account.sub_type && (
          <span className="account-sub-type">{formatSubType(account.sub_type)}</span>
        )}
        <span className="account-balance-type">
          {account.normal_balance.toUpperCase()}
        </span>
      </div>
      {hasChildren &&
        account.children.map((child) => (
          <AccountNode key={child.id} account={child} depth={depth + 1} />
        ))}
    </>
  );
}

const accountImportColumns: ImportColumn[] = [
  { key: "account_number", label: "Account Number", required: true },
  { key: "name", label: "Account Name", required: true },
  { key: "account_type", label: "Account Type", required: true },
  { key: "sub_type", label: "Sub Type", required: false },
  { key: "description", label: "Description", required: false },
];

const accountSampleData = [
  { account_number: "1000", name: "Cash & Equivalents", account_type: "asset", sub_type: "Current Asset", description: "Cash on hand and in banks" },
  { account_number: "2000", name: "Accounts Payable", account_type: "liability", sub_type: "Current Liability", description: "Amounts owed to vendors" },
  { account_number: "4000", name: "Construction Revenue", account_type: "revenue", sub_type: "", description: "Revenue from construction projects" },
];

export default function AccountsClient({ accounts }: AccountsClientProps) {
  const router = useRouter();
  const [showImport, setShowImport] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<string>("asset");
  const [subType, setSubType] = useState("");
  const [parentId, setParentId] = useState("");
  const [description, setDescription] = useState("");
  const [normalBalance, setNormalBalance] = useState<string>("debit");

  // Group root-level accounts by type
  const grouped: Record<string, AccountTreeNode[]> = {};
  for (const type of accountTypeOrder) {
    grouped[type] = [];
  }
  for (const account of accounts) {
    const type = account.account_type;
    if (grouped[type]) {
      grouped[type].push(account);
    }
  }

  const hasAnyAccounts = accounts.length > 0;
  const flatAccounts = flattenAccounts(accounts);

  function handleOpen() {
    setAccountNumber("");
    setAccountName("");
    setAccountType("asset");
    setSubType("");
    setParentId("");
    setDescription("");
    setNormalBalance("debit");
    setError(null);
    setOpen(true);
  }

  function handleClose() {
    if (!loading) {
      setOpen(false);
      setError(null);
    }
  }

  // Auto-set normal balance based on account type
  function handleAccountTypeChange(newType: string) {
    setAccountType(newType);
    if (newType === "asset" || newType === "expense") {
      setNormalBalance("debit");
    } else {
      setNormalBalance("credit");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!accountNumber.trim()) {
      setError("Account number is required.");
      return;
    }

    if (!accountName.trim()) {
      setError("Account name is required.");
      return;
    }

    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        account_number: accountNumber.trim(),
        name: accountName.trim(),
        account_type: accountType,
        normal_balance: normalBalance,
      };

      if (subType.trim()) {
        body.sub_type = subType.trim();
      }
      if (parentId) {
        body.parent_id = parentId;
      }
      if (description.trim()) {
        body.description = description.trim();
      }

      const res = await fetch("/api/financial/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create account");
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.82rem",
    fontWeight: 600,
    color: "var(--text)",
    marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 38,
    padding: "0 12px",
    fontSize: "0.85rem",
    fontFamily: "var(--font-sans)",
    color: "var(--text)",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    boxSizing: "border-box",
  };

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Chart of Accounts</h2>
          <p className="fin-header-sub">
            Manage your general ledger account structure.
          </p>
        </div>
        <div className="fin-header-actions" style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className="ui-btn ui-btn-outline ui-btn-md"
            onClick={() => setShowImport(true)}
          >
            <Upload size={16} />
            Import CSV
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-primary ui-btn-md"
            onClick={handleOpen}
          >
            <Plus size={16} />
            Add Account
          </button>
        </div>
      </div>

      {hasAnyAccounts ? (
        <div className="accounts-tree">
          {accountTypeOrder.map((type) => {
            const typeAccounts = grouped[type];
            if (typeAccounts.length === 0) return null;

            return (
              <div key={type} className="accounts-group">
                <div className="accounts-group-title">
                  {accountTypeIcons[type]}
                  {accountTypeLabels[type]}
                  <span
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--muted)",
                      fontWeight: 400,
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    ({typeAccounts.length})
                  </span>
                </div>
                {typeAccounts.map((account) => (
                  <AccountNode
                    key={account.id}
                    account={account}
                    depth={0}
                  />
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <Landmark size={48} />
            </div>
            <div className="fin-empty-title">No Accounts Set Up</div>
            <div className="fin-empty-desc">
              Create your chart of accounts to organize your general ledger.
              Start with the standard categories: Assets, Liabilities, Equity,
              Revenue, and Expenses.
            </div>
            <button
              type="button"
              className="ui-btn ui-btn-primary ui-btn-md"
              onClick={handleOpen}
            >
              <Plus size={16} />
              Add First Account
            </button>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImport && (
        <ImportModal
          entityName="Accounts"
          columns={accountImportColumns}
          sampleData={accountSampleData}
          onImport={async (rows) => {
            const res = await fetch("/api/import", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ entity: "chart_of_accounts", rows }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Import failed");
            router.refresh();
            return { success: data.success, errors: data.errors };
          }}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Add Account Modal */}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(2px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 0,
              width: "100%",
              maxWidth: 520,
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px 24px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div>
                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "1.15rem",
                    fontWeight: 700,
                    margin: 0,
                  }}
                >
                  Add Account
                </h3>
                <p
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--muted)",
                    margin: "4px 0 0",
                  }}
                >
                  Create a new account in your chart of accounts.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--muted)",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit}>
              <div
                style={{
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                }}
              >
                {error && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "var(--color-red-light)",
                      color: "var(--color-red)",
                      fontSize: "0.82rem",
                      fontWeight: 500,
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* Two-column row: Account Number + Account Name */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "140px 1fr",
                    gap: 16,
                  }}
                >
                  <div>
                    <label style={labelStyle}>
                      Account No. <span style={{ color: "var(--color-red)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="e.g., 1000"
                      required
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>
                      Account Name <span style={{ color: "var(--color-red)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="e.g., Cash & Equivalents"
                      required
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Two-column row: Account Type + Normal Balance */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  <div>
                    <label style={labelStyle}>
                      Account Type <span style={{ color: "var(--color-red)" }}>*</span>
                    </label>
                    <select
                      value={accountType}
                      onChange={(e) => handleAccountTypeChange(e.target.value)}
                      required
                      style={{ ...inputStyle, cursor: "pointer" }}
                    >
                      <option value="asset">Asset</option>
                      <option value="liability">Liability</option>
                      <option value="equity">Equity</option>
                      <option value="revenue">Revenue</option>
                      <option value="expense">Expense</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>
                      Normal Balance <span style={{ color: "var(--color-red)" }}>*</span>
                    </label>
                    <select
                      value={normalBalance}
                      onChange={(e) => setNormalBalance(e.target.value)}
                      required
                      style={{ ...inputStyle, cursor: "pointer" }}
                    >
                      <option value="debit">Debit</option>
                      <option value="credit">Credit</option>
                    </select>
                  </div>
                </div>

                {/* Sub Type */}
                <div>
                  <label style={labelStyle}>Sub Type</label>
                  <input
                    type="text"
                    value={subType}
                    onChange={(e) => setSubType(e.target.value)}
                    placeholder="e.g., Current Asset, Fixed Asset"
                    style={inputStyle}
                  />
                </div>

                {/* Parent Account */}
                <div>
                  <label style={labelStyle}>Parent Account</label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    <option value="">None (top-level account)</option>
                    {flatAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description of this account..."
                    rows={3}
                    style={{
                      ...inputStyle,
                      height: "auto",
                      padding: "10px 12px",
                      resize: "vertical",
                      fontFamily: "var(--font-sans)",
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  padding: "16px 24px",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <button
                  type="button"
                  className="ui-btn ui-btn-outline ui-btn-md"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ui-btn ui-btn-primary ui-btn-md"
                  disabled={loading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    minWidth: 140,
                    justifyContent: "center",
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Create Account
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
