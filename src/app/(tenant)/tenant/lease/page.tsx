import { redirect } from "next/navigation";
import { FileText, Building2, CalendarDays, DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTenantLease } from "@/lib/queries/tenant-portal";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = {
  title: "My Lease - ConstructionERP",
};

export default async function TenantLeasePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login/tenant");
  }

  const leases = await getTenantLease(supabase, user.id);

  function getStatusBadge(status: string): string {
    switch (status) {
      case "active":
        return "badge badge-green";
      case "expired":
        return "badge badge-red";
      case "pending":
        return "badge badge-amber";
      default:
        return "badge badge-blue";
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>My Lease</h2>
          <p className="fin-header-sub">
            View your lease details, property information, and terms.
          </p>
        </div>
      </div>

      {leases.length > 0 ? (
        leases.map((lease) => {
          const unit = lease.units as {
            unit_number: string;
            properties: {
              name: string;
              address_line1?: string;
              city?: string;
              state?: string;
              zip?: string;
            };
          } | null;
          const property = unit?.properties;
          const address = property
            ? [property.address_line1, property.city, property.state, property.zip]
                .filter(Boolean)
                .join(", ")
            : null;

          return (
            <div key={lease.id} className="card" style={{ marginBottom: 20 }}>
              <div className="card-title">
                <FileText size={18} />
                Lease Agreement
                <span className={getStatusBadge(lease.status)}>{lease.status}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
                {/* Property Info */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Building2 size={16} style={{ color: "var(--color-blue)" }} />
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>
                      Property
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {property?.name ?? "Unknown Property"}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                    Unit: {unit?.unit_number ?? "Unknown Unit"}
                  </div>
                  {address && (
                    <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 4 }}>
                      {address}
                    </div>
                  )}
                </div>

                {/* Lease Dates */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <CalendarDays size={16} style={{ color: "var(--color-amber)" }} />
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>
                      Lease Period
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85rem", marginBottom: 4 }}>
                    <span style={{ color: "var(--muted)" }}>Start: </span>
                    <span style={{ fontWeight: 600 }}>
                      {lease.lease_start
                        ? new Date(lease.lease_start).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                        : "--"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85rem" }}>
                    <span style={{ color: "var(--muted)" }}>End: </span>
                    <span style={{ fontWeight: 600 }}>
                      {lease.lease_end
                        ? new Date(lease.lease_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                        : "--"}
                    </span>
                  </div>
                </div>

                {/* Financials */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <DollarSign size={16} style={{ color: "var(--color-green)" }} />
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>
                      Financials
                    </span>
                  </div>
                  <div style={{ fontSize: "0.85rem", marginBottom: 4 }}>
                    <span style={{ color: "var(--muted)" }}>Monthly Rent: </span>
                    <span style={{ fontWeight: 600 }}>
                      {lease.monthly_rent != null ? formatCurrency(lease.monthly_rent) : "--"}
                    </span>
                  </div>
                  {lease.security_deposit != null && (
                    <div style={{ fontSize: "0.85rem" }}>
                      <span style={{ color: "var(--muted)" }}>Security Deposit: </span>
                      <span style={{ fontWeight: 600 }}>
                        {formatCurrency(lease.security_deposit)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon"><FileText size={48} /></div>
            <div className="fin-empty-title">No Leases Found</div>
            <div className="fin-empty-desc">
              You do not have any leases on file. Please contact your property manager if you believe this is an error.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
