import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getAgingReport } from "@/lib/queries/reports";
import { formatCurrency } from "@/lib/utils/format";
import ExportButton from "@/components/reports/ExportButton";

export const metadata = {
  title: "Aging Report - ConstructionERP",
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

  const activeType =
    params.type === "payable" ? "payable" : "receivable";
  const activeLabel =
    activeType === "receivable" ? "Accounts Receivable" : "Accounts Payable";

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
            Reports Center
          </Link>
        </div>
        <div className="report-page-title-row">
          <div>
            <h2>Aging Report</h2>
            <p className="report-page-sub">
              Outstanding invoice aging analysis by time bucket.
            </p>
          </div>
          <div className="report-page-actions">
            <ExportButton
              reportType="aging"
              reportTitle={`Aging Report - ${activeType === "receivable" ? "AR" : "AP"}`}
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
                { key: "invoice_number", label: "Invoice #" },
                { key: "name", label: activeType === "receivable" ? "Client" : "Vendor" },
                { key: "invoice_date", label: "Invoice Date" },
                { key: "due_date", label: "Due Date" },
                { key: "total_amount", label: "Total Amount" },
                { key: "balance_due", label: "Balance Due" },
                { key: "aging_days", label: "Days Overdue" },
                { key: "aging_bucket", label: "Bucket" },
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
          Accounts Receivable
        </Link>
        <Link
          href="/reports/aging?type=payable"
          className={`aging-tab ${activeType === "payable" ? "active" : ""}`}
        >
          Accounts Payable
        </Link>
      </div>

      {/* Aging Summary Buckets */}
      <div className="aging-summary">
        <div className="aging-summary-title">{activeLabel} Aging Summary</div>
        <div className="aging-summary-total">
          Total Outstanding: <strong>{formatCurrency(report.total)}</strong>
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
            No Outstanding {activeLabel}
          </div>
          <div className="report-empty-desc">
            All {activeType === "receivable" ? "receivable" : "payable"} invoices
            are either paid or voided. No aging data to display.
          </div>
        </div>
      ) : (
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>
                  {activeType === "receivable" ? "Client" : "Vendor"}
                </th>
                <th>Invoice Date</th>
                <th>Due Date</th>
                <th style={{ textAlign: "right" }}>Total Amount</th>
                <th style={{ textAlign: "right" }}>Balance Due</th>
                <th style={{ textAlign: "center" }}>Days Overdue</th>
                <th>Bucket</th>
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
                      {new Date(inv.invoice_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td>
                      {new Date(inv.due_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
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
