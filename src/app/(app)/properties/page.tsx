import Link from "next/link";
import { Building2, Plus, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProperties } from "@/lib/queries/properties";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import PropertiesImport from "./PropertiesImport";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Properties - Buildwrk",
};

function OccupancyRing({ rate }: { rate: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, rate));
  const offset = circumference - (clamped / 100) * circumference;
  const color =
    clamped >= 90
      ? "var(--color-green)"
      : clamped >= 70
        ? "var(--color-amber)"
        : "var(--color-red)";

  return (
    <div className="occupancy-ring">
      <svg viewBox="0 0 44 44">
        <circle className="occupancy-ring-track" cx="22" cy="22" r={radius} />
        <circle
          className="occupancy-ring-fill"
          cx="22"
          cy="22"
          r={radius}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="occupancy-ring-text">{Math.round(clamped)}%</span>
    </div>
  );
}

function PropertyTypeBadge({ type, labels }: { type: string; labels: Record<string, string> }) {
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

export default async function PropertiesPage() {
  const t = await getTranslations("properties");
  const supabase = await createClient();
  const ctx = await getCurrentUserCompany(supabase);

  if (!ctx) {
    return (
      <div className="properties-empty">
        <div className="properties-empty-title">{t("notAuthorized")}</div>
        <div className="properties-empty-desc">
          {t("loginToViewProperties")}
        </div>
      </div>
    );
  }

  let properties: Awaited<ReturnType<typeof getProperties>>;
  try {
    properties = await getProperties(supabase, ctx.companyId);
  } catch {
    properties = [];
  }

  // Get open maintenance counts per property
  const openStatuses = ["submitted", "assigned", "in_progress"];
  const { data: maintCounts } = await supabase
    .from("maintenance_requests")
    .select("property_id")
    .eq("company_id", ctx.companyId)
    .in("status", openStatuses);

  const maintMap = new Map<string, number>();
  for (const m of maintCounts ?? []) {
    maintMap.set(m.property_id, (maintMap.get(m.property_id) ?? 0) + 1);
  }

  // Compute summary
  const totalProperties = properties.length;
  const totalUnits = properties.reduce((sum, p) => sum + (p.total_units ?? 0), 0);
  const totalOccupied = properties.reduce((sum, p) => sum + (p.occupied_units ?? 0), 0);
  const avgOccupancy = totalUnits > 0 ? (totalOccupied / totalUnits) * 100 : 0;
  const totalNOI = properties.reduce((sum, p) => sum + (p.noi ?? 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="properties-header">
        <div>
          <h2>{t("listTitle")}</h2>
          <p>{t("listSubtitle")}</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <PropertiesImport />
          <Link href="/properties/new" className="ui-btn ui-btn-md ui-btn-primary">
            <Plus size={16} />
            {t("addProperty")}
          </Link>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="properties-summary-bar">
        <div className="card properties-summary-item">
          <span className="summary-label">{t("totalProperties")}</span>
          <span className="summary-value">{totalProperties}</span>
        </div>
        <div className="card properties-summary-item">
          <span className="summary-label">{t("totalUnits")}</span>
          <span className="summary-value">{totalUnits}</span>
          <span className="summary-sub">{totalOccupied} {t("occupied")}</span>
        </div>
        <div className="card properties-summary-item">
          <span className="summary-label">{t("avgOccupancy")}</span>
          <span className="summary-value">{formatPercent(avgOccupancy)}</span>
        </div>
        <div className="card properties-summary-item">
          <span className="summary-label">{t("totalMonthlyNOI")}</span>
          <span className="summary-value">{formatCurrency(totalNOI)}</span>
        </div>
      </div>

      {/* Property Cards Grid */}
      {properties.length === 0 ? (
        <div className="properties-empty">
          <div className="properties-empty-icon">
            <Building2 size={48} />
          </div>
          <div className="properties-empty-title">{t("noPropertiesYet")}</div>
          <div className="properties-empty-desc">
            {t("addFirstProperty")}
          </div>
          <Link href="/properties/new" className="ui-btn ui-btn-md ui-btn-primary">
            <Plus size={16} />
            {t("addProperty")}
          </Link>
        </div>
      ) : (
        <div className="properties-grid">
          {properties.map((property) => {
            const propertyTypeLabels: Record<string, string> = {
              residential: t("residential"),
              commercial: t("commercial"),
              industrial: t("industrial"),
              mixed_use: t("mixedUse"),
            };
            const occupancy = property.occupancy_rate ?? (
              property.total_units > 0
                ? (property.occupied_units / property.total_units) * 100
                : 0
            );
            const maintCount = maintMap.get(property.id) ?? 0;

            return (
              <Link
                key={property.id}
                href={`/properties/${property.id}`}
                className="card property-card"
              >
                <div className="property-card-top">
                  <div className="property-card-info">
                    <div className="property-card-name">{property.name}</div>
                    <div className="property-card-address">
                      {property.address_line1}, {property.city}, {property.state} {property.zip}
                    </div>
                  </div>
                  <div className="property-card-type">
                    <PropertyTypeBadge type={property.property_type} labels={propertyTypeLabels} />
                  </div>
                </div>

                <div className="property-card-stats">
                  <div className="property-card-stat">
                    <span className="property-card-stat-label">{t("units")}</span>
                    <span className="property-card-stat-value">
                      {property.occupied_units}/{property.total_units}
                    </span>
                  </div>
                  <div className="property-card-stat">
                    <span className="property-card-stat-label">{t("monthlyNOI")}</span>
                    <span className="property-card-stat-value">
                      {formatCurrency(property.noi ?? 0)}
                    </span>
                  </div>
                </div>

                <div className="property-card-footer">
                  <div className="property-card-occupancy">
                    <OccupancyRing rate={occupancy} />
                    <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                      {t("occupancy")}
                    </span>
                  </div>
                  {maintCount > 0 && (
                    <div className="property-card-maint">
                      <Wrench size={14} />
                      <span className="property-card-maint-count">{maintCount}</span>
                      {t("openMaint")}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
