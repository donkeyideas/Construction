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

  const [contracts, stats, projects, contactsResult] = await Promise.all([
    getContracts(supabase, userCtx.companyId),
    getContractStats(supabase, userCtx.companyId),
    getCompanyProjects(supabase, userCtx.companyId),
    supabase
      .from("contacts")
      .select("id, first_name, last_name, email, job_title, contact_type, company_name")
      .eq("company_id", userCtx.companyId)
      .eq("is_active", true)
      .order("first_name"),
  ]);

  const contacts = (contactsResult.data ?? []).map((c) => ({
    id: c.id as string,
    first_name: c.first_name as string,
    last_name: c.last_name as string,
    email: c.email as string | null,
    job_title: c.job_title as string | null,
    contact_type: c.contact_type as string,
    company_name: c.company_name as string | null,
  }));

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
      contacts={contacts}
      userId={userCtx.userId}
      companyId={userCtx.companyId}
      linkedJEs={linkedJEs}
    />
  );
}
