import { User } from "lucide-react";

export const metadata = { title: "My Profile - ConstructionERP" };

export default function TenantProfilePage() {
  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>My Profile</h2>
          <p className="fin-header-sub">Manage your personal information and preferences.</p>
        </div>
      </div>
      <div className="fin-chart-card">
        <div className="fin-empty">
          <div className="fin-empty-icon"><User size={48} /></div>
          <div className="fin-empty-title">Coming Soon</div>
          <div className="fin-empty-desc">This feature is under development.</div>
        </div>
      </div>
    </div>
  );
}
