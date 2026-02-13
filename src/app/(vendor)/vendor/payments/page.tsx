import { DollarSign } from "lucide-react";

export const metadata = { title: "Payment History - ConstructionERP" };

export default function PaymentHistoryPage() {
  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Payment History</h2>
          <p className="fin-header-sub">Track all payments received for your invoices.</p>
        </div>
      </div>
      <div className="fin-chart-card">
        <div className="fin-empty">
          <div className="fin-empty-icon"><DollarSign size={48} /></div>
          <div className="fin-empty-title">Coming Soon</div>
          <div className="fin-empty-desc">This feature is under development.</div>
        </div>
      </div>
    </div>
  );
}
