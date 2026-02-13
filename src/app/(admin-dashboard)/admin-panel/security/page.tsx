import { Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getSecuritySettings, getLoginHistory, getActiveSessions } from "@/lib/queries/security";
import SecurityClient from "./SecurityClient";

export const metadata = { title: "Security - ConstructionERP" };

export default async function SecurityPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><Shield size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Complete your company registration first.</div>
      </div>
    );
  }

  const [settings, loginHistory, sessions] = await Promise.all([
    getSecuritySettings(supabase, userCompany.companyId),
    getLoginHistory(supabase, userCompany.companyId, { limit: 50 }),
    getActiveSessions(supabase, userCompany.companyId),
  ]);

  return (
    <SecurityClient
      settings={settings}
      loginHistory={loginHistory}
      sessions={sessions}
    />
  );
}
