"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  ArrowLeft,
  Pencil,
  X,
  Trash2,
  Grid3x3,
  Building2,
  ImageIcon,
  Upload,
  Loader2,
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

function toInputDate(d: string | null | undefined): string {
  if (!d) return "";
  return d.slice(0, 10);
}

/* ------------------------------------------------------------------ */
/*  Badge Components                                                    */
/* ------------------------------------------------------------------ */

function PropertyTypeBadge({ type }: { type: string }) {
  const t = useTranslations("app");
  const labels: Record<string, string> = {
    residential: t("propTypeResidential"),
    commercial: t("propTypeCommercial"),
    industrial: t("propTypeIndustrial"),
    mixed_use: t("propTypeMixedUse"),
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
  const t = useTranslations("app");
  const map: Record<string, { label: string; cls: string }> = {
    occupied: { label: t("unitStatusOccupied"), cls: "badge-green" },
    vacant: { label: t("unitStatusVacant"), cls: "badge-amber" },
    maintenance: { label: t("unitStatusMaintenance"), cls: "badge-red" },
    reserved: { label: t("unitStatusReserved"), cls: "badge-blue" },
  };
  const m = map[status] ?? { label: status, cls: "badge-blue" };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

function LeaseStatusBadge({ status }: { status: string }) {
  const t = useTranslations("app");
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: t("statusActive"), cls: "badge-green" },
    expired: { label: t("statusExpired"), cls: "badge-red" },
    terminated: { label: t("statusTerminated"), cls: "badge-red" },
    pending: { label: t("statusPending"), cls: "badge-amber" },
  };
  const m = map[status] ?? { label: status, cls: "badge-blue" };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const t = useTranslations("app");
  const map: Record<string, { label: string; cls: string }> = {
    low: { label: t("priorityLow"), cls: "badge-green" },
    medium: { label: t("priorityMedium"), cls: "badge-blue" },
    high: { label: t("priorityHigh"), cls: "badge-amber" },
    emergency: { label: t("priorityEmergency"), cls: "badge-red" },
  };
  const m = map[priority] ?? { label: priority, cls: "badge-blue" };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

function MaintenanceStatusBadge({ status }: { status: string }) {
  const t = useTranslations("app");
  const map: Record<string, { label: string; cls: string }> = {
    submitted: { label: t("maintStatusSubmitted"), cls: "badge-amber" },
    assigned: { label: t("maintStatusAssigned"), cls: "badge-blue" },
    in_progress: { label: t("maintStatusInProgress"), cls: "badge-blue" },
    completed: { label: t("maintStatusCompleted"), cls: "badge-green" },
    closed: { label: t("maintStatusClosed"), cls: "badge-green" },
  };
  const m = map[status] ?? { label: status, cls: "badge-blue" };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

/* ------------------------------------------------------------------ */
/*  Tab Definitions                                                     */
/* ------------------------------------------------------------------ */

const TAB_KEYS = ["overview", "units", "leases", "maintenance", "financials"] as const;
type TabKey = (typeof TAB_KEYS)[number];

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
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

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

  // Helper
  function formatDate(d: string | null | undefined): string {
    if (!d) return "--";
    return new Date(d).toLocaleDateString(dateLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function unitTypeLabel(ut: string): string {
    const map: Record<string, string> = {
      studio: t("unitTypeStudio"),
      "1br": t("unitType1br"),
      "2br": t("unitType2br"),
      "3br": t("unitType3br"),
      office: t("unitTypeOffice"),
      retail: t("unitTypeRetail"),
      warehouse: t("unitTypeWarehouse"),
    };
    return map[ut] ?? ut;
  }

  // Tab labels with counts
  const TABS = [
    { key: "overview" as TabKey, label: t("propTabOverview") },
    { key: "units" as TabKey, label: t("propTabUnitsCount", { count: units.length }) },
    { key: "leases" as TabKey, label: t("propTabLeasesCount", { count: leases.length }) },
    { key: "maintenance" as TabKey, label: t("propTabMaintenanceCount", { count: maintenanceRequests.length }) },
    { key: "financials" as TabKey, label: t("propTabFinancials") },
  ];

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
              {t("backToProperties")}
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
            {t("editProperty")}
          </button>
        </div>
      </div>

      {/* ===== Tabs ===== */}
      <div className="property-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`property-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
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
          leases={leases}
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
          leases={leases}
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
          onSelectLease={(l) => {
            setSelectedUnit(null);
            setUnitEditMode(false);
            setSelectedLease(l);
            setLeaseEditMode(false);
          }}
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
/*  Photo Gallery                                                        */
/* ==================================================================== */

interface PhotoItem {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  created_at: string;
  url: string | null;
}

function PhotoGallery({ propertyId }: { propertyId: string }) {
  const t = useTranslations("app");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<PhotoItem | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch(`/api/properties/${propertyId}/photos`);
      if (res.ok) {
        const data = await res.json();
        setPhotos(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`/api/properties/${propertyId}/photos`, {
          method: "POST",
          body: fd,
        });
        if (res.ok) {
          const photo = await res.json();
          setPhotos((prev) => [photo, ...prev]);
        }
      }
    } catch {
      // silent
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(docId: string) {
    setDeleting(docId);
    try {
      const res = await fetch(
        `/api/properties/${propertyId}/photos?docId=${docId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== docId));
        if (lightbox?.id === docId) setLightbox(null);
      }
    } catch {
      // silent
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <div className="card">
        <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ImageIcon size={18} style={{ color: "var(--muted)" }} />
            {t("photos")} {photos.length > 0 && `(${photos.length})`}
          </span>
          <label
            className="btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.8rem",
              padding: "6px 12px",
              cursor: uploading ? "wait" : "pointer",
            }}
          >
            {uploading ? (
              <Loader2 size={14} className="spin-icon" />
            ) : (
              <Upload size={14} />
            )}
            {uploading ? t("uploading") : t("upload")}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              disabled={uploading}
              style={{ display: "none" }}
            />
          </label>
        </div>

        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "120px",
              color: "var(--muted)",
              fontSize: "0.85rem",
            }}
          >
            {t("loadingPhotos")}
          </div>
        ) : photos.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "160px",
              border: "2px dashed var(--border)",
              borderRadius: "8px",
              color: "var(--muted)",
              fontSize: "0.85rem",
              gap: "8px",
              cursor: "pointer",
            }}
            onClick={() => fileRef.current?.click()}
          >
            <ImageIcon size={24} />
            {t("clickToUploadPhotos")}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "8px",
            }}
          >
            {photos.map((photo) => (
              <div
                key={photo.id}
                style={{
                  position: "relative",
                  aspectRatio: "1",
                  borderRadius: "8px",
                  overflow: "hidden",
                  cursor: "pointer",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                }}
                onClick={() => setLightbox(photo)}
              >
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt={photo.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--muted)",
                    }}
                  >
                    <ImageIcon size={32} />
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(photo.id);
                  }}
                  disabled={deleting === photo.id}
                  style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    background: "rgba(0,0,0,0.6)",
                    border: "none",
                    borderRadius: "50%",
                    width: "24px",
                    height: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#fff",
                    opacity: 0,
                    transition: "opacity 0.15s",
                  }}
                  className="photo-delete-btn"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#fff",
            }}
          >
            <X size={20} />
          </button>
          {lightbox.url && (
            <img
              src={lightbox.url}
              alt={lightbox.name}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: "8px",
                cursor: "default",
              }}
            />
          )}
          <div
            style={{
              position: "absolute",
              bottom: "16px",
              left: "50%",
              transform: "translateX(-50%)",
              color: "#fff",
              fontSize: "0.85rem",
              background: "rgba(0,0,0,0.5)",
              padding: "6px 14px",
              borderRadius: "6px",
            }}
          >
            {lightbox.name}
          </div>
        </div>
      )}
    </>
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
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  function formatDate(d: string | null | undefined): string {
    if (!d) return "--";
    return new Date(d).toLocaleDateString(dateLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

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
          <span className="property-kpi-label">{t("occupancyRate")}</span>
          <span
            className={`property-kpi-value ${
              occupancy >= 90 ? "green" : occupancy >= 70 ? "amber" : "red"
            }`}
          >
            {formatPercent(occupancy)}
          </span>
        </div>
        <div className="card property-kpi">
          <span className="property-kpi-label">{t("monthlyRevenue")}</span>
          <span className="property-kpi-value">
            {formatCurrency(financials.monthlyRevenue)}
          </span>
        </div>
        <div className="card property-kpi">
          <span className="property-kpi-label">{t("monthlyExpenses")}</span>
          <span className="property-kpi-value">
            {formatCurrency(financials.monthlyExpenses)}
          </span>
        </div>
        <div className="card property-kpi">
          <span className="property-kpi-label">{t("noi")}</span>
          <span
            className={`property-kpi-value ${
              financials.noi >= 0 ? "green" : "red"
            }`}
          >
            {formatCurrency(financials.noi)}
          </span>
        </div>
        <div className="card property-kpi">
          <span className="property-kpi-label">{t("activeLeases")}</span>
          <span className="property-kpi-value">{activeLeaseCount}</span>
        </div>
        <div className="card property-kpi">
          <span className="property-kpi-label">{t("openMaintenance")}</span>
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
            <span className="card-title">{t("unitStatusGrid")}</span>
            <button
              className="link-btn"
              onClick={() => onTabSwitch("units")}
            >
              {t("viewAllUnits")} &rarr;
            </button>
          </div>
          {units.length > 0 ? (
            <>
              <div className="unit-grid">
                {units.map((unit) => (
                  <div
                    key={unit.id}
                    className={`unit-grid-cell ${unit.status}`}
                    title={t("unitStatusTitle", { number: unit.unit_number, status: unit.status })}
                    onClick={() => onSelectUnit(unit)}
                  >
                    {unit.unit_number}
                  </div>
                ))}
              </div>
              <div className="unit-grid-legend">
                <span className="legend-item">
                  <span className="legend-dot occupied" />
                  {t("unitStatusOccupied")} (
                  {units.filter((u) => u.status === "occupied").length})
                </span>
                <span className="legend-item">
                  <span className="legend-dot vacant" />
                  {t("unitStatusVacant")} ({units.filter((u) => u.status === "vacant").length})
                </span>
                <span className="legend-item">
                  <span className="legend-dot maintenance" />
                  {t("unitStatusMaintenance")} (
                  {units.filter((u) => u.status === "maintenance").length})
                </span>
                <span className="legend-item">
                  <span className="legend-dot reserved" />
                  {t("unitStatusReserved")} (
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
              {t("noUnitsAddedYet")}
            </div>
          )}
        </div>

        <div className="card lease-expirations-section">
          <div className="card-title-row">
            <span className="card-title">{t("upcomingLeaseExpirations")}</span>
            <button
              className="link-btn"
              onClick={() => onTabSwitch("leases")}
            >
              {t("viewAllLeases")} &rarr;
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
                        {t("unitLabel", { number: l.units?.unit_number ?? "--" })}
                      </span>
                      {daysLeft < 30 && (
                        <span className="badge badge-red">{t("priorityUrgent")}</span>
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
                        {t("daysCount", { count: daysLeft })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="lease-expiry-empty">
              {t("noLeasesExpiringWithin120Days")}
            </div>
          )}
        </div>
      </div>

      {/* Property Info */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="card-title">{t("propertyInformation")}</div>
        <div className="property-info-grid">
          <div className="property-info-item">
            <span className="property-info-label">{t("propertyType")}</span>
            <span
              className="property-info-value"
              style={{ textTransform: "capitalize" }}
            >
              {property.property_type.replace("_", " ")}
            </span>
          </div>
          <div className="property-info-item">
            <span className="property-info-label">{t("address")}</span>
            <span className="property-info-value">
              {property.address_line1}, {property.city}, {property.state}{" "}
              {property.zip}
            </span>
          </div>
          <div className="property-info-item">
            <span className="property-info-label">{t("yearBuilt")}</span>
            <span className="property-info-value">
              {property.year_built ?? "--"}
            </span>
          </div>
          <div className="property-info-item">
            <span className="property-info-label">{t("totalSqFt")}</span>
            <span className="property-info-value">
              {property.total_sqft
                ? property.total_sqft.toLocaleString()
                : "--"}
            </span>
          </div>
          <div className="property-info-item">
            <span className="property-info-label">{t("purchasePrice")}</span>
            <span className="property-info-value">
              {property.purchase_price
                ? formatCurrency(property.purchase_price)
                : "--"}
            </span>
          </div>
          <div className="property-info-item">
            <span className="property-info-label">{t("currentValue")}</span>
            <span className="property-info-value">
              {property.current_value
                ? formatCurrency(property.current_value)
                : "--"}
            </span>
          </div>
        </div>
      </div>

      {/* Photo Gallery */}
      <PhotoGallery propertyId={property.id} />
    </>
  );
}

/* ==================================================================== */
/*  Units Tab                                                            */
/* ==================================================================== */

function UnitsTabContent({
  units,
  leases,
  onSelectUnit,
  onEditUnit,
}: {
  units: UnitRow[];
  leases: LeaseRow[];
  onSelectUnit: (u: UnitRow) => void;
  onEditUnit: (u: UnitRow) => void;
}) {
  const t = useTranslations("app");

  function unitTypeLabel(ut: string): string {
    const map: Record<string, string> = {
      studio: t("unitTypeStudio"),
      "1br": t("unitType1br"),
      "2br": t("unitType2br"),
      "3br": t("unitType3br"),
      office: t("unitTypeOffice"),
      retail: t("unitTypeRetail"),
      warehouse: t("unitTypeWarehouse"),
    };
    return map[ut] ?? ut;
  }

  // Build a map of unit_id -> active lease tenant name
  const tenantByUnit = new Map<string, string>();
  for (const l of leases) {
    if (l.status === "active" && l.unit_id) {
      tenantByUnit.set(l.unit_id, l.tenant_name);
    }
  }

  // Sort: vacant/maintenance first, then occupied
  const statusOrder: Record<string, number> = {
    vacant: 0,
    maintenance: 1,
    reserved: 2,
    occupied: 3,
  };
  const sorted = [...units].sort(
    (a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
  );

  if (units.length === 0) {
    return (
      <div className="properties-empty" style={{ padding: "40px 20px" }}>
        <div className="properties-empty-title">{t("noUnits")}</div>
        <div className="properties-empty-desc">
          {t("addUnitsDesc")}
        </div>
      </div>
    );
  }

  const vacantCount = units.filter((u) => u.status === "vacant").length;

  return (
    <>
      {vacantCount > 0 && (
        <div
          style={{
            padding: "10px 16px",
            marginBottom: "12px",
            background: "rgba(var(--color-amber-rgb, 245, 158, 11), 0.1)",
            border: "1px solid rgba(var(--color-amber-rgb, 245, 158, 11), 0.3)",
            borderRadius: "8px",
            fontSize: "0.85rem",
            color: "var(--color-amber, #f59e0b)",
            fontWeight: 500,
          }}
        >
          {t("vacantUnitsAvailable", { count: vacantCount })}
        </div>
      )}
      <div className="units-grid">
        {sorted.map((unit) => {
          const tenant = tenantByUnit.get(unit.id);
          const isVacant = unit.status === "vacant";
          return (
            <div
              key={unit.id}
              className="card unit-card clickable"
              onClick={() => onSelectUnit(unit)}
              style={
                isVacant
                  ? {
                      borderColor: "rgba(var(--color-amber-rgb, 245, 158, 11), 0.4)",
                      background: "rgba(var(--color-amber-rgb, 245, 158, 11), 0.05)",
                    }
                  : undefined
              }
            >
              <span className={`unit-status-dot ${unit.status}`} />
              <div className="unit-card-info">
                <div className="unit-card-number">{t("unitLabel", { number: unit.unit_number })}</div>
                <div className="unit-card-meta">
                  {unitTypeLabel(unit.unit_type)}
                  {unit.sqft ? ` -- ${unit.sqft.toLocaleString()} sqft` : ""}
                  {unit.floor_number ? ` -- ${t("floorLabel", { number: unit.floor_number })}` : ""}
                </div>
                {tenant && (
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "2px" }}>
                    {t("tenantLabel", { name: tenant })}
                  </div>
                )}
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
                    title={t("editUnit")}
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
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
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  function formatDate(d: string | null | undefined): string {
    if (!d) return "--";
    return new Date(d).toLocaleDateString(dateLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  if (leases.length === 0) {
    return (
      <div className="properties-empty" style={{ padding: "40px 20px" }}>
        <div className="properties-empty-title">{t("noLeases")}</div>
        <div className="properties-empty-desc">
          {t("leasesWillAppearHere")}
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="lease-table">
        <thead>
          <tr>
            <th>{t("unit")}</th>
            <th>{t("tenant")}</th>
            <th>{t("monthlyRent")}</th>
            <th>{t("start")}</th>
            <th>{t("end")}</th>
            <th>{t("status")}</th>
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
                      {t("expiringSoon")}
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
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  function formatDate(d: string | null | undefined): string {
    if (!d) return "--";
    return new Date(d).toLocaleDateString(dateLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const columns: { key: string; label: string }[] = [
    { key: "submitted", label: t("maintStatusSubmitted") },
    { key: "assigned", label: t("maintStatusAssigned") },
    { key: "in_progress", label: t("maintStatusInProgress") },
    { key: "completed", label: t("maintStatusCompleted") },
  ];

  const grouped = new Map<string, MaintenanceRequestRow[]>();
  for (const col of columns) {
    grouped.set(col.key, []);
  }
  for (const req of requests) {
    // Map legacy "open" status to "submitted"
    const status = (req.status as string) === "open" ? "submitted" : req.status;
    const bucket = grouped.get(status);
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
                    <span>{t("unitLabel", { number: req.units.unit_number })}</span>
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
                      {t("estAbbr")} {formatCurrency(req.estimated_cost)}
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
                {t("noRequests")}
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

const EXPENSE_TYPE_LABELS: Record<string, string> = {
  maintenance: "Repairs & Maintenance",
  cam: "Common Area Maintenance",
  property_tax: "Property Taxes",
  insurance: "Insurance",
  utilities: "Utilities",
  management_fee: "Management Fees",
  capital_expense: "Capital Expenditures",
  hoa_fee: "HOA / Association Fees",
  marketing: "Leasing & Marketing",
  legal: "Legal & Professional",
  other: "Other",
};

function FinancialsTabContent({
  financials,
}: {
  financials: PropertyFinancials;
}) {
  const t = useTranslations("app");

  const maxVal = Math.max(
    financials.monthlyRevenue,
    financials.monthlyExpenses,
    1
  );

  return (
    <div className="financials-grid">
      {/* Revenue vs Expenses */}
      <div className="card">
        <div className="card-title">{t("revenueVsExpenses")}</div>
        <div className="financials-bar-row">
          <span className="financials-bar-label">{t("revenue")}</span>
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
          <span className="financials-bar-label">{t("expenses")}</span>
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
            {t("noi")}
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
        <div className="card-title">{t("rentCollectionCurrentMonth")}</div>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <div className="property-info-item">
            <span className="property-info-label">{t("collectionRate")}</span>
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
              <span className="property-info-label">{t("collected")}</span>
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
              <span className="property-info-label">{t("totalDue")}</span>
              <span className="property-info-value">
                {formatCurrency(financials.totalDue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Operating Expense Breakdown */}
      {financials.expenseBreakdown && financials.expenseBreakdown.length > 0 && (
        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-title">Operating Expense Breakdown (Monthly)</div>
          <table className="data-table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Category</th>
                <th style={{ textAlign: "right" }}>Monthly Amount</th>
                <th style={{ textAlign: "right" }}>% of Total</th>
              </tr>
            </thead>
            <tbody>
              {financials.expenseBreakdown.map((item) => (
                <tr key={item.type}>
                  <td>{EXPENSE_TYPE_LABELS[item.type] ?? item.type}</td>
                  <td className="amount-cell">
                    {formatCurrency(item.monthlyAmount)}
                  </td>
                  <td className="amount-cell">
                    {financials.monthlyExpenses > 0
                      ? `${((item.monthlyAmount / financials.monthlyExpenses) * 100).toFixed(1)}%`
                      : "—"}
                  </td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700, borderTop: "2px solid var(--border-color)" }}>
                <td>Total Expenses</td>
                <td className="amount-cell">
                  {formatCurrency(financials.monthlyExpenses)}
                </td>
                <td className="amount-cell">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
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
  const t = useTranslations("app");
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
        setError(data.error || t("failedToUpdateProperty"));
      }
    } catch {
      setError(t("networkError"));
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
          <h3>{t("editProperty")}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}
          <div className="modal-form-grid">
            <div className="form-group full-width">
              <label className="form-label">{t("propertyName")}</label>
              <input
                className="form-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("propertyType")}</label>
              <select
                className="form-select"
                value={form.property_type}
                onChange={(e) =>
                  setForm({ ...form, property_type: e.target.value as PropertyRow["property_type"] })
                }
              >
                <option value="residential">{t("propTypeResidential")}</option>
                <option value="commercial">{t("propTypeCommercial")}</option>
                <option value="industrial">{t("propTypeIndustrial")}</option>
                <option value="mixed_use">{t("propTypeMixedUse")}</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t("yearBuilt")}</label>
              <input
                className="form-input"
                type="number"
                value={form.year_built}
                onChange={(e) =>
                  setForm({ ...form, year_built: e.target.value })
                }
                placeholder={t("yearBuiltPlaceholder")}
              />
            </div>
            <div className="form-group full-width">
              <label className="form-label">{t("address")}</label>
              <input
                className="form-input"
                value={form.address_line1}
                onChange={(e) =>
                  setForm({ ...form, address_line1: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("city")}</label>
              <input
                className="form-input"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("state")}</label>
              <input
                className="form-input"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("zip")}</label>
              <input
                className="form-input"
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t("totalSqFt")}</label>
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
              <label className="form-label">{t("purchasePrice")}</label>
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
              <label className="form-label">{t("currentValue")}</label>
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
              {t("cancel")}
            </button>
            <button
              className="ui-btn ui-btn-md ui-btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? t("saving") : t("saveChanges")}
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
  leases,
  editMode,
  saving,
  setSaving,
  onClose,
  onToggleEdit,
  onDelete,
  onSelectLease,
}: {
  unit: UnitRow;
  propertyId: string;
  leases: LeaseRow[];
  editMode: boolean;
  saving: boolean;
  setSaving: (v: boolean) => void;
  onClose: () => void;
  onToggleEdit: () => void;
  onDelete: (id: string, name: string) => void;
  onSelectLease: (l: LeaseRow) => void;
}) {
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  function formatDate(d: string | null | undefined): string {
    if (!d) return "--";
    return new Date(d).toLocaleDateString(dateLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function unitTypeLabel(ut: string): string {
    const map: Record<string, string> = {
      studio: t("unitTypeStudio"),
      "1br": t("unitType1br"),
      "2br": t("unitType2br"),
      "3br": t("unitType3br"),
      office: t("unitTypeOffice"),
      retail: t("unitTypeRetail"),
      warehouse: t("unitTypeWarehouse"),
    };
    return map[ut] ?? ut;
  }

  // Find the active lease for this unit
  const activeLease = leases.find(
    (l) => l.unit_id === unit.id && l.status === "active"
  );
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
        setError(data.error || t("failedToUpdateUnit"));
      }
    } catch {
      setError(t("networkError"));
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
          <h3>{t("unitLabel", { number: unit.unit_number })}</h3>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="ui-btn ui-btn-sm ui-btn-outline"
              onClick={onToggleEdit}
            >
              {editMode ? t("cancel") : t("edit")}
            </button>
            <button
              className="ui-btn ui-btn-sm ui-btn-danger"
              onClick={() => onDelete(unit.id, t("unitLabel", { number: unit.unit_number }))}
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
                  <label className="form-label">{t("unitNumber")}</label>
                  <input
                    className="form-input"
                    value={form.unit_number}
                    onChange={(e) =>
                      setForm({ ...form, unit_number: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("unitType")}</label>
                  <select
                    className="form-select"
                    value={form.unit_type}
                    onChange={(e) =>
                      setForm({ ...form, unit_type: e.target.value as UnitRow["unit_type"] })
                    }
                  >
                    <option value="studio">{t("unitTypeStudio")}</option>
                    <option value="1br">{t("unitType1br")}</option>
                    <option value="2br">{t("unitType2br")}</option>
                    <option value="3br">{t("unitType3br")}</option>
                    <option value="office">{t("unitTypeOffice")}</option>
                    <option value="retail">{t("unitTypeRetail")}</option>
                    <option value="warehouse">{t("unitTypeWarehouse")}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t("sqFt")}</label>
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
                  <label className="form-label">{t("bedrooms")}</label>
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
                  <label className="form-label">{t("bathrooms")}</label>
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
                  <label className="form-label">{t("floorNumber")}</label>
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
                  <label className="form-label">{t("marketRent")}</label>
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
                  <label className="form-label">{t("status")}</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as UnitRow["status"] })
                    }
                  >
                    <option value="vacant">{t("unitStatusVacant")}</option>
                    <option value="occupied">{t("unitStatusOccupied")}</option>
                    <option value="maintenance">{t("unitStatusMaintenance")}</option>
                    <option value="reserved">{t("unitStatusReserved")}</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ border: "none", padding: "20px 0 0" }}>
                <button
                  className="ui-btn ui-btn-md ui-btn-secondary"
                  onClick={onToggleEdit}
                  disabled={saving}
                >
                  {t("cancel")}
                </button>
                <button
                  className="ui-btn ui-btn-md ui-btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? t("saving") : t("saveChanges")}
                </button>
              </div>
            </>
          ) : (
            /* ---- View Mode ---- */
            <div style={{ padding: "1.25rem" }}>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("unitNumber")}</label>
                  <div className="detail-value">{unit.unit_number}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("unitType")}</label>
                  <div className="detail-value">{unitTypeLabel(unit.unit_type)}</div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("sqFt")}</label>
                  <div className="detail-value">{unit.sqft ? unit.sqft.toLocaleString() : "--"}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("bedrooms")}</label>
                  <div className="detail-value">{unit.bedrooms ?? "--"}</div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("bathrooms")}</label>
                  <div className="detail-value">{unit.bathrooms ?? "--"}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("floorNumber")}</label>
                  <div className="detail-value">{unit.floor_number ?? "--"}</div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("marketRent")}</label>
                  <div className="detail-value">{unit.market_rent ? formatCurrency(unit.market_rent) : "--"}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("status")}</label>
                  <div className="detail-value"><UnitStatusBadge status={unit.status} /></div>
                </div>
              </div>

              {/* Tenant / Lease Info */}
              {activeLease ? (
                <div
                  style={{
                    marginTop: "16px",
                    padding: "14px 16px",
                    background: "rgba(var(--color-green-rgb, 34, 197, 94), 0.08)",
                    borderRadius: "8px",
                    border: "1px solid rgba(var(--color-green-rgb, 34, 197, 94), 0.2)",
                  }}
                >
                  <label className="detail-label" style={{ marginBottom: "8px", display: "block" }}>
                    {t("currentTenant")}
                  </label>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                        {activeLease.tenant_name}
                      </div>
                      {activeLease.tenant_email && (
                        <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "2px" }}>
                          {activeLease.tenant_email}
                        </div>
                      )}
                      {activeLease.tenant_phone && (
                        <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "1px" }}>
                          {activeLease.tenant_phone}
                        </div>
                      )}
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "4px" }}>
                        {formatCurrency(activeLease.monthly_rent)}/{t("moAbbr")} &middot; {t("leaseEnds")} {formatDate(activeLease.lease_end)}
                      </div>
                    </div>
                    <button
                      className="ui-btn ui-btn-sm ui-btn-outline"
                      onClick={() => onSelectLease(activeLease)}
                    >
                      {t("viewLease")}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    marginTop: "16px",
                    padding: "14px 16px",
                    background: "rgba(var(--color-amber-rgb, 245, 158, 11), 0.08)",
                    borderRadius: "8px",
                    border: "1px solid rgba(var(--color-amber-rgb, 245, 158, 11), 0.2)",
                    fontSize: "0.85rem",
                    color: "var(--color-amber, #f59e0b)",
                  }}
                >
                  {t("noActiveLeaseForUnit")}
                </div>
              )}
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
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  function formatDate(d: string | null | undefined): string {
    if (!d) return "--";
    return new Date(d).toLocaleDateString(dateLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

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
        setError(data.error || t("failedToUpdateLease"));
      }
    } catch {
      setError(t("networkError"));
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
            {t("leaseFor", { tenant: lease.tenant_name })}
            {lease.units?.unit_number && (
              <span
                style={{
                  fontSize: "0.85rem",
                  color: "var(--muted)",
                  fontWeight: 400,
                  marginLeft: "8px",
                }}
              >
                ({t("unitLabel", { number: lease.units.unit_number })})
              </span>
            )}
          </h3>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="ui-btn ui-btn-sm ui-btn-outline"
              onClick={onToggleEdit}
            >
              {editMode ? t("cancel") : t("edit")}
            </button>
            <button
              className="ui-btn ui-btn-sm ui-btn-danger"
              onClick={() =>
                onDelete(lease.id, t("leaseFor", { tenant: lease.tenant_name }))
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
                  <label className="form-label">{t("tenantName")}</label>
                  <input
                    className="form-input"
                    value={form.tenant_name}
                    onChange={(e) =>
                      setForm({ ...form, tenant_name: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("tenantEmail")}</label>
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
                  <label className="form-label">{t("tenantPhone")}</label>
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
                  <label className="form-label">{t("monthlyRent")}</label>
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
                  <label className="form-label">{t("securityDeposit")}</label>
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
                  <label className="form-label">{t("leaseStart")}</label>
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
                  <label className="form-label">{t("leaseEnd")}</label>
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
                  <label className="form-label">{t("status")}</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as LeaseRow["status"] })
                    }
                  >
                    <option value="active">{t("statusActive")}</option>
                    <option value="expired">{t("statusExpired")}</option>
                    <option value="terminated">{t("statusTerminated")}</option>
                    <option value="pending">{t("statusPending")}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t("autoRenew")}</label>
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
                    <option value="true">{t("yes")}</option>
                    <option value="false">{t("no")}</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ border: "none", padding: "20px 0 0" }}>
                <button
                  className="ui-btn ui-btn-md ui-btn-secondary"
                  onClick={onToggleEdit}
                  disabled={saving}
                >
                  {t("cancel")}
                </button>
                <button
                  className="ui-btn ui-btn-md ui-btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? t("saving") : t("saveChanges")}
                </button>
              </div>
            </>
          ) : (
            /* ---- View Mode ---- */
            <div style={{ padding: "1.25rem" }}>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("unit")}</label>
                  <div className="detail-value">{lease.units?.unit_number ? t("unitLabel", { number: lease.units.unit_number }) : "--"}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("tenantName")}</label>
                  <div className="detail-value">{lease.tenant_name}</div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("email")}</label>
                  <div className="detail-value">{lease.tenant_email ?? "--"}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("phone")}</label>
                  <div className="detail-value">{lease.tenant_phone ?? "--"}</div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("monthlyRent")}</label>
                  <div className="detail-value">{formatCurrency(lease.monthly_rent)}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("securityDeposit")}</label>
                  <div className="detail-value">{lease.security_deposit ? formatCurrency(lease.security_deposit) : "--"}</div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("leaseStart")}</label>
                  <div className="detail-value">{formatDate(lease.lease_start)}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("leaseEnd")}</label>
                  <div className="detail-value">{formatDate(lease.lease_end)}</div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("status")}</label>
                  <div className="detail-value"><LeaseStatusBadge status={lease.status} /></div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("autoRenew")}</label>
                  <div className="detail-value">{lease.auto_renew ? t("yes") : t("no")}</div>
                </div>
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
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  function formatDate(d: string | null | undefined): string {
    if (!d) return "--";
    return new Date(d).toLocaleDateString(dateLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

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
        setError(data.error || t("failedToUpdateMaintenance"));
      }
    } catch {
      setError(t("networkError"));
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
              {editMode ? t("cancel") : t("edit")}
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
                  <label className="form-label">{t("title")}</label>
                  <input
                    className="form-input"
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">{t("description")}</label>
                  <textarea
                    className="form-textarea"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    rows={3}
                    placeholder={t("describeTheIssue")}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("category")}</label>
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
                    <option value="plumbing">{t("categoryPlumbing")}</option>
                    <option value="electrical">{t("categoryElectrical")}</option>
                    <option value="hvac">{t("categoryHvac")}</option>
                    <option value="appliance">{t("categoryAppliance")}</option>
                    <option value="structural">{t("categoryStructural")}</option>
                    <option value="general">{t("categoryGeneral")}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t("priority")}</label>
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
                    <option value="low">{t("priorityLow")}</option>
                    <option value="medium">{t("priorityMedium")}</option>
                    <option value="high">{t("priorityHigh")}</option>
                    <option value="emergency">{t("priorityEmergency")}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t("status")}</label>
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
                    <option value="submitted">{t("maintStatusSubmitted")}</option>
                    <option value="assigned">{t("maintStatusAssigned")}</option>
                    <option value="in_progress">{t("maintStatusInProgress")}</option>
                    <option value="completed">{t("maintStatusCompleted")}</option>
                    <option value="closed">{t("maintStatusClosed")}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t("estimatedCost")}</label>
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
                  <label className="form-label">{t("actualCost")}</label>
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
                  <label className="form-label">{t("scheduledDate")}</label>
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
                  <label className="form-label">{t("notes")}</label>
                  <textarea
                    className="form-textarea"
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    rows={3}
                    placeholder={t("additionalNotes")}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ border: "none", padding: "20px 0 0" }}>
                <button
                  className="ui-btn ui-btn-md ui-btn-secondary"
                  onClick={onToggleEdit}
                  disabled={saving}
                >
                  {t("cancel")}
                </button>
                <button
                  className="ui-btn ui-btn-md ui-btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? t("saving") : t("saveChanges")}
                </button>
              </div>
            </>
          ) : (
            /* ---- View Mode ---- */
            <div style={{ padding: "1.25rem" }}>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("title")}</label>
                  <div className="detail-value">{maint.title}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("unit")}</label>
                  <div className="detail-value">{maint.units?.unit_number ? t("unitLabel", { number: maint.units.unit_number }) : "--"}</div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("category")}</label>
                  <div className="detail-value" style={{ textTransform: "capitalize" }}>{maint.category}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("priority")}</label>
                  <div className="detail-value"><PriorityBadge priority={maint.priority} /></div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("status")}</label>
                  <div className="detail-value"><MaintenanceStatusBadge status={maint.status} /></div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("estimatedCost")}</label>
                  <div className="detail-value">{maint.estimated_cost != null ? formatCurrency(maint.estimated_cost) : "--"}</div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("actualCost")}</label>
                  <div className="detail-value">{maint.actual_cost != null ? formatCurrency(maint.actual_cost) : "--"}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("scheduledDate")}</label>
                  <div className="detail-value">{formatDate(maint.scheduled_date)}</div>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("created")}</label>
                  <div className="detail-value">{formatDate(maint.created_at)}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("maintCompleted")}</label>
                  <div className="detail-value">{formatDate(maint.completed_at)}</div>
                </div>
              </div>
              {maint.description && (
                <div className="detail-group">
                  <label className="detail-label">{t("description")}</label>
                  <div className="detail-value--multiline">{maint.description}</div>
                </div>
              )}
              {maint.notes && (
                <div className="detail-group">
                  <label className="detail-label">{t("notes")}</label>
                  <div className="detail-value--multiline">{maint.notes}</div>
                </div>
              )}
            </div>
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
  const t = useTranslations("app");
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
        setError(data.error || t("failedToDeleteItem", { type: target.type }));
      }
    } catch {
      setError(t("networkError"));
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
          <h3>{t("confirmDelete")}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}
          <div className="delete-confirm-text">
            {t("confirmDeleteTypeAndName", { type: target.type, name: target.name })}
            <br />
            <span
              style={{
                fontSize: "0.82rem",
                color: "var(--muted)",
                marginTop: "8px",
                display: "inline-block",
              }}
            >
              {t("cannotBeUndone")}
            </span>
          </div>
          <div className="modal-footer" style={{ border: "none", padding: "16px 0 0" }}>
            <button
              className="ui-btn ui-btn-md ui-btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              {t("cancel")}
            </button>
            <button
              className="ui-btn ui-btn-md ui-btn-danger"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? t("deleting") : t("delete")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
