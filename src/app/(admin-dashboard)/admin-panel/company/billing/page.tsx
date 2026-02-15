import { CreditCard } from "lucide-react";

export const metadata = { title: "Billing & Subscription - Buildwrk" };

export default function BillingPage() {
  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Billing & Subscription</h2>
          <p className="fin-header-sub">Manage your subscription plan, payment methods, and billing history.</p>
        </div>
      </div>
      <div className="fin-chart-card">
        <div className="fin-empty">
          <div className="fin-empty-icon"><CreditCard size={48} /></div>
          <div className="fin-empty-title">Coming Soon</div>
          <div className="fin-empty-desc">This feature is under development.</div>
        </div>
      </div>
    </div>
  );
}
