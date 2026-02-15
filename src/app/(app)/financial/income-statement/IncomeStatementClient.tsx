"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { FileText, Printer, Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import type { IncomeStatementData, IncomeStatementSection } from "@/lib/queries/financial";

interface Props {
  data: IncomeStatementData;
  companyName: string;
}

function StatementSection({
  section,
  indent = true,
  t,
}: {
  section: IncomeStatementSection;
  indent?: boolean;
  t: (key: string, values?: Record<string, string>) => string;
}) {
  return (
    <>
      {/* Section header */}
      <tr className="fs-section-header">
        <td colSpan={2}>{section.label}</td>
      </tr>

      {/* Account lines */}
      {section.accounts.map((account) => (
        <tr key={account.account_number} className="fs-account-row">
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
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";
  const [startDate, setStartDate] = useState(data.startDate);
  const [endDate, setEndDate] = useState(data.endDate);

  function formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(dateLocale, { month: "long", day: "numeric", year: "numeric" });
  }

  function handleApply() {
    router.push(`/financial/income-statement?start=${startDate}&end=${endDate}`);
  }

  function handlePrint() {
    window.print();
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
              <StatementSection section={data.revenue} t={t} />

              {/* Spacer */}
              <tr className="fs-spacer"><td colSpan={2} /></tr>

              {/* Cost of Construction */}
              <StatementSection section={data.costOfConstruction} t={t} />

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
              <StatementSection section={data.operatingExpenses} t={t} />

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
    </div>
  );
}
