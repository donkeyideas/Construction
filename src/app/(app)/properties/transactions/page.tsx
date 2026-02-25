import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getPropertyTransactions } from "@/lib/queries/section-transactions";
import { backfillMissingJournalEntries } from "@/lib/utils/backfill-journal-entries";
import SectionTransactions from "@/components/SectionTransactions";

export const metadata = {
  title: "Properties Transactions - Buildwrk",
};

export default async function PropertiesTransactionsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  let txnData = await getPropertyTransactions(supabase, userCompany.companyId);

  // Auto-heal: if any transactions are missing JEs, backfill once and re-fetch
  const hasMissingJEs = txnData.transactions.some(
    (t) => !t.jeNumber && t.jeExpected !== false
  );
  if (hasMissingJEs) {
    try {
      await backfillMissingJournalEntries(supabase, userCompany.companyId, userCompany.userId);
      txnData = await getPropertyTransactions(supabase, userCompany.companyId);
    } catch {
      // Non-blocking: show whatever data we have
    }
  }

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Properties Transactions</h2>
          <p className="fin-header-sub">
            Financial transactions linked to properties — invoices, lease payments, and journal entries.
          </p>
        </div>
      </div>
      <SectionTransactions data={txnData} sectionName="Properties" />
    </div>
  );
}
