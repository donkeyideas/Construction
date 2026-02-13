import Link from "next/link";
import { HandCoins, AlertCircle, DollarSign, FileText, TrendingUp, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils/format";

export const metadata = {
  title: "Accounts Receivable - ConstructionERP",
};

interface PageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function AccountsReceivablePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><HandCoins size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access accounts receivable.</div>
      </div>
    );
  }

  const activeStatus = params.status || undefined;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // Fetch all non-voided receivable invoices for KPIs
  const [allArRes, billedThisMonthRes, collectedThisMonthRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, balance_due, status")
      .eq("company_id", userCompany.companyId)
      .eq("invoice_type", "receivable")
      .not("status", "eq", "voided"),
    supabase
      .from("invoices")
      .select("total_amount")
      .eq("company_id", userCompany.companyId)
      .eq("invoice_type", "receivable")
      .not("status", "eq", "voided")
      .gte("invoice_date", startOfMonth)
      .lte("invoice_date", endOfMonth),
    supabase
      .from("invoices")
      .select("total_amount")
      .eq("company_id", userCompany.companyId)
      .eq("invoice_type", "receivable")
      .eq("status", "paid")
      .gte("invoice_date", startOfMonth)
      .lte("invoice_date", endOfMonth),
  ]);

  const allAr = allArRes.data ?? [];
  const totalArBalance = allAr
    .filter((inv) => inv.status !== "paid")
    .reduce((sum, inv) => sum + (inv.balance_due ?? 0), 0);
  const overdueAmount = allAr
    .filter((inv) => inv.status === "overdue")
    .reduce((sum, inv) => sum + (inv.balance_due ?? 0), 0);
  const billedThisMonth = (billedThisMonthRes.data ?? []).reduce(
    (sum, inv) => sum + (inv.total_amount ?? 0),
    0
  );
  const collectedThisMonth = (collectedThisMonthRes.data ?? []).reduce(
    (sum, inv) => sum + (inv.total_amount ?? 0),
    0
  );

  // Build the filtered query for the table
  let query = supabase
    .from("invoices")
    .select("id, invoice_number, client_name, project_id, invoice_date, due_date, total_amount, balance_due, status, projects(name)")
    .eq("company_id", userCompany.companyId)
    .eq("invoice_type", "receivable")
    .order("invoice_date", { ascending: false });

  if (activeStatus && activeStatus !== "all") {
    query = query.eq("status", activeStatus);
  } else {
    query = query.not("status", "eq", "voided");
  }

  const { data: invoicesData } = await query;
  const invoices = invoicesData ?? [];

  const statuses = [
    { label: "All", value: "all" },
    { label: "Draft", value: "draft" },
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Overdue", value: "overdue" },
    { label: "Paid", value: "paid" },
  ];

  function buildUrl(status?: string): string {
    const p = new URLSearchParams();
    if (status && status !== "all") p.set("status", status);
    const qs = p.toString();
    return `/financial/ar${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Accounts Receivable</h2>
          <p className="fin-header-sub">Track client invoices, payments, and retainage receivable</p>
        </div>
        <div className="fin-header-actions">
          <Link href="/financial/invoices/new" className="ui-btn ui-btn-primary ui-btn-md">
            <FileText size={16} />
            New Invoice
          </Link>
        </div>
      </div>

      {/* KPI Row */}
      <div className="financial-kpi-row" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <DollarSign size={18} />
          </div>
          <span className="fin-kpi-label">Total AR Balance</span>
          <span className="fin-kpi-value">
            {formatCompactCurrency(totalArBalance)}
          </span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon red">
            <Clock size={18} />
          </div>
          <span className="fin-kpi-label">Overdue Amount</span>
          <span className={`fin-kpi-value ${overdueAmount > 0 ? "negative" : ""}`}>
            {formatCompactCurrency(overdueAmount)}
          </span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <TrendingUp size={18} />
          </div>
          <span className="fin-kpi-label">Billed This Month</span>
          <span className="fin-kpi-value">
            {formatCompactCurrency(billedThisMonth)}
          </span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon green">
            <HandCoins size={18} />
          </div>
          <span className="fin-kpi-label">Collected This Month</span>
          <span className="fin-kpi-value positive">
            {formatCompactCurrency(collectedThisMonth)}
          </span>
        </div>
      </div>

      {/* Status Filters */}
      <div className="fin-filters">
        <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500 }}>
          Status:
        </label>
        {statuses.map((s) => (
          <Link
            key={s.value}
            href={buildUrl(s.value)}
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
                  <th>Client Name</th>
                  <th>Project</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th style={{ textAlign: "right" }}>Balance Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: Record<string, unknown>) => {
                  const isOverdue = inv.status === "overdue";
                  const dueDate = new Date(inv.due_date as string);
                  const isPastDue = dueDate < now && inv.status !== "paid" && inv.status !== "voided";
                  const project = inv.projects as { name: string } | null;

                  return (
                    <tr
                      key={inv.id as string}
                      className={isOverdue ? "invoice-row-overdue" : ""}
                    >
                      <td style={{ fontWeight: 600 }}>
                        <Link
                          href={`/financial/invoices/${inv.id}`}
                          style={{ color: "var(--color-blue)", textDecoration: "none" }}
                        >
                          {inv.invoice_number as string}
                        </Link>
                      </td>
                      <td>{(inv.client_name as string) ?? "--"}</td>
                      <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                        {project?.name ?? "--"}
                      </td>
                      <td>
                        {new Date(inv.invoice_date as string).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td>
                        <span
                          style={{
                            color: isPastDue ? "var(--color-red)" : "var(--text)",
                            fontWeight: isPastDue ? 600 : 400,
                          }}
                        >
                          {dueDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {isPastDue && (
                            <AlertCircle
                              size={12}
                              style={{ marginLeft: "4px", verticalAlign: "middle" }}
                            />
                          )}
                        </span>
                      </td>
                      <td className="amount-col">
                        {formatCurrency(inv.total_amount as number)}
                      </td>
                      <td className={`amount-col ${isOverdue ? "overdue" : ""}`}>
                        {formatCurrency(inv.balance_due as number)}
                      </td>
                      <td>
                        <span className={`inv-status inv-status-${inv.status}`}>
                          {inv.status as string}
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
              <HandCoins size={48} />
            </div>
            <div className="fin-empty-title">No Invoices Found</div>
            <div className="fin-empty-desc">
              {activeStatus
                ? "No receivable invoices match the current filter. Try adjusting your filter or create a new invoice."
                : "No receivable invoices yet. Create an invoice to start tracking client payments."}
            </div>
            <Link
              href="/financial/invoices/new"
              className="ui-btn ui-btn-primary ui-btn-md"
            >
              <FileText size={16} />
              Create Invoice
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
