import { Scale } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getBalanceSheet } from "@/lib/queries/financial";
import BalanceSheetClient from "./BalanceSheetClient";

export const metadata = {
  title: "Balance Sheet - ConstructionERP",
};

export default async function BalanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string }>;
}) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><Scale size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access the balance sheet.</div>
      </div>
    );
  }

  const params = await searchParams;

  // Default: as of today
  const defaultDate = new Date().toISOString().split("T")[0];
  const asOfDate = params.asOf || defaultDate;

  const data = await getBalanceSheet(supabase, userCompany.companyId, asOfDate);

  return <BalanceSheetClient data={data} companyName={userCompany.companyName} />;
}
