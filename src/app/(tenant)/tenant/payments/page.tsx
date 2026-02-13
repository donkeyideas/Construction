import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTenantPayments } from "@/lib/queries/tenant-portal";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = {
  title: "Payments - ConstructionERP",
};

export default async function TenantPaymentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login/tenant");
  }

  const payments = await getTenantPayments(supabase, user.id);

  function getStatusBadge(status: string): string {
    switch (status) {
      case "paid":
        return "badge badge-green";
      case "pending":
        return "badge badge-amber";
      case "overdue":
        return "badge badge-red";
      case "failed":
        return "badge badge-red";
      default:
        return "badge badge-blue";
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Payment History</h2>
          <p className="fin-header-sub">
            View your rent payment history and transaction details.
          </p>
        </div>
      </div>

      {payments.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th>Status</th>
                  <th>Method</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      {payment.payment_date
                        ? new Date(payment.payment_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "--"}
                    </td>
                    <td className="amount-col">
                      {payment.amount != null ? formatCurrency(payment.amount) : "--"}
                    </td>
                    <td>
                      <span className={getStatusBadge(payment.status)}>
                        {payment.status}
                      </span>
                    </td>
                    <td>{payment.payment_method ?? "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon"><CreditCard size={48} /></div>
            <div className="fin-empty-title">No Payments Found</div>
            <div className="fin-empty-desc">
              You do not have any payment records yet. Payment history will appear here once transactions are recorded.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
