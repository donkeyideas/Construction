import { ShieldCheck } from "lucide-react";

export const metadata = { title: "Vendor Compliance - ConstructionERP" };

export default function VendorCompliancePage() {
  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Vendor Compliance</h2>
          <p className="fin-header-sub">Track vendor certifications, insurance, and compliance documents.</p>
        </div>
      </div>
      <div className="fin-chart-card">
        <div className="fin-empty">
          <div className="fin-empty-icon"><ShieldCheck size={48} /></div>
          <div className="fin-empty-title">Coming Soon</div>
          <div className="fin-empty-desc">This feature is under development.</div>
        </div>
      </div>
    </div>
  );
}
