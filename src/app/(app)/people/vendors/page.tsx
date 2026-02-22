import { Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getAPPaymentHistory, getAPVendorSummary } from "@/lib/queries/financial";
import { getBankAccounts } from "@/lib/queries/banking";
import VendorsClient from "./VendorsClient";

export const metadata = {
  title: "Vendors & Subcontractors - Buildwrk",
};

export default async function VendorsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><Truck size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access vendors.</div>
      </div>
    );
  }

  const { companyId } = userCompany;

  // Fetch vendor contacts, vendor contracts, projects, payable invoices, payment history, and vendor summary in parallel
  const [{ data: contacts }, { data: contracts }, { data: projects }, { data: payableInvoices }, paymentHistory, vendorSummary, bankAccounts] = await Promise.all([
    supabase
      .from("contacts")
      .select("*")
      .eq("company_id", companyId)
      .in("contact_type", ["vendor", "subcontractor"])
      .eq("is_active", true)
      .order("company_name"),
    supabase
      .from("vendor_contracts")
      .select("*, contacts(first_name, last_name, company_name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, name, code, status")
      .eq("company_id", companyId)
      .order("name"),
    supabase
      .from("invoices")
      .select("id, invoice_number, vendor_name, total_amount, balance_due, status, due_date, invoice_date, projects(name)")
      .eq("company_id", companyId)
      .eq("invoice_type", "payable")
      .not("status", "eq", "voided")
      .not("status", "eq", "paid")
      .order("due_date", { ascending: true }),
    getAPPaymentHistory(supabase, companyId),
    getAPVendorSummary(supabase, companyId),
    getBankAccounts(supabase, companyId),
  ]);

  return (
    <div>
      <VendorsClient
        contacts={contacts ?? []}
        contracts={contracts ?? []}
        projects={projects ?? []}
        payableInvoices={(payableInvoices ?? []).map((inv: Record<string, unknown>) => ({
          id: inv.id as string,
          invoice_number: inv.invoice_number as string,
          vendor_name: inv.vendor_name as string | null,
          total_amount: inv.total_amount as number,
          balance_due: inv.balance_due as number,
          status: inv.status as string,
          due_date: inv.due_date as string,
          invoice_date: inv.invoice_date as string,
          projects: inv.projects as { name: string } | null,
        }))}
        paymentHistory={paymentHistory}
        vendorSummary={vendorSummary}
        bankAccounts={bankAccounts.map((ba) => ({
          id: ba.id,
          name: ba.name,
          bank_name: ba.bank_name,
          account_type: ba.account_type,
          account_number_last4: ba.account_number_last4,
          is_default: ba.is_default,
        }))}
      />
    </div>
  );
}
