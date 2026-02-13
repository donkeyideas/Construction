import { Users, Key, Truck, Mail, Building2, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getAdminOverview } from "@/lib/queries/admin-dashboard";

export const metadata = { title: "Admin Panel - ConstructionERP" };

export default async function AdminPanelOverviewPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><Building2 size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Complete your company registration first.</div>
      </div>
    );
  }

  const overview = await getAdminOverview(supabase, userCompany.companyId);

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Admin Panel</h2>
          <p className="fin-header-sub">
            {overview.companyName} &mdash; {overview.subscriptionPlan.charAt(0).toUpperCase() + overview.subscriptionPlan.slice(1)} Plan
          </p>
        </div>
      </div>

      <div className="financial-kpi-row" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <Users size={18} />
          </div>
          <span className="fin-kpi-label">Total Members</span>
          <span className="fin-kpi-value">{overview.totalMembers}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon green">
            <Key size={18} />
          </div>
          <span className="fin-kpi-label">Active Tenants</span>
          <span className="fin-kpi-value">{overview.totalTenants}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <Truck size={18} />
          </div>
          <span className="fin-kpi-label">Active Vendors</span>
          <span className="fin-kpi-value">{overview.totalVendors}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon red">
            <Mail size={18} />
          </div>
          <span className="fin-kpi-label">Pending Invitations</span>
          <span className="fin-kpi-value">{overview.pendingInvitations}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div className="fin-chart-card">
          <div className="fin-chart-title">
            <Building2 size={18} />
            Company Info
          </div>
          <div style={{ fontSize: "0.88rem", lineHeight: 1.8 }}>
            <div><strong>Company:</strong> {overview.companyName}</div>
            <div><strong>Active Members:</strong> {overview.activeMembers} of {overview.totalMembers}</div>
          </div>
        </div>

        <div className="fin-chart-card">
          <div className="fin-chart-title">
            <CreditCard size={18} />
            Subscription
          </div>
          <div style={{ fontSize: "0.88rem", lineHeight: 1.8 }}>
            <div>
              <strong>Plan:</strong>{" "}
              <span style={{ textTransform: "capitalize" }}>{overview.subscriptionPlan}</span>
            </div>
            <div><strong>Status:</strong> Active</div>
          </div>
        </div>
      </div>
    </div>
  );
}
