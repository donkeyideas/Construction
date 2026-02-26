import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getContracts, getContractStats, getCompanyProjects } from "@/lib/queries/contracts";
import { findLinkedJournalEntriesBatch } from "@/lib/utils/je-linkage";
import ContractsClient from "./ContractsClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Contracts - Buildwrk",
};

export default async function ContractsPage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);

  if (!userCtx) {
    redirect("/login");
  }

  const [contracts, stats, projects] = await Promise.all([
    getContracts(supabase, userCtx.companyId),
    getContractStats(supabase, userCtx.companyId),
    getCompanyProjects(supabase, userCtx.companyId),
  ]);

  // Batch-fetch linked journal entries for contracts
  const contractIds = contracts.map((c) => c.id);
  const jeMap = await findLinkedJournalEntriesBatch(supabase, userCtx.companyId, "contract:", contractIds);
  const linkedJEs: Record<string, { id: string; entry_number: string }[]> = {};
  for (const [entityId, entries] of jeMap) {
    linkedJEs[entityId] = entries.map((e) => ({ id: e.id, entry_number: e.entry_number }));
  }

  return (
    <ContractsClient
      contracts={contracts}
      stats={stats}
      projects={projects}
      userId={userCtx.userId}
      companyId={userCtx.companyId}
      linkedJEs={linkedJEs}
    />
  );
}
