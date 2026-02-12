import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Building2,
  Calendar,
  Ruler,
  ImageIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getPropertyById,
  getPropertyFinancials,
  type LeaseRow,
  type MaintenanceRequestRow,
  type UnitRow,
} from "@/lib/queries/properties";
import { formatCurrency, formatPercent } from "@/lib/utils/format";

export const metadata = {
  title: "Property Detail - ConstructionERP",
};

/* ------------------------------------------------------------------ */
/*  Helper components                                                  */
/* ------------------------------------------------------------------ */

function PropertyTypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    residential: "Residential",
    commercial: "Commercial",
    industrial: "Industrial",
    mixed_use: "Mixed Use",
  };
  const variants: Record<string, string> = {
    residential: "badge-green",
    commercial: "badge-blue",
    industrial: "badge-amber",
    mixed_use: "badge-red",
  };
  return (
    <span className={`badge ${variants[type] ?? "badge-blue"}`}>
      {labels[type] ?? type}
    </span>
  );
}

function UnitStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    occupied: { label: "Occupied", cls: "badge-green" },
    vacant: { label: "Vacant", cls: "badge-amber" },
    maintenance: { label: "Maintenance", cls: "badge-red" },
    reserved: { label: "Reserved", cls: "badge-blue" },
  };
  const m = map[status] ?? { label: status, cls: "badge-blue" };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

function LeaseStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Active", cls: "badge-green" },
    expired: { label: "Expired", cls: "badge-red" },
    terminated: { label: "Terminated", cls: "badge-red" },
    pending: { label: "Pending", cls: "badge-amber" },
  };
  const m = map[status] ?? { label: status, cls: "badge-blue" };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    low: { label: "Low", cls: "badge-green" },
    medium: { label: "Medium", cls: "badge-blue" },
    high: { label: "High", cls: "badge-amber" },
    emergency: { label: "Emergency", cls: "badge-red" },
  };
  const m = map[priority] ?? { label: priority, cls: "badge-blue" };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "--";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isExpiringSoon(leaseEnd: string): boolean {
  const end = new Date(leaseEnd).getTime();
  const now = Date.now();
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;
  return end > now && end - now <= ninetyDays;
}

function unitTypeLabel(t: string): string {
  const map: Record<string, string> = {
    studio: "Studio",
    "1br": "1 BR",
    "2br": "2 BR",
    "3br": "3 BR",
    office: "Office",
    retail: "Retail",
    warehouse: "Warehouse",
  };
  return map[t] ?? t;
}

/* ------------------------------------------------------------------ */
/*  Tab content renderers                                              */
/* ------------------------------------------------------------------ */

