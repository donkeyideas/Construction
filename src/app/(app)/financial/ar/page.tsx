import { HandCoins } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { findLinkedJournalEntriesBatch } from "@/lib/utils/je-linkage";
import { getGLBalanceForAccountType } from "@/lib/utils/gl-balance";
import { paginatedQuery } from "@/lib/utils/paginated-query";
import ARClient from "./ARClient";

export const metadata = {
  title: "Accounts Receivable - Buildwrk",
};

interface PageProps {
  searchParams: Promise<{
    status?: string;
    start?: string;
    end?: string;
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
  const filterStartDate = params.start || undefined;
  const filterEndDate = params.end || undefined;
  const now = new Date();
  const startOfMonth = filterStartDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = filterEndDate || new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const todayStr = now.toISOString().split("T")[0];

  const [allAr, billedThisMonthRes, collectedThisMonthRes, invoicesRes] = await Promise.all([
    paginatedQuery<{ id: string; balance_due: number; status: string; due_date: string }>((from, to) => {
      let q = supabase
        .from("invoices")
        .select("id, balance_due, status, due_date")
        .eq("company_id", userCompany.companyId)
        .eq("invoice_type", "receivable")
        .not("status", "eq", "voided");
      if (filterStartDate) q = q.gte("invoice_date", filterStartDate);
      if (filterEndDate) q = q.lte("invoice_date", filterEndDate);
      return q.range(from, to);
    }),
    supabase
      .from("invoices")
      .select("total_amount")
      .eq("company_id", userCompany.companyId)
      .eq("invoice_type", "receivable")
      .not("status", "eq", "voided")
      .gte("invoice_date", startOfMonth)
      .lte("invoice_date", endOfMonth),
    // Use payments table with payment_date for accurate "Collected" timing
    supabase
      .from("payments")
      .select("amount, invoices!inner(invoice_type)")
      .eq("company_id", userCompany.companyId)
      .eq("invoices.invoice_type", "receivable")
      .gte("payment_date", startOfMonth)
      .lte("payment_date", endOfMonth),
    (() => {
      let query = supabase
        .from("invoices")
        .select("id, invoice_number, client_name, vendor_name, project_id, invoice_date, due_date, total_amount, balance_due, status, notes, projects(name)")
        .eq("company_id", userCompany.companyId)
        .eq("invoice_type", "receivable")
        .order("invoice_date", { ascending: false });

      if (activeStatus && activeStatus !== "all") {
        query = query.eq("status", activeStatus);
      } else {
        query = query.not("status", "eq", "voided");
      }
      if (filterStartDate) query = query.gte("invoice_date", filterStartDate);
      if (filterEndDate) query = query.lte("invoice_date", filterEndDate);
      return query;
    })(),
  ]);

  // Include paid invoices with retainage (balance_due > 0) to match GL which includes Retainage Receivable
  const totalArBalance = allAr
    .filter((inv) => (inv.balance_due ?? 0) > 0)
    .reduce((sum, inv) => sum + (inv.balance_due ?? 0), 0);
  const overdueAmount = allAr
    .filter((inv) => (inv.balance_due ?? 0) > 0 && inv.due_date && inv.due_date < todayStr)
    .reduce((sum, inv) => sum + (inv.balance_due ?? 0), 0);
  const billedThisMonth = (billedThisMonthRes.data ?? []).reduce(
    (sum, inv) => sum + (inv.total_amount ?? 0), 0
  );
  const collectedThisMonth = (collectedThisMonthRes.data ?? []).reduce(
    (sum: number, row: { amount: number }) => sum + (row.amount ?? 0), 0
  );

  const invoices = (invoicesRes.data ?? []).map((inv: Record<string, unknown>) => ({
    id: inv.id as string,
    invoice_number: inv.invoice_number as string,
    client_name: inv.client_name as string | null,
    vendor_name: inv.vendor_name as string | null,
    project_id: inv.project_id as string | null,
    invoice_date: inv.invoice_date as string,
    due_date: inv.due_date as string,
    total_amount: inv.total_amount as number,
    balance_due: inv.balance_due as number,
    status: inv.status as string,
    notes: inv.notes as string | null,
    projects: inv.projects as { name: string } | null,
  }));

  // Batch-fetch linked journal entries
  const invoiceIds = invoices.map((inv) => inv.id);
  const jeMap = await findLinkedJournalEntriesBatch(supabase, userCompany.companyId, "invoice:", invoiceIds);
  const linkedJEs: Record<string, { id: string; entry_number: string }[]> = {};
  for (const [entityId, entries] of jeMap) {
    linkedJEs[entityId] = entries.map((e) => ({ id: e.id, entry_number: e.entry_number }));
  }

  // GL balance for AR accounts (debit - credit for asset accounts)
  // Include retainage receivable since invoice JEs split retainage into separate account
  const [arBase, arRetainage] = await Promise.all([
    getGLBalanceForAccountType(supabase, userCompany.companyId, "asset", "%accounts receivable%", "debit-credit"),
    getGLBalanceForAccountType(supabase, userCompany.companyId, "asset", "%retainage receivable%", "debit-credit"),
  ]);
  const glArBalance = arBase + arRetainage;

  return (
    <ARClient
      invoices={invoices}
      totalArBalance={totalArBalance}
      overdueAmount={overdueAmount}
      billedThisMonth={billedThisMonth}
      collectedThisMonth={collectedThisMonth}
      activeStatus={activeStatus}
      linkedJEs={linkedJEs}
      initialStartDate={filterStartDate}
      initialEndDate={filterEndDate}
      glBalance={glArBalance}
    />
  );
}
