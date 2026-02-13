import { Puzzle } from "lucide-react";

export const metadata = { title: "Integrations - ConstructionERP" };

export default function IntegrationsPage() {
  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Integrations</h2>
          <p className="fin-header-sub">Connect third-party services and tools to your workspace.</p>
        </div>
      </div>
      <div className="fin-chart-card">
        <div className="fin-empty">
          <div className="fin-empty-icon"><Puzzle size={48} /></div>
          <div className="fin-empty-title">Coming Soon</div>
          <div className="fin-empty-desc">This feature is under development.</div>
        </div>
      </div>
    </div>
  );
}
