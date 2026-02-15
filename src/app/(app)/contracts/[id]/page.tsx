import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getContractById,
  getContractMilestones,
  getCompanyProjects,
} from "@/lib/queries/contracts";
import ContractDetailClient from "./ContractDetailClient";
import { redirect, notFound } from "next/navigation";

export const metadata = {
  title: "Contract Detail - Buildwrk",
};

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);

  if (!userCtx) {
    redirect("/login");
  }

  const [contract, milestones, projects] = await Promise.all([
    getContractById(supabase, id),
    getContractMilestones(supabase, id),
    getCompanyProjects(supabase, userCtx.companyId),
  ]);

  if (!contract || contract.company_id !== userCtx.companyId) {
    notFound();
  }

  return (
    <ContractDetailClient
      contract={contract}
      milestones={milestones}
      projects={projects}
      userId={userCtx.userId}
      companyId={userCtx.companyId}
    />
  );
}
