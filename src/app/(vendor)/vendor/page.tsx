import { redirect } from "next/navigation";
import { LayoutDashboard, FileText, Receipt, DollarSign, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getVendorDashboard } from "@/lib/queries/vendor-portal";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = { title: "Vendor Dashboard - ConstructionERP" };

export default async function VendorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect("/login/vendor"); }

  const dashboard = await getVendorDashboard(supabase, user.id);

  if (!dashboard.contactId) {
    return (
      <div>
        <div className="fin-header">
          <div>
            <h2>Vendor Dashboard</h2>
            <p className="fin-header-sub">Welcome to the Vendor Portal.</p>
          </div>
        </div>
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon"><LayoutDashboard size={48} /></div>
            <div className="fin-empty-title">No Vendor Profile Found</div>
            <div className="fin-empty-desc">
              Your account is not linked to a vendor or subcontractor contact.
              Please contact the company administrator to set up your vendor profile.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Vendor Dashboard</h2>
          <p className="fin-header-sub">Overview of your contracts, invoices, and compliance status.</p>
        </div>
      </div>

      <div className="vendor-kpi-grid">
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <FileText size={18} />
          </div>
          <span className="fin-kpi-label">Total Contract Value</span>
          <span className="fin-kpi-value">{formatCurrency(dashboard.totalContractValue)}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <Receipt size={18} />
          </div>
          <span className="fin-kpi-label">Outstanding Invoices</span>
          <span className="fin-kpi-value">{dashboard.outstandingInvoices}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon red">
            <DollarSign size={18} />
          </div>
          <span className="fin-kpi-label">Outstanding Amount</span>
          <span className={`fin-kpi-value ${dashboard.outstandingAmount > 0 ? "negative" : ""}`}>
            {formatCurrency(dashboard.outstandingAmount)}
          </span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon green">
            <ShieldCheck size={18} />
          </div>
          <span className="fin-kpi-label">Expiring Certifications</span>
          <span className={`fin-kpi-value ${dashboard.expiringCertifications > 0 ? "negative" : ""}`}>
            {dashboard.expiringCertifications}
          </span>
        </div>
      </div>
    </div>
  );
}
