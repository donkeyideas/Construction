"use client";

import { useState, useEffect } from "react";
import { X, Loader2, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import type { AccountTransactionsResult } from "@/lib/queries/financial";

interface Props {
  accountId: string;
  accountName: string;
  accountNumber: string;
  startDate?: string;
  endDate?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AccountTransactionsModal({
  accountId,
  accountName,
  accountNumber,
  startDate,
  endDate,
  isOpen,
  onClose,
}: Props) {
  const [data, setData] = useState<AccountTransactionsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeUnposted, setIncludeUnposted] = useState(false);

  useEffect(() => {
    if (!isOpen || !accountId) return;

    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ accountId });
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (includeUnposted) params.set("includeUnposted", "true");

    fetch(`/api/financial/account-transactions?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch transactions");
        return res.json();
      })
      .then((result: AccountTransactionsResult) => {
        setData(result);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, accountId, startDate, endDate, includeUnposted]);

  if (!isOpen) return null;

  // Compute running balance
  let runningBalance = 0;
  const transactionsWithBalance = (data?.transactions ?? []).map((txn) => {
    if (data?.normalBalance === "debit") {
      runningBalance += txn.debit - txn.credit;
    } else {
      runningBalance += txn.credit - txn.debit;
    }
    return { ...txn, runningBalance };
  });

  return (
    <div className="acct-txn-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="acct-txn-modal">
        {/* Header */}
        <div className="acct-txn-header">
          <div>
            <h3 className="acct-txn-title">
              <span className="acct-txn-acct-num">{accountNumber}</span>
              {accountName}
            </h3>
            <p className="acct-txn-subtitle">
              {startDate && endDate
                ? `${formatDate(startDate)} — ${formatDate(endDate)}`
                : startDate
                  ? `From ${formatDate(startDate)}`
                  : endDate
                    ? `Through ${formatDate(endDate)}`
                    : "All transactions"
              }
            </p>
          </div>
          <button type="button" className="acct-txn-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Include draft toggle */}
        <div style={{ padding: "0 24px", display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "var(--muted)" }}>
            <input
              type="checkbox"
              checked={includeUnposted}
              onChange={(e) => setIncludeUnposted(e.target.checked)}
            />
            Include draft entries
          </label>
          {data && data.transactions.length === 0 && !loading && (
            <span style={{ color: "var(--color-amber)", fontSize: "0.78rem" }}>
              No posted transactions found — try including drafts
            </span>
          )}
        </div>

        {/* Body */}
        <div className="acct-txn-body">
          {loading && (
            <div className="acct-txn-loading">
              <Loader2 size={24} className="spin" />
              <span>Loading transactions...</span>
            </div>
          )}

          {error && (
            <div className="acct-txn-error">{error}</div>
          )}

          {!loading && !error && data && (
            <>
              {transactionsWithBalance.length === 0 ? (
                <div className="acct-txn-empty">No transactions found for this period.</div>
              ) : (
                <div className="acct-txn-table-wrap">
                  <table className="acct-txn-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>JE #</th>
                        <th>Description</th>
                        <th className="acct-txn-amt">Debit</th>
                        <th className="acct-txn-amt">Credit</th>
                        <th className="acct-txn-amt">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactionsWithBalance.map((txn) => (
                        <tr key={txn.id} className="acct-txn-row">
                          <td className="acct-txn-date">{formatDate(txn.entry_date)}</td>
                          <td>
                            <a
                              href="/financial/general-ledger"
                              className="acct-txn-je-link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {txn.entry_number}
                              <ExternalLink size={11} />
                            </a>
                          </td>
                          <td className="acct-txn-desc">
                            {txn.line_description || txn.description}
                          </td>
                          <td className="acct-txn-amt">
                            {txn.debit > 0 ? formatCurrency(txn.debit) : ""}
                          </td>
                          <td className="acct-txn-amt">
                            {txn.credit > 0 ? formatCurrency(txn.credit) : ""}
                          </td>
                          <td className="acct-txn-amt acct-txn-balance">
                            {formatCurrency(txn.runningBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="acct-txn-totals">
                        <td colSpan={3}>Totals</td>
                        <td className="acct-txn-amt">{formatCurrency(data.totalDebit)}</td>
                        <td className="acct-txn-amt">{formatCurrency(data.totalCredit)}</td>
                        <td className="acct-txn-amt acct-txn-balance">
                          {formatCurrency(data.netBalance)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
