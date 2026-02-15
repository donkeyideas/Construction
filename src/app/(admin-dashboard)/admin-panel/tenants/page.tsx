import { Key } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getAllTenants } from "@/lib/queries/admin-dashboard";

export const metadata = { title: "All Tenants - Buildwrk" };

export default async function AllTenantsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><Key size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Complete your company registration first.</div>
      </div>
    );
  }

  const tenants = await getAllTenants(supabase, userCompany.companyId);

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>All Tenants</h2>
          <p className="fin-header-sub">View and manage all tenants across your properties.</p>
        </div>
      </div>

      {tenants.length > 0 ? (
        <div className="members-table-wrap">
          <table className="members-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Unit</th>
                <th>Status</th>
                <th>Monthly Rent</th>
                <th>Lease Period</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((lease: Record<string, unknown>) => {
                const unit = lease.units as { name: string; properties: { name: string } | null } | null;
                return (
                  <tr key={lease.id as string}>
                    <td style={{ fontWeight: 500 }}>{unit?.properties?.name ?? "--"}</td>
                    <td>{unit?.name ?? "--"}</td>
                    <td>
                      <span className={`inv-status inv-status-${lease.status}`}>
                        {lease.status as string}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {lease.monthly_rent
                        ? `$${Number(lease.monthly_rent).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                        : "--"}
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                      {lease.start_date
                        ? new Date(lease.start_date as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "--"}
                      {" - "}
                      {lease.end_date
                        ? new Date(lease.end_date as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "Ongoing"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon"><Key size={48} /></div>
            <div className="fin-empty-title">No Tenants Found</div>
            <div className="fin-empty-desc">No tenants are currently assigned to your properties.</div>
          </div>
        </div>
      )}
    </div>
  );
}
