import { Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getBankAccounts } from "@/lib/queries/banking";
import { findLinkedJournalEntriesBatch } from "@/lib/utils/je-linkage";
import { getGLBalanceForAccountType } from "@/lib/utils/gl-balance";
import { paginatedQuery } from "@/lib/utils/paginated-query";
import APClient from "./APClient";

export const metadata = {
  title: "Accounts Payable - Buildwrk",
};

interface PageProps {
  searchParams: Promise<{
    status?: string;
    start?: string;
    end?: string;
  }>;
}

export default async function AccountsPayablePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><Receipt size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access accounts payable.</div>
      </div>
    );
  }

  const activeStatus = params.status || undefined;
  const filterStartDate = params.start || undefined;
  const filterEndDate = params.end || undefined;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  const todayStr = now.toISOString().split("T")[0];

  // --- Parallel data fetching ---
  const [allAp, invoicesRes, bankAccounts] = await Promise.all([
    // All AP invoices for KPIs (excludes voided)
    paginatedQuery<{ id: string; balance_due: number; status: string; due_date: string; vendor_name: string | null }>((from, to) => {
      let q = supabase
        .from("invoices")
        .select("id, balance_due, status, due_date, vendor_name")
        .eq("company_id", userCompany.companyId)
        .eq("invoice_type", "payable")
        .not("status", "eq", "voided");
      if (filterStartDate) q = q.gte("invoice_date", filterStartDate);
      if (filterEndDate) q = q.lte("invoice_date", filterEndDate);
      return q.range(from, to);
    }),
    // Invoices for the table (filtered by status)
    (() => {
      let query = supabase
        .from("invoices")
        .select("id, invoice_number, client_name, vendor_name, project_id, invoice_date, due_date, total_amount, amount_paid, balance_due, status, notes, payment_terms, projects(name)")
        .eq("company_id", userCompany.companyId)
        .eq("invoice_type", "payable")
        .order("invoice_date", { ascending: false });

      if (activeStatus === "active" || !activeStatus) {
        query = query.not("status", "eq", "voided").not("status", "eq", "paid");
      } else if (activeStatus !== "all") {
        query = query.eq("status", activeStatus);
      }
      if (filterStartDate) query = query.gte("invoice_date", filterStartDate);
      if (filterEndDate) query = query.lte("invoice_date", filterEndDate);
      return query;
    })(),
    // Bank accounts for inline payment recording
    getBankAccounts(supabase, userCompany.companyId),
  ]);

  // --- KPI calculations ---
  // Total AP Balance: exclude drafts (they don't have posted JEs, so shouldn't count in subledger)
  const totalApBalance = allAp
    .filter((inv) => (inv.balance_due ?? 0) > 0 && inv.status !== "draft")
    .reduce((sum, inv) => sum + (inv.balance_due ?? 0), 0);

  const overdueAmount = allAp
    .filter((inv) => (inv.balance_due ?? 0) > 0 && inv.status !== "draft" && inv.due_date && inv.due_date < todayStr)
    .reduce((sum, inv) => sum + (inv.balance_due ?? 0), 0);

  const overdueCount = allAp
    .filter((inv) => (inv.balance_due ?? 0) > 0 && inv.status !== "draft" && inv.due_date && inv.due_date < todayStr)
    .length;

  const pendingApprovalCount = allAp.filter((inv) => inv.status === "pending" || inv.status === "submitted").length;

  // Paid This Month: get payable invoice IDs, then sum payments in date range
  const payableInvoiceIds = allAp.map((inv) => inv.id);
  let paidThisMonth = 0;
  if (payableInvoiceIds.length > 0) {
    // Chunk IDs to avoid overly long IN clause (Supabase limit)
    const CHUNK = 200;
    for (let i = 0; i < payableInvoiceIds.length; i += CHUNK) {
      const chunk = payableInvoiceIds.slice(i, i + CHUNK);
      const { data: pmts } = await supabase
        .from("payments")
        .select("amount")
        .in("invoice_id", chunk)
        .gte("payment_date", startOfMonth)
        .lte("payment_date", endOfMonth);
      paidThisMonth += (pmts ?? []).reduce((s: number, r: { amount: number }) => s + (Number(r.amount) || 0), 0);
    }
  }

  // Aging breakdown
  const agingBuckets = { current: 0, days30: 0, days60: 0, days90: 0, days90plus: 0 };
  for (const inv of allAp) {
    if ((inv.balance_due ?? 0) <= 0 || inv.status === "draft") continue;
    const daysOverdue = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24));
    if (daysOverdue <= 0) agingBuckets.current += inv.balance_due;
    else if (daysOverdue <= 30) agingBuckets.days30 += inv.balance_due;
    else if (daysOverdue <= 60) agingBuckets.days60 += inv.balance_due;
    else if (daysOverdue <= 90) agingBuckets.days90 += inv.balance_due;
    else agingBuckets.days90plus += inv.balance_due;
  }

  // Top vendors by AP balance
  const vendorMap: Record<string, number> = {};
  for (const inv of allAp) {
    if ((inv.balance_due ?? 0) <= 0 || inv.status === "draft") continue;
    const name = inv.vendor_name || "Unknown";
    vendorMap[name] = (vendorMap[name] || 0) + inv.balance_due;
  }
  const topVendors = Object.entries(vendorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, amount]) => ({ name, amount }));

  // --- Map invoice rows ---
  const invoices = (invoicesRes.data ?? []).map((inv: Record<string, unknown>) => ({
    id: inv.id as string,
    invoice_number: inv.invoice_number as string,
    client_name: inv.client_name as string | null,
    vendor_name: inv.vendor_name as string | null,
    project_id: inv.project_id as string | null,
    invoice_date: inv.invoice_date as string,
    due_date: inv.due_date as string,
    total_amount: inv.total_amount as number,
    amount_paid: inv.amount_paid as number,
    balance_due: inv.balance_due as number,
    status: inv.status as string,
    notes: inv.notes as string | null,
    payment_terms: (inv.payment_terms as string) || null,
    projects: inv.projects as { name: string } | null,
  }));

  // Batch-fetch linked journal entries
  const invoiceIds = invoices.map((inv) => inv.id);
  const jeMap = await findLinkedJournalEntriesBatch(supabase, userCompany.companyId, "invoice:", invoiceIds);
  const linkedJEs: Record<string, { id: string; entry_number: string }[]> = {};
  for (const [entityId, entries] of jeMap) {
    linkedJEs[entityId] = entries.map((e) => ({ id: e.id, entry_number: e.entry_number }));
  }

  // Fetch payment bank accounts for each invoice (for "Paid From" column)
  // Note: payments.bank_account_id has no FK to bank_accounts, so we do a two-step lookup
  const paidFromMap: Record<string, string> = {};
  if (invoiceIds.length > 0) {
    const CHUNK = 200;
    const allPayments: { invoice_id: string; bank_account_id: string | null }[] = [];
    for (let i = 0; i < invoiceIds.length; i += CHUNK) {
      const chunk = invoiceIds.slice(i, i + CHUNK);
      const { data: pmts } = await supabase
        .from("payments")
        .select("invoice_id, bank_account_id")
        .in("invoice_id", chunk);
      for (const p of pmts ?? []) {
        allPayments.push({ invoice_id: p.invoice_id as string, bank_account_id: p.bank_account_id as string | null });
      }
    }
    // Resolve bank account names
    const bankIds = [...new Set(allPayments.map((p) => p.bank_account_id).filter(Boolean))] as string[];
    const bankNameMap: Record<string, string> = {};
    if (bankIds.length > 0) {
      const { data: banks } = await supabase
        .from("bank_accounts")
        .select("id, name, account_number_last4")
        .in("id", bankIds);
      for (const b of banks ?? []) {
        bankNameMap[b.id] = b.account_number_last4 ? `${b.name} ****${b.account_number_last4}` : b.name;
      }
    }
    for (const p of allPayments) {
      if (p.bank_account_id && bankNameMap[p.bank_account_id]) {
        paidFromMap[p.invoice_id] = bankNameMap[p.bank_account_id];
      }
    }
  }

  // GL balance for AP accounts
  const [apBase, apRetainage] = await Promise.all([
    getGLBalanceForAccountType(supabase, userCompany.companyId, "liability", "%accounts payable%", "credit-debit"),
    getGLBalanceForAccountType(supabase, userCompany.companyId, "liability", "%retainage payable%", "credit-debit"),
  ]);
  const glApBalance = apBase + apRetainage;

  return (
    <APClient
      invoices={invoices}
      totalApBalance={totalApBalance}
      overdueAmount={overdueAmount}
      overdueCount={overdueCount}
      pendingApprovalCount={pendingApprovalCount}
      paidThisMonth={paidThisMonth}
      activeStatus={activeStatus}
      linkedJEs={linkedJEs}
      initialStartDate={filterStartDate}
      initialEndDate={filterEndDate}
      glBalance={glApBalance}
      agingBuckets={agingBuckets}
      topVendors={topVendors}
      serverToday={todayStr}
      invoiceCount={allAp.length}
      bankAccounts={bankAccounts.map((ba) => ({
        id: ba.id,
        name: ba.name,
        bank_name: ba.bank_name,
        account_number_last4: ba.account_number_last4,
        is_default: ba.is_default,
      }))}
      paidFromMap={paidFromMap}
    />
  );
}
