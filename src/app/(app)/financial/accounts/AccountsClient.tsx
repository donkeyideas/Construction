"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
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
import AccountTransactionsModal from "@/components/financial/AccountTransactionsModal";

interface AccountsClientProps {
  accounts: AccountTreeNode[];
}

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
  onAccountClick,
}: {
  account: AccountTreeNode;
  depth: number;
  onAccountClick?: (account: AccountTreeNode) => void;
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
        className={`account-row ${hasChildren ? "account-row-parent" : ""} ${indentClass} account-clickable`}
        onClick={() => onAccountClick?.(account)}
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
          <AccountNode key={child.id} account={child} depth={depth + 1} onAccountClick={onAccountClick} />
        ))}
    </>
  );
}

export default function AccountsClient({ accounts }: AccountsClientProps) {
  const router = useRouter();
  const t = useTranslations("financial");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";
  const [showImport, setShowImport] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<AccountTreeNode | null>(null);

  // Form state
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<string>("asset");
  const [subType, setSubType] = useState("");
  const [parentId, setParentId] = useState("");
  const [description, setDescription] = useState("");
  const [normalBalance, setNormalBalance] = useState<string>("debit");

  const accountTypeLabels: Record<string, string> = {
    asset: t("assets"),
    liability: t("liabilities"),
    equity: t("equity"),
    revenue: t("revenue"),
    expense: t("expenses"),
  };

  const accountImportColumns: ImportColumn[] = [
    { key: "account_number", label: t("accountNumber"), required: true },
    { key: "name", label: t("accountName"), required: true },
    { key: "account_type", label: t("accountType"), required: true },
    { key: "sub_type", label: t("subType"), required: false },
    { key: "description", label: t("description"), required: false },
  ];

  const accountSampleData = [
    { account_number: "1000", name: "Cash & Equivalents", account_type: "asset", sub_type: "Current Asset", description: "Cash on hand and in banks" },
    { account_number: "2000", name: "Accounts Payable", account_type: "liability", sub_type: "Current Liability", description: "Amounts owed to vendors" },
    { account_number: "4000", name: "Construction Revenue", account_type: "revenue", sub_type: "", description: "Revenue from construction projects" },
  ];

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

  async function handleLoadDefaults() {
    setLoadingDefaults(true);
    try {
      const res = await fetch("/api/financial/accounts/seed-defaults", {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || t("failedToLoadDefaultAccounts"));
        return;
      }
      router.refresh();
    } catch {
      alert(t("networkError"));
    } finally {
      setLoadingDefaults(false);
    }
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
      setError(t("accountNumberRequired"));
      return;
    }

    if (!accountName.trim()) {
      setError(t("accountNameRequired"));
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
        throw new Error(data.error || t("failedToCreateAccount"));
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("unexpectedError")
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
          <h2>{t("chartOfAccounts")}</h2>
          <p className="fin-header-sub">
            {t("chartOfAccountsDesc")}
          </p>
        </div>
        <div className="fin-header-actions" style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className="ui-btn ui-btn-outline ui-btn-md"
            onClick={() => setShowImport(true)}
          >
            <Upload size={16} />
            {t("importCsv")}
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-primary ui-btn-md"
            onClick={handleOpen}
          >
            <Plus size={16} />
            {t("addAccount")}
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
                    onAccountClick={(acct) => setSelectedAccount(acct)}
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
            <div className="fin-empty-title">{t("noAccountsSetUp")}</div>
            <div className="fin-empty-desc">
              {t("noAccountsDesc")}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <button
                type="button"
                className="ui-btn ui-btn-primary ui-btn-md"
                onClick={handleLoadDefaults}
                disabled={loadingDefaults}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                {loadingDefaults ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    {t("loading")}
                  </>
                ) : (
                  <>
                    <Layers size={16} />
                    {t("loadDefaultAccounts")}
                  </>
                )}
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-outline ui-btn-md"
                onClick={() => setShowImport(true)}
              >
                <Upload size={16} />
                {t("importCsv")}
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-outline ui-btn-md"
                onClick={handleOpen}
              >
                <Plus size={16} />
                {t("addManually")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImport && (
        <ImportModal
          entityName={t("accounts")}
          columns={accountImportColumns}
          sampleData={accountSampleData}
          onImport={async (rows) => {
            const res = await fetch("/api/import", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ entity: "chart_of_accounts", rows }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || t("importFailed"));
            router.refresh();
            return { success: data.success, errors: data.errors };
          }}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Account Transactions Drill-Down Modal */}
      {selectedAccount && (
        <AccountTransactionsModal
          accountId={selectedAccount.id}
          accountName={selectedAccount.name}
          accountNumber={selectedAccount.account_number}
          isOpen={true}
          onClose={() => setSelectedAccount(null)}
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
                  {t("addAccount")}
                </h3>
                <p
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--muted)",
                    margin: "4px 0 0",
                  }}
                >
                  {t("addAccountDesc")}
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
                      {t("accountNo")} <span style={{ color: "var(--color-red)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder={t("accountNoPlaceholder")}
                      required
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>
                      {t("accountName")} <span style={{ color: "var(--color-red)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder={t("accountNamePlaceholder")}
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
                      {t("accountType")} <span style={{ color: "var(--color-red)" }}>*</span>
                    </label>
                    <select
                      value={accountType}
                      onChange={(e) => handleAccountTypeChange(e.target.value)}
                      required
                      style={{ ...inputStyle, cursor: "pointer" }}
                    >
                      <option value="asset">{t("asset")}</option>
                      <option value="liability">{t("liability")}</option>
                      <option value="equity">{t("equity")}</option>
                      <option value="revenue">{t("revenue")}</option>
                      <option value="expense">{t("expense")}</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>
                      {t("normalBalance")} <span style={{ color: "var(--color-red)" }}>*</span>
                    </label>
                    <select
                      value={normalBalance}
                      onChange={(e) => setNormalBalance(e.target.value)}
                      required
                      style={{ ...inputStyle, cursor: "pointer" }}
                    >
                      <option value="debit">{t("debit")}</option>
                      <option value="credit">{t("credit")}</option>
                    </select>
                  </div>
                </div>

                {/* Sub Type */}
                <div>
                  <label style={labelStyle}>{t("subType")}</label>
                  <input
                    type="text"
                    value={subType}
                    onChange={(e) => setSubType(e.target.value)}
                    placeholder={t("subTypePlaceholder")}
                    style={inputStyle}
                  />
                </div>

                {/* Parent Account */}
                <div>
                  <label style={labelStyle}>{t("parentAccount")}</label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    <option value="">{t("noneTopLevel")}</option>
                    {flatAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label style={labelStyle}>{t("description")}</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("descriptionPlaceholder")}
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
                  {t("cancel")}
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
                      {t("creating")}
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      {t("createAccount")}
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
