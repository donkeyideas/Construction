import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getFinancialSummaryReport } from "@/lib/queries/reports";
import { formatCurrency } from "@/lib/utils/format";
import ExportButton from "@/components/reports/ExportButton";

export const metadata = {
  title: "Financial Summary Report - ConstructionERP",
};

export default async function FinancialSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const dateRange =
    params.start && params.end
      ? { start: params.start, end: params.end }
      : undefined;

  const report = await getFinancialSummaryReport(
    supabase,
    userCompany.companyId,
    dateRange
  );

  const periodLabel = dateRange
    ? `${new Date(dateRange.start).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${new Date(dateRange.end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : `Jan 1 – ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} (YTD)`;

  const exportData = [
    {
      metric: "Total Revenue",
      amount: report.totalRevenue,
    },
    {
      metric: "Total Expenses",
      amount: report.totalExpenses,
    },
    {
      metric: "Net Income",
      amount: report.netIncome,
    },
    {
      metric: "Accounts Receivable (Outstanding)",
      amount: report.totalAR,
    },
    {
      metric: "Accounts Payable (Outstanding)",
      amount: report.totalAP,
    },
    {
      metric: "Invoices Paid",
      amount: report.invoicesPaid,
    },
    {
      metric: "Invoices Outstanding",
      amount: report.invoicesOutstanding,
    },
  ];

  const exportColumns = [
    { key: "metric", label: "Metric" },
    { key: "amount", label: "Amount" },
  ];

  const margin =
    report.totalRevenue > 0
      ? ((report.netIncome / report.totalRevenue) * 100).toFixed(1)
      : "0.0";

  return (
    <div>
      {/* Header */}
      <div className="report-page-header">
        <div className="report-page-nav">
          <Link href="/reports" className="report-back-link">
            <ArrowLeft size={16} />
            Reports Center
          </Link>
        </div>
        <div className="report-page-title-row">
          <div>
            <h2>Financial Summary</h2>
            <p className="report-page-sub">
              Revenue, expenses, and net income for {periodLabel}
            </p>
          </div>
          <div className="report-page-actions">
            <ExportButton
              reportType="financial-summary"
              reportTitle="Financial Summary"
              data={exportData}
              columns={exportColumns}
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="portfolio-kpi-row">
        <div className="portfolio-kpi">
          <span className="portfolio-kpi-label">Total Revenue</span>
          <span className="portfolio-kpi-value" style={{ color: "var(--color-green)" }}>
            {formatCurrency(report.totalRevenue)}
          </span>
        </div>
        <div className="portfolio-kpi">
          <span className="portfolio-kpi-label">Total Expenses</span>
          <span className="portfolio-kpi-value" style={{ color: "var(--color-red)" }}>
            {formatCurrency(report.totalExpenses)}
          </span>
        </div>
        <div className="portfolio-kpi">
          <span className="portfolio-kpi-label">Net Income</span>
          <span
            className="portfolio-kpi-value"
            style={{
              color:
                report.netIncome >= 0 ? "var(--color-green)" : "var(--color-red)",
            }}
          >
            {formatCurrency(report.netIncome)}
          </span>
        </div>
        <div className="portfolio-kpi">
          <span className="portfolio-kpi-label">Profit Margin</span>
          <span className="portfolio-kpi-value">{margin}%</span>
        </div>
      </div>

      {/* Detail Breakdown */}
      <div className="report-table-wrap">
        <table className="report-table">
          <thead>
            <tr>
              <th>Category</th>
              <th style={{ textAlign: "right" }}>Amount</th>
              <th style={{ textAlign: "center" }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {/* Revenue */}
            <tr>
              <td style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <TrendingUp size={16} style={{ color: "var(--color-green)" }} />
                <strong>Revenue</strong>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                  (paid receivable invoices)
                </span>
              </td>
              <td className="report-num variance-positive">
                {formatCurrency(report.totalRevenue)}
              </td>
              <td style={{ textAlign: "center" }}>
                {report.invoicesPaid > 0 && (
                  <Link href="/financial/invoices" className="report-project-link">
                    View Invoices
                  </Link>
                )}
              </td>
            </tr>

            {/* Expenses */}
            <tr>
              <td style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <TrendingDown size={16} style={{ color: "var(--color-red)" }} />
                <strong>Expenses</strong>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                  (paid payable invoices)
                </span>
              </td>
              <td className="report-num variance-negative">
                {formatCurrency(report.totalExpenses)}
              </td>
              <td style={{ textAlign: "center" }}>
                <Link href="/financial/ap" className="report-project-link">
                  View AP
                </Link>
              </td>
            </tr>

            {/* Net Income */}
            <tr>
              <td>
                <strong>Net Income</strong>
              </td>
              <td
                className={`report-num ${report.netIncome >= 0 ? "variance-positive" : "variance-negative"}`}
              >
                <strong>{formatCurrency(report.netIncome)}</strong>
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {/* AR/AP Section */}
      <h3
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "1.15rem",
          fontWeight: 600,
          margin: "32px 0 16px",
        }}
      >
        Outstanding Balances
      </h3>
      <div className="report-table-wrap">
        <table className="report-table">
          <thead>
            <tr>
              <th>Category</th>
              <th style={{ textAlign: "right" }}>Outstanding Amount</th>
              <th style={{ textAlign: "center" }}>Count</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Accounts Receivable</strong>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginLeft: "8px" }}>
                  (owed to you)
                </span>
              </td>
              <td className="report-num">
                {formatCurrency(report.totalAR)}
              </td>
              <td style={{ textAlign: "center" }}>
                {report.invoicesOutstanding > 0 ? (
                  <span className="badge badge-amber">
                    {report.invoicesOutstanding} unpaid
                  </span>
                ) : (
                  <span className="badge badge-green">All paid</span>
                )}
              </td>
              <td style={{ textAlign: "center" }}>
                <Link href="/reports/aging?type=receivable" className="report-project-link">
                  AR Aging
                </Link>
              </td>
            </tr>
            <tr>
              <td>
                <strong>Accounts Payable</strong>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginLeft: "8px" }}>
                  (you owe)
                </span>
              </td>
              <td className="report-num">
                {formatCurrency(report.totalAP)}
              </td>
              <td style={{ textAlign: "center" }}>
                {report.totalAP > 0 ? (
                  <span className="badge badge-amber">Outstanding</span>
                ) : (
                  <span className="badge badge-green">All paid</span>
                )}
              </td>
              <td style={{ textAlign: "center" }}>
                <Link href="/reports/aging?type=payable" className="report-project-link">
                  AP Aging
                </Link>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="report-summary-row">
              <td>
                <strong>Net Position (AR − AP)</strong>
              </td>
              <td
                className={`report-num ${report.totalAR - report.totalAP >= 0 ? "variance-positive" : "variance-negative"}`}
              >
                <strong>{formatCurrency(report.totalAR - report.totalAP)}</strong>
              </td>
              <td />
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Invoice Stats */}
      <div
        className="portfolio-kpi-row"
        style={{ marginTop: "24px", gridTemplateColumns: "repeat(2, 1fr)" }}
      >
        <div className="portfolio-kpi">
          <span className="portfolio-kpi-label">Invoices Paid (YTD)</span>
          <span className="portfolio-kpi-value">{report.invoicesPaid}</span>
        </div>
        <div className="portfolio-kpi">
          <span className="portfolio-kpi-label">Invoices Outstanding</span>
          <span
            className="portfolio-kpi-value"
            style={{
              color:
                report.invoicesOutstanding > 0
                  ? "var(--color-amber)"
                  : "var(--color-green)",
            }}
          >
            {report.invoicesOutstanding}
          </span>
        </div>
      </div>
    </div>
  );
}
