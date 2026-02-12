import Link from "next/link";
import {
  Landmark,
  Plus,
  ChevronRight,
  Layers,
  CreditCard,
  Scale,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getChartOfAccounts } from "@/lib/queries/financial";
import type { AccountTreeNode } from "@/lib/queries/financial";

export const metadata = {
  title: "Chart of Accounts - ConstructionERP",
};

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

export default async function ChartOfAccountsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon">
          <Landmark size={48} />
        </div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">
          Complete your company registration to set up your chart of accounts.
        </div>
      </div>
    );
  }

  const accounts = await getChartOfAccounts(supabase, userCompany.companyId);

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
        <div className="fin-header-actions">
          <Link href="#" className="ui-btn ui-btn-primary ui-btn-md">
            <Plus size={16} />
            Add Account
          </Link>
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
                  <AccountNode key={account.id} account={account} depth={0} />
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
            <Link href="#" className="ui-btn ui-btn-primary ui-btn-md">
              <Plus size={16} />
              Add First Account
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountNode({
  account,
  depth,
}: {
  account: AccountTreeNode;
  depth: number;
}) {
  const hasChildren = account.children.length > 0;
  const indentClass = depth === 0 ? "" : depth === 1 ? "account-indent-1" : "account-indent-2";

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
          <span style={{ width: "20px", marginRight: "6px", flexShrink: 0 }} />
        )}
        <span className="account-number">{account.account_number}</span>
        <span className="account-name">{account.name}</span>
        {account.sub_type && (
          <span className="account-sub-type">{account.sub_type}</span>
        )}
        <span className="account-balance-type">{account.normal_balance}</span>
      </div>
      {hasChildren &&
        account.children.map((child) => (
          <AccountNode key={child.id} account={child} depth={depth + 1} />
        ))}
    </>
  );
}
