import { Globe } from "lucide-react";

export const metadata = { title: "SEO & GEO Management - ConstructionERP" };

export default function SEOManagementPage() {
  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>SEO & GEO Management</h2>
          <p className="fin-header-sub">Optimize your site for search engines and manage geographic targeting.</p>
        </div>
      </div>
      <div className="fin-chart-card">
        <div className="fin-empty">
          <div className="fin-empty-icon"><Globe size={48} /></div>
          <div className="fin-empty-title">Coming Soon</div>
          <div className="fin-empty-desc">This feature is under development.</div>
        </div>
      </div>
    </div>
  );
}
