import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getInvoices } from "@/lib/queries/financial";
import type { InvoiceFilters } from "@/lib/queries/financial";
import InvoicesClient from "./InvoicesClient";

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

  return (
    <InvoicesClient
      invoices={invoices}
      activeType={activeType}
      activeStatus={activeStatus}
    />
  );
}
