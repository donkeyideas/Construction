import { Sparkles } from "lucide-react";

export const metadata = { title: "AI Provider Configuration - Buildwrk" };

export default function AIProvidersPage() {
  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>AI Provider Configuration</h2>
          <p className="fin-header-sub">Configure AI model providers, API keys, and usage limits.</p>
        </div>
      </div>
      <div className="fin-chart-card">
        <div className="fin-empty">
          <div className="fin-empty-icon"><Sparkles size={48} /></div>
          <div className="fin-empty-title">Coming Soon</div>
          <div className="fin-empty-desc">This feature is under development.</div>
        </div>
      </div>
    </div>
  );
}
