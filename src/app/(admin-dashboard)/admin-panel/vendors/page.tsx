import { Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getAllVendors } from "@/lib/queries/admin-dashboard";

export const metadata = { title: "All Vendors - Buildwrk" };

export default async function AllVendorsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><Truck size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Complete your company registration first.</div>
      </div>
    );
  }

  const vendors = await getAllVendors(supabase, userCompany.companyId);

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>All Vendors</h2>
          <p className="fin-header-sub">Manage vendors and subcontractors with portal access.</p>
        </div>
      </div>

      {vendors.length > 0 ? (
        <div className="members-table-wrap">
          <table className="members-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Type</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Portal Access</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor: Record<string, unknown>) => (
                <tr key={vendor.id as string}>
                  <td style={{ fontWeight: 500 }}>{(vendor.name as string) ?? "--"}</td>
                  <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                    {(vendor.company_name as string) ?? "--"}
                  </td>
                  <td>
                    <span className={`role-badge role-badge-${vendor.contact_type === "vendor" ? "accountant" : "project_manager"}`}>
                      {(vendor.contact_type as string).replace(/_/g, " ")}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.82rem" }}>{(vendor.email as string) ?? "--"}</td>
                  <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                    {(vendor.phone as string) ?? "--"}
                  </td>
                  <td>
                    <span className="member-status">
                      <span className={`member-status-dot ${vendor.user_id ? "active" : "inactive"}`} />
                      {vendor.user_id ? "Enabled" : "No Access"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon"><Truck size={48} /></div>
            <div className="fin-empty-title">No Vendors Found</div>
            <div className="fin-empty-desc">Add vendors or subcontractors to your directory to manage them here.</div>
          </div>
        </div>
      )}
    </div>
  );
}
