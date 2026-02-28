import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, ArrowLeft, BookOpen, AlertCircle, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getInvoiceById } from "@/lib/queries/financial";
import { getBankAccounts } from "@/lib/queries/banking";
import { formatCurrency, formatDateSafe, formatDateLong } from "@/lib/utils/format";
import { findLinkedJournalEntries } from "@/lib/utils/je-linkage";
import type { LineItem, PaymentRow } from "@/lib/queries/financial";
import RecordPaymentButton from "./RecordPaymentButton";
import EditPaymentSection from "./EditPaymentSection";
import DeleteInvoiceButton from "./DeleteInvoiceButton";
import DeferralScheduleCard from "./DeferralScheduleCard";
import PrintExportButtons from "./PrintExportButtons";
import InvoicePrintView from "./InvoicePrintView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Invoice ${id.substring(0, 8)} - Buildwrk` };
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

  const [invoice, bankAccounts] = await Promise.all([
    getInvoiceById(supabase, id),
    getBankAccounts(supabase, userCompany.companyId),
  ]);

  // Fetch GL account name for this invoice (if assigned)
  let glAccountDisplay: string | null = null;
  const glAccountId = (invoice as unknown as Record<string, unknown>)?.gl_account_id as string | undefined;
  if (glAccountId) {
    const { data: glAcct } = await supabase
      .from("chart_of_accounts")
      .select("account_number, name")
      .eq("id", glAccountId)
      .single();
    if (glAcct) {
      glAccountDisplay = `${glAcct.account_number} — ${glAcct.name}`;
    }
  }

  if (!invoice) {
    notFound();
  }

  // Fetch deferral schedule for this invoice
  const { data: deferralSchedule } = await supabase
    .from("invoice_deferral_schedule")
    .select("id, schedule_date, monthly_amount, status")
    .eq("invoice_id", id)
    .order("schedule_date", { ascending: true });

  const rawInv = invoice as unknown as Record<string, unknown>;
  const hasDeferralDates = !!(rawInv.deferral_start_date && rawInv.deferral_end_date);
  const hasDeferralSchedule = !!(deferralSchedule && deferralSchedule.length > 0);
  // Show deferral section for any receivable invoice (so users know the feature exists and can enable it)
  const showDeferralSection = invoice.invoice_type === "receivable" || hasDeferralDates || hasDeferralSchedule;

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

  // Fetch linked journal entries for this invoice
  const linkedJEs = await findLinkedJournalEntries(supabase, userCompany.companyId, "invoice:", id);

  // Also fetch payment JEs
  const paymentJEsMap: Record<string, { id: string; entry_number: string }[]> = {};
  for (const p of payments) {
    const pJEs = await findLinkedJournalEntries(supabase, userCompany.companyId, "payment:", p.id);
    if (pJEs.length > 0) {
      paymentJEsMap[p.id] = pJEs.map((e) => ({ id: e.id, entry_number: e.entry_number }));
    }
  }

  // Safe currency formatting
  const safeCurrency = (val: unknown) => {
    const num = Number(val);
    return isNaN(num) ? "$0" : formatCurrency(num);
  };

  // Safe date formatting — deterministic to avoid hydration mismatch
  const safeDate = (val: unknown, opts?: { long?: boolean }) => {
    const str = String(val ?? "");
    if (!str || str === "undefined" || str === "null") return "--";
    return opts?.long ? formatDateLong(str) : formatDateSafe(str);
  };

  return (
    <div>
      {/* ── Screen content (hidden when printing) ── */}
      <div className="inv-screen-only">
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
          <Link href={`/financial/invoices/${id}/edit`} className="ui-btn ui-btn-outline ui-btn-md" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
            <Pencil size={16} />
            Edit
          </Link>
          <RecordPaymentButton
            invoiceId={id}
            balanceDue={Number(invoice.balance_due) || 0}
            invoiceType={invoice.invoice_type}
            bankAccounts={bankAccounts.map((ba) => ({
              id: ba.id,
              name: ba.name,
              bank_name: ba.bank_name,
              account_number_last4: ba.account_number_last4,
              is_default: ba.is_default,
            }))}
          />
          <PrintExportButtons invoiceId={id} />
          <DeleteInvoiceButton invoiceId={id} invoiceType={invoice.invoice_type} />
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
              ["Invoice Date", safeDate(invoice.invoice_date, { long: true })],
              ["Due Date", safeDate(invoice.due_date, { long: true })],
              ["Status", invoice.status],
              ...(glAccountDisplay ? [[isPayable ? "Expense Account" : "Revenue Account", glAccountDisplay] as [string, string]] : []),
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

      {/* Journal Entries */}
      <div className="fin-chart-card" style={{ padding: 0, marginBottom: 24 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
          <BookOpen size={16} style={{ color: "var(--color-blue)" }} />
          <div className="card-title" style={{ marginBottom: 0 }}>Journal Entries</div>
        </div>
        {linkedJEs.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Entry #</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {linkedJEs.map((je) => (
                  <tr key={je.id}>
                    <td>
                      <Link href={`/financial/general-ledger?entry=${je.entry_number}`} className="je-link">
                        {je.entry_number}
                      </Link>
                    </td>
                    <td>{safeDate(je.entry_date)}</td>
                    <td style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{je.description}</td>
                    <td>
                      <span className={`inv-status inv-status-${je.status}`}>{je.status}</span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{safeCurrency(je.total_debit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "24px 20px", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {invoice.status !== "draft" && invoice.status !== "voided" ? (
              <>
                <AlertCircle size={14} style={{ color: "var(--color-amber)" }} />
                No journal entry found for this invoice. This may indicate a posting issue.
              </>
            ) : (
              "Journal entries are created when an invoice is posted."
            )}
          </div>
        )}
      </div>

      {/* Deferral Schedule — shown for all receivable invoices */}
      {showDeferralSection && (
        <DeferralScheduleCard
          invoiceId={id}
          deferralStartDate={rawInv.deferral_start_date as string | null}
          deferralEndDate={rawInv.deferral_end_date as string | null}
          schedule={(deferralSchedule ?? []).map((r) => ({
            id: r.id,
            schedule_date: r.schedule_date,
            monthly_amount: Number(r.monthly_amount),
            status: r.status ?? "scheduled",
          }))}
          totalAmount={Number(invoice.total_amount)}
        />
      )}

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
                  <th>Bank Account</th>
                  <th>Reference</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th>JE</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{safeDate(p.payment_date)}</td>
                    <td style={{ textTransform: "capitalize" }}>{p.method ?? "--"}</td>
                    <td style={{ fontSize: "0.82rem" }}>
                      {p.bank_account_name ? (
                        <Link
                          href={`/financial/banking/${p.bank_account_id}`}
                          className="je-link"
                          style={{ fontSize: "0.82rem" }}
                        >
                          {p.bank_account_name}
                        </Link>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>--</span>
                      )}
                    </td>
                    <td style={{ color: "var(--muted)" }}>{p.reference_number ?? "--"}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "var(--color-green)" }}>
                      {safeCurrency(p.amount)}
                    </td>
                    <td>
                      {paymentJEsMap[p.id]?.length ? (
                        paymentJEsMap[p.id].map((je) => (
                          <Link key={je.id} href={`/financial/general-ledger?entry=${je.entry_number}`} className="je-link">
                            {je.entry_number}
                          </Link>
                        ))
                      ) : (
                        <span style={{ color: "var(--muted)" }}>--</span>
                      )}
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

      {/* Edit Payment Section */}
      <EditPaymentSection
        payments={payments}
        invoiceId={id}
        bankAccounts={bankAccounts.map((ba) => ({
          id: ba.id,
          name: ba.name,
          bank_name: ba.bank_name,
          account_number_last4: ba.account_number_last4,
        }))}
      />
      </div>{/* end inv-screen-only */}

      {/* ── Print-only invoice view (hidden on screen, shown when printing) ── */}
      <InvoicePrintView
        companyName={userCompany.companyName}
        invoiceNumber={invoice.invoice_number ?? ""}
        invoiceType={(invoice.invoice_type ?? "receivable") as "payable" | "receivable"}
        partyName={isPayable ? (invoice.vendor_name ?? "") : (invoice.client_name ?? "")}
        invoiceDate={safeDate(rawInv.invoice_date, { long: true })}
        dueDate={safeDate(rawInv.due_date, { long: true })}
        status={invoice.status ?? "pending"}
        subtotal={Number(rawInv.subtotal ?? invoice.total_amount ?? 0)}
        taxAmount={Number(rawInv.tax_amount ?? 0)}
        total={Number(invoice.total_amount ?? 0)}
        amountPaid={Number(rawInv.amount_paid ?? 0)}
        balanceDue={Number(rawInv.balance_due ?? invoice.total_amount ?? 0)}
        lineItems={lineItems}
        notes={String(invoice.notes ?? "")}
        glAccountDisplay={glAccountDisplay}
      />
    </div>
  );
}
