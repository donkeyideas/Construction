import { Settings } from "lucide-react";

export const metadata = { title: "Company Settings - Buildwrk" };

export default function CompanySettingsPage() {
  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Company Settings</h2>
          <p className="fin-header-sub">Manage your company profile, branding, and general configuration.</p>
        </div>
      </div>
      <div className="fin-chart-card">
        <div className="fin-empty">
          <div className="fin-empty-icon"><Settings size={48} /></div>
          <div className="fin-empty-title">Coming Soon</div>
          <div className="fin-empty-desc">This feature is under development.</div>
        </div>
      </div>
    </div>
  );
}
