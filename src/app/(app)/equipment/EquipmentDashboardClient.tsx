"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  Package,
  CheckCircle2,
  Clock,
  Wrench,
  ArrowRight,
  Truck,
  ClipboardList,
  Settings,
  X,
} from "lucide-react";
import type { EquipmentRow, EquipmentStats } from "@/lib/queries/equipment";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function getUserName(
  user: { id: string; full_name: string; email: string } | null | undefined
): string {
  if (!user) return "--";
  return user.full_name || user.email || "Unknown";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface EquipmentDashboardClientProps {
  equipment: EquipmentRow[];
  stats: EquipmentStats;
}

export default function EquipmentDashboardClient({
  equipment,
  stats,
}: EquipmentDashboardClientProps) {
  const t = useTranslations("equipment");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const [selectedItem, setSelectedItem] = useState<EquipmentRow | null>(null);

  const STATUS_LABELS: Record<string, string> = {
    available: t("statusAvailable"),
    in_use: t("statusInUse"),
    maintenance: t("statusMaintenance"),
    retired: t("statusRetired"),
  };

  const EQUIPMENT_TYPES: Record<string, string> = {
    excavator: t("typeExcavator"),
    loader: t("typeLoader"),
    crane: t("typeCrane"),
    truck: t("typeTruck"),
    generator: t("typeGenerator"),
    compressor: t("typeCompressor"),
    scaffold: t("typeScaffold"),
    tools: t("typeTools"),
    other: t("typeOther"),
  };

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString(dateLocale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="equipment-page">
      {/* Header */}
      <div className="equipment-header">
        <div>
          <h2>{t("equipment")}</h2>
          <p className="equipment-header-sub">
            {t("manageFleetDescription")}
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="equipment-stats">
        <div className="equipment-stat-card stat-available">
          <div className="equipment-stat-icon">
            <Package size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{stats.total}</span>
            <span className="equipment-stat-label">{t("totalEquipment")}</span>
          </div>
        </div>
        <div className="equipment-stat-card stat-available">
          <div className="equipment-stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{stats.available}</span>
            <span className="equipment-stat-label">{t("statusAvailable")}</span>
          </div>
        </div>
        <div className="equipment-stat-card stat-in-use">
          <div className="equipment-stat-icon">
            <Clock size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{stats.in_use}</span>
            <span className="equipment-stat-label">{t("statusInUse")}</span>
          </div>
        </div>
        <div className="equipment-stat-card stat-maintenance">
          <div className="equipment-stat-icon">
            <Wrench size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{stats.maintenance}</span>
            <span className="equipment-stat-label">{t("statusMaintenance")}</span>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="equipment-quick-links">
        <Link href="/equipment/inventory" className="equipment-quick-link">
          <div className="equipment-quick-link-icon" style={{ background: "var(--color-blue-light)", color: "var(--color-blue)" }}>
            <Truck size={22} />
          </div>
          <div className="equipment-quick-link-info">
            <h4>{t("inventory")}</h4>
            <p>{t("viewAndManageAllEquipment")}</p>
          </div>
          <ArrowRight size={16} className="equipment-quick-link-arrow" />
        </Link>

        <Link href="/equipment/assignments" className="equipment-quick-link">
          <div className="equipment-quick-link-icon" style={{ background: "var(--color-amber-light)", color: "var(--color-amber)" }}>
            <ClipboardList size={22} />
          </div>
          <div className="equipment-quick-link-info">
            <h4>{t("assignments")}</h4>
            <p>{t("trackCheckOutsAndReturns")}</p>
          </div>
          <ArrowRight size={16} className="equipment-quick-link-arrow" />
        </Link>

        <Link href="/equipment/maintenance" className="equipment-quick-link">
          <div className="equipment-quick-link-icon" style={{ background: "rgba(22, 163, 74, 0.08)", color: "var(--color-green)" }}>
            <Settings size={22} />
          </div>
          <div className="equipment-quick-link-info">
            <h4>{t("maintenance")}</h4>
            <p>{t("scheduleAndLogMaintenance")}</p>
          </div>
          <ArrowRight size={16} className="equipment-quick-link-arrow" />
        </Link>
      </div>

      {/* Recent Equipment */}
      {equipment.length > 0 && (
        <div className="equipment-recent-section">
          <div className="equipment-recent-header">
            <h3>{t("recentEquipment")}</h3>
            <Link href="/equipment/inventory" className="equipment-view-all">
              {t("viewAll")} <ArrowRight size={14} />
            </Link>
          </div>
          <div className="equipment-table-wrap">
            <table className="equipment-table">
              <thead>
                <tr>
                  <th>{t("columnName")}</th>
                  <th>{t("columnType")}</th>
                  <th>{t("columnStatus")}</th>
                  <th>{t("columnProject")}</th>
                  <th>{t("columnAdded")}</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((item) => (
                  <tr
                    key={item.id}
                    className="equipment-table-row"
                    onClick={() => setSelectedItem(item)}
                  >
                    <td className="equipment-name-cell">{item.name}</td>
                    <td className="equipment-type-cell">
                      {EQUIPMENT_TYPES[item.equipment_type] ?? item.equipment_type}
                    </td>
                    <td>
                      <span className={`equipment-status-badge status-${item.status}`}>
                        {STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    </td>
                    <td className="equipment-project-cell">
                      {item.project?.name || "--"}
                    </td>
                    <td className="equipment-date-cell">
                      {formatDate(item.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Equipment Detail Modal */}
      {selectedItem && (
        <div className="equipment-modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="equipment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="equipment-modal-header">
              <h3>{selectedItem.name}</h3>
              <button className="equipment-modal-close" onClick={() => setSelectedItem(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "0 0 0.5rem" }}>
              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("columnName")}</label>
                  <div className="detail-value">{selectedItem.name}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("columnType")}</label>
                  <div className="detail-value">
                    {EQUIPMENT_TYPES[selectedItem.equipment_type] ?? selectedItem.equipment_type}
                  </div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("labelMake")}</label>
                  <div className="detail-value">{selectedItem.make || "--"}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("labelModel")}</label>
                  <div className="detail-value">{selectedItem.model || "--"}</div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("labelSerialNumber")}</label>
                  <div className="detail-value">{selectedItem.serial_number || "--"}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("columnStatus")}</label>
                  <div className="detail-value">
                    <span className={`equipment-status-badge status-${selectedItem.status}`}>
                      {STATUS_LABELS[selectedItem.status] ?? selectedItem.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("labelCurrentProject")}</label>
                  <div className="detail-value">{selectedItem.project?.name || "--"}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("labelAssignedTo")}</label>
                  <div className="detail-value">{getUserName(selectedItem.assignee)}</div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("labelPurchaseDate")}</label>
                  <div className="detail-value">{formatDate(selectedItem.purchase_date)}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("labelPurchaseCost")}</label>
                  <div className="detail-value">{formatCurrency(selectedItem.purchase_cost)}</div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("labelHourlyRate")}</label>
                  <div className="detail-value">
                    {selectedItem.hourly_rate ? `${formatCurrency(selectedItem.hourly_rate)}/hr` : "--"}
                  </div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("labelTotalHours")}</label>
                  <div className="detail-value">{selectedItem.total_hours ?? "--"}</div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("labelLastMaintenance")}</label>
                  <div className="detail-value">{formatDate(selectedItem.last_maintenance_date)}</div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">{t("labelNextMaintenance")}</label>
                  <div className="detail-value">{formatDate(selectedItem.next_maintenance_date)}</div>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">{t("columnAdded")}</label>
                  <div className="detail-value">{formatDate(selectedItem.created_at)}</div>
                </div>
              </div>

              <div className="equipment-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedItem(null)}
                >
                  {t("close")}
                </button>
                <Link
                  href="/equipment/inventory"
                  className="btn-primary"
                  style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  {t("viewInInventory")}
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
