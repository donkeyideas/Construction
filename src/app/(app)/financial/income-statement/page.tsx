import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getIncomeStatement } from "@/lib/queries/financial";
import IncomeStatementClient from "./IncomeStatementClient";

export const metadata = {
  title: "Income Statement - ConstructionERP",
};

export default async function IncomeStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><FileText size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access the income statement.</div>
      </div>
    );
  }

  const params = await searchParams;

  // Default date range: Jan 1 of current year to today
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
  const defaultEnd = now.toISOString().split("T")[0];

  const startDate = params.start || defaultStart;
  const endDate = params.end || defaultEnd;

  const data = await getIncomeStatement(supabase, userCompany.companyId, startDate, endDate);

  return <IncomeStatementClient data={data} companyName={userCompany.companyName} />;
}
