"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

interface JELine {
  id: string;
  accountNumber: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
}

interface JEDetail {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  reference: string | null;
  status: string;
  lines: JELine[];
}

interface Props {
  jeId: string;
  jeNumber: string;
  isOpen: boolean;
  onClose: () => void;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDate(iso: string): string {
  const parts = (iso || "").split("T")[0].split("-");
  if (parts.length < 3) return iso || "";
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  return `${MONTHS[m]} ${d}, ${parts[0]}`;
}

export default function JournalEntryModal({ jeId, jeNumber, isOpen, onClose }: Props) {
  const [data, setData] = useState<JEDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !jeId) return;
    setLoading(true);
    setError("");
    fetch(`/api/financial/journal-entry/${jeId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isOpen, jeId]);

  if (!isOpen) return null;

  const totalDebit = data?.lines.reduce((s, l) => s + l.debit, 0) ?? 0;
  const totalCredit = data?.lines.reduce((s, l) => s + l.credit, 0) ?? 0;

  return (
    <div className="je-modal-overlay" onClick={onClose}>
      <div className="je-modal" onClick={(e) => e.stopPropagation()}>
        <div className="je-modal-header">
          <div>
            <h3>Journal Entry {jeNumber}</h3>
            {data && (
              <p className="je-modal-sub">
                {formatDate(data.entry_date)} &bull; {data.status}
                {data.reference && ` \u2022 Ref: ${data.reference}`}
              </p>
            )}
          </div>
          <button className="je-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {data?.description && (
          <p className="je-modal-desc">{data.description}</p>
        )}

        {loading && <div className="je-modal-loading">Loading...</div>}
        {error && <div className="je-modal-error">{error}</div>}

        {data && (
          <div className="je-modal-table-wrap">
            <table className="invoice-table je-modal-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Description</th>
                  <th style={{ textAlign: "right" }}>Debit</th>
                  <th style={{ textAlign: "right" }}>Credit</th>
                </tr>
              </thead>
              <tbody>
                {data.lines.map((line) => (
                  <tr key={line.id}>
                    <td>
                      <span className="je-modal-acct-num">{line.accountNumber}</span>
                      {" "}
                      <span className="je-modal-acct-name">{line.accountName}</span>
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{line.description}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: line.debit > 0 ? "var(--color-red)" : "var(--muted)" }}>
                      {line.debit > 0 ? formatCurrency(line.debit) : "\u2014"}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: line.credit > 0 ? "var(--color-green)" : "var(--muted)" }}>
                      {line.credit > 0 ? formatCurrency(line.credit) : "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="je-modal-totals">
                  <td colSpan={2} style={{ fontWeight: 600 }}>Totals</td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "var(--color-red)" }}>
                    {formatCurrency(totalDebit)}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "var(--color-green)" }}>
                    {formatCurrency(totalCredit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
