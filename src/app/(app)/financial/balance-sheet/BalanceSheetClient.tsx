"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Printer, AlertTriangle, CheckCircle } from "lucide-react";
import { formatCurrency, formatDateLong } from "@/lib/utils/format";
import type { BalanceSheetData, BalanceSheetSection, IncomeStatementLine } from "@/lib/queries/financial";
import AccountTransactionsModal from "@/components/financial/AccountTransactionsModal";

interface Props {
  data: BalanceSheetData;
  companyName: string;
}

function StatementSection({
  section,
  t,
  onAccountClick,
}: {
  section: BalanceSheetSection;
  t: (key: string, values?: Record<string, string>) => string;
  onAccountClick?: (account: IncomeStatementLine) => void;
}) {
  return (
    <>
      {/* Section header */}
      <tr className="fs-section-header">
        <td colSpan={2}>{section.label.toUpperCase()}</td>
      </tr>

      {/* Account lines */}
      {section.accounts.map((account) => (
        <tr
          key={account.account_number}
          className={`fs-account-row ${account.account_id ? "fs-clickable" : ""}`}
          onClick={() => account.account_id && onAccountClick?.(account)}
        >
          <td className="fs-indent">
            <span className="fs-acct-num">{account.account_number}</span>
            {account.name}
          </td>
          <td className="fs-amount">{formatCurrency(account.amount)}</td>
        </tr>
      ))}

      {section.accounts.length === 0 && (
        <tr className="fs-account-row">
          <td className="fs-indent fs-no-data" colSpan={2}>{t("noAccountsRecorded")}</td>
        </tr>
      )}

      {/* Section total */}
      <tr className="fs-section-total">
        <td>{t("totalSection", { section: section.label })}</td>
        <td className="fs-amount">{formatCurrency(section.total)}</td>
      </tr>
    </>
  );
}

export default function BalanceSheetClient({ data, companyName }: Props) {
  const router = useRouter();
  const t = useTranslations("financial");
  const [asOfDate, setAsOfDate] = useState(data.asOfDate);
  const [selectedAccount, setSelectedAccount] = useState<IncomeStatementLine | null>(null);

  function formatDateLabel(dateStr: string): string {
    return formatDateLong(dateStr);
  }

  function handleApply() {
    router.push(`/financial/balance-sheet?asOf=${asOfDate}`);
  }

  function handlePrint() {
    window.print();
  }

  function handleAccountClick(account: IncomeStatementLine) {
    if (account.account_id) {
      setSelectedAccount(account);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>{t("balanceSheet")}</h2>
          <p className="fin-header-sub">{t("statementOfFinancialPosition")}</p>
        </div>
        <div className="fin-header-actions">
          <button className="ui-btn ui-btn-outline ui-btn-sm" onClick={handlePrint}>
            <Printer size={14} />
            {t("print")}
          </button>
        </div>
      </div>

      {/* Date Controls */}
      <div className="fs-date-controls">
        <div className="fs-date-field">
          <label htmlFor="fs-asof">{t("asOf")}</label>
          <input
            id="fs-asof"
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
          />
        </div>
        <button className="ui-btn ui-btn-primary ui-btn-md" onClick={handleApply}>
          {t("apply")}
        </button>
      </div>

      {/* Balance Warning Banner */}
      {!data.isBalanced && (
        <div className="fs-warning-banner">
          <AlertTriangle size={18} />
          <span>{t("warningBalance", { assets: formatCurrency(data.assets.total), liabilities: formatCurrency(data.totalLiabilitiesAndEquity) })}</span>
        </div>
      )}

      {/* Statement Card */}
      <div className="fin-chart-card fs-statement-card">
        {/* Statement Title Block */}
        <div className="fs-title-block">
          <div className="fs-company-name">{companyName}</div>
          <div className="fs-statement-name">{t("balanceSheet")}</div>
          <div className="fs-date-range">
            {t("asOf")} {formatDateLabel(data.asOfDate)}
          </div>
        </div>

        {/* Accounting Table */}
        <div style={{ overflowX: "auto" }}>
          <table className="fs-table">
            <thead>
              <tr>
                <th>{t("account")}</th>
                <th className="fs-amount">{t("amount")}</th>
              </tr>
            </thead>
            <tbody>
              {/* Assets */}
              <StatementSection section={data.assets} t={t} onAccountClick={handleAccountClick} />

              <tr className="fs-spacer"><td colSpan={2} /></tr>

              {/* Liabilities */}
              <StatementSection section={data.liabilities} t={t} onAccountClick={handleAccountClick} />

              <tr className="fs-spacer"><td colSpan={2} /></tr>

              {/* Equity */}
              <StatementSection section={data.equity} t={t} onAccountClick={handleAccountClick} />

              {/* Total Liabilities + Equity */}
              <tr className="fs-spacer"><td colSpan={2} /></tr>
              <tr className="fs-grand-total">
                <td>{t("totalLiabilitiesAndEquity")}</td>
                <td className="fs-amount">{formatCurrency(data.totalLiabilitiesAndEquity)}</td>
              </tr>

              {/* Balance Check */}
              <tr className="fs-spacer"><td colSpan={2} /></tr>
              <tr className="fs-balance-check">
                <td colSpan={2}>
                  <div className={`fs-balance-indicator ${data.isBalanced ? "fs-balanced" : "fs-unbalanced"}`}>
                    {data.isBalanced ? (
                      <>
                        <CheckCircle size={16} />
                        <span>{t("balanced")}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={16} />
                        <span>{t("unbalancedDifference", { difference: formatCurrency(Math.abs(data.assets.total - data.totalLiabilitiesAndEquity)) })}</span>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Transactions Drill-Down Modal */}
      {selectedAccount?.account_id && (
        <AccountTransactionsModal
          accountId={selectedAccount.account_id}
          accountName={selectedAccount.name}
          accountNumber={selectedAccount.account_number}
          endDate={data.asOfDate}
          isOpen={true}
          onClose={() => setSelectedAccount(null)}
        />
      )}
    </div>
  );
}
