"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  X,
  Trash2,
  Grid3x3,
  Building2,
  ImageIcon,
} from "lucide-react";
import type {
  PropertyRow,
  UnitRow,
  LeaseRow,
  MaintenanceRequestRow,
  PropertyFinancials,
} from "@/lib/queries/properties";
import { formatCurrency, formatPercent } from "@/lib/utils/format";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PropertyDetailClientProps {
  property: PropertyRow;
  units: UnitRow[];
  leases: LeaseRow[];
  maintenanceRequests: MaintenanceRequestRow[];
  financials: PropertyFinancials;
}

/* ------------------------------------------------------------------ */
/*  Helper Functions                                                    */
/* ------------------------------------------------------------------ */

function formatDate(d: string | null | undefined): string {
  if (!d) return "--";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toInputDate(d: string | null | undefined): string {
  if (!d) return "";
  return d.slice(0, 10);
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
/*  Badge Components                                                    */
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

function MaintenanceStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    submitted: { label: "Submitted", cls: "badge-amber" },
    assigned: { label: "Assigned", cls: "badge-blue" },
    in_progress: { label: "In Progress", cls: "badge-blue" },
    completed: { label: "Completed", cls: "badge-green" },
    closed: { label: "Closed", cls: "badge-green" },
  };
  const m = map[status] ?? { label: status, cls: "badge-blue" };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

/* ------------------------------------------------------------------ */
/*  Tab Definitions                                                     */
/* ------------------------------------------------------------------ */

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "units", label: "Units" },
  { key: "leases", label: "Leases" },
  { key: "maintenance", label: "Maintenance" },
  { key: "financials", label: "Financials" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */

export default function PropertyDetailClient({
  property,
  units,
  leases,
  maintenanceRequests,
  financials,
}: PropertyDetailClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [saving, setSaving] = useState(false);

  // Edit property modal
  const [editPropertyOpen, setEditPropertyOpen] = useState(false);

  // Unit modal
  const [selectedUnit, setSelectedUnit] = useState<UnitRow | null>(null);
  const [unitEditMode, setUnitEditMode] = useState(false);

  // Lease modal
  const [selectedLease, setSelectedLease] = useState<LeaseRow | null>(null);
  const [leaseEditMode, setLeaseEditMode] = useState(false);

  // Maintenance modal
  const [selectedMaint, setSelectedMaint] = useState<MaintenanceRequestRow | null>(null);
  const [maintEditMode, setMaintEditMode] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{
    type: string;
    id: string;
    name: string;
  } | null>(null);

  // Derived data
  const activeLeases = leases.filter((l) => l.status === "active");
  const openMaint = maintenanceRequests.filter(
    (m) => m.status !== "completed" && m.status !== "closed"
  );

  const occupancy =
    property.occupancy_rate ??
    (property.total_units > 0
      ? (property.occupied_units / property.total_units) * 100
      : 0);

  // Tab labels with counts
  const tabLabels: Record<string, string> = {
    overview: "Overview",
    units: `Units (${units.length})`,
    leases: `Leases (${leases.length})`,
    maintenance: `Maintenance (${maintenanceRequests.length})`,
    financials: "Financials",
  };

  return (
    <div>
      {/* ===== Header ===== */}
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
            {property.address_line1}, {property.city}, {property.state}{" "}
            {property.zip}
          </div>
        </div>
        <div className="property-detail-actions">
          <button
            className="ui-btn ui-btn-md ui-btn-outline"
            onClick={() => setEditPropertyOpen(true)}
          >
            <Pencil size={14} />
            Edit Property
          </button>
        </div>
      </div>

      {/* ===== Tabs ===== */}
      <div className="property-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`property-tab ${activeTab === t.key ? "active" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            {tabLabels[t.key]}
          </button>
        ))}
      </div>

      {/* ===== Tab Content ===== */}
      {activeTab === "overview" && (
        <OverviewTabContent
          property={property}
          units={units}
          leases={leases}
          financials={financials}
          occupancy={occupancy}
          activeLeaseCount={activeLeases.length}
          openMaintCount={openMaint.length}
          onTabSwitch={setActiveTab}
          onSelectUnit={(u) => {
            setSelectedUnit(u);
            setUnitEditMode(false);
          }}
          onSelectLease={(l) => {
            setSelectedLease(l);
            setLeaseEditMode(false);
          }}
        />
      )}

      {activeTab === "units" && (
        <UnitsTabContent
          units={units}
          onSelectUnit={(u) => {
            setSelectedUnit(u);
            setUnitEditMode(false);
          }}
          onEditUnit={(u) => {
            setSelectedUnit(u);
            setUnitEditMode(true);
          }}
        />
      )}

      {activeTab === "leases" && (
        <LeasesTabContent
          leases={leases}
          onSelectLease={(l) => {
            setSelectedLease(l);
            setLeaseEditMode(false);
          }}
        />
      )}

      {activeTab === "maintenance" && (
        <MaintenanceTabContent
          requests={maintenanceRequests}
          onSelectMaint={(m) => {
            setSelectedMaint(m);
            setMaintEditMode(false);
          }}
        />
      )}

      {activeTab === "financials" && (
        <FinancialsTabContent financials={financials} />
      )}

      {/* ===== MODALS ===== */}

      {/* Edit Property Modal */}
      {editPropertyOpen && (
        <EditPropertyModal
          property={property}
          saving={saving}
          setSaving={setSaving}
          onClose={() => setEditPropertyOpen(false)}
        />
      )}

      {/* Unit Detail/Edit Modal */}
      {selectedUnit && (
        <UnitModal
          unit={selectedUnit}
          propertyId={property.id}
          editMode={unitEditMode}
          saving={saving}
          setSaving={setSaving}
          onClose={() => {
            setSelectedUnit(null);
            setUnitEditMode(false);
          }}
          onToggleEdit={() => setUnitEditMode(!unitEditMode)}
          onDelete={(id, name) =>
            setDeleteTarget({ type: "unit", id, name })
          }
        />
      )}

      {/* Lease Detail/Edit Modal */}
      {selectedLease && (
        <LeaseModal
          lease={selectedLease}
          propertyId={property.id}
          editMode={leaseEditMode}
          saving={saving}
          setSaving={setSaving}
          onClose={() => {
            setSelectedLease(null);
            setLeaseEditMode(false);
          }}
          onToggleEdit={() => setLeaseEditMode(!leaseEditMode)}
          onDelete={(id, name) =>
            setDeleteTarget({ type: "lease", id, name })
          }
        />
      )}

      {/* Maintenance Detail/Edit Modal */}
      {selectedMaint && (
        <MaintenanceModal
          maint={selectedMaint}
          propertyId={property.id}
          editMode={maintEditMode}
          saving={saving}
          setSaving={setSaving}
          onClose={() => {
            setSelectedMaint(null);
            setMaintEditMode(false);
          }}
          onToggleEdit={() => setMaintEditMode(!maintEditMode)}
          onDelete={(id, name) =>
            setDeleteTarget({ type: "maintenance", id, name })
          }
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          target={deleteTarget}
          propertyId={property.id}
          saving={saving}
          setSaving={setSaving}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

/* ==================================================================== */
/*  Overview Tab                                                         */
/* ==================================================================== */

function OverviewTabContent({
  property,
  units,
  leases,
  financials,
  occupancy,
  activeLeaseCount,
  openMaintCount,
  onTabSwitch,
  onSelectUnit,
  onSelectLease,
}: {
  property: PropertyRow;
  units: UnitRow[];
  leases: LeaseRow[];
  financials: PropertyFinancials;
  occupancy: number;
  activeLeaseCount: number;
  openMaintCount: number;
  onTabSwitch: (tab: TabKey) => void;
  onSelectUnit: (u: UnitRow) => void;
  onSelectLease: (l: LeaseRow) => void;
}) {
  // Upcoming lease expirations within 120 days
  const upcomingExpirations = leases
    .filter((l) => l.status === "active" && l.lease_end)
    .filter((l) => {
      const days = Math.ceil(
        (new Date(l.lease_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return days > 0 && days <= 120;
    })
    .sort(
      (a, b) =>
        new Date(a.lease_end).getTime() - new Date(b.lease_end).getTime()
    );

  return (
    <>
      {/* KPI Row */}
      <div className="property-kpi-row">
        <div className="card property-kpi">
          <span className="property-kpi-label">Occupancy Rate</span>
          <span
            className={`property-kpi-value ${
              occupancy >= 90 ? "green" : occupancy >= 70 ? "amber" : "red"
            }`}
          >
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
          <span
            className={`property-kpi-value ${
              financials.noi >= 0 ? "green" : "red"
            }`}
          >
            {formatCurrency(financials.noi)}
          </span>
        </div>
        <div className="card property-kpi">
          <span className="property-kpi-label">Active Leases</span>
          <span className="property-kpi-value">{activeLeaseCount}</span>
        </div>
        <div className="card property-kpi">
          <span className="property-kpi-label">Open Maintenance</span>
          <span
            className={`property-kpi-value ${openMaintCount > 0 ? "amber" : ""}`}
          >
            {openMaintCount}
          </span>
        </div>
      </div>

      {/* Unit Status Grid + Lease Expirations */}
      <div className="overview-grid-row">
        <div className="card unit-status-grid-section">
          <div className="card-title-row">
            <span className="card-title">Unit Status Grid</span>
            <button
              className="link-btn"
              onClick={() => onTabSwitch("units")}
            >
              View All Units &rarr;
            </button>
          </div>
          {units.length > 0 ? (
            <>
              <div className="unit-grid">
                {units.map((unit) => (
                  <div
                    key={unit.id}
                    className={`unit-grid-cell ${unit.status}`}
                    title={`Unit ${unit.unit_number} - ${unit.status}`}
                    onClick={() => onSelectUnit(unit)}
                  >
                    {unit.unit_number}
                  </div>
                ))}
              </div>
              <div className="unit-grid-legend">
                <span className="legend-item">
                  <span className="legend-dot occupied" />
                  Occupied (
                  {units.filter((u) => u.status === "occupied").length})
                </span>
                <span className="legend-item">
                  <span className="legend-dot vacant" />
                  Vacant ({units.filter((u) => u.status === "vacant").length})
                </span>
                <span className="legend-item">
                  <span className="legend-dot maintenance" />
                  Maintenance (
                  {units.filter((u) => u.status === "maintenance").length})
                </span>
                <span className="legend-item">
                  <span className="legend-dot reserved" />
                  Reserved (
                  {units.filter((u) => u.status === "reserved").length})
                </span>
              </div>
            </>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--muted)",
                fontSize: "0.85rem",
              }}
            >
              No units added yet
            </div>
          )}
        </div>

        <div className="card lease-expirations-section">
          <div className="card-title-row">
            <span className="card-title">Upcoming Lease Expirations</span>
            <button
              className="link-btn"
              onClick={() => onTabSwitch("leases")}
            >
              View All Leases &rarr;
            </button>
          </div>
          {upcomingExpirations.length > 0 ? (
            <div className="lease-expiry-list">
              {upcomingExpirations.map((l) => {
                const daysLeft = Math.ceil(
                  (new Date(l.lease_end).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                );
                return (
                  <div
                    key={l.id}
                    className="lease-expiry-item"
                    onClick={() => onSelectLease(l)}
                  >
                    <div className="lease-expiry-header">
                      <span className="lease-expiry-unit">
                        Unit {l.units?.unit_number ?? "--"}
                      </span>
                      {daysLeft < 30 && (
                        <span className="badge badge-red">Urgent</span>
                      )}
                    </div>
                    <div className="lease-expiry-tenant">{l.tenant_name}</div>
                    <div className="lease-expiry-footer">
                      <span className="lease-expiry-date">
                        {formatDate(l.lease_end)}
                      </span>
                      <span
                        className={`lease-expiry-days ${
                          daysLeft < 30
                            ? "urgent"
                            : daysLeft < 60
                              ? "warning"
                              : ""
                        }`}
                      >
                        {daysLeft} days
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="lease-expiry-empty">
              No leases expiring within the next 120 days
            </div>
          )}
        </div>
      </div>

      {/* Property Info */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="card-title">Property Information</div>
        <div className="property-info-grid">
          <div className="property-info-item">
            <span className="property-info-label">Property Type</span>
            <span
              className="property-info-value"
              style={{ textTransform: "capitalize" }}
            >
              {property.property_type.replace("_", " ")}
            </span>
          </div>
          <div className="property-info-item">
            <span className="property-info-label">Address</span>
            <span className="property-info-value">
              {property.address_line1}, {property.city}, {property.state}{" "}
              {property.zip}
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

/* ==================================================================== */
/*  Units Tab                                                            */
/* ==================================================================== */

function UnitsTabContent({
  units,
  onSelectUnit,
  onEditUnit,
}: {
  units: UnitRow[];
  onSelectUnit: (u: UnitRow) => void;
  onEditUnit: (u: UnitRow) => void;
}) {
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
        <div
          key={unit.id}
          className="card unit-card clickable"
          onClick={() => onSelectUnit(unit)}
        >
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
              <UnitStatusBadge status={unit.status} />
              <button
                className="ui-btn ui-btn-sm ui-btn-ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditUnit(unit);
                }}
                title="Edit unit"
              >
                <Pencil size={13} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ==================================================================== */
/*  Leases Tab                                                           */
/* ==================================================================== */

function LeasesTabContent({
  leases,
  onSelectLease,
}: {
  leases: LeaseRow[];
  onSelectLease: (l: LeaseRow) => void;
}) {
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
            const expiring =
              lease.status === "active" &&
              lease.lease_end &&
              (() => {
                const end = new Date(lease.lease_end).getTime();
                const now = Date.now();
                const ninetyDays = 90 * 24 * 60 * 60 * 1000;
                return end > now && end - now <= ninetyDays;
              })();

            return (
              <tr
                key={lease.id}
                className={`clickable-row ${expiring ? "expiring-soon" : ""}`}
                onClick={() => onSelectLease(lease)}
              >
                <td>{lease.units?.unit_number ?? "--"}</td>
                <td>
                  <div style={{ fontWeight: 500 }}>{lease.tenant_name}</div>
                  {lease.tenant_email && (
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--muted)",
                      }}
                    >
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

/* ==================================================================== */
/*  Maintenance Tab (Kanban)                                             */
/* ==================================================================== */

function MaintenanceTabContent({
  requests,
  onSelectMaint,
}: {
  requests: MaintenanceRequestRow[];
  onSelectMaint: (m: MaintenanceRequestRow) => void;
}) {
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
              <div
                key={req.id}
                className="maintenance-card clickable"
                onClick={() => onSelectMaint(req)}
              >
                <div className={`maintenance-card-stripe ${req.priority}`} />
                <div className="maintenance-card-title">{req.title}</div>
                <div className="maintenance-card-meta">
                  {req.units?.unit_number && (
                    <span>Unit {req.units.unit_number}</span>
                  )}
                  <span style={{ textTransform: "capitalize" }}>
                    {req.category}
                  </span>
                  <span>{formatDate(req.created_at)}</span>
                </div>
                <div className="maintenance-card-footer">
                  <PriorityBadge priority={req.priority} />
                  {req.estimated_cost != null && (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--muted)",
                      }}
                    >
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

/* ==================================================================== */
/*  Financials Tab                                                       */
/* ==================================================================== */

function FinancialsTabContent({
  financials,
}: {
  financials: PropertyFinancials;
}) {
  const maxVal = Math.max(
    financials.monthlyRevenue,
    financials.monthlyExpenses,
    1
  );

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
          <span className="financials-bar-label" style={{ fontWeight: 600 }}>
            NOI
          </span>
          <div className="financials-bar-track">
            <div
              className="financials-bar-fill"
              style={{
                width: `${(Math.abs(financials.noi) / maxVal) * 100}%`,
                background:
                  financials.noi >= 0
                    ? "var(--color-blue)"
                    : "var(--color-red)",
              }}
            />
          </div>
          <span
            className="financials-bar-value"
            style={{ fontWeight: 700 }}
          >
            {formatCurrency(financials.noi)}
          </span>
        </div>
      </div>

      {/* Rent Collection */}
      <div className="card">
        <div className="card-title">Rent Collection (Current Month)</div>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
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
              <span
                className="property-info-value"
                style={{ color: "var(--color-green)" }}
              >
                {formatCurrency(financials.totalPaid)}
              </span>
            </div>
            <div
              className="property-info-item"
              style={{ textAlign: "right" }}
            >
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

/* ==================================================================== */
/*  Edit Property Modal                                                  */
/* ==================================================================== */

function EditPropertyModal({
  property,
  saving,
  setSaving,
  onClose,
}: {
  property: PropertyRow;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: property.name,
    property_type: property.property_type,
    address_line1: property.address_line1,
    city: property.city,
    state: property.state,
    zip: property.zip,
    year_built: property.year_built ?? "",
    total_sqft: property.total_sqft ?? "",
    purchase_price: property.purchase_price ?? "",
    current_value: property.current_value ?? "",
  });
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/properties/${property.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          property_type: form.property_type,
          address_line1: form.address_line1,
          city: form.city,
          state: form.state,
          zip: form.zip,
          year_built: form.year_built !== "" ? Number(form.year_built) : null,
          total_sqft: form.total_sqft !== "" ? Number(form.total_sqft) : null,
          purchase_price:
            form.purchase_price !== "" ? Number(form.purchase_price) : null,
          current_value:
            form.current_value !== "" ? Number(form.current_value) : null,
        }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update property.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Edit Property</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}
          <div className="modal-form-grid">
            <div className="form-group full-width">
              <label className="form-label">Property Name</label>
              <input
                className="form-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Property Type</label>
              <select
                className="form-select"
                value={form.property_type}
                onChange={(e) =>
                  setForm({ ...form, property_type: e.target.value as PropertyRow["property_type"] })
                }
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial</option>
                <option value="mixed_use">Mixed Use</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year Built</label>
              <input
                className="form-input"
                type="number"
                value={form.year_built}
                onChange={(e) =>
                  setForm({ ...form, year_built: e.target.value })
                }
                placeholder="e.g. 2005"
              />
            </div>
            <div className="form-group full-width">
              <label className="form-label">Address</label>
              <input
                className="form-input"
                value={form.address_line1}
                onChange={(e) =>
                  setForm({ ...form, address_line1: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input
                className="form-input"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">State</label>
              <input
                className="form-input"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">ZIP</label>
              <input
                className="form-input"
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Total Sq Ft</label>
              <input
                className="form-input"
                type="number"
                value={form.total_sqft}
                onChange={(e) =>
                  setForm({ ...form, total_sqft: e.target.value })
                }
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Purchase Price</label>
              <input
                className="form-input"
                type="number"
                value={form.purchase_price}
                onChange={(e) =>
                  setForm({ ...form, purchase_price: e.target.value })
                }
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Current Value</label>
              <input
                className="form-input"
                type="number"
                value={form.current_value}
                onChange={(e) =>
                  setForm({ ...form, current_value: e.target.value })
                }
                placeholder="0"
              />
            </div>
          </div>
          <div className="modal-footer" style={{ border: "none", padding: "20px 0 0" }}>
            <button
              className="ui-btn ui-btn-md ui-btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="ui-btn ui-btn-md ui-btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================================================================== */
/*  Unit Detail/Edit Modal                                               */
/* ==================================================================== */

function UnitModal({
  unit,
  propertyId,
  editMode,
  saving,
  setSaving,
  onClose,
  onToggleEdit,
  onDelete,
}: {
  unit: UnitRow;
  propertyId: string;
  editMode: boolean;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onClose: () => void;
  onToggleEdit: () => void;
  onDelete: (id: string, name: string) => void;
}) {
  const [form, setForm] = useState({
    unit_number: unit.unit_number,
    unit_type: unit.unit_type,
    sqft: unit.sqft ?? "",
    bedrooms: unit.bedrooms ?? "",
    bathrooms: unit.bathrooms ?? "",
    floor_number: unit.floor_number ?? "",
    market_rent: unit.market_rent ?? "",
    status: unit.status,
  });
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/properties/${propertyId}/units`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: unit.id,
          unit_number: form.unit_number,
          unit_type: form.unit_type,
          sqft: form.sqft !== "" ? Number(form.sqft) : null,
          bedrooms: form.bedrooms !== "" ? Number(form.bedrooms) : null,
          bathrooms: form.bathrooms !== "" ? Number(form.bathrooms) : null,
          floor_number:
            form.floor_number !== "" ? Number(form.floor_number) : null,
          market_rent:
            form.market_rent !== "" ? Number(form.market_rent) : null,
          status: form.status,
        }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update unit.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={() => onClose()}
    >
      <div
        className="modal-content modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Unit {unit.unit_number}</h3>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="ui-btn ui-btn-sm ui-btn-outline"
              onClick={onToggleEdit}
            >
              {editMode ? "Cancel" : "Edit"}
            </button>
            <button
              className="ui-btn ui-btn-sm ui-btn-danger"
              onClick={() => onDelete(unit.id, `Unit ${unit.unit_number}`)}
            >
              <Trash2 size={13} />
            </button>
            <button className="modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          {editMode ? (
            /* ---- Edit Mode ---- */
            <>
              <div className="modal-form-grid">
                <div className="form-group">
                  <label className="form-label">Unit Number</label>
                  <input
                    className="form-input"
                    value={form.unit_number}
                    onChange={(e) =>
                      setForm({ ...form, unit_number: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Type</label>
                  <select
                    className="form-select"
                    value={form.unit_type}
                    onChange={(e) =>
                      setForm({ ...form, unit_type: e.target.value as UnitRow["unit_type"] })
                    }
                  >
                    <option value="studio">Studio</option>
                    <option value="1br">1 BR</option>
                    <option value="2br">2 BR</option>
                    <option value="3br">3 BR</option>
                    <option value="office">Office</option>
                    <option value="retail">Retail</option>
                    <option value="warehouse">Warehouse</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Sq Ft</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.sqft}
                    onChange={(e) =>
                      setForm({ ...form, sqft: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bedrooms</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.bedrooms}
                    onChange={(e) =>
                      setForm({ ...form, bedrooms: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bathrooms</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.bathrooms}
                    onChange={(e) =>
                      setForm({ ...form, bathrooms: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Floor Number</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.floor_number}
                    onChange={(e) =>
                      setForm({ ...form, floor_number: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Market Rent</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.market_rent}
                    onChange={(e) =>
                      setForm({ ...form, market_rent: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as UnitRow["status"] })
                    }
                  >
                    <option value="vacant">Vacant</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="reserved">Reserved</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ border: "none", padding: "20px 0 0" }}>
                <button
                  className="ui-btn ui-btn-md ui-btn-secondary"
                  onClick={onToggleEdit}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className="ui-btn ui-btn-md ui-btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </>
          ) : (
            /* ---- View Mode ---- */
            <div className="modal-detail-grid">
              <div className="modal-detail-item">
                <span className="modal-detail-label">Unit Number</span>
                <span className="modal-detail-value">
                  {unit.unit_number}
                </span>
              </div>
              <div className="modal-detail-item">
                <span className="modal-detail-label">Unit Type</span>
                <span className="modal-detail-value">
                  {unitTypeLabel(unit.unit_type)}
                </span>
              </div>
              <div className="modal-detail-item">
                <span className="modal-detail-label">Sq Ft</span>
                <span className="modal-detail-value">
                  {unit.sqft ? unit.sqft.toLocaleString() : "--"}
                </span>
              </div>
              <div className="modal-detail-item">
                <span className="modal-detail-label">Bedrooms</span>
                <span className="modal-detail-value">
                  {unit.bedrooms ?? "--"}
                </span>
              </div>
              <div className="modal-detail-item">
                <span className="modal-detail-label">Bathrooms</span>
                <span className="modal-detail-value">
                  {unit.bathrooms ?? "--"}
                </span>
              </div>
              <div className="modal-detail-item">
                <span className="modal-detail-label">Floor Number</span>
                <span className="modal-detail-value">
                  {unit.floor_number ?? "--"}
                </span>
              </div>
              <div className="modal-detail-item">
                <span className="modal-detail-label">Market Rent</span>
                <span className="modal-detail-value">
                  {unit.market_rent
                    ? formatCurrency(unit.market_rent)
                    : "--"}
                </span>
              </div>
              <div className="modal-detail-item">
                <span className="modal-detail-label">Status</span>
                <span className="modal-detail-value">
                  <UnitStatusBadge status={unit.status} />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================================================================== */
/*  Lease Detail/Edit Modal                                              */
/* ==================================================================== */

function LeaseModal({
  lease,
  propertyId,
  editMode,
  saving,
  setSaving,
  onClose,
  onToggleEdit,
  onDelete,
}: {
  lease: LeaseRow;
  propertyId: string;
  editMode: boolean;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onClose: () => void;
  onToggleEdit: () => void;
  onDelete: (id: string, name: string) => void;
}) {
  const [form, setForm] = useState({
    tenant_name: lease.tenant_name,
    tenant_email: lease.tenant_email ?? "",
    tenant_phone: lease.tenant_phone ?? "",
    monthly_rent: lease.monthly_rent,
    security_deposit: lease.security_deposit ?? "",
    lease_start: toInputDate(lease.lease_start),
    lease_end: toInputDate(lease.lease_end),
    status: lease.status,
    auto_renew: lease.auto_renew,
  });
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/properties/leases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lease.id,
          tenant_name: form.tenant_name,
          tenant_email: form.tenant_email || null,
          tenant_phone: form.tenant_phone || null,
          monthly_rent: Number(form.monthly_rent),
          security_deposit:
            form.security_deposit !== ""
              ? Number(form.security_deposit)
              : null,
          lease_start: form.lease_start || null,
          lease_end: form.lease_end || null,
          status: form.status,
          auto_renew: form.auto_renew,
        }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update lease.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>
            Lease - {lease.tenant_name}
            {lease.units?.unit_number && (
              <span
                style={{
                  fontSize: "0.85rem",
                  color: "var(--muted)",
                  fontWeight: 400,
                  marginLeft: "8px",
                }}
              >
                (Unit {lease.units.unit_number})
              </span>
            )}
          </h3>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="ui-btn ui-btn-sm ui-btn-outline"
              onClick={onToggleEdit}
            >
              {editMode ? "Cancel" : "Edit"}
            </button>
            <button
              className="ui-btn ui-btn-sm ui-btn-danger"
              onClick={() =>
                onDelete(lease.id, `Lease for ${lease.tenant_name}`)
              }
            >
              <Trash2 size={13} />
            </button>
            <button className="modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          {editMode ? (
            /* ---- Edit Mode ---- */
            <>
              <div className="modal-form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Tenant Name</label>
                  <input
                    className="form-input"
                    value={form.tenant_name}
                    onChange={(e) =>
                      setForm({ ...form, tenant_name: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tenant Email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={form.tenant_email}
                    onChange={(e) =>
                      setForm({ ...form, tenant_email: e.target.value })
                    }
                    placeholder="email@example.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tenant Phone</label>
                  <input
                    className="form-input"
                    value={form.tenant_phone}
                    onChange={(e) =>
                      setForm({ ...form, tenant_phone: e.target.value })
                    }
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Rent</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.monthly_rent}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        monthly_rent: Number(e.target.value),
                      })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Security Deposit</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.security_deposit}
                    onChange={(e) =>
                      setForm({ ...form, security_deposit: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Lease Start</label>
                  <input
                    className="form-input"
                    type="date"
                    value={form.lease_start}
                    onChange={(e) =>
                      setForm({ ...form, lease_start: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Lease End</label>
                  <input
                    className="form-input"
                    type="date"
                    value={form.lease_end}
                    onChange={(e) =>
                      setForm({ ...form, lease_end: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as LeaseRow["status"] })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="terminated">Terminated</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Auto Renew</label>
                  <select
                    className="form-select"
                    value={form.auto_renew ? "true" : "false"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        auto_renew: e.target.value === "true",
                      })
                    }
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ border: "none", padding: "20px 0 0" }}>
                <button
                  className="ui-btn ui-btn-md ui-btn-secondary"
                  onClick={onToggleEdit}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className="ui-btn ui-btn-md ui-btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </>
          ) : (
            /* ---- View Mode ---- */
            <div className="modal-detail-grid">
              <div className="modal-detail-item">
                <span className="modal-detail-label">Unit</span>
                <span className="modal-detail-value">
                  {lease.units?.unit_number
                    ? `Unit ${lease.units.unit_number}`
                    : "--"}
                </span>
              </div>
              <div className="modal-detail-item">
                <span className="modal-detail-label">Tenant Name</span>
                <span className="modal-detail-value">
                  {lease.tenant_name}
                </span>
              </div>
              <div className="modal-detail-item">
                <span className="modal-detail-label">Email</span>
                <span className="modal-detail-value">
                  {lease.tenant_email ?? "--"}
                </span>
              </div>
              <div className="modal-detail-item">
                <span className="modal-detail-label">Phone</span>
                <span className="modal-detail-value">
                  {lease.tenant_phone ?? "--"}
                </span>
              </div>
              <div className="modal-detail-item">
                <span className="modal-detail-label">Monthly Rent</span>
                <span className="modal-detail-value">
                  {formatCurrency(lease.monthly_rent)}
                </span>
              </div>
              <div className="modal-detail-item">
                <span className="modal-detail-label">Security Deposit</span>
                <span className="modal-detail-value">
                  {lease.security_deposit
                    ? formatCurrency(lease.security_deposit)
                    : "--"}
                </span>
              </div>
              <div className="modal-detail-item">
                <span className="modal-detail-label">Lease Start</span>
                <span className="modal-detail-value">
                  {formatDate(lease.lease_start)}
                </span>
              </div>
              <div className="modal-detail-item">
                <span className="modal-detail-label">Lease End</span>
                <span className="modal-detail-value">
                  {formatDate(lease.lease_end)}
                </span>
              </div>
              <div className="modal-detail-item">
                <span className="modal-detail-label">Status</span>
                <span className="modal-detail-value">
                  <LeaseStatusBadge status={lease.status} />
                </span>
              </div>
              <div className="modal-detail-item">
                <span className="modal-detail-label">Auto Renew</span>
                <span className="modal-detail-value">
                  {lease.auto_renew ? "Yes" : "No"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================================================================== */
/*  Maintenance Detail/Edit Modal                                        */
/* ==================================================================== */

function MaintenanceModal({
  maint,
  propertyId,
  editMode,
  saving,
  setSaving,
  onClose,
  onToggleEdit,
  onDelete,
}: {
  maint: MaintenanceRequestRow;
  propertyId: string;
  editMode: boolean;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onClose: () => void;
  onToggleEdit: () => void;
  onDelete: (id: string, name: string) => void;
}) {
  const [form, setForm] = useState({
    title: maint.title,
    description: maint.description ?? "",
    category: maint.category,
    priority: maint.priority,
    status: maint.status,
    estimated_cost: maint.estimated_cost ?? "",
    actual_cost: maint.actual_cost ?? "",
    scheduled_date: toInputDate(maint.scheduled_date),
    notes: maint.notes ?? "",
  });
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        `/api/properties/${propertyId}/maintenance`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: maint.id,
            title: form.title,
            description: form.description || null,
            category: form.category,
            priority: form.priority,
            status: form.status,
            estimated_cost:
              form.estimated_cost !== ""
                ? Number(form.estimated_cost)
                : null,
            actual_cost:
              form.actual_cost !== "" ? Number(form.actual_cost) : null,
            scheduled_date: form.scheduled_date || null,
            notes: form.notes || null,
          }),
        }
      );
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update maintenance request.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{maint.title}</h3>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="ui-btn ui-btn-sm ui-btn-outline"
              onClick={onToggleEdit}
            >
              {editMode ? "Cancel" : "Edit"}
            </button>
            <button
              className="ui-btn ui-btn-sm ui-btn-danger"
              onClick={() => onDelete(maint.id, maint.title)}
            >
              <Trash2 size={13} />
            </button>
            <button className="modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          {editMode ? (
            /* ---- Edit Mode ---- */
            <>
              <div className="modal-form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Title</label>
                  <input
                    className="form-input"
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    rows={3}
                    placeholder="Describe the issue..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={form.category}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        category: e.target.value as MaintenanceRequestRow["category"],
                      })
                    }
                  >
                    <option value="plumbing">Plumbing</option>
                    <option value="electrical">Electrical</option>
                    <option value="hvac">HVAC</option>
                    <option value="appliance">Appliance</option>
                    <option value="structural">Structural</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={form.priority}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        priority: e.target.value as MaintenanceRequestRow["priority"],
                      })
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as MaintenanceRequestRow["status"],
                      })
                    }
                  >
                    <option value="submitted">Submitted</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Estimated Cost</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.estimated_cost}
                    onChange={(e) =>
                      setForm({ ...form, estimated_cost: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Actual Cost</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.actual_cost}
                    onChange={(e) =>
                      setForm({ ...form, actual_cost: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Scheduled Date</label>
                  <input
                    className="form-input"
                    type="date"
                    value={form.scheduled_date}
                    onChange={(e) =>
                      setForm({ ...form, scheduled_date: e.target.value })
                    }
                  />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-textarea"
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    rows={3}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ border: "none", padding: "20px 0 0" }}>
                <button
                  className="ui-btn ui-btn-md ui-btn-secondary"
                  onClick={onToggleEdit}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className="ui-btn ui-btn-md ui-btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </>
          ) : (
            /* ---- View Mode ---- */
            <>
              <div className="modal-detail-grid">
                <div className="modal-detail-item">
                  <span className="modal-detail-label">Title</span>
                  <span className="modal-detail-value">{maint.title}</span>
                </div>
                <div className="modal-detail-item">
                  <span className="modal-detail-label">Unit</span>
                  <span className="modal-detail-value">
                    {maint.units?.unit_number
                      ? `Unit ${maint.units.unit_number}`
                      : "--"}
                  </span>
                </div>
                <div className="modal-detail-item">
                  <span className="modal-detail-label">Category</span>
                  <span
                    className="modal-detail-value"
                    style={{ textTransform: "capitalize" }}
                  >
                    {maint.category}
                  </span>
                </div>
                <div className="modal-detail-item">
                  <span className="modal-detail-label">Priority</span>
                  <span className="modal-detail-value">
                    <PriorityBadge priority={maint.priority} />
                  </span>
                </div>
                <div className="modal-detail-item">
                  <span className="modal-detail-label">Status</span>
                  <span className="modal-detail-value">
                    <MaintenanceStatusBadge status={maint.status} />
                  </span>
                </div>
                <div className="modal-detail-item">
                  <span className="modal-detail-label">Estimated Cost</span>
                  <span className="modal-detail-value">
                    {maint.estimated_cost != null
                      ? formatCurrency(maint.estimated_cost)
                      : "--"}
                  </span>
                </div>
                <div className="modal-detail-item">
                  <span className="modal-detail-label">Actual Cost</span>
                  <span className="modal-detail-value">
                    {maint.actual_cost != null
                      ? formatCurrency(maint.actual_cost)
                      : "--"}
                  </span>
                </div>
                <div className="modal-detail-item">
                  <span className="modal-detail-label">Scheduled Date</span>
                  <span className="modal-detail-value">
                    {formatDate(maint.scheduled_date)}
                  </span>
                </div>
                <div className="modal-detail-item">
                  <span className="modal-detail-label">Created</span>
                  <span className="modal-detail-value">
                    {formatDate(maint.created_at)}
                  </span>
                </div>
                <div className="modal-detail-item">
                  <span className="modal-detail-label">Completed</span>
                  <span className="modal-detail-value">
                    {formatDate(maint.completed_at)}
                  </span>
                </div>
              </div>
              {maint.description && (
                <div style={{ marginTop: "20px" }}>
                  <div
                    className="modal-detail-label"
                    style={{ marginBottom: "6px" }}
                  >
                    Description
                  </div>
                  <div
                    style={{
                      fontSize: "0.88rem",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      color: "var(--text)",
                    }}
                  >
                    {maint.description}
                  </div>
                </div>
              )}
              {maint.notes && (
                <div style={{ marginTop: "16px" }}>
                  <div
                    className="modal-detail-label"
                    style={{ marginBottom: "6px" }}
                  >
                    Notes
                  </div>
                  <div
                    style={{
                      fontSize: "0.88rem",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      color: "var(--text)",
                    }}
                  >
                    {maint.notes}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================================================================== */
/*  Delete Confirmation Modal                                            */
/* ==================================================================== */

function DeleteConfirmModal({
  target,
  propertyId,
  saving,
  setSaving,
  onClose,
}: {
  target: { type: string; id: string; name: string };
  propertyId: string;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onClose: () => void;
}) {
  const [error, setError] = useState("");

  async function handleDelete() {
    setSaving(true);
    setError("");
    try {
      let url = "";
      let options: RequestInit = { method: "DELETE" };

      if (target.type === "unit") {
        url = `/api/properties/${propertyId}/units?unitId=${target.id}`;
      } else if (target.type === "lease") {
        url = "/api/properties/leases";
        options = {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: target.id }),
        };
      } else if (target.type === "maintenance") {
        url = `/api/properties/${propertyId}/maintenance?requestId=${target.id}`;
      }

      const res = await fetch(url, options);
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || `Failed to delete ${target.type}.`);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Confirm Delete</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}
          <div className="delete-confirm-text">
            Are you sure you want to delete {target.type}{" "}
            <span className="delete-confirm-name">{target.name}</span>?
            <br />
            <span
              style={{
                fontSize: "0.82rem",
                color: "var(--muted)",
                marginTop: "8px",
                display: "inline-block",
              }}
            >
              This action cannot be undone.
            </span>
          </div>
          <div className="modal-footer" style={{ border: "none", padding: "16px 0 0" }}>
            <button
              className="ui-btn ui-btn-md ui-btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="ui-btn ui-btn-md ui-btn-danger"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
