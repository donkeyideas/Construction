import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Download, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { REPORT_TYPE_LABELS } from "@/types/authoritative-reports";
import type { ReportType, SectionConfig, SectionData } from "@/types/authoritative-reports";

export const metadata = {
  title: "View Report - Buildwrk",
};

export default async function SavedReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const { reportId } = await params;

  const { data: report, error } = await supabase
    .from("authoritative_reports")
    .select("*")
    .eq("id", reportId)
    .eq("company_id", userCompany.companyId)
    .single();

  if (error || !report) {
    notFound();
  }

  const sections = (report.section_config as SectionConfig[]) ?? [];
  const sectionsData = (report.sections_data as Record<string, SectionData>) ?? {};
  const enabledSections = sections.filter((s) => s.enabled && s.id !== "cover");

  function fmt(n: number | null | undefined): string {
    if (n == null) return "$0";
    return `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }

  return (
    <div>
      <Link
        href="/reports/authoritative"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          color: "var(--muted)",
          textDecoration: "none",
          fontSize: "0.85rem",
          marginBottom: "1.5rem",
        }}
      >
        <ArrowLeft size={14} /> Back to Authoritative Reports
      </Link>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <span
              className="saved-report-type-badge"
              data-type={report.report_type}
            >
              {REPORT_TYPE_LABELS[report.report_type as ReportType]}
            </span>
            <span
              className="saved-report-status"
              data-status={report.status}
            >
              {report.status}
            </span>
          </div>
          <h2 style={{ fontFamily: "var(--font-serif, Georgia, serif)", margin: 0 }}>
            {report.title}
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
            <Clock size={12} style={{ marginRight: 4 }} />
            Last updated{" "}
            {new Date(report.updated_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Report preview */}
      <div className="report-preview">
        {/* Cover */}
        <div className="report-cover-preview" data-type={report.report_type}>
          <div className="report-cover-pattern" />
          <div className="report-cover-content">
            <div className="report-cover-label">
              {REPORT_TYPE_LABELS[report.report_type as ReportType]}
            </div>
            <h1 className="report-cover-title">{report.title}</h1>
            <div className="report-cover-divider" />
            <div className="report-cover-meta">
              <div>{userCompany.companyName}</div>
            </div>
          </div>
        </div>

        {/* Sections */}
        {enabledSections.map((section, i) => {
          const data = sectionsData[section.id];
          return (
            <div key={section.id} className="report-preview-section">
              <div className="report-preview-section-header">
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div
                    className="report-preview-section-number"
                    style={{
                      background:
                        report.report_type === "market_feasibility"
                          ? "#1B2A4A"
                          : report.report_type === "offering_memorandum"
                            ? "#0D3B3E"
                            : "#2D2D3D",
                    }}
                  >
                    {i + 1}
                  </div>
                  <span className="report-preview-section-title">
                    {section.label}
                  </span>
                </div>
              </div>

              {data?.narrative && (
                <div className="narrative-text">{data.narrative}</div>
              )}

              {data?.kpis && (
                <div className="report-kpi-grid">
                  {data.kpis.map((kpi, j) => (
                    <div key={j} className="report-kpi-card">
                      <div className="report-kpi-value">{kpi.value}</div>
                      <div className="report-kpi-label">{kpi.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {data?.tableData && data.tableColumns && (
                <table className="report-data-table">
                  <thead>
                    <tr>
                      {data.tableColumns.map((col) => (
                        <th key={col.key}>{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.tableData.map((row, ri) => (
                      <tr key={ri}>
                        {data.tableColumns!.map((col) => (
                          <td
                            key={col.key}
                            className={
                              col.format === "currency" ? "currency" : ""
                            }
                          >
                            {col.format === "currency"
                              ? fmt(row[col.key] as number)
                              : String(row[col.key] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {data?.tableData &&
                !data.tableColumns &&
                Array.isArray(data.tableData) &&
                data.tableData.length > 0 &&
                "field" in data.tableData[0] && (
                  <table className="report-data-table">
                    <tbody>
                      {data.tableData.map((row, ri) => (
                        <tr key={ri}>
                          <td style={{ fontWeight: 600, width: "30%" }}>
                            {String(row.field)}
                          </td>
                          <td>{String(row.value ?? "")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
