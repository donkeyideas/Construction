import Link from "next/link";
import { FileText, Plus, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getInvoices } from "@/lib/queries/financial";
import { formatCurrency } from "@/lib/utils/format";
import type { InvoiceFilters } from "@/lib/queries/financial";

export const metadata = {
  title: "Invoices - ConstructionERP",
};

interface PageProps {
  searchParams: Promise<{
    type?: string;
    status?: string;
  }>;
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon">
          <FileText size={48} />
        </div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">
          Complete your company registration to manage invoices.
        </div>
      </div>
    );
  }

  const activeType = params.type as InvoiceFilters["type"] | undefined;
  const activeStatus = params.status || undefined;

  const filters: InvoiceFilters = {};
  if (activeType === "payable" || activeType === "receivable") {
    filters.type = activeType;
  }
  if (activeStatus && activeStatus !== "all") {
    filters.status = activeStatus;
  }

  const invoices = await getInvoices(supabase, userCompany.companyId, filters);

  const tabs = [
    { label: "All", value: undefined },
    { label: "Payable (AP)", value: "payable" },
    { label: "Receivable (AR)", value: "receivable" },
  ];

  const statuses = [
    { label: "All Statuses", value: "all" },
    { label: "Draft", value: "draft" },
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Paid", value: "paid" },
    { label: "Overdue", value: "overdue" },
    { label: "Voided", value: "voided" },
  ];

  function buildUrl(type?: string, status?: string): string {
    const p = new URLSearchParams();
    if (type) p.set("type", type);
    if (status && status !== "all") p.set("status", status);
    const qs = p.toString();
    return `/financial/invoices${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Invoices</h2>
          <p className="fin-header-sub">
            Manage your accounts payable and receivable.
          </p>
        </div>
        <div className="fin-header-actions">
          <Link href="/financial/invoices/new" className="ui-btn ui-btn-primary ui-btn-md">
            <Plus size={16} />
            New Invoice
          </Link>
        </div>
      </div>

      {/* Tab Filter */}
      <div className="fin-tab-bar">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={buildUrl(tab.value, activeStatus)}
            className={`fin-tab ${activeType === tab.value ? "active" : !activeType && !tab.value ? "active" : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Status Filter */}
      <div className="fin-filters">
        <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500 }}>
          Status:
        </label>
        {statuses.map((s) => (
          <Link
            key={s.value}
            href={buildUrl(activeType, s.value)}
            className={`ui-btn ui-btn-sm ${
              activeStatus === s.value || (!activeStatus && s.value === "all")
                ? "ui-btn-primary"
                : "ui-btn-outline"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Invoice Table */}
      {invoices.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Type</th>
                  <th>Vendor / Client</th>
                  <th>Project</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th style={{ textAlign: "right" }}>Balance Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const isOverdue = inv.status === "overdue";
                  return (
                    <tr
                      key={inv.id}
                      className={isOverdue ? "invoice-row-overdue" : ""}
                    >
                      <td style={{ fontWeight: 600 }}>
                        <Link
                          href={`/financial/invoices/${inv.id}`}
                          style={{ color: "var(--color-blue)", textDecoration: "none" }}
                        >
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td>
                        <span className={`inv-type inv-type-${inv.invoice_type}`}>
                          {inv.invoice_type === "payable" ? "AP" : "AR"}
                        </span>
                      </td>
                      <td>
                        {inv.invoice_type === "payable"
                          ? inv.vendor_name ?? "--"
                          : inv.client_name ?? "--"}
                      </td>
                      <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                        {inv.project_id ? inv.project_id.substring(0, 8) + "..." : "--"}
                      </td>
                      <td>
                        {new Date(inv.invoice_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td>
                        <span
                          style={{
                            color: isOverdue ? "var(--color-red)" : "var(--text)",
                            fontWeight: isOverdue ? 600 : 400,
                          }}
                        >
                          {new Date(inv.due_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {isOverdue && (
                            <AlertCircle
                              size={12}
                              style={{ marginLeft: "4px", verticalAlign: "middle" }}
                            />
                          )}
                        </span>
                      </td>
                      <td className="amount-col">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td
                        className={`amount-col ${isOverdue ? "overdue" : ""}`}
                      >
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
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <FileText size={48} />
            </div>
            <div className="fin-empty-title">No Invoices Found</div>
            <div className="fin-empty-desc">
              {activeType || activeStatus
                ? "No invoices match the current filters. Try adjusting your filters or create a new invoice."
                : "Get started by creating your first invoice to track payments and receivables."}
            </div>
            <Link
              href="/financial/invoices/new"
              className="ui-btn ui-btn-primary ui-btn-md"
            >
              <Plus size={16} />
              Create Invoice
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
