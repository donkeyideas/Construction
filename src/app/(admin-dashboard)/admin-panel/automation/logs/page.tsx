import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getAutomationLogs } from "@/lib/queries/automation";
import AutomationLogsClient from "./AutomationLogsClient";

export const metadata = { title: "Automation Logs - ConstructionERP" };

export default async function AutomationLogsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><FileText size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Complete your company registration first.</div>
      </div>
    );
  }

  const logs = await getAutomationLogs(supabase, userCompany.companyId, {
    limit: 100,
  });

  return <AutomationLogsClient logs={logs} />;
}
