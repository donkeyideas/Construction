import { HandCoins } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { findLinkedJournalEntriesBatch } from "@/lib/utils/je-linkage";
import ARClient from "./ARClient";

export const metadata = {
  title: "Accounts Receivable - Buildwrk",
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

  const todayStr = now.toISOString().split("T")[0];

  const [allArRes, billedThisMonthRes, collectedThisMonthRes, invoicesRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, balance_due, status, due_date")
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
      return query;
    })(),
  ]);

  const allAr = allArRes.data ?? [];
  const totalArBalance = allAr
    .filter((inv) => inv.status !== "paid")
    .reduce((sum, inv) => sum + (inv.balance_due ?? 0), 0);
  const overdueAmount = allAr
    .filter((inv) => inv.status !== "paid" && inv.due_date && inv.due_date < todayStr)
    .reduce((sum, inv) => sum + (inv.balance_due ?? 0), 0);
  const billedThisMonth = (billedThisMonthRes.data ?? []).reduce(
    (sum, inv) => sum + (inv.total_amount ?? 0), 0
  );
  const collectedThisMonth = (collectedThisMonthRes.data ?? []).reduce(
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
    <ARClient
      invoices={invoices}
      totalArBalance={totalArBalance}
      overdueAmount={overdueAmount}
      billedThisMonth={billedThisMonth}
      collectedThisMonth={collectedThisMonth}
      activeStatus={activeStatus}
      linkedJEs={linkedJEs}
    />
  );
}