function OverviewTab({
  property,
  financials,
  leaseCount,
  openMaint,
}: {
  property: NonNullable<Awaited<ReturnType<typeof getPropertyById>>>["property"];
  financials: Awaited<ReturnType<typeof getPropertyFinancials>>;
  leaseCount: number;
  openMaint: number;
}) {
  const occupancy =
    property.occupancy_rate ??
    (property.total_units > 0
      ? (property.occupied_units / property.total_units) * 100
      : 0);

  return (
    <>
      {/* KPI Row */}
      <div className="property-kpi-row">
        <div className="card property-kpi">
          <span className="property-kpi-label">Occupancy Rate</span>
          <span className={`property-kpi-value ${occupancy >= 90 ? "green" : occupancy >= 70 ? "amber" : "red"}`}>
            {formatPercent(occupancy)}
          </span>
        </div>
        <div className="card property-kpi">
          <span className="property-kpi-label">Monthly Revenue</span>
          <span className="property-kpi-value">
            {formatCurrency(financials.monthlyRevenue)}
          </span>
        </div>
        <div className="card property-kpi">
          <span className="property-kpi-label">Monthly Expenses</span>
          <span className="property-kpi-value">
            {formatCurrency(financials.monthlyExpenses)}
          </span>
        </div>
        <div className="card property-kpi">
          <span className="property-kpi-label">NOI</span>
          <span className={`property-kpi-value ${financials.noi >= 0 ? "green" : "red"}`}>
            {formatCurrency(financials.noi)}
          </span>
        </div>
        <div className="card property-kpi">
          <span className="property-kpi-label">Active Leases</span>
          <span className="property-kpi-value">{leaseCount}</span>
        </div>
        <div className="card property-kpi">
          <span className="property-kpi-label">Open Maintenance</span>
          <span className={`property-kpi-value ${openMaint > 0 ? "amber" : ""}`}>
            {openMaint}
          </span>
        </div>
      </div>

      {/* Property Info */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="card-title">Property Information</div>
        <div className="property-info-grid">
          <div className="property-info-item">
            <span className="property-info-label">Property Type</span>
            <span className="property-info-value" style={{ textTransform: "capitalize" }}>
              {property.property_type.replace("_", " ")}
            </span>
          </div>
          <div className="property-info-item">
            <span className="property-info-label">Address</span>
            <span className="property-info-value">
              {property.address_line1}, {property.city}, {property.state} {property.zip}
            </span>
          </div>
          <div className="property-info-item">
            <span className="property-info-label">Year Built</span>
            <span className="property-info-value">
              {property.year_built ?? "--"}
            </span>
          </div>
          <div className="property-info-item">
            <span className="property-info-label">Total Sq Ft</span>
            <span className="property-info-value">
              {property.total_sqft
                ? property.total_sqft.toLocaleString()
                : "--"}
            </span>
          </div>
          <div className="property-info-item">
            <span className="property-info-label">Purchase Price</span>
            <span className="property-info-value">
              {property.purchase_price
                ? formatCurrency(property.purchase_price)
                : "--"}
            </span>
          </div>
          <div className="property-info-item">
            <span className="property-info-label">Current Value</span>
            <span className="property-info-value">
              {property.current_value
                ? formatCurrency(property.current_value)
                : "--"}
            </span>
          </div>
        </div>
      </div>

      {/* Photo Gallery Placeholder */}
      <div className="card">
        <div className="card-title">
          <ImageIcon size={18} style={{ color: "var(--muted)" }} />
          Photos
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "160px",
            border: "2px dashed var(--border)",
            borderRadius: "8px",
            color: "var(--muted)",
            fontSize: "0.85rem",
          }}
        >
          No photos uploaded yet
        </div>
      </div>
    </>
  );
}

