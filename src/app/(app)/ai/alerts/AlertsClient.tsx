"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  AlertTriangle,
  DollarSign,
  ShieldAlert,
  Clipboard,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import { detectAnomalies, type AlertItem } from "@/lib/ai/analysis";
import "@/styles/ai-features.css";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AlertsClientProps {
  invoicesWithoutJE: {
    id: string;
    invoice_number: string;
    total_amount: number;
  }[];
  budgetsOver90Pct: {
    projectName: string;
    budgeted: number;
    actual: number;
    pct: number;
  }[];
  unpostedJEs: {
    id: string;
    entry_number: string;
    entry_date: string;
    total_debit: number;
    daysInDraft: number;
  }[];
  expiringCerts: {
    personName: string;
    certName: string;
    expiresAt: string;
  }[];
  overdueRFIs: {
    id: string;
    rfi_number: string;
    subject: string;
    daysPending: number;
  }[];
  pendingCOs: {
    id: string;
    co_number: string;
    amount: number;
    daysPending: number;
  }[];
  overdueEquipment: {
    id: string;
    name: string;
    daysPastDue: number;
  }[];
  overdueTasks: {
    id: string;
    taskName: string;
    projectName: string;
    daysOverdue: number;
  }[];
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

type FilterCategory = "all" | "financial" | "safety" | "project" | "equipment";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCategoryIcon(category: AlertItem["category"]) {
  switch (category) {
    case "financial":
      return <DollarSign size={16} />;
    case "safety":
      return <ShieldAlert size={16} />;
    case "project":
      return <Clipboard size={16} />;
    case "equipment":
      return <Wrench size={16} />;
    default:
      return <AlertTriangle size={16} />;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AlertsClient(props: AlertsClientProps) {
  const t = useTranslations("ai");
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");

  const filterOptions = useMemo(
    () => [
      { key: "all" as const, label: t("alerts.filterAll") },
      { key: "financial" as const, label: t("alerts.filterFinancial") },
      { key: "safety" as const, label: t("alerts.filterSafety") },
      { key: "project" as const, label: t("alerts.filterProject") },
      { key: "equipment" as const, label: t("alerts.filterEquipment") },
    ],
    [t]
  );

  // Convert raw data into unified alerts using the analysis engine
  const alerts: AlertItem[] = useMemo(
    () =>
      detectAnomalies({
        invoicesWithoutJE: props.invoicesWithoutJE,
        budgetsOver90Pct: props.budgetsOver90Pct,
        unpostedJEs: props.unpostedJEs,
        expiringCerts: props.expiringCerts,
        overdueRFIs: props.overdueRFIs,
        pendingCOs: props.pendingCOs,
        overdueEquipment: props.overdueEquipment,
        overdueTasks: props.overdueTasks,
      }),
    [props]
  );

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: alerts.length,
      financial: 0,
      safety: 0,
      project: 0,
      equipment: 0,
    };
    for (const a of alerts) {
      counts[a.category] = (counts[a.category] ?? 0) + 1;
    }
    return counts;
  }, [alerts]);

  // Severity counts
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;
  const infoCount = alerts.filter((a) => a.severity === "info").length;

  // Filtered alerts
  const filteredAlerts =
    activeFilter === "all"
      ? alerts
      : alerts.filter((a) => a.category === activeFilter);

  return (
    <div className="ai-feature-page">
      {/* ── Header ── */}
      <div className="ai-feature-header">
        <div>
          <h1>
            <AlertTriangle size={28} className="sparkle-icon" />
            {t("alerts.title")}
          </h1>
          <p className="subtitle">
            {t("alerts.subtitle")}
          </p>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="ai-kpi-grid">
        <div className="ai-kpi-card kpi-critical">
          <span className="kpi-label">{t("alerts.criticalAlerts")}</span>
          <span className="kpi-value" style={{ color: "var(--color-red)" }}>
            {criticalCount}
          </span>
        </div>
        <div className="ai-kpi-card kpi-warning">
          <span className="kpi-label">{t("alerts.warningAlerts")}</span>
          <span className="kpi-value" style={{ color: "var(--color-amber)" }}>
            {warningCount}
          </span>
        </div>
        <div className="ai-kpi-card kpi-info">
          <span className="kpi-label">{t("alerts.infoAlerts")}</span>
          <span className="kpi-value" style={{ color: "var(--color-blue)" }}>
            {infoCount}
          </span>
        </div>
        <div className="ai-kpi-card kpi-good">
          <span className="kpi-label">{t("alerts.totalAlerts")}</span>
          <span className="kpi-value">{alerts.length}</span>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="alert-filters">
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            className={`alert-filter-btn${activeFilter === opt.key ? " active" : ""}`}
            onClick={() => setActiveFilter(opt.key)}
          >
            {opt.label}
            <span className="alert-count-badge">{categoryCounts[opt.key]}</span>
          </button>
        ))}
      </div>

      {/* ── Alert List ── */}
      {filteredAlerts.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 20px",
            color: "var(--muted)",
            textAlign: "center",
            gap: 12,
          }}
        >
          <CheckCircle2 size={48} style={{ color: "var(--color-green)" }} />
          <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)" }}>
            {t("alerts.noAlerts")}
          </p>
        </div>
      ) : (
        <div className="alert-list">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`alert-card alert-${alert.severity}`}
            >
              <div className="alert-icon">
                {getCategoryIcon(alert.category)}
              </div>
              <div className="alert-body">
                <div className="alert-title">{alert.title}</div>
                <div className="alert-description">{alert.description}</div>
                {alert.metric && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      marginRight: 12,
                    }}
                  >
                    {alert.metric}
                  </span>
                )}
                {alert.actionUrl && (
                  <Link href={alert.actionUrl} className="alert-action">
                    {t("alerts.view")}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
