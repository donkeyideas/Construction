import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getInvoiceById } from "@/lib/queries/financial";
import EditInvoiceClient from "./EditInvoiceClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Edit Invoice ${id.substring(0, 8)} - Buildwrk` };
}

export default async function EditInvoicePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    notFound();
  }

  const invoice = await getInvoiceById(supabase, id);

  if (!invoice) {
    notFound();
  }

  // Fetch GL accounts and projects for dropdowns
  const [acctRes, projRes] = await Promise.all([
    supabase
      .from("chart_of_accounts")
      .select("id, account_number, name, account_type")
      .eq("company_id", userCompany.companyId)
      .eq("is_active", true)
      .order("account_number"),
    supabase
      .from("projects")
      .select("id, name, code")
      .eq("company_id", userCompany.companyId)
      .order("name"),
  ]);

  const raw = invoice as unknown as Record<string, unknown>;

  return (
    <EditInvoiceClient
      invoiceId={id}
      invoice={{
        invoice_number: invoice.invoice_number ?? "",
        invoice_type: (invoice.invoice_type ?? "receivable") as "payable" | "receivable",
        vendor_name: invoice.vendor_name ?? "",
        client_name: invoice.client_name ?? "",
        project_id: invoice.project_id ?? "",
        gl_account_id: (raw.gl_account_id as string) ?? "",
        invoice_date: invoice.invoice_date ?? "",
        due_date: invoice.due_date ?? "",
        notes: invoice.notes ?? "",
        subtotal: Number(invoice.subtotal) || 0,
        tax_amount: Number(invoice.tax_amount) || 0,
        total_amount: Number(invoice.total_amount) || 0,
        status: invoice.status ?? "draft",
        line_items: Array.isArray(invoice.line_items)
          ? invoice.line_items
          : typeof invoice.line_items === "string"
            ? JSON.parse(invoice.line_items)
            : [],
        deferral_start_date: (raw.deferral_start_date as string) ?? "",
        deferral_end_date: (raw.deferral_end_date as string) ?? "",
      }}
      glAccounts={acctRes.data ?? []}
      projects={projRes.data ?? []}
    />
  );
}
