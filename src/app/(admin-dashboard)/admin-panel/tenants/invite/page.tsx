import { UserPlus } from "lucide-react";

export const metadata = { title: "Invite Tenant - Buildwrk" };

export default function InviteTenantPage() {
  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Invite Tenant</h2>
          <p className="fin-header-sub">Send portal access invitations to tenants for self-service management.</p>
        </div>
      </div>
      <div className="fin-chart-card">
        <div className="fin-empty">
          <div className="fin-empty-icon"><UserPlus size={48} /></div>
          <div className="fin-empty-title">Coming Soon</div>
          <div className="fin-empty-desc">This feature is under development.</div>
        </div>
      </div>
    </div>
  );
}
