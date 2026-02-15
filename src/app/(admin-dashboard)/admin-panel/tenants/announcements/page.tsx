import { Megaphone } from "lucide-react";

export const metadata = { title: "Tenant Announcements - Buildwrk" };

export default function TenantAnnouncementsPage() {
  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Tenant Announcements</h2>
          <p className="fin-header-sub">Broadcast announcements and updates to your tenants.</p>
        </div>
      </div>
      <div className="fin-chart-card">
        <div className="fin-empty">
          <div className="fin-empty-icon"><Megaphone size={48} /></div>
          <div className="fin-empty-title">Coming Soon</div>
          <div className="fin-empty-desc">This feature is under development.</div>
        </div>
      </div>
    </div>
  );
}
