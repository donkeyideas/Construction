import { redirect } from "next/navigation";
import { Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getVendorInvoices } from "@/lib/queries/vendor-portal";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = { title: "My Invoices - ConstructionERP" };

export default async function VendorInvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect("/login/vendor"); }

  const invoices = await getVendorInvoices(supabase, user.id);

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>My Invoices</h2>
          <p className="fin-header-sub">View and track your submitted invoices.</p>
        </div>
      </div>

      {invoices.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Balance Due</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: Record<string, unknown>) => (
                  <tr key={inv.id as string}>
                    <td style={{ fontWeight: 600 }}>
                      <a
                        href={`/vendor/invoices/${inv.id}`}
                        style={{ color: "var(--color-blue)", textDecoration: "none" }}
                      >
                        {(inv.invoice_number as string) ?? "--"}
                      </a>
                    </td>
                    <td>
                      {inv.invoice_date
                        ? new Date(inv.invoice_date as string).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "--"}
                    </td>
                    <td className="amount-col">
                      {formatCurrency((inv.total_amount as number) ?? 0)}
                    </td>
                    <td>
                      <span className={`inv-status inv-status-${inv.status}`}>
                        {inv.status as string}
                      </span>
                    </td>
                    <td className="amount-col">
                      {formatCurrency((inv.balance_due as number) ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon"><Receipt size={48} /></div>
            <div className="fin-empty-title">No Invoices Found</div>
            <div className="fin-empty-desc">You have not submitted any invoices yet.</div>
          </div>
        </div>
      )}
    </div>
  );
}
