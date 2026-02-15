import { Shield } from "lucide-react";

export const metadata = { title: "Role Permissions - Buildwrk" };

export default function PermissionsPage() {
  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Role Permissions</h2>
          <p className="fin-header-sub">Configure what each role can access and manage within your organization.</p>
        </div>
      </div>
      <div className="fin-chart-card">
        <div className="fin-empty">
          <div className="fin-empty-icon"><Shield size={48} /></div>
          <div className="fin-empty-title">Coming Soon</div>
          <div className="fin-empty-desc">This feature is under development.</div>
        </div>
      </div>
    </div>
  );
}
