import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getFinancialSummaryReport } from "@/lib/queries/reports";
import { formatCurrency } from "@/lib/utils/format";
import { formatLocalDate } from "@/lib/utils/date";
import ExportButton from "@/components/reports/ExportButton";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Financial Summary Report - Buildwrk",
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

  const t = await getTranslations("reports");

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
    ? `${formatLocalDate(dateRange.start, { month: "short", day: "numeric", year: "numeric" })} – ${formatLocalDate(dateRange.end, { month: "short", day: "numeric", year: "numeric" })}`
    : `Jan 1 – ${formatLocalDate(new Date(), { month: "short", day: "numeric", year: "numeric" })} (YTD)`;

  const exportData = [
    {
      metric: t("totalRevenue"),
      amount: report.totalRevenue,
    },
    {
      metric: t("totalExpenses"),
      amount: report.totalExpenses,
    },
    {
      metric: t("netIncome"),
      amount: report.netIncome,
    },
    {
      metric: t("arOutstanding"),
      amount: report.totalAR,
    },
    {
      metric: t("apOutstanding"),
      amount: report.totalAP,
    },
    {
      metric: t("invoicesPaidYTD"),
      amount: report.invoicesPaid,
    },
    {
      metric: t("invoicesOutstanding"),
      amount: report.invoicesOutstanding,
    },
  ];

  const exportColumns = [
    { key: "metric", label: t("thMetric") },
    { key: "amount", label: t("thAmount") },
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
            {t("centerTitle")}
          </Link>
        </div>
        <div className="report-page-title-row">
          <div>
            <h2>{t("finSummaryTitle")}</h2>
            <p className="report-page-sub">
              {t("finSummarySubPrefix")} {periodLabel}
            </p>
          </div>
          <div className="report-page-actions">
            <ExportButton
              reportType="financial-summary"
              reportTitle={t("finSummaryTitle")}
              data={exportData}
              columns={exportColumns}
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="portfolio-kpi-row">
        <div className="portfolio-kpi">
          <span className="portfolio-kpi-label">{t("totalRevenue")}</span>
          <span className="portfolio-kpi-value" style={{ color: "var(--color-green)" }}>
            {formatCurrency(report.totalRevenue)}
          </span>
        </div>
        <div className="portfolio-kpi">
          <span className="portfolio-kpi-label">{t("totalExpenses")}</span>
          <span className="portfolio-kpi-value" style={{ color: "var(--color-red)" }}>
            {formatCurrency(report.totalExpenses)}
          </span>
        </div>
        <div className="portfolio-kpi">
          <span className="portfolio-kpi-label">{t("netIncome")}</span>
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
          <span className="portfolio-kpi-label">{t("profitMargin")}</span>
          <span className="portfolio-kpi-value">{margin}%</span>
        </div>
      </div>

      {/* Detail Breakdown */}
      <div className="report-table-wrap">
        <table className="report-table">
          <thead>
            <tr>
              <th>{t("thCategory")}</th>
              <th style={{ textAlign: "right" }}>{t("thAmount")}</th>
              <th style={{ textAlign: "center" }}>{t("thDetails")}</th>
            </tr>
          </thead>
          <tbody>
            {/* Revenue */}
            <tr>
              <td style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <TrendingUp size={16} style={{ color: "var(--color-green)" }} />
                <strong>{t("revenue")}</strong>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                  ({t("paidReceivable")})
                </span>
              </td>
              <td className="report-num variance-positive">
                {formatCurrency(report.totalRevenue)}
              </td>
              <td style={{ textAlign: "center" }}>
                {report.invoicesPaid > 0 && (
                  <Link href="/financial/invoices" className="report-project-link">
                    {t("viewInvoices")}
                  </Link>
                )}
              </td>
            </tr>

            {/* Expenses */}
            <tr>
              <td style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <TrendingDown size={16} style={{ color: "var(--color-red)" }} />
                <strong>{t("expenses")}</strong>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                  ({t("paidPayable")})
                </span>
              </td>
              <td className="report-num variance-negative">
                {formatCurrency(report.totalExpenses)}
              </td>
              <td style={{ textAlign: "center" }}>
                <Link href="/financial/ap" className="report-project-link">
                  {t("viewAP")}
                </Link>
              </td>
            </tr>

            {/* Net Income */}
            <tr>
              <td>
                <strong>{t("netIncome")}</strong>
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
        {t("outstandingBalances")}
      </h3>
      <div className="report-table-wrap">
        <table className="report-table">
          <thead>
            <tr>
              <th>{t("thCategory")}</th>
              <th style={{ textAlign: "right" }}>{t("thOutstandingAmount")}</th>
              <th style={{ textAlign: "center" }}>{t("thCount")}</th>
              <th style={{ textAlign: "center" }}>{t("thAction")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>{t("accountsReceivable")}</strong>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginLeft: "8px" }}>
                  ({t("owedToYou")})
                </span>
              </td>
              <td className="report-num">
                {formatCurrency(report.totalAR)}
              </td>
              <td style={{ textAlign: "center" }}>
                {report.invoicesOutstanding > 0 ? (
                  <span className="badge badge-amber">
                    {report.invoicesOutstanding} {t("unpaid")}
                  </span>
                ) : (
                  <span className="badge badge-green">{t("allPaid")}</span>
                )}
              </td>
              <td style={{ textAlign: "center" }}>
                <Link href="/reports/aging?type=receivable" className="report-project-link">
                  {t("rptArAging")}
                </Link>
              </td>
            </tr>
            <tr>
              <td>
                <strong>{t("accountsPayable")}</strong>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginLeft: "8px" }}>
                  ({t("youOwe")})
                </span>
              </td>
              <td className="report-num">
                {formatCurrency(report.totalAP)}
              </td>
              <td style={{ textAlign: "center" }}>
                {report.totalAP > 0 ? (
                  <span className="badge badge-amber">{t("outstanding")}</span>
                ) : (
                  <span className="badge badge-green">{t("allPaid")}</span>
                )}
              </td>
              <td style={{ textAlign: "center" }}>
                <Link href="/reports/aging?type=payable" className="report-project-link">
                  {t("rptApAging")}
                </Link>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="report-summary-row">
              <td>
                <strong>{t("netPosition")}</strong>
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
          <span className="portfolio-kpi-label">{t("invoicesPaidYTD")}</span>
          <span className="portfolio-kpi-value">{report.invoicesPaid}</span>
        </div>
        <div className="portfolio-kpi">
          <span className="portfolio-kpi-label">{t("invoicesOutstanding")}</span>
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
