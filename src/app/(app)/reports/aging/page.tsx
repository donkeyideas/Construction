import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getAgingReport } from "@/lib/queries/reports";
import { formatCurrency } from "@/lib/utils/format";
import { formatLocalDate } from "@/lib/utils/date";
import ExportButton from "@/components/reports/ExportButton";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Aging Report - Buildwrk",
};

export default async function AgingReportPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const t = await getTranslations("reports");

  const activeType =
    params.type === "payable" ? "payable" : "receivable";
  const activeLabel =
    activeType === "receivable" ? t("accountsReceivable") : t("accountsPayable");

  const report = await getAgingReport(
    supabase,
    userCompany.companyId,
    activeType
  );

  // Max bucket amount for bar visualization
  const maxBucketAmount = Math.max(
    ...report.buckets.map((b) => b.amount),
    1
  );

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
            <h2>{t("agingTitle")}</h2>
            <p className="report-page-sub">
              {t("agingSubtitle")}
            </p>
          </div>
          <div className="report-page-actions">
            <ExportButton
              reportType="aging"
              reportTitle={`${t("agingTitle")} - ${activeType === "receivable" ? "AR" : "AP"}`}
              data={report.invoices.map((inv) => ({
                invoice_number: inv.invoice_number,
                name: activeType === "receivable" ? (inv.client_name ?? "") : (inv.vendor_name ?? ""),
                invoice_date: inv.invoice_date,
                due_date: inv.due_date,
                total_amount: inv.total_amount,
                balance_due: inv.balance_due,
                aging_days: inv.aging_days,
                aging_bucket: inv.aging_bucket,
              }))}
              columns={[
                { key: "invoice_number", label: t("thInvoice") },
                { key: "name", label: activeType === "receivable" ? t("client") : t("vendor") },
                { key: "invoice_date", label: t("thInvoiceDate") },
                { key: "due_date", label: t("thDueDate") },
                { key: "total_amount", label: t("thTotalAmount") },
                { key: "balance_due", label: t("thBalanceDue") },
                { key: "aging_days", label: t("thDaysOverdue") },
                { key: "aging_bucket", label: t("thBucket") },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Type Toggle Tabs */}
      <div className="aging-tab-bar">
        <Link
          href="/reports/aging?type=receivable"
          className={`aging-tab ${activeType === "receivable" ? "active" : ""}`}
        >
          {t("accountsReceivable")}
        </Link>
        <Link
          href="/reports/aging?type=payable"
          className={`aging-tab ${activeType === "payable" ? "active" : ""}`}
        >
          {t("accountsPayable")}
        </Link>
      </div>

      {/* Aging Summary Buckets */}
      <div className="aging-summary">
        <div className="aging-summary-title">{activeLabel} {t("agingSummary")}</div>
        <div className="aging-summary-total">
          {t("totalOutstanding")}: <strong>{formatCurrency(report.total)}</strong>
        </div>

        <div className="aging-buckets-viz">
          {report.buckets.map((bucket, i) => {
            const widthPct = Math.max(
              (bucket.amount / maxBucketAmount) * 100,
              2
            );
            const colorVar =
              i === 0
                ? "var(--color-green)"
                : i === 1
                  ? "var(--color-blue)"
                  : i === 2
                    ? "var(--color-amber)"
                    : i === 3
                      ? "var(--color-amber)"
                      : "var(--color-red)";

            return (
              <div key={bucket.label} className="aging-bucket-row">
                <div className="aging-bucket-label">{bucket.label}</div>
                <div className="aging-bucket-bar-wrap">
                  <div
                    className="aging-bucket-bar"
                    style={{
                      width: `${widthPct}%`,
                      background: colorVar,
                    }}
                  />
                </div>
                <div className="aging-bucket-amount">
                  {formatCurrency(bucket.amount)}
                </div>
                <div className="aging-bucket-count">
                  {bucket.count} invoice{bucket.count !== 1 ? "s" : ""}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Table */}
      {report.invoices.length === 0 ? (
        <div className="report-empty">
          <CreditCard size={48} style={{ color: "var(--border)" }} />
          <div className="report-empty-title">
            {activeType === "receivable" ? t("noOutstandingAR") : t("noOutstandingAP")}
          </div>
          <div className="report-empty-desc">
            {activeType === "receivable" ? t("allPaidOrVoided") : t("allPayablePaidOrVoided")}
          </div>
        </div>
      ) : (
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>{t("thInvoice")}</th>
                <th>
                  {activeType === "receivable" ? t("client") : t("vendor")}
                </th>
                <th>{t("thInvoiceDate")}</th>
                <th>{t("thDueDate")}</th>
                <th style={{ textAlign: "right" }}>{t("thTotalAmount")}</th>
                <th style={{ textAlign: "right" }}>{t("thBalanceDue")}</th>
                <th style={{ textAlign: "center" }}>{t("thDaysOverdue")}</th>
                <th>{t("thBucket")}</th>
              </tr>
            </thead>
            <tbody>
              {report.invoices.map((inv) => {
                const bucketClass =
                  inv.aging_days <= 0
                    ? "badge badge-green"
                    : inv.aging_days <= 30
                      ? "badge badge-blue"
                      : inv.aging_days <= 60
                        ? "badge badge-amber"
                        : "badge badge-red";

                return (
                  <tr key={inv.id}>
                    <td>
                      <Link
                        href={`/financial/invoices/${inv.id}`}
                        className="report-project-link"
                      >
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td>
                      {activeType === "receivable"
                        ? inv.client_name ?? "--"
                        : inv.vendor_name ?? "--"}
                    </td>
                    <td>
                      {formatLocalDate(inv.invoice_date, { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td>
                      {formatLocalDate(inv.due_date, { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="report-num">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="report-num">
                      {formatCurrency(inv.balance_due)}
                    </td>
                    <td
                      style={{ textAlign: "center" }}
                      className={
                        inv.aging_days > 60
                          ? "variance-negative"
                          : inv.aging_days > 30
                            ? "variance-warning"
                            : ""
                      }
                    >
                      {inv.aging_days > 0 ? inv.aging_days : "--"}
                    </td>
                    <td>
                      <span className={bucketClass}>{inv.aging_bucket}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="report-summary-row">
                <td colSpan={4}>
                  <strong>
                    Total ({report.invoices.length} invoice
                    {report.invoices.length !== 1 ? "s" : ""})
                  </strong>
                </td>
                <td className="report-num">
                  <strong>
                    {formatCurrency(
                      report.invoices.reduce((s, i) => s + i.total_amount, 0)
                    )}
                  </strong>
                </td>
                <td className="report-num">
                  <strong>{formatCurrency(report.total)}</strong>
                </td>
                <td />
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
