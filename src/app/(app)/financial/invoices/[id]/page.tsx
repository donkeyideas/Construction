import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, ArrowLeft, Printer, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getInvoiceById } from "@/lib/queries/financial";
import { formatCurrency } from "@/lib/utils/format";
import type { LineItem, PaymentRow } from "@/lib/queries/financial";
import RecordPaymentButton from "./RecordPaymentButton";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Invoice ${id.substring(0, 8)} - ConstructionERP` };
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params;

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><FileText size={48} /></div>
        <div className="fin-empty-title">Connection Error</div>
        <div className="fin-empty-desc">Unable to connect. Please try again.</div>
      </div>
    );
  }

  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><FileText size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Complete registration to view invoices.</div>
      </div>
    );
  }

  const invoice = await getInvoiceById(supabase, id);

  if (!invoice) {
    notFound();
  }

  const isPayable = invoice.invoice_type === "payable";
  const statusClass = `inv-status inv-status-${invoice.status}`;

  // Safely parse line_items - might be string JSON from Supabase JSONB
  let lineItems: LineItem[] = [];
  try {
    const raw = invoice.line_items;
    if (Array.isArray(raw)) {
      lineItems = raw;
    } else if (typeof raw === "string") {
      lineItems = JSON.parse(raw);
    }
  } catch {
    lineItems = [];
  }

  const payments: PaymentRow[] = Array.isArray(invoice.payments) ? invoice.payments : [];

  // Safe currency formatting
  const safeCurrency = (val: unknown) => {
    const num = Number(val);
    return isNaN(num) ? "$0" : formatCurrency(num);
  };

  // Safe date formatting
  const safeDate = (val: unknown, opts?: Intl.DateTimeFormatOptions) => {
    try {
      return new Date(String(val)).toLocaleDateString("en-US", opts ?? { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "--";
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <Link
            href="/financial/invoices"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.82rem",
              color: "var(--muted)",
              textDecoration: "none",
              marginBottom: 8,
            }}
          >
            <ArrowLeft size={14} />
            Back to Invoices
          </Link>
          <h2 style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {invoice.invoice_number ?? "Invoice"}
            <span className={statusClass}>{invoice.status ?? "unknown"}</span>
          </h2>
          <p className="fin-header-sub">
            {isPayable ? "Accounts Payable" : "Accounts Receivable"}
            {" — "}
            {isPayable ? invoice.vendor_name ?? "Unknown Vendor" : invoice.client_name ?? "Unknown Client"}
          </p>
        </div>
        <div className="fin-header-actions">
          <RecordPaymentButton
            invoiceId={id}
            balanceDue={Number(invoice.balance_due) || 0}
            invoiceType={invoice.invoice_type}
          />
          <button className="ui-btn ui-btn-outline ui-btn-md" type="button">
            <Printer size={16} />
            Print
          </button>
          <button className="ui-btn ui-btn-outline ui-btn-md" type="button">
            <Download size={16} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="fin-kpi">
          <span className="fin-kpi-label">Total Amount</span>
          <span className="fin-kpi-value">{safeCurrency(invoice.total_amount)}</span>
        </div>
        <div className="fin-kpi">
          <span className="fin-kpi-label">Amount Paid</span>
          <span className="fin-kpi-value positive">{safeCurrency(invoice.amount_paid)}</span>
        </div>
        <div className="fin-kpi">
          <span className="fin-kpi-label">Balance Due</span>
          <span className={`fin-kpi-value ${Number(invoice.balance_due) > 0 ? "negative" : ""}`}>
            {safeCurrency(invoice.balance_due)}
          </span>
        </div>
        <div className="fin-kpi">
          <span className="fin-kpi-label">Due Date</span>
          <span className="fin-kpi-value" style={{ fontSize: "1.1rem" }}>
            {safeDate(invoice.due_date)}
          </span>
        </div>
      </div>

      {/* Details Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Invoice Info */}
        <div className="card">
          <div className="card-title">Invoice Details</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              ["Type", isPayable ? "Accounts Payable (AP)" : "Accounts Receivable (AR)"],
              ["Invoice Number", invoice.invoice_number],
              [isPayable ? "Vendor" : "Client", isPayable ? invoice.vendor_name : invoice.client_name],
              ["Invoice Date", safeDate(invoice.invoice_date, { month: "long", day: "numeric", year: "numeric" })],
              ["Due Date", safeDate(invoice.due_date, { month: "long", day: "numeric", year: "numeric" })],
              ["Status", invoice.status],
            ].map(([label, value]) => (
              <div key={String(label)} className="info-row">
                <span className="info-label">{label}</span>
                <span className="info-value">{value ?? "--"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <div className="card-title">Notes</div>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.6 }}>
            {invoice.notes || "No notes for this invoice."}
          </p>
        </div>
      </div>

      {/* Line Items */}
      {lineItems.length > 0 && (
        <div className="fin-chart-card" style={{ padding: 0, marginBottom: 24 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Line Items</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style={{ textAlign: "center" }}>Qty</th>
                  <th style={{ textAlign: "right" }}>Unit Price</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, i) => (
                  <tr key={i}>
                    <td>{item.description ?? "--"}</td>
                    <td style={{ textAlign: "center" }}>{item.quantity ?? 0}</td>
                    <td style={{ textAlign: "right" }}>{safeCurrency(item.unit_price)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                      {safeCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid var(--border)" }}>
                  <td colSpan={3} style={{ textAlign: "right", fontWeight: 600 }}>Subtotal</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{safeCurrency(invoice.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} style={{ textAlign: "right", color: "var(--muted)" }}>Tax</td>
                  <td style={{ textAlign: "right", color: "var(--muted)" }}>{safeCurrency(invoice.tax_amount)}</td>
                </tr>
                <tr style={{ borderTop: "1px solid var(--border)" }}>
                  <td colSpan={3} style={{ textAlign: "right", fontWeight: 700, fontSize: "1rem" }}>Total</td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontSize: "1rem" }}>{safeCurrency(invoice.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Payments History */}
      <div className="fin-chart-card" style={{ padding: 0 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Payment History</div>
        </div>
        {payments.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{safeDate(p.payment_date)}</td>
                    <td style={{ textTransform: "capitalize" }}>{p.method ?? "--"}</td>
                    <td style={{ color: "var(--muted)" }}>{p.reference_number ?? "--"}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "var(--color-green)" }}>
                      {safeCurrency(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
            No payments recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
