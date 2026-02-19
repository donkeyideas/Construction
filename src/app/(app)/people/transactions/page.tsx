import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getPeopleTransactions } from "@/lib/queries/section-transactions";
import SectionTransactions from "@/components/SectionTransactions";

export const metadata = {
  title: "People Transactions - Buildwrk",
};

export default async function PeopleTransactionsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const txnData = await getPeopleTransactions(supabase, userCompany.companyId);

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>People Transactions</h2>
          <p className="fin-header-sub">
            Payroll runs, vendor invoices, and contractor payments.
          </p>
        </div>
      </div>
      <SectionTransactions data={txnData} sectionName="People" />
    </div>
  );
}
