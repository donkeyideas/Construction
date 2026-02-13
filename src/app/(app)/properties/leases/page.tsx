import Link from "next/link";
import {
  FileSignature,
  Home,
  DollarSign,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { formatCurrency } from "@/lib/utils/format";
import LeasesClient from "./LeasesClient";

export const metadata = {
  title: "Leases - ConstructionERP",
};

interface PageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function LeasesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-icon"><FileSignature size={48} /></div>
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">Please complete registration to access leases.</div>
      </div>
    );
  }

  const { companyId } = userCompany;
  const activeStatus = params.status || "all";

  // Fetch leases with joined property and unit info
  let query = supabase
    .from("leases")
    .select("*, properties(name), units(unit_number)")
    .eq("company_id", companyId)
    .order("lease_end", { ascending: true });

  if (activeStatus !== "all") {
    query = query.eq("status", activeStatus);
  }

  const { data: leases } = await query;
  const allLeases = leases ?? [];

  // Fetch all leases (unfiltered) for KPI computation, and company property IDs for vacancy calc
  const [{ data: allLeasesRaw }, { data: companyProperties }] = await Promise.all([
    supabase
      .from("leases")
      .select("id, status, monthly_rent, lease_end, unit_id")
      .eq("company_id", companyId),
    supabase
      .from("properties")
      .select("id")
      .eq("company_id", companyId),
  ]);
  const allForKpis = allLeasesRaw ?? [];
  const propertyIds = (companyProperties ?? []).map((p) => p.id);

  // Count total units across all company properties
  let totalUnitCount = 0;
  if (propertyIds.length > 0) {
    const { count } = await supabase
      .from("units")
      .select("id", { count: "exact", head: true })
      .in("property_id", propertyIds);
    totalUnitCount = count ?? 0;
  }

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  // KPIs
  const activeLeases = allForKpis.filter((l) => l.status === "active");
  const totalActive = activeLeases.length;
  const monthlyRentRoll = activeLeases.reduce(
    (sum, l) => sum + (l.monthly_rent ?? 0),
    0
  );
  const expiringSoon = activeLeases.filter((l) => {
    if (!l.lease_end) return false;
    const end = new Date(l.lease_end);
    return end >= now && end <= in60Days;
  }).length;

  // Vacant units: total units in company properties minus units with active leases
  const activeUnitIds = new Set(
    activeLeases.map((l) => l.unit_id).filter(Boolean)
  );
  const vacantUnits = Math.max((totalUnitCount ?? 0) - activeUnitIds.size, 0);

  // Status filter options
  const statuses = [
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Expired", value: "expired" },
    { label: "Pending", value: "pending" },
    { label: "Terminated", value: "terminated" },
  ];

  function buildUrl(status: string): string {
    if (status === "all") return "/properties/leases";
    return `/properties/leases?status=${status}`;
  }

  function getExpiryHighlight(leaseEnd: string | null): string {
    if (!leaseEnd) return "";
    const end = new Date(leaseEnd);
    if (end < now) return "";
    if (end <= in30Days) return "invoice-row-overdue";
    if (end <= in60Days) return "invoice-row-warning";
    return "";
  }

  function getStatusBadge(status: string): string {
    switch (status) {
      case "active":
        return "inv-status inv-status-approved";
      case "expired":
        return "inv-status inv-status-voided";
      case "terminated":
        return "inv-status inv-status-voided";
      case "pending":
        return "inv-status inv-status-pending";
      default:
        return "inv-status inv-status-draft";
    }
  }

  return (
    <div>
      <LeasesClient>
      {/* KPI Row */}
      <div className="financial-kpi-row">
        <div className="fin-kpi">
          <div className="fin-kpi-icon green">
            <FileSignature size={18} />
          </div>
          <span className="fin-kpi-label">Active Leases</span>
          <span className="fin-kpi-value">{totalActive}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <DollarSign size={18} />
          </div>
          <span className="fin-kpi-label">Monthly Rent Roll</span>
          <span className="fin-kpi-value">{formatCurrency(monthlyRentRoll)}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <Clock size={18} />
          </div>
          <span className="fin-kpi-label">Expiring Soon (60d)</span>
          <span className="fin-kpi-value">{expiringSoon}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon red">
            <Home size={18} />
          </div>
          <span className="fin-kpi-label">Vacant Units</span>
          <span className="fin-kpi-value">{vacantUnits}</span>
        </div>
      </div>

      {/* Status Filters */}
      <div className="fin-filters">
        <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500 }}>
          Status:
        </label>
        {statuses.map((s) => (
          <Link
            key={s.value}
            href={buildUrl(s.value)}
            className={`ui-btn ui-btn-sm ${
              activeStatus === s.value ? "ui-btn-primary" : "ui-btn-outline"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Lease Table */}
      {allLeases.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Tenant Name</th>
                  <th>Property</th>
                  <th>Unit #</th>
                  <th>Lease Start</th>
                  <th>Lease End</th>
                  <th style={{ textAlign: "right" }}>Monthly Rent</th>
                  <th style={{ textAlign: "right" }}>Security Deposit</th>
                  <th>Auto-Renew</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {allLeases.map((lease) => {
                  const property = lease.properties as { name: string } | null;
                  const unit = lease.units as { unit_number: string } | null;
                  const rowClass = getExpiryHighlight(lease.lease_end);
                  const isExpiringSoon =
                    lease.lease_end &&
                    new Date(lease.lease_end) >= now &&
                    new Date(lease.lease_end) <= in60Days;

                  return (
                    <tr key={lease.id} className={rowClass}>
                      <td style={{ fontWeight: 600 }}>
                        {lease.tenant_name ?? "--"}
                        {lease.tenant_email && (
                          <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 400 }}>
                            {lease.tenant_email}
                          </div>
                        )}
                      </td>
                      <td>{property?.name ?? "--"}</td>
                      <td>{unit?.unit_number ?? "--"}</td>
                      <td>
                        {lease.lease_start
                          ? new Date(lease.lease_start).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "--"}
                      </td>
                      <td>
                        <span
                          style={{
                            color: isExpiringSoon ? "var(--color-red)" : "var(--text)",
                            fontWeight: isExpiringSoon ? 600 : 400,
                          }}
                        >
                          {lease.lease_end
                            ? new Date(lease.lease_end).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "--"}
                          {isExpiringSoon && (
                            <AlertTriangle
                              size={12}
                              style={{ marginLeft: "4px", verticalAlign: "middle" }}
                            />
                          )}
                        </span>
                      </td>
                      <td className="amount-col">
                        {lease.monthly_rent != null
                          ? formatCurrency(lease.monthly_rent)
                          : "--"}
                      </td>
                      <td className="amount-col">
                        {lease.security_deposit != null
                          ? formatCurrency(lease.security_deposit)
                          : "--"}
                      </td>
                      <td>
                        <span
                          className={
                            lease.auto_renew
                              ? "badge badge-green"
                              : "badge badge-amber"
                          }
                        >
                          {lease.auto_renew ? "Yes" : "No"}
                        </span>
                      </td>
                      <td>
                        <span className={getStatusBadge(lease.status)}>
                          {lease.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <FileSignature size={48} />
            </div>
            <div className="fin-empty-title">No Leases Found</div>
            <div className="fin-empty-desc">
              {activeStatus !== "all"
                ? "No leases match the current filter. Try adjusting your status filter."
                : "No leases have been created yet. Add your first lease to start tracking tenants and rent schedules."}
            </div>
          </div>
        </div>
      )}
      </LeasesClient>
    </div>
  );
}
