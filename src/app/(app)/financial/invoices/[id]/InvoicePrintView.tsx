"use client";

interface LineItem {
  description?: string;
  csi_code?: string;
  quantity?: number;
  unit_price?: number;
  amount?: number;
}

interface Props {
  companyName: string;
  invoiceNumber: string;
  invoiceType: "payable" | "receivable";
  partyName: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  lineItems: LineItem[];
  notes: string;
  glAccountDisplay?: string | null;
}

function fmt(val: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
}

const STATUS_COLORS: Record<string, string> = {
  paid: "#16a34a",
  pending: "#d97706",
  overdue: "#dc2626",
  draft: "#64748b",
  voided: "#94a3b8",
};

export default function InvoicePrintView({
  companyName,
  invoiceNumber,
  invoiceType,
  partyName,
  invoiceDate,
  dueDate,
  status,
  subtotal,
  taxAmount,
  total,
  amountPaid,
  balanceDue,
  lineItems,
  notes,
  glAccountDisplay,
}: Props) {
  const isPayable = invoiceType === "payable";
  const hasCsiCodes = lineItems.some((l) => l.csi_code);
  const statusColor = STATUS_COLORS[status] ?? "#64748b";

  return (
    <div className="inv-print-view">
      {/* Dark header */}
      <div className="ipv-header">
        <div>
          <div className="ipv-title">INVOICE</div>
          <div className="ipv-invnum">{invoiceNumber}</div>
        </div>
        <div className="ipv-company">
          <div className="ipv-company-name">{companyName}</div>
          <div
            className="ipv-status-badge"
            style={{ color: statusColor, borderColor: statusColor }}
          >
            {status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Bill To + Invoice Details */}
      <div className="ipv-meta">
        <div className="ipv-meta-block">
          <div className="ipv-label">Bill {isPayable ? "From" : "To"}</div>
          <div className="ipv-party">{partyName}</div>
        </div>
        <div className="ipv-meta-block">
          <div className="ipv-label">Invoice Details</div>
          <div className="ipv-details-grid">
            <span className="ipv-dl">Invoice #</span>
            <span className="ipv-dv">{invoiceNumber}</span>
            <span className="ipv-dl">Type</span>
            <span className="ipv-dv">{isPayable ? "Payable (AP)" : "Receivable (AR)"}</span>
            <span className="ipv-dl">Invoice Date</span>
            <span className="ipv-dv">{invoiceDate}</span>
            <span className="ipv-dl">Due Date</span>
            <span className="ipv-dv">{dueDate}</span>
            {glAccountDisplay && (
              <>
                <span className="ipv-dl">{isPayable ? "Expense Acct" : "Revenue Acct"}</span>
                <span className="ipv-dv">{glAccountDisplay}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Line items */}
      <table className="ipv-table">
        <thead>
          <tr>
            <th className="ipv-th-center">#</th>
            <th>Description</th>
            {hasCsiCodes && <th>CSI Code</th>}
            <th className="ipv-th-right">Qty</th>
            <th className="ipv-th-right">Unit Price</th>
            <th className="ipv-th-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.length > 0 ? (
            lineItems.map((item, i) => {
              const qty = Number(item.quantity ?? 1);
              const price = Number(item.unit_price ?? 0);
              const amount = Number(item.amount ?? qty * price);
              return (
                <tr key={i}>
                  <td className="ipv-th-center ipv-muted">{i + 1}</td>
                  <td className="ipv-td-bold">{item.description ?? "—"}</td>
                  {hasCsiCodes && (
                    <td className="ipv-td-mono">{item.csi_code ?? ""}</td>
                  )}
                  <td className="ipv-th-right">{qty.toLocaleString()}</td>
                  <td className="ipv-th-right">{fmt(price)}</td>
                  <td className="ipv-th-right ipv-td-bold">{fmt(amount)}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={hasCsiCodes ? 6 : 5}
                className="ipv-th-center ipv-muted"
              >
                No line items
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div className="ipv-totals">
        <div className="ipv-total-row">
          <span>Subtotal</span>
          <span>{fmt(subtotal)}</span>
        </div>
        {taxAmount !== 0 && (
          <div className="ipv-total-row">
            <span>Tax</span>
            <span>{fmt(taxAmount)}</span>
          </div>
        )}
        {amountPaid > 0 && (
          <div className="ipv-total-row ipv-paid">
            <span>Amount Paid</span>
            <span>&minus;{fmt(amountPaid)}</span>
          </div>
        )}
        <div className="ipv-total-grand">
          <span>Total</span>
          <span>{fmt(total)}</span>
        </div>
        <div className={`ipv-balance${balanceDue <= 0 ? " ipv-balance-paid" : ""}`}>
          <span>Balance Due</span>
          <span>{fmt(Math.max(0, balanceDue))}</span>
        </div>
      </div>

      {/* Notes */}
      {notes && notes.trim() && (
        <div className="ipv-notes">
          <div className="ipv-label">Notes</div>
          <p>{notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="ipv-footer">
        <span>Generated by <strong>Buildwrk</strong></span>
        <span>{isPayable ? "Vendor" : "Client"}: {partyName}</span>
      </div>
    </div>
  );
}
