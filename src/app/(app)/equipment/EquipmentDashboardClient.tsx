"use client";

import Link from "next/link";
import {
  Package,
  CheckCircle2,
  Clock,
  Wrench,
  ArrowRight,
  Truck,
  ClipboardList,
  Settings,
} from "lucide-react";
import type { EquipmentRow, EquipmentStats } from "@/lib/queries/equipment";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  available: "Available",
  in_use: "In Use",
  maintenance: "Maintenance",
  retired: "Retired",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
  return (
    <div className="equipment-page">
      {/* Header */}
      <div className="equipment-header">
        <div>
          <h2>Equipment</h2>
          <p className="equipment-header-sub">
            Manage your fleet, assignments, and maintenance
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
            <span className="equipment-stat-label">Total Equipment</span>
          </div>
        </div>
        <div className="equipment-stat-card stat-available">
          <div className="equipment-stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{stats.available}</span>
            <span className="equipment-stat-label">Available</span>
          </div>
        </div>
        <div className="equipment-stat-card stat-in-use">
          <div className="equipment-stat-icon">
            <Clock size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{stats.in_use}</span>
            <span className="equipment-stat-label">In Use</span>
          </div>
        </div>
        <div className="equipment-stat-card stat-maintenance">
          <div className="equipment-stat-icon">
            <Wrench size={20} />
          </div>
          <div className="equipment-stat-info">
            <span className="equipment-stat-value">{stats.maintenance}</span>
            <span className="equipment-stat-label">Maintenance</span>
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
            <h4>Inventory</h4>
            <p>View and manage all equipment</p>
          </div>
          <ArrowRight size={16} className="equipment-quick-link-arrow" />
        </Link>

        <Link href="/equipment/assignments" className="equipment-quick-link">
          <div className="equipment-quick-link-icon" style={{ background: "var(--color-amber-light)", color: "var(--color-amber)" }}>
            <ClipboardList size={22} />
          </div>
          <div className="equipment-quick-link-info">
            <h4>Assignments</h4>
            <p>Track check-outs and returns</p>
          </div>
          <ArrowRight size={16} className="equipment-quick-link-arrow" />
        </Link>

        <Link href="/equipment/maintenance" className="equipment-quick-link">
          <div className="equipment-quick-link-icon" style={{ background: "rgba(22, 163, 74, 0.08)", color: "var(--color-green)" }}>
            <Settings size={22} />
          </div>
          <div className="equipment-quick-link-info">
            <h4>Maintenance</h4>
            <p>Schedule and log maintenance</p>
          </div>
          <ArrowRight size={16} className="equipment-quick-link-arrow" />
        </Link>
      </div>

      {/* Recent Equipment */}
      {equipment.length > 0 && (
        <div className="equipment-recent-section">
          <div className="equipment-recent-header">
            <h3>Recent Equipment</h3>
            <Link href="/equipment/inventory" className="equipment-view-all">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="equipment-table-wrap">
            <table className="equipment-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Project</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((item) => (
                  <tr key={item.id}>
                    <td className="equipment-name-cell">{item.name}</td>
                    <td className="equipment-type-cell">{item.equipment_type}</td>
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
    </div>
  );
}
