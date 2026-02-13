import { Wrench } from "lucide-react";

export const metadata = { title: "Submit Request - ConstructionERP" };

export default function SubmitMaintenanceRequestPage() {
  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Submit Maintenance Request</h2>
          <p className="fin-header-sub">Report a maintenance issue for your unit.</p>
        </div>
      </div>
      <div className="fin-chart-card">
        <div className="fin-empty">
          <div className="fin-empty-icon"><Wrench size={48} /></div>
          <div className="fin-empty-title">Coming Soon</div>
          <div className="fin-empty-desc">This feature is under development.</div>
        </div>
      </div>
    </div>
  );
}
