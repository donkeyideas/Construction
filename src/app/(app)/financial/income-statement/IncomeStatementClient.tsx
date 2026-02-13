"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Printer, Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import type { IncomeStatementData, IncomeStatementSection } from "@/lib/queries/financial";

interface Props {
  data: IncomeStatementData;
  companyName: string;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function StatementSection({
  section,
  indent = true,
}: {
  section: IncomeStatementSection;
  indent?: boolean;
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
          <td className="fs-indent fs-no-data" colSpan={2}>No accounts for this period</td>
        </tr>
      )}

      {/* Section total */}
      <tr className="fs-section-total">
        <td>Total {section.label}</td>
        <td className="fs-amount">{formatCurrency(section.total)}</td>
      </tr>
    </>
  );
}

export default function IncomeStatementClient({ data, companyName }: Props) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(data.startDate);
  const [endDate, setEndDate] = useState(data.endDate);

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
          <h2>Income Statement</h2>
          <p className="fin-header-sub">Profit &amp; Loss for the period</p>
        </div>
        <div className="fin-header-actions">
          <button className="ui-btn ui-btn-outline ui-btn-sm" onClick={handlePrint}>
            <Printer size={14} />
            Print
          </button>
        </div>
      </div>

      {/* Date Range Controls */}
      <div className="fs-date-controls">
        <div className="fs-date-field">
          <label htmlFor="fs-start">From</label>
          <input
            id="fs-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="fs-date-field">
          <label htmlFor="fs-end">To</label>
          <input
            id="fs-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <button className="ui-btn ui-btn-primary ui-btn-md" onClick={handleApply}>
          Apply
        </button>
      </div>

      {/* Statement Card */}
      <div className="fin-chart-card fs-statement-card">
        {/* Statement Title Block */}
        <div className="fs-title-block">
          <div className="fs-company-name">{companyName}</div>
          <div className="fs-statement-name">Income Statement</div>
          <div className="fs-date-range">
            {formatDateLabel(data.startDate)} &mdash; {formatDateLabel(data.endDate)}
          </div>
        </div>

        {/* Accounting Table */}
        <div style={{ overflowX: "auto" }}>
          <table className="fs-table">
            <thead>
              <tr>
                <th>Account</th>
                <th className="fs-amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              {/* Revenue */}
              <StatementSection section={data.revenue} />

              {/* Spacer */}
              <tr className="fs-spacer"><td colSpan={2} /></tr>

              {/* Cost of Construction */}
              <StatementSection section={data.costOfConstruction} />

              {/* Gross Profit */}
              <tr className="fs-spacer"><td colSpan={2} /></tr>
              <tr className="fs-grand-total">
                <td>GROSS PROFIT</td>
                <td className={`fs-amount ${data.grossProfit >= 0 ? "fs-positive" : "fs-negative"}`}>
                  {formatCurrency(data.grossProfit)}
                </td>
              </tr>

              {/* Spacer */}
              <tr className="fs-spacer"><td colSpan={2} /></tr>

              {/* Operating Expenses */}
              <StatementSection section={data.operatingExpenses} />

              {/* Net Income */}
              <tr className="fs-spacer"><td colSpan={2} /></tr>
              <tr className="fs-net-income">
                <td>NET INCOME</td>
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
