"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Download,
  Building2,
  Users,
  DollarSign,
  Headphones,
  Loader2,
  FileDown,
} from "lucide-react";

interface ExportCard {
  type: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export default function DataExportClient() {
  const t = useTranslations("superAdmin");
  const [exporting, setExporting] = useState("");

  const EXPORT_CARDS: ExportCard[] = useMemo(() => [
    {
      type: "companies",
      title: t("dataExport.companies"),
      description: t("dataExport.companiesDesc"),
      icon: <Building2 size={24} />,
    },
    {
      type: "users",
      title: t("dataExport.users"),
      description: t("dataExport.usersDesc"),
      icon: <Users size={24} />,
    },
    {
      type: "revenue",
      title: t("dataExport.revenue"),
      description: t("dataExport.revenueDesc"),
      icon: <DollarSign size={24} />,
    },
    {
      type: "tickets",
      title: t("dataExport.tickets"),
      description: t("dataExport.ticketsDesc"),
      icon: <Headphones size={24} />,
    },
  ], [t]);

  async function handleExport(type: string) {
    setExporting(type);
    try {
      const res = await fetch(`/api/super-admin/export?type=${type}`);
      if (!res.ok) {
        console.error("Export failed:", res.status);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting("");
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="admin-header">
        <div>
          <h2>{t("dataExport.title")}</h2>
          <p className="admin-header-sub">
            {t("dataExport.subtitle")}
          </p>
        </div>
      </div>

      {/* Export Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 20,
          marginTop: 8,
        }}
      >
        {EXPORT_CARDS.map((card) => (
          <div key={card.type} className="sa-card" style={{ padding: 0 }}>
            <div style={{ padding: "24px 24px 16px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: "var(--surface)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-blue)",
                    flexShrink: 0,
                  }}
                >
                  {card.icon}
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "1rem",
                      color: "var(--text)",
                    }}
                  >
                    {card.title}
                  </div>
                </div>
              </div>
              <p
                style={{
                  color: "var(--muted)",
                  fontSize: "0.85rem",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {card.description}
              </p>
            </div>
            <div
              style={{
                padding: "12px 24px 20px",
              }}
            >
              <button
                className="sa-action-btn"
                onClick={() => handleExport(card.type)}
                disabled={exporting === card.type}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  width: "100%",
                  justifyContent: "center",
                }}
              >
                {exporting === card.type ? (
                  <>
                    <Loader2
                      size={14}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                    {t("dataExport.exporting")}
                  </>
                ) : (
                  <>
                    <FileDown size={14} />
                    {t("dataExport.downloadCsv")}
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Spinner keyframe (inline, scoped) */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
