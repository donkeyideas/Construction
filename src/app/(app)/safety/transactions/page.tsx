import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getSafetyTransactions } from "@/lib/queries/section-transactions";
import SectionTransactions from "@/components/SectionTransactions";
import ResetCompanyButton from "@/components/ResetCompanyButton";

export const metadata = {
  title: "Safety Transactions - Buildwrk",
};

export default async function SafetyTransactionsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/login");
  }

  const { data: { user } } = await supabase.auth.getUser();
  const isTestAccount = user?.email === "beltran_alain@yahoo.com";
  const txnData = await getSafetyTransactions(supabase, userCompany.companyId);

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Safety Transactions</h2>
          <p className="fin-header-sub">
            Safety-related expenses — training, PPE, OSHA compliance, and inspections.
          </p>
        </div>
        {isTestAccount && (
          <div className="fin-header-actions">
            <ResetCompanyButton />
          </div>
        )}
      </div>
      <SectionTransactions data={txnData} sectionName="Safety" />
    </div>
  );
}
