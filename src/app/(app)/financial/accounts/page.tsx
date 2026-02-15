import { Landmark } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getChartOfAccounts } from "@/lib/queries/financial";
import AccountsClient from "./AccountsClient";

export const metadata = {
  title: "Chart of Accounts - Buildwrk",
};

export default async function ChartOfAccountsPage() {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon">
          <Landmark size={48} />
        </div>
        <div className="fin-empty-title">Connection Error</div>
        <div className="fin-empty-desc">
          Unable to connect to the database. Please try again.
        </div>
      </div>
    );
  }

  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon">
          <Landmark size={48} />
        </div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">
          Complete your company registration to set up your chart of accounts.
        </div>
      </div>
    );
  }

  const accounts = await getChartOfAccounts(supabase, userCompany.companyId);

  return <AccountsClient accounts={accounts} />;
}
