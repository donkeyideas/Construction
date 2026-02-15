import { FileText } from "lucide-react";

export const metadata = { title: "Content Manager - Buildwrk" };

export default function ContentManagerPage() {
  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Content Manager</h2>
          <p className="fin-header-sub">Manage pages, blog posts, and other content for your company site.</p>
        </div>
      </div>
      <div className="fin-chart-card">
        <div className="fin-empty">
          <div className="fin-empty-icon"><FileText size={48} /></div>
          <div className="fin-empty-title">Coming Soon</div>
          <div className="fin-empty-desc">This feature is under development.</div>
        </div>
      </div>
    </div>
  );
}
