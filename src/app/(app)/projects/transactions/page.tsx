import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProjectTransactions } from "@/lib/queries/section-transactions";
import SectionTransactions from "@/components/SectionTransactions";
import ResetCompanyButton from "@/components/ResetCompanyButton";

export const metadata = {
  title: "Projects Transactions - Buildwrk",
};

export default async function ProjectsTransactionsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const { data: { user } } = await supabase.auth.getUser();
  const isTestAccount = user?.email === "beltran_alain@yahoo.com";
  const txnData = await getProjectTransactions(supabase, userCompany.companyId);

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Projects Transactions</h2>
          <p className="fin-header-sub">
            All financial transactions linked to projects — invoices, change orders, and payments.
          </p>
        </div>
        {isTestAccount && (
          <div className="fin-header-actions">
            <ResetCompanyButton />
          </div>
        )}
      </div>
      <SectionTransactions data={txnData} sectionName="Projects" />
    </div>
  );
}
