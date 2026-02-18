import { Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { findLinkedJournalEntriesBatch } from "@/lib/utils/je-linkage";
import APClient from "./APClient";

export const metadata = {
  title: "Accounts Payable - Buildwrk",
};

interface PageProps {
  searchParams: Promise<{
    status?: string;
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
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const todayStr = now.toISOString().split("T")[0];

  const [allApRes, paidThisMonthRes, invoicesRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, balance_due, status, due_date")
      .eq("company_id", userCompany.companyId)
      .eq("invoice_type", "payable")
      .not("status", "eq", "voided"),
    supabase
      .from("invoices")
      .select("total_amount")
      .eq("company_id", userCompany.companyId)
      .eq("invoice_type", "payable")
      .eq("status", "paid")
      .gte("invoice_date", startOfMonth)
      .lte("invoice_date", endOfMonth),
    (() => {
      let query = supabase
        .from("invoices")
        .select("id, invoice_number, client_name, vendor_name, project_id, invoice_date, due_date, total_amount, balance_due, status, notes, projects(name)")
        .eq("company_id", userCompany.companyId)
        .eq("invoice_type", "payable")
        .order("invoice_date", { ascending: false });

      if (activeStatus && activeStatus !== "all") {
        query = query.eq("status", activeStatus);
      } else {
        query = query.not("status", "eq", "voided").not("status", "eq", "paid");
      }
      return query;
    })(),
  ]);

  const allAp = allApRes.data ?? [];
  const totalApBalance = allAp
    .filter((inv) => inv.status !== "paid")
    .reduce((sum, inv) => sum + (inv.balance_due ?? 0), 0);
  const overdueAmount = allAp
    .filter((inv) => inv.status !== "paid" && inv.due_date && inv.due_date < todayStr)
    .reduce((sum, inv) => sum + (inv.balance_due ?? 0), 0);
  const pendingApprovalCount = allAp.filter((inv) => inv.status === "pending").length;
  const paidThisMonth = (paidThisMonthRes.data ?? []).reduce(
    (sum, inv) => sum + (inv.total_amount ?? 0), 0
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

  return (
    <APClient
      invoices={invoices}
      totalApBalance={totalApBalance}
      overdueAmount={overdueAmount}
      pendingApprovalCount={pendingApprovalCount}
      paidThisMonth={paidThisMonth}
      activeStatus={activeStatus}
      linkedJEs={linkedJEs}
    />
  );
}
