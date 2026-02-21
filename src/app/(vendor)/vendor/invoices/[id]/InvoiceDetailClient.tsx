"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLocale } from "next-intl";
import type { VendorInvoiceDetail } from "@/lib/queries/vendor-portal";
import "@/styles/vendor-detail.css";

interface LineItem {
  description?: string;
  qty?: number;
  unit_price?: number;
  amount?: number;
}

export default function InvoiceDetailClient({ invoice }: { invoice: VendorInvoiceDetail }) {
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const fmt = (n: number) =>
    new Intl.NumberFormat(dateLocale, { style: "currency", currency: "USD" }).format(n);

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(dateLocale) : "\u2014";

  const paidAmount = invoice.total_amount - invoice.balance_due;
  const lineItems: LineItem[] = Array.isArray(invoice.line_items) ? invoice.line_items : [];

  return (
    <div>
      <Link href="/vendor/invoices" className="vd-back">
        <ArrowLeft size={16} /> Back to Invoices
      </Link>

      <div className="vd-header">
        <div className="vd-header-left">
          <h2>Invoice {invoice.invoice_number}</h2>
          <span className="vd-header-sub">
            {invoice.project_name ? `Project: ${invoice.project_name}` : "No project assigned"}
          </span>
        </div>
        <span className={`vd-badge vd-badge-${invoice.status}`}>{invoice.status}</span>
      </div>

      {/* Summary Cards */}
      <div className="vd-cards">
        <div className="vd-card">
          <div className="vd-card-label">Total Amount</div>
          <div className="vd-card-value">{fmt(invoice.total_amount)}</div>
        </div>
        <div className="vd-card">
          <div className="vd-card-label">Tax</div>
          <div className="vd-card-value">{fmt(invoice.tax_amount)}</div>
        </div>
        <div className="vd-card">
          <div className="vd-card-label">Paid</div>
          <div className="vd-card-value" style={{ color: "var(--color-green)" }}>{fmt(paidAmount)}</div>
        </div>
        <div className="vd-card">
          <div className="vd-card-label">Balance Due</div>
          <div className="vd-card-value" style={{ color: invoice.balance_due > 0 ? "var(--color-red)" : "var(--color-green)" }}>
            {fmt(invoice.balance_due)}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="vd-section">
        <div className="vd-section-title">Invoice Details</div>
        <div className="vd-grid">
          <div>
            <div className="vd-field-label">Invoice Date</div>
            <div className="vd-field-value">{fmtDate(invoice.invoice_date)}</div>
          </div>
          <div>
            <div className="vd-field-label">Due Date</div>
            <div className="vd-field-value">{fmtDate(invoice.due_date)}</div>
          </div>
          <div>
            <div className="vd-field-label">Payment Terms</div>
            <div className="vd-field-value">{invoice.payment_terms?.replace(/_/g, " ").toUpperCase() || "\u2014"}</div>
          </div>
          <div>
            <div className="vd-field-label">Project</div>
            <div className="vd-field-value">{invoice.project_name || "\u2014"}</div>
          </div>
          {invoice.description && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="vd-field-label">Description</div>
              <div className="vd-field-value">{invoice.description}</div>
            </div>
          )}
        </div>
      </div>

      {/* Line Items */}
      {lineItems.length > 0 && (
        <div className="vd-section">
          <div className="vd-section-title">Line Items</div>
          <table className="vd-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, i) => (
                <tr key={i}>
                  <td>{item.description || "\u2014"}</td>
                  <td>{item.qty ?? 1}</td>
                  <td>{item.unit_price != null ? fmt(item.unit_price) : "\u2014"}</td>
                  <td style={{ textAlign: "right" }}>{item.amount != null ? fmt(item.amount) : "\u2014"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment History */}
      <div className="vd-section">
        <div className="vd-section-title">Payment History</div>
        {invoice.payments.length === 0 ? (
          <div className="vd-table-empty">No payments recorded yet</div>
        ) : (
          <table className="vd-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Journal Entry</th>
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map((p) => (
                <tr key={p.id}>
                  <td>{fmtDate(p.payment_date)}</td>
                  <td style={{ fontWeight: 600 }}>{fmt(p.amount)}</td>
                  <td style={{ textTransform: "capitalize" }}>{p.method}</td>
                  <td>{p.reference_number || "\u2014"}</td>
                  <td>{p.je_entry_number || "\u2014"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
