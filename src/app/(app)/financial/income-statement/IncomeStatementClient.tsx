"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Printer } from "lucide-react";
import { formatCurrency, formatDateLong } from "@/lib/utils/format";
import type { IncomeStatementData, IncomeStatementSection, IncomeStatementLine } from "@/lib/queries/financial";
import AccountTransactionsModal from "@/components/financial/AccountTransactionsModal";

interface Props {
  data: IncomeStatementData;
  companyName: string;
}

function StatementSection({
  section,
  indent = true,
  t,
  onAccountClick,
}: {
  section: IncomeStatementSection;
  indent?: boolean;
  t: (key: string, values?: Record<string, string>) => string;
  onAccountClick?: (account: IncomeStatementLine) => void;
}) {
  return (
    <>
      {/* Section header */}
      <tr className="fs-section-header">
        <td colSpan={2}>{section.label}</td>
      </tr>

      {/* Account lines */}
      {section.accounts.map((account) => (
        <tr
          key={account.account_number}
          className={`fs-account-row ${account.account_id ? "fs-clickable" : ""}`}
          onClick={() => account.account_id && onAccountClick?.(account)}
        >
          <td className={indent ? "fs-indent" : ""}>
            <span className="fs-acct-num">{account.account_number}</span>
            {account.name}
          </td>
          <td className="fs-amount">{formatCurrency(account.amount)}</td>
        </tr>
      ))}

      {section.accounts.length === 0 && (
        <tr className="fs-account-row">
          <td className="fs-indent fs-no-data" colSpan={2}>{t("noAccountsForPeriod")}</td>
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

export default function IncomeStatementClient({ data, companyName }: Props) {
  const router = useRouter();
  const t = useTranslations("financial");
  const [startDate, setStartDate] = useState(data.startDate);
  const [endDate, setEndDate] = useState(data.endDate);
  const [selectedAccount, setSelectedAccount] = useState<IncomeStatementLine | null>(null);

  function formatDateLabel(dateStr: string): string {
    return formatDateLong(dateStr);
  }

  function handleApply() {
    router.push(`/financial/income-statement?start=${startDate}&end=${endDate}`);
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
          <h2>{t("incomeStatement")}</h2>
          <p className="fin-header-sub">{t("profitAndLossForPeriod")}</p>
        </div>
        <div className="fin-header-actions">
          <button className="ui-btn ui-btn-outline ui-btn-sm" onClick={handlePrint}>
            <Printer size={14} />
            {t("print")}
          </button>
        </div>
      </div>

      {/* Date Range Controls */}
      <div className="fs-date-controls">
        <div className="fs-date-field">
          <label htmlFor="fs-start">{t("from")}</label>
          <input
            id="fs-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="fs-date-field">
          <label htmlFor="fs-end">{t("to")}</label>
          <input
            id="fs-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <button className="ui-btn ui-btn-primary ui-btn-md" onClick={handleApply}>
          {t("apply")}
        </button>
      </div>

      {/* Statement Card */}
      <div className="fin-chart-card fs-statement-card">
        {/* Statement Title Block */}
        <div className="fs-title-block">
          <div className="fs-company-name">{companyName}</div>
          <div className="fs-statement-name">{t("incomeStatement")}</div>
          <div className="fs-date-range">
            {formatDateLabel(data.startDate)} &mdash; {formatDateLabel(data.endDate)}
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
              {/* Revenue */}
              <StatementSection section={data.revenue} t={t} onAccountClick={handleAccountClick} />

              {/* Spacer */}
              <tr className="fs-spacer"><td colSpan={2} /></tr>

              {/* Cost of Construction */}
              <StatementSection section={data.costOfConstruction} t={t} onAccountClick={handleAccountClick} />

              {/* Gross Profit */}
              <tr className="fs-spacer"><td colSpan={2} /></tr>
              <tr className="fs-grand-total">
                <td>{t("grossProfit")}</td>
                <td className={`fs-amount ${data.grossProfit >= 0 ? "fs-positive" : "fs-negative"}`}>
                  {formatCurrency(data.grossProfit)}
                </td>
              </tr>

              {/* Spacer */}
              <tr className="fs-spacer"><td colSpan={2} /></tr>

              {/* Operating Expenses */}
              <StatementSection section={data.operatingExpenses} t={t} onAccountClick={handleAccountClick} />

              {/* Net Income */}
              <tr className="fs-spacer"><td colSpan={2} /></tr>
              <tr className="fs-net-income">
                <td>{t("netIncome")}</td>
                <td className={`fs-amount ${data.netIncome >= 0 ? "fs-positive" : "fs-negative"}`}>
                  {formatCurrency(data.netIncome)}
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
          startDate={data.startDate}
          endDate={data.endDate}
          isOpen={true}
          onClose={() => setSelectedAccount(null)}
        />
      )}
    </div>
  );
}
