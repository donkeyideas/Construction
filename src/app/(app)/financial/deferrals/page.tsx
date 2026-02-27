import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import DeferralsClient from "./DeferralsClient";

export const metadata = {
  title: "Deferrals - Buildwrk",
};

interface DeferralRow {
  id: string;
  invoice_id: string;
  schedule_date: string;
  monthly_amount: number;
  status: string;
  invoice?: {
    invoice_number: string;
    invoice_type: string;
    vendor_name: string | null;
    client_name: string | null;
    total_amount: number;
    deferral_start_date: string | null;
    deferral_end_date: string | null;
  };
}

export default async function DeferralsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const { companyId } = userCompany;

  // Fetch all deferral schedule entries with invoice info
  const { data: scheduleData } = await supabase
    .from("invoice_deferral_schedule")
    .select(`
      id,
      invoice_id,
      schedule_date,
      monthly_amount,
      status,
      invoice:invoices(invoice_number, invoice_type, vendor_name, client_name, total_amount, deferral_start_date, deferral_end_date)
    `)
    .eq("company_id", companyId)
    .order("schedule_date", { ascending: true });

  const schedule = (scheduleData ?? []) as unknown as DeferralRow[];

  // Also get invoices that have deferral dates but might not have schedule rows yet
  const { data: deferredInvoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, invoice_type, vendor_name, client_name, total_amount, deferral_start_date, deferral_end_date")
    .eq("company_id", companyId)
    .not("deferral_start_date", "is", null)
    .not("deferral_end_date", "is", null)
    .order("deferral_start_date", { ascending: true });

  return (
    <DeferralsClient
      schedule={schedule}
      deferredInvoices={deferredInvoices ?? []}
    />
  );
}