function UnitsTab({ units }: { units: UnitRow[] }) {
  if (units.length === 0) {
    return (
      <div className="properties-empty" style={{ padding: "40px 20px" }}>
        <div className="properties-empty-title">No units</div>
        <div className="properties-empty-desc">
          Add units to this property to track occupancy and leases.
        </div>
      </div>
    );
  }

  return (
    <div className="units-grid">
      {units.map((unit) => (
        <div key={unit.id} className="card unit-card">
          <span className={`unit-status-dot ${unit.status}`} />
          <div className="unit-card-info">
            <div className="unit-card-number">Unit {unit.unit_number}</div>
            <div className="unit-card-meta">
              {unitTypeLabel(unit.unit_type)}
              {unit.sqft ? ` -- ${unit.sqft.toLocaleString()} sqft` : ""}
              {unit.floor_number ? ` -- Floor ${unit.floor_number}` : ""}
            </div>
          </div>
          <div className="unit-card-right">
            <div className="unit-card-rent">
              {unit.market_rent ? formatCurrency(unit.market_rent) : "--"}
            </div>
            <UnitStatusBadge status={unit.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

function LeasesTab({ leases }: { leases: LeaseRow[] }) {
  if (leases.length === 0) {
    return (
      <div className="properties-empty" style={{ padding: "40px 20px" }}>
        <div className="properties-empty-title">No leases</div>
        <div className="properties-empty-desc">
          Active and historical leases will appear here.
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="lease-table">
        <thead>
          <tr>
            <th>Unit</th>
            <th>Tenant</th>
            <th>Monthly Rent</th>
            <th>Start</th>
            <th>End</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {leases.map((lease) => {
            const expiring = lease.status === "active" && isExpiringSoon(lease.lease_end);
            return (
              <tr key={lease.id} className={expiring ? "expiring-soon" : ""}>
                <td>{lease.units?.unit_number ?? "--"}</td>
                <td>
                  <div style={{ fontWeight: 500 }}>{lease.tenant_name}</div>
                  {lease.tenant_email && (
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      {lease.tenant_email}
                    </div>
                  )}
                </td>
                <td>{formatCurrency(lease.monthly_rent)}</td>
                <td>{formatDate(lease.lease_start)}</td>
                <td>
                  {formatDate(lease.lease_end)}
                  {expiring && (
                    <span
                      className="badge badge-amber"
                      style={{ marginLeft: "8px" }}
                    >
                      Expiring Soon
                    </span>
                  )}
                </td>
                <td>
                  <LeaseStatusBadge status={lease.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MaintenanceTab({ requests }: { requests: MaintenanceRequestRow[] }) {
  const columns: { key: string; label: string }[] = [
    { key: "submitted", label: "Submitted" },
    { key: "assigned", label: "Assigned" },
    { key: "in_progress", label: "In Progress" },
    { key: "completed", label: "Completed" },
  ];

  const grouped = new Map<string, MaintenanceRequestRow[]>();
  for (const col of columns) {
    grouped.set(col.key, []);
  }
  for (const req of requests) {
    const bucket = grouped.get(req.status);
    if (bucket) {
      bucket.push(req);
    }
  }

  return (
    <div className="maintenance-board">
      {columns.map((col) => {
        const items = grouped.get(col.key) ?? [];
        return (
          <div key={col.key} className="maintenance-column">
            <div className="maintenance-column-header">
              <span className="maintenance-column-title">{col.label}</span>
              <span className="maintenance-column-count">{items.length}</span>
            </div>
            {items.map((req) => (
              <div key={req.id} className="maintenance-card">
                <div className={`maintenance-card-stripe ${req.priority}`} />
                <div className="maintenance-card-title">{req.title}</div>
                <div className="maintenance-card-meta">
                  {req.units?.unit_number && (
                    <span>Unit {req.units.unit_number}</span>
                  )}
                  <span style={{ textTransform: "capitalize" }}>{req.category}</span>
                  <span>{formatDate(req.created_at)}</span>
                </div>
                <div className="maintenance-card-footer">
                  <PriorityBadge priority={req.priority} />
                  {req.estimated_cost != null && (
                    <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      Est. {formatCurrency(req.estimated_cost)}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--muted)",
                  textAlign: "center",
                  padding: "20px 0",
                }}
              >
                No requests
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FinancialsTab({
  financials,
}: {
  financials: Awaited<ReturnType<typeof getPropertyFinancials>>;
}) {
  const maxVal = Math.max(financials.monthlyRevenue, financials.monthlyExpenses, 1);

  return (
    <div className="financials-grid">
      {/* Revenue vs Expenses */}
      <div className="card">
        <div className="card-title">Revenue vs Expenses</div>
        <div className="financials-bar-row">
          <span className="financials-bar-label">Revenue</span>
          <div className="financials-bar-track">
            <div
              className="financials-bar-fill"
              style={{
                width: `${(financials.monthlyRevenue / maxVal) * 100}%`,
                background: "var(--color-green)",
              }}
            />
          </div>
          <span className="financials-bar-value">
            {formatCurrency(financials.monthlyRevenue)}
          </span>
        </div>
        <div className="financials-bar-row">
          <span className="financials-bar-label">Expenses</span>
          <div className="financials-bar-track">
            <div
              className="financials-bar-fill"
              style={{
                width: `${(financials.monthlyExpenses / maxVal) * 100}%`,
                background: "var(--color-red)",
              }}
            />
          </div>
          <span className="financials-bar-value">
            {formatCurrency(financials.monthlyExpenses)}
          </span>
        </div>
        <div className="financials-bar-row">
          <span className="financials-bar-label" style={{ fontWeight: 600 }}>NOI</span>
          <div className="financials-bar-track">
            <div
              className="financials-bar-fill"
              style={{
                width: `${(Math.abs(financials.noi) / maxVal) * 100}%`,
                background: financials.noi >= 0 ? "var(--color-blue)" : "var(--color-red)",
              }}
            />
          </div>
          <span className="financials-bar-value" style={{ fontWeight: 700 }}>
            {formatCurrency(financials.noi)}
          </span>
        </div>
      </div>

      {/* Rent Collection */}
      <div className="card">
        <div className="card-title">Rent Collection (Current Month)</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="property-info-item">
            <span className="property-info-label">Collection Rate</span>
            <span
              className="property-info-value"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "1.5rem",
                fontWeight: 700,
                color:
                  financials.rentCollectionRate >= 95
                    ? "var(--color-green)"
                    : financials.rentCollectionRate >= 80
                      ? "var(--color-amber)"
                      : "var(--color-red)",
              }}
            >
              {formatPercent(financials.rentCollectionRate)}
            </span>
          </div>
          <div className="financials-bar-track" style={{ height: "12px" }}>
            <div
              className="financials-bar-fill"
              style={{
                width: `${Math.min(financials.rentCollectionRate, 100)}%`,
                background:
                  financials.rentCollectionRate >= 95
                    ? "var(--color-green)"
                    : financials.rentCollectionRate >= 80
                      ? "var(--color-amber)"
                      : "var(--color-red)",
                height: "12px",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div className="property-info-item">
              <span className="property-info-label">Collected</span>
              <span className="property-info-value" style={{ color: "var(--color-green)" }}>
                {formatCurrency(financials.totalPaid)}
              </span>
            </div>
            <div className="property-info-item" style={{ textAlign: "right" }}>
              <span className="property-info-label">Total Due</span>
              <span className="property-info-value">
                {formatCurrency(financials.totalDue)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function PropertyDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { tab } = await searchParams;

  const supabase = await createClient();
  const ctx = await getCurrentUserCompany(supabase);

  if (!ctx) {
    return (
      <div className="properties-empty">
        <div className="properties-empty-title">Not Authorized</div>
        <div className="properties-empty-desc">
          Please log in and join a company to view property details.
        </div>
      </div>
    );
  }

  const result = await getPropertyById(supabase, id);
  if (!result) {
    notFound();
  }

  const { property, units, leases, maintenanceRequests } = result;

  // Only allow access to properties in the user's company
  if (property.company_id !== ctx.companyId) {
    notFound();
  }

  const financials = await getPropertyFinancials(supabase, id);

  const activeLeases = leases.filter((l) => l.status === "active");
  const openMaint = maintenanceRequests.filter(
    (m) => m.status !== "completed" && m.status !== "closed"
  );

  const activeTab = tab ?? "overview";
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "units", label: `Units (${units.length})` },
    { key: "leases", label: `Leases (${leases.length})` },
    { key: "maintenance", label: `Maintenance (${maintenanceRequests.length})` },
    { key: "financials", label: "Financials" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="property-detail-header">
        <div className="property-detail-title">
          <div style={{ marginBottom: "8px" }}>
            <Link
              href="/properties"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.82rem",
                color: "var(--muted)",
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={14} />
              Back to Properties
            </Link>
          </div>
          <h2>
            {property.name}
            <PropertyTypeBadge type={property.property_type} />
          </h2>
          <div className="property-detail-address">
            {property.address_line1}, {property.city}, {property.state} {property.zip}
          </div>
        </div>
        <div className="property-detail-actions">
          <Link
            href={`/properties/${property.id}?tab=${activeTab}`}
            className="ui-btn ui-btn-md ui-btn-outline"
          >
            <Pencil size={14} />
            Edit Property
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="property-tabs">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/properties/${property.id}?tab=${t.key}`}
            className={`property-tab ${activeTab === t.key ? "active" : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <OverviewTab
          property={property}
          financials={financials}
          leaseCount={activeLeases.length}
          openMaint={openMaint.length}
        />
      )}
      {activeTab === "units" && <UnitsTab units={units} />}
      {activeTab === "leases" && <LeasesTab leases={leases} />}
      {activeTab === "maintenance" && <MaintenanceTab requests={maintenanceRequests} />}
      {activeTab === "financials" && <FinancialsTab financials={financials} />}
    </div>
  );
}
