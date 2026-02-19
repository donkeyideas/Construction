import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getFinancialTransactions } from "@/lib/queries/section-transactions";
import { backfillMissingJournalEntries } from "@/lib/utils/backfill-journal-entries";
import { DollarSign } from "lucide-react";
import SectionTransactions from "@/components/SectionTransactions";

export const metadata = {
  title: "Financial Transactions - Buildwrk",
};

export default async function FinancialTransactionsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><DollarSign size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access financial transactions.</div>
      </div>
    );
  }

  await backfillMissingJournalEntries(supabase, userCompany.companyId, userCompany.userId);

  const txnData = await getFinancialTransactions(supabase, userCompany.companyId);

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Financial Transactions</h2>
          <p className="fin-header-sub">
            All posted journal entry lines — the master ledger of every financial movement.
          </p>
        </div>
      </div>
      <SectionTransactions data={txnData} sectionName="Financial" />
    </div>
  );
}
