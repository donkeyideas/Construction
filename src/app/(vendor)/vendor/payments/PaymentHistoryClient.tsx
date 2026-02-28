"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import {
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react";
import { formatCurrency, formatDateSafe } from "@/lib/utils/format";

interface PaymentRow {
  id: string;
  payment_date: string;
  amount: number;
  method: string;
  reference_number: string | null;
  notes: string | null;
  invoice_number: string;
  je_entry_number: string | null;
  je_id: string | null;
}

interface PendingInvoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  balance_due: number;
  status: string;
  invoice_date: string;
  due_date: string;
  payment_terms: string | null;
  project_name: string | null;
}

interface Props {
  payments: PaymentRow[];
  pendingInvoices: PendingInvoice[];
  stats: {
    totalReceived: number;
    pendingCount: number;
    outstandingBalance: number;
  };
}

function getMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    check: "Check",
    ach: "ACH",
    wire: "Wire Transfer",
    credit_card: "Credit Card",
    cash: "Cash",
    bank_transfer: "Bank Transfer",
  };
  return labels[method] || method;
}

function getTermsLabel(terms: string | null): string {
  if (!terms) return "--";
  const labels: Record<string, string> = {
    due_on_receipt: "Due on Receipt",
    net_10: "Net 10",
    net_15: "Net 15",
    net_30: "Net 30",
    net_45: "Net 45",
    net_60: "Net 60",
    net_90: "Net 90",
  };
  return labels[terms] || terms;
}

export default function PaymentHistoryClient({
  payments,
  pendingInvoices,
  stats,
}: Props) {
  const t = useTranslations("vendor");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  function formatDate(dateStr: string) {
    return formatDateSafe(dateStr);
  }

  const now = new Date();

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>{t("paymentsTitle")}</h2>
          <p className="fin-header-sub">{t("paymentsSubtitle")}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="vendor-payment-stats">
        <div className="vendor-stat-card">
          <span className="vendor-stat-label">{t("totalReceived")}</span>
          <span className="vendor-stat-value positive">
            {formatCurrency(stats.totalReceived)}
          </span>
        </div>
        <div className="vendor-stat-card">
          <span className="vendor-stat-label">{t("pendingInvoicesCount")}</span>
          <span className="vendor-stat-value">{stats.pendingCount}</span>
        </div>
        <div className="vendor-stat-card">
          <span className="vendor-stat-label">{t("outstandingBalance")}</span>
          <span className="vendor-stat-value">
            {formatCurrency(stats.outstandingBalance)}
          </span>
        </div>
      </div>

      {/* Pending Invoices */}
      {pendingInvoices.length > 0 && (
        <div className="fin-chart-card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 12 }}>
            <Clock size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
            {t("pendingInvoicesTitle")}
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>{t("thInvoiceNumber")}</th>
                  <th>{t("thProject")}</th>
                  <th>{t("thDate")}</th>
                  <th>{t("dueDate")}</th>
                  <th>{t("paymentTerms")}</th>
                  <th style={{ textAlign: "right" }}>{t("thAmount")}</th>
                  <th style={{ textAlign: "right" }}>{t("thBalanceDue")}</th>
                  <th>{t("thStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {pendingInvoices.map((inv) => {
                  const isPastDue =
                    new Date(inv.due_date) < now &&
                    inv.status !== "paid";
                  return (
                    <tr
                      key={inv.id}
                      className={isPastDue ? "invoice-row-overdue" : ""}
                    >
                      <td style={{ fontWeight: 600 }}>{inv.invoice_number}</td>
                      <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                        {inv.project_name || "--"}
                      </td>
                      <td>{formatDate(inv.invoice_date)}</td>
                      <td>
                        <span
                          style={{
                            color: isPastDue ? "var(--color-red)" : "var(--text)",
                            fontWeight: isPastDue ? 600 : 400,
                          }}
                        >
                          {formatDate(inv.due_date)}
                          {isPastDue && (
                            <AlertCircle
                              size={12}
                              style={{ marginLeft: 4, verticalAlign: "middle" }}
                            />
                          )}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {getTermsLabel(inv.payment_terms)}
                      </td>
                      <td className="amount-col">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td className="amount-col">
                        {formatCurrency(inv.balance_due)}
                      </td>
                      <td>
                        <span className={`inv-status inv-status-${inv.status}`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment History */}
      {payments.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              padding: "16px 20px 0",
              marginBottom: 0,
            }}
          >
            <CheckCircle
              size={16}
              style={{ verticalAlign: "middle", marginRight: 6 }}
            />
            {t("paymentsReceivedTitle")}
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>{t("thDate")}</th>
                  <th>{t("thInvoiceNumber")}</th>
                  <th style={{ textAlign: "right" }}>{t("thAmount")}</th>
                  <th>{t("method")}</th>
                  <th>{t("reference")}</th>
                  <th>{t("journalEntry")}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((pmt) => (
                  <tr key={pmt.id}>
                    <td>{formatDate(pmt.payment_date)}</td>
                    <td style={{ fontWeight: 600 }}>{pmt.invoice_number}</td>
                    <td className="amount-col" style={{ color: "var(--color-green)" }}>
                      {formatCurrency(pmt.amount)}
                    </td>
                    <td>{getMethodLabel(pmt.method)}</td>
                    <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                      {pmt.reference_number || "--"}
                    </td>
                    <td>
                      {pmt.je_entry_number ? (
                        <span className="je-link" style={{ cursor: "default" }}>
                          {pmt.je_entry_number}
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        pendingInvoices.length === 0 && (
          <div className="fin-chart-card">
            <div className="fin-empty">
              <div className="fin-empty-icon">
                <DollarSign size={48} />
              </div>
              <div className="fin-empty-title">{t("noPaymentsYet")}</div>
              <div className="fin-empty-desc">{t("noPaymentsYetDesc")}</div>
              <Link
                href="/vendor/invoices/new"
                className="ui-btn ui-btn-primary ui-btn-md"
              >
                <FileText size={16} />
                {t("submitInvoiceBtn")}
              </Link>
            </div>
          </div>
        )
      )}
    </div>
  );
}
