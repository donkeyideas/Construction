import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { runFinancialAudit } from "@/lib/queries/financial-audit";
import AuditClient from "./AuditClient";

export const metadata = {
  title: "Financial Audit - Buildwrk",
};

export default async function FinancialAuditPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon">
          <ShieldCheck size={48} />
        </div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">
          Complete your company registration to run financial audits.
        </div>
      </div>
    );
  }

  const audit = await runFinancialAudit(supabase, userCompany.companyId);

  return <AuditClient audit={audit} companyName={userCompany.companyName} />;
}
