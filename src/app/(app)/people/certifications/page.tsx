import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { Award } from "lucide-react";

export const metadata = {
  title: "Certifications - ConstructionERP",
};

export default async function CertificationsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><Award size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access certifications.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Certifications & Licenses</h2>
          <p className="fin-header-sub">Track worker certifications, licenses, and expiration dates</p>
        </div>
      </div>
      <div className="fin-empty">
        <div className="fin-empty-icon"><Award size={48} /></div>
        <div className="fin-empty-title">Certification Tracking Coming Soon</div>
        <div className="fin-empty-desc">
          Certification and license management with expiration alerts,
          renewal reminders, and compliance reporting are under development.
        </div>
      </div>
    </div>
  );
}
