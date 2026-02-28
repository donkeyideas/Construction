import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getInvoiceById } from "@/lib/queries/financial";
import { PrintButtons } from "./PrintButtons";
import { AutoPrint } from "./AutoPrint";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ autoPrint?: string }>;
}

function fmt(val: unknown): string {
  const num = Number(val ?? 0);
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

function fmtDate(val: unknown): string {
  const s = String(val ?? "");
  if (!s || s === "null" || s === "undefined") return "—";
  try {
    const d = new Date(s + (s.includes("T") ? "" : "T12:00:00"));
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return s;
  }
}

interface LineItem {
  description?: string;
  csi_code?: string;
  quantity?: number;
  unit_price?: number;
  amount?: number;
}

const STYLES = [
  "*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }",
  "html, body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f8fafc; color: #1e293b; font-size: 14px; line-height: 1.5; }",
  ".inv-page { max-width: 860px; margin: 32px auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 16px rgba(0,0,0,0.08); overflow: hidden; }",
  ".inv-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 40px 48px 32px; background: #0f172a; color: #fff; }",
  ".inv-header-left h1 { font-size: 2rem; font-weight: 700; letter-spacing: 0.04em; color: #fff; }",
  ".inv-header-left .inv-number { font-size: 0.95rem; color: #94a3b8; margin-top: 4px; }",
  ".inv-header-right { text-align: right; }",
  ".inv-header-right .company-name { font-size: 1.15rem; font-weight: 700; color: #fff; }",
  ".inv-header-right .company-sub { font-size: 0.82rem; color: #94a3b8; margin-top: 2px; }",
  ".inv-status-badge { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; border: 1.5px solid currentColor; margin-top: 8px; }",
  ".inv-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-bottom: 1px solid #e2e8f0; }",
  ".inv-meta-block { padding: 28px 48px; }",
  ".inv-meta-block:first-child { border-right: 1px solid #e2e8f0; }",
  ".inv-meta-block h3 { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #94a3b8; margin-bottom: 10px; }",
  ".inv-meta-block .party-name { font-size: 1rem; font-weight: 700; color: #0f172a; }",
  ".inv-details-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 32px; margin-top: 6px; }",
  ".inv-detail-row { display: flex; justify-content: space-between; font-size: 0.84rem; }",
  ".inv-detail-row .label { color: #64748b; }",
  ".inv-detail-row .value { font-weight: 600; color: #1e293b; text-align: right; }",
  ".inv-table-wrap { padding: 0 48px; }",
  "table { width: 100%; border-collapse: collapse; margin-top: 24px; }",
  "thead tr { background: #f1f5f9; }",
  "th { padding: 10px 12px; text-align: left; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }",
  "th.right, td.right { text-align: right; }",
  "th.center, td.center { text-align: center; }",
  "td { padding: 12px 12px; font-size: 0.88rem; border-bottom: 1px solid #f1f5f9; color: #334155; }",
  "td.desc { font-weight: 500; color: #1e293b; }",
  "tbody tr:last-child td { border-bottom: none; }",
  ".inv-totals { padding: 20px 48px 0; }",
  ".inv-totals-inner { margin-left: auto; max-width: 320px; }",
  ".inv-total-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 0.88rem; }",
  ".inv-total-row .t-label { color: #64748b; }",
  ".inv-total-row .t-value { font-weight: 600; }",
  ".inv-total-divider { border: none; border-top: 1px solid #e2e8f0; margin: 6px 0; }",
  ".inv-total-grand { display: flex; justify-content: space-between; align-items: center; padding: 10px 0 6px; font-size: 1rem; font-weight: 700; color: #0f172a; }",
  ".inv-balance-box { margin-top: 8px; padding: 12px 16px; border-radius: 6px; background: #f8fafc; border: 1.5px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }",
  ".inv-balance-box .bal-label { font-size: 0.78rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #64748b; }",
  ".inv-balance-box .bal-value { font-size: 1.15rem; font-weight: 700; color: #dc2626; }",
  ".inv-balance-box.paid .bal-value { color: #16a34a; }",
  ".inv-notes { padding: 24px 48px; border-top: 1px solid #e2e8f0; margin-top: 20px; }",
  ".inv-notes h3 { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px; }",
  ".inv-notes p { font-size: 0.88rem; color: #475569; white-space: pre-wrap; }",
  ".inv-footer { padding: 20px 48px 32px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }",
  ".inv-footer .footer-brand { font-size: 0.75rem; color: #94a3b8; }",
  ".inv-footer .footer-brand strong { color: #64748b; }",
  "@media print { html, body { background: #fff; } .inv-page { box-shadow: none; border-radius: 0; margin: 0; max-width: 100%; } }",
].join(" ");

export default async function InvoicePrintPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { autoPrint } = await searchParams;

  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);
  if (!userCompany) redirect("/login");

  const invoice = await getInvoiceById(supabase, id);
  if (!invoice) notFound();

  const { data: company } = await supabase
    .from("companies")
    .select("name, website")
    .eq("id", userCompany.companyId)
    .single();

  const raw = invoice as unknown as Record<string, unknown>;
  const isPayable = invoice.invoice_type === "payable";

  let lineItems: LineItem[] = [];
  try {
    const li = invoice.line_items;
    if (Array.isArray(li)) lineItems = li as LineItem[];
    else if (typeof li === "string") lineItems = JSON.parse(li);
  } catch { /* empty */ }

  const subtotal = Number(raw.subtotal ?? invoice.total_amount ?? 0);
  const taxAmount = Number(raw.tax_amount ?? 0);
  const total = Number(invoice.total_amount ?? 0);
  const amountPaid = Number(raw.amount_paid ?? 0);
  const balanceDue = Number(raw.balance_due ?? total - amountPaid);

  const statusColors: Record<string, string> = {
    paid: "#16a34a",
    pending: "#d97706",
    overdue: "#dc2626",
    draft: "#64748b",
    voided: "#94a3b8",
  };
  const statusColor = statusColors[String(invoice.status ?? "pending")] ?? "#64748b";

  const companyName = company?.name ?? userCompany.companyName ?? "Your Company";
  const companyWebsite = (company?.website ?? "").replace(/^https?:\/\//, "");
  const partyName = isPayable
    ? String(invoice.vendor_name ?? "—")
    : String(invoice.client_name ?? "—");

  const hasCsiCodes = lineItems.some((l) => l.csi_code);
  const colSpan = hasCsiCodes ? 6 : 5;
  const shouldAutoPrint = autoPrint === "1";

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>
          Invoice {String(invoice.invoice_number ?? id.slice(0, 8))} — {companyName}
        </title>
        <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      </head>
      <body>
        <PrintButtons />

        <div className="inv-page">
          {/* Dark header bar */}
          <div className="inv-header">
            <div className="inv-header-left">
              <h1>INVOICE</h1>
              <div className="inv-number">{String(invoice.invoice_number ?? "—")}</div>
            </div>
            <div className="inv-header-right">
              <div className="company-name">{companyName}</div>
              {companyWebsite && <div className="company-sub">{companyWebsite}</div>}
              <div
                className="inv-status-badge"
                style={{ color: statusColor, borderColor: statusColor }}
              >
                {String(invoice.status ?? "pending").toUpperCase()}
              </div>
            </div>
          </div>

          {/* Bill To / Invoice Details */}
          <div className="inv-meta">
            <div className="inv-meta-block">
              <h3>Bill {isPayable ? "From" : "To"}</h3>
              <div className="party-name">{partyName}</div>
            </div>
            <div className="inv-meta-block">
              <h3>Invoice Details</h3>
              <div className="inv-details-grid">
                <div className="inv-detail-row">
                  <span className="label">Invoice #</span>
                  <span className="value">{String(invoice.invoice_number ?? "—")}</span>
                </div>
                <div className="inv-detail-row">
                  <span className="label">Type</span>
                  <span className="value">{isPayable ? "Payable (AP)" : "Receivable (AR)"}</span>
                </div>
                <div className="inv-detail-row">
                  <span className="label">Invoice Date</span>
                  <span className="value">{fmtDate(raw.invoice_date)}</span>
                </div>
                <div className="inv-detail-row">
                  <span className="label">Due Date</span>
                  <span className="value">{fmtDate(raw.due_date)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="inv-table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="center" style={{ width: "28px" }}>#</th>
                  <th>Description</th>
                  {hasCsiCodes && <th style={{ width: "100px" }}>CSI Code</th>}
                  <th className="right" style={{ width: "60px" }}>Qty</th>
                  <th className="right" style={{ width: "110px" }}>Unit Price</th>
                  <th className="right" style={{ width: "110px" }}>Amount</th>
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
                        <td className="center" style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                          {i + 1}
                        </td>
                        <td className="desc">{item.description ?? "—"}</td>
                        {hasCsiCodes && (
                          <td style={{ color: "#64748b", fontFamily: "monospace", fontSize: "0.82rem" }}>
                            {item.csi_code ?? ""}
                          </td>
                        )}
                        <td className="right">{qty.toLocaleString()}</td>
                        <td className="right">{fmt(price)}</td>
                        <td className="right" style={{ fontWeight: 600 }}>{fmt(amount)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={colSpan}
                      style={{ textAlign: "center", color: "#94a3b8", padding: "24px" }}
                    >
                      No line items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="inv-totals">
            <div className="inv-totals-inner">
              <div className="inv-total-row">
                <span className="t-label">Subtotal</span>
                <span className="t-value">{fmt(subtotal)}</span>
              </div>
              {taxAmount !== 0 && (
                <div className="inv-total-row">
                  <span className="t-label">Tax</span>
                  <span className="t-value">{fmt(taxAmount)}</span>
                </div>
              )}
              {amountPaid > 0 && (
                <div className="inv-total-row">
                  <span className="t-label">Amount Paid</span>
                  <span className="t-value" style={{ color: "#16a34a" }}>
                    &minus;{fmt(amountPaid)}
                  </span>
                </div>
              )}
              <hr className="inv-total-divider" />
              <div className="inv-total-grand">
                <span>Total</span>
                <span>{fmt(total)}</span>
              </div>
              <div className={`inv-balance-box${balanceDue <= 0 ? " paid" : ""}`}>
                <span className="bal-label">Balance Due</span>
                <span className="bal-value">{fmt(Math.max(0, balanceDue))}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && String(invoice.notes).trim() && (
            <div className="inv-notes">
              <h3>Notes</h3>
              <p>{String(invoice.notes)}</p>
            </div>
          )}

          {/* Footer */}
          <div className="inv-footer">
            <div className="footer-brand">
              Generated by <strong>Buildwrk</strong> &mdash; buildwrk.com
            </div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              {isPayable ? "Vendor" : "Client"}: {partyName}
            </div>
          </div>
        </div>

        {shouldAutoPrint && <AutoPrint />}
      </body>
    </html>
  );
}
