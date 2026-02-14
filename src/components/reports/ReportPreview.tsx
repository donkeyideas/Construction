"use client";

import type { ReportType, SectionConfig, SectionData } from "@/types/authoritative-reports";
import { REPORT_THEMES, REPORT_TYPE_LABELS } from "@/types/authoritative-reports";
import { Clock } from "lucide-react";

interface ReportPreviewProps {
  reportType: ReportType;
  title: string;
  subtitle?: string;
  companyName: string;
  generatedAt?: string;
  sections: SectionConfig[];
  sectionsData: Record<string, SectionData>;
  renderSection: (sectionId: string, data: SectionData | undefined) => React.ReactNode;
}

export function ReportPreview({
  reportType,
  title,
  subtitle,
  companyName,
  generatedAt,
  sections,
  sectionsData,
  renderSection,
}: ReportPreviewProps) {
  const theme = REPORT_THEMES[reportType];
  const enabledSections = sections.filter((s) => s.enabled && s.id !== "cover");

  return (
    <div className="report-preview">
      {/* Cover page */}
      <div className="report-cover-preview" data-type={reportType}>
        <div className="report-cover-pattern" />
        <div className="report-cover-content">
          <div className="report-cover-label">
            {REPORT_TYPE_LABELS[reportType]}
          </div>
          <h1 className="report-cover-title">{title}</h1>
          {subtitle && (
            <p className="report-cover-subtitle">{subtitle}</p>
          )}
          <div className="report-cover-divider" />
          <div className="report-cover-meta">
            <div>{companyName}</div>
            <div style={{ marginTop: "0.25rem" }}>
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Sections */}
      {enabledSections.map((section, i) => (
        <div key={section.id} className="report-preview-section">
          <div className="report-preview-section-header">
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                className="report-preview-section-number"
                style={{ background: theme.primary }}
              >
                {i + 1}
              </div>
              <span className="report-preview-section-title">
                {section.label}
              </span>
            </div>
            {generatedAt && (
              <span className="data-freshness-badge">
                <Clock size={10} />
                Data as of{" "}
                {new Date(generatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
          {renderSection(section.id, sectionsData[section.id])}
        </div>
      ))}
    </div>
  );
}
