import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getOpportunities,
  getPipelineSummary,
} from "@/lib/queries/crm";
import CRMPipelineClient from "./CRMPipelineClient";

export const metadata = {
  title: "Sales Pipeline - ConstructionERP",
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
    <div>
      {/* Header with Bid Management Link */}
      <div className="crm-header">
        <div style={{ flex: 1 }} />
        <div className="crm-header-actions">
          <Link href="/crm/bids" className="ui-btn ui-btn-md ui-btn-secondary">
            Bid Management
          </Link>
        </div>
      </div>

      {/* Client Component with Interactive Pipeline */}
      <CRMPipelineClient opportunities={opportunities} summary={summary} />
    </div>
  );
}
