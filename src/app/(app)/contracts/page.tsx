import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getContracts, getContractStats, getCompanyProjects } from "@/lib/queries/contracts";
import ContractsClient from "./ContractsClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Contracts - ConstructionERP",
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

  return (
    <ContractsClient
      contracts={contracts}
      stats={stats}
      projects={projects}
      userId={userCtx.userId}
      companyId={userCtx.companyId}
    />
  );
}
