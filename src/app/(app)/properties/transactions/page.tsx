import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getPropertyTransactions } from "@/lib/queries/section-transactions";
import SectionTransactions from "@/components/SectionTransactions";
import ResetCompanyButton from "@/components/ResetCompanyButton";

export const metadata = {
  title: "Properties Transactions - Buildwrk",
};

export default async function PropertiesTransactionsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const { data: { user } } = await supabase.auth.getUser();
  const isTestAccount = user?.email === "beltran_alain@yahoo.com";
  const txnData = await getPropertyTransactions(supabase, userCompany.companyId);

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Properties Transactions</h2>
          <p className="fin-header-sub">
            Financial transactions linked to properties — invoices, lease payments, and journal entries.
          </p>
        </div>
        {isTestAccount && (
          <div className="fin-header-actions">
            <ResetCompanyButton />
          </div>
        )}
      </div>
      <SectionTransactions data={txnData} sectionName="Properties" />
    </div>
  );
}
