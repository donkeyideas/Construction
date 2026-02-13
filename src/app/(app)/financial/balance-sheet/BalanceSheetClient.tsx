"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Printer, AlertTriangle, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import type { BalanceSheetData, BalanceSheetSection } from "@/lib/queries/financial";

interface Props {
  data: BalanceSheetData;
  companyName: string;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function StatementSection({ section }: { section: BalanceSheetSection }) {
  return (
    <>
      {/* Section header */}
      <tr className="fs-section-header">
        <td colSpan={2}>{section.label.toUpperCase()}</td>
      </tr>

      {/* Account lines */}
      {section.accounts.map((account) => (
        <tr key={account.account_number} className="fs-account-row">
          <td className="fs-indent">
            <span className="fs-acct-num">{account.account_number}</span>
            {account.name}
          </td>
          <td className="fs-amount">{formatCurrency(account.amount)}</td>
        </tr>
      ))}

      {section.accounts.length === 0 && (
        <tr className="fs-account-row">
          <td className="fs-indent fs-no-data" colSpan={2}>No accounts recorded</td>
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

export default function BalanceSheetClient({ data, companyName }: Props) {
  const router = useRouter();
  const [asOfDate, setAsOfDate] = useState(data.asOfDate);

  function handleApply() {
    router.push(`/financial/balance-sheet?asOf=${asOfDate}`);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Balance Sheet</h2>
          <p className="fin-header-sub">Statement of Financial Position</p>
        </div>
        <div className="fin-header-actions">
          <button className="ui-btn ui-btn-outline ui-btn-sm" onClick={handlePrint}>
            <Printer size={14} />
            Print
          </button>
        </div>
      </div>

      {/* Date Controls */}
      <div className="fs-date-controls">
        <div className="fs-date-field">
          <label htmlFor="fs-asof">As of</label>
          <input
            id="fs-asof"
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
          />
        </div>
        <button className="ui-btn ui-btn-primary ui-btn-md" onClick={handleApply}>
          Apply
        </button>
      </div>

      {/* Balance Warning Banner */}
      {!data.isBalanced && (
        <div className="fs-warning-banner">
          <AlertTriangle size={18} />
          <span>Warning: Balance sheet is not balanced. Total Assets ({formatCurrency(data.assets.total)}) does not equal Total Liabilities + Equity ({formatCurrency(data.totalLiabilitiesAndEquity)}).</span>
        </div>
      )}

      {/* Statement Card */}
      <div className="fin-chart-card fs-statement-card">
        {/* Statement Title Block */}
        <div className="fs-title-block">
          <div className="fs-company-name">{companyName}</div>
          <div className="fs-statement-name">Balance Sheet</div>
          <div className="fs-date-range">
            As of {formatDateLabel(data.asOfDate)}
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
              {/* Assets */}
              <StatementSection section={data.assets} />

              <tr className="fs-spacer"><td colSpan={2} /></tr>

              {/* Liabilities */}
              <StatementSection section={data.liabilities} />

              <tr className="fs-spacer"><td colSpan={2} /></tr>

              {/* Equity */}
              <StatementSection section={data.equity} />

              {/* Total Liabilities + Equity */}
              <tr className="fs-spacer"><td colSpan={2} /></tr>
              <tr className="fs-grand-total">
                <td>TOTAL LIABILITIES + EQUITY</td>
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
                        <span>Balanced</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={16} />
                        <span>UNBALANCED &mdash; Difference: {formatCurrency(Math.abs(data.assets.total - data.totalLiabilitiesAndEquity))}</span>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
