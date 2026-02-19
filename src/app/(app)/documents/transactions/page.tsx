import { redirect } from "next/navigation";
import { DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getDocumentTransactions } from "@/lib/queries/section-transactions";
import SectionTransactions from "@/components/SectionTransactions";

export const metadata = {
  title: "Documents Transactions - Buildwrk",
};

export default async function DocumentsTransactionsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const txnData = await getDocumentTransactions(supabase, userCompany.companyId);

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>
            <DollarSign size={24} style={{ verticalAlign: "middle", marginRight: 8 }} />
            Documents Transactions
          </h2>
          <p className="fin-header-sub">
            Printing, scanning, storage, and blueprint-related expenses.
          </p>
        </div>
      </div>
      <SectionTransactions data={txnData} sectionName="Documents" />
    </div>
  );
}
