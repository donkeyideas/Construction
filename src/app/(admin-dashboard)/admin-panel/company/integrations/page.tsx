import { Puzzle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getIntegrations, getIntegrationStats } from "@/lib/queries/integrations";
import IntegrationsClient from "./IntegrationsClient";

export const metadata = { title: "Integrations - Buildwrk" };

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><Puzzle size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Complete your company registration first.</div>
      </div>
    );
  }

  const [integrations, stats] = await Promise.all([
    getIntegrations(supabase, userCompany.companyId),
    getIntegrationStats(supabase, userCompany.companyId),
  ]);

  return (
    <IntegrationsClient
      integrations={integrations}
      stats={stats}
    />
  );
}
