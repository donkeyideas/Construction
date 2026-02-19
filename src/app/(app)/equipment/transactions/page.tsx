import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getEquipmentTransactions } from "@/lib/queries/section-transactions";
import SectionTransactions from "@/components/SectionTransactions";
import ResetCompanyButton from "@/components/ResetCompanyButton";

export const metadata = {
  title: "Equipment Transactions - Buildwrk",
};

export default async function EquipmentTransactionsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/login");
  }

  const { data: { user } } = await supabase.auth.getUser();
  const isTestAccount = user?.email === "beltran_alain@yahoo.com";
  const txnData = await getEquipmentTransactions(supabase, userCompany.companyId);

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Equipment Transactions</h2>
          <p className="fin-header-sub">
            Fixed asset journal entries, equipment purchases, and maintenance costs.
          </p>
        </div>
        {isTestAccount && (
          <div className="fin-header-actions">
            <ResetCompanyButton />
          </div>
        )}
      </div>
      <SectionTransactions data={txnData} sectionName="Equipment" />
    </div>
  );
}
