import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getOpportunities,
  getPipelineSummary,
} from "@/lib/queries/crm";
import CRMPipelineClient from "./CRMPipelineClient";

export const metadata = {
  title: "Sales Pipeline - Buildwrk",
};

export default async function CRMPipelinePage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const { companyId } = userCompany;

  const [opportunities, summary] = await Promise.all([
    getOpportunities(supabase, companyId),
    getPipelineSummary(supabase, companyId),
  ]);

  return (
    <CRMPipelineClient opportunities={opportunities} summary={summary} />
  );
}
