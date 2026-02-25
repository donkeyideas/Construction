import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProjectTransactions } from "@/lib/queries/section-transactions";
import { backfillMissingJournalEntries } from "@/lib/utils/backfill-journal-entries";
import SectionTransactions from "@/components/SectionTransactions";

export const metadata = {
  title: "Projects Transactions - Buildwrk",
};

export default async function ProjectsTransactionsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  let txnData = await getProjectTransactions(supabase, userCompany.companyId);

  // Auto-heal: if any approved COs (or other entities) are missing JEs, backfill once and re-fetch
  const hasMissingJEs = txnData.transactions.some(
    (t) => !t.jeNumber && t.jeExpected !== false
  );
  if (hasMissingJEs) {
    try {
      await backfillMissingJournalEntries(supabase, userCompany.companyId, userCompany.userId);
      txnData = await getProjectTransactions(supabase, userCompany.companyId);
    } catch {
      // Non-blocking: show whatever data we have
    }
  }

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Projects Transactions</h2>
          <p className="fin-header-sub">
            All financial transactions linked to projects — invoices, change orders, and payments.
          </p>
        </div>
      </div>
      <SectionTransactions data={txnData} sectionName="Projects" />
    </div>
  );
}
