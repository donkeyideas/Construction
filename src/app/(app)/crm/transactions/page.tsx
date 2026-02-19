import { redirect } from "next/navigation";
import { DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getCRMTransactions } from "@/lib/queries/section-transactions";
import SectionTransactions from "@/components/SectionTransactions";

export const metadata = {
  title: "CRM Transactions - Buildwrk",
};

export default async function CRMTransactionsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const txnData = await getCRMTransactions(supabase, userCompany.companyId);

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>
            <DollarSign size={24} style={{ verticalAlign: "middle", marginRight: 8 }} />
            CRM & Bids Transactions
          </h2>
          <p className="fin-header-sub">
            Won opportunities, bid amounts, and estimated costs.
          </p>
        </div>
      </div>
      <SectionTransactions data={txnData} sectionName="CRM & Bids" />
    </div>
  );
}
