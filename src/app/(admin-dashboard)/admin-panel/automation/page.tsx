import { Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getAutomationRules, getAutomationStats } from "@/lib/queries/automation";
import AutomationClient from "./AutomationClient";

export const metadata = { title: "Automation - Buildwrk" };

export default async function AutomationPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><Zap size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Complete your company registration first.</div>
      </div>
    );
  }

  const [rules, stats] = await Promise.all([
    getAutomationRules(supabase, userCompany.companyId),
    getAutomationStats(supabase, userCompany.companyId),
  ]);

  return (
    <AutomationClient
      rules={rules}
      stats={stats}
    />
  );
}
