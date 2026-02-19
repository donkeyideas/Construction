import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getJournalEntries, getChartOfAccounts, getTrialBalance } from "@/lib/queries/financial";
import { BookOpen } from "lucide-react";
import GeneralLedgerClient from "./GeneralLedgerClient";

export const metadata = {
  title: "General Ledger - Buildwrk",
};

export default async function GeneralLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon">
          <BookOpen size={48} />
        </div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">
          Complete your company registration to access the General Ledger.
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const startDate = params.start || undefined;
  const endDate = params.end || undefined;

  const [entries, accounts, trialBalance] = await Promise.all([
    getJournalEntries(supabase, userCompany.companyId, { startDate, endDate }),
    getChartOfAccounts(supabase, userCompany.companyId),
    getTrialBalance(supabase, userCompany.companyId),
  ]);

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>
            <BookOpen size={24} style={{ verticalAlign: "middle", marginRight: 8 }} />
            General Ledger
          </h2>
          <p className="fin-header-sub">
            Journal entries, trial balance, and double-entry bookkeeping.
          </p>
        </div>
      </div>

      <GeneralLedgerClient
        entries={entries}
        accounts={accounts}
        trialBalance={trialBalance}
        initialStartDate={startDate}
        initialEndDate={endDate}
      />
    </div>
  );
}
