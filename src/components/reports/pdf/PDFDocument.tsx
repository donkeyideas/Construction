"use client";

import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
} from "@react-pdf/renderer";
import { styles, getTheme } from "./PDFStyles";
import type {
  SectionConfig,
  SectionData,
  MarketFeasibilityData,
  OfferingMemorandumData,
  BasisOfDesignData,
  WatermarkType,
  ReportType,
} from "@/types/authoritative-reports";
import { REPORT_TYPE_LABELS } from "@/types/authoritative-reports";

/* =========================================================
   Shared PDF Components
   ========================================================= */

function CoverPage({
  reportType,
  title,
  subtitle,
  companyName,
}: {
  reportType: ReportType;
  title: string;
  subtitle?: string;
  companyName: string;
}) {
  const theme = getTheme(reportType);

  return (
    <Page size="LETTER" style={[styles.page, styles.coverPage]}>
      {/* Background */}
      <View
        style={[styles.coverBg, { backgroundColor: theme.primary }]}
      />

      {/* Content */}
      <View style={styles.coverContent}>
        <Text style={styles.coverLabel}>
          {REPORT_TYPE_LABELS[reportType]}
        </Text>
        <Text style={styles.coverTitle}>{title}</Text>
        {subtitle && (
          <Text style={styles.coverSubtitle}>{subtitle}</Text>
        )}
        <View
          style={[styles.coverDivider, { backgroundColor: theme.accent }]}
        />
        <Text style={styles.coverMeta}>
          {companyName}
        </Text>
        <View
          style={[styles.coverAccentLine, { backgroundColor: theme.accent, opacity: 0.5 }]}
        />
        <Text style={[styles.coverMeta, { marginTop: 12 }]}>
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </Text>
      </View>
    </Page>
  );
}

/** Renders a sensitivity analysis grid (rent vs occupancy scenarios) */
function SensitivityTable({ tableData }: { tableData: Record<string, unknown>[] }) {
  const occScenarios = [-10, -5, 0, 5, 10];

  return (
    <View style={styles.sensitivityGrid}>
      {/* Header row */}
      <View style={styles.sensitivityRow}>
        <Text style={styles.sensitivityHeaderCell}>{" "}</Text>
        {occScenarios.map((occ) => (
          <Text key={occ} style={styles.sensitivityHeaderCell}>
            {occ >= 0 ? "+" : ""}{occ}% Occ
          </Text>
        ))}
      </View>
      {/* Data rows */}
      {tableData.map((row, ri) => (
        <View key={ri} style={styles.sensitivityRow}>
          <Text style={styles.sensitivityRowHeader}>
            {String(row.rent_change ?? "")}
          </Text>
          {occScenarios.map((occ) => {
            const isCenter = occ === 0 && String(row.rent_change).includes("+0");
            return (
              <Text
                key={occ}
                style={isCenter ? styles.sensitivityHighlight : styles.sensitivityCell}
              >
                {String(row[`occ_${occ}`] ?? "")}
              </Text>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function SectionPage({
  reportType,
  sectionNumber,
  sectionTitle,
  data,
  watermark,
  companyName,
  isAiGenerated,
  children,
}: {
  reportType: ReportType;
  sectionNumber: number;
  sectionTitle: string;
  data?: SectionData;
  watermark: WatermarkType;
  companyName: string;
  isAiGenerated?: boolean;
  children?: React.ReactNode;
}) {
  const theme = getTheme(reportType);
  const hasAnyContent = data?.narrative || data?.kpis || data?.tableData;

  return (
    <Page size="LETTER" style={styles.page} wrap>
      {/* Top accent bar */}
      <View
        style={[styles.accentBar, { backgroundColor: theme.primary }]}
      />

      {/* Left side stripe */}
      <View
        style={[
          styles.sideStripe,
          { backgroundColor: theme.accent, opacity: 0.3 },
        ]}
      />

      {/* Corner decorations */}
      <View style={styles.cornerBracketTL} />
      <View style={styles.cornerBracketBR} />

      {/* Watermark */}
      {watermark && (
        <Text style={styles.watermark}>
          {watermark.toUpperCase()}
        </Text>
      )}

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <View
          style={[
            styles.sectionNumber,
            { backgroundColor: theme.primary },
          ]}
        >
          <Text style={styles.sectionNumberText}>{sectionNumber}</Text>
        </View>
        <Text style={[styles.sectionTitle, { color: theme.primary }]}>
          {sectionTitle}
        </Text>
      </View>
      <View
        style={[
          styles.sectionDividerLine,
          { backgroundColor: theme.accent, opacity: 0.4 },
        ]}
      />

      {/* Narrative text */}
      {data?.narrative ? (
        <Text style={[styles.narrative, { marginTop: 14 }]}>
          {data.narrative}
        </Text>
      ) : isAiGenerated && !hasAnyContent ? (
        <Text style={styles.placeholder}>
          AI-generated narrative not available. Configure an AI provider in Admin &gt; AI Providers to enable auto-generated content for this section.
        </Text>
      ) : null}

      {/* KPIs */}
      {data?.kpis && (
        <View style={styles.kpiGrid}>
          {data.kpis.map((kpi, i) => (
            <View key={i} style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: theme.primary }]}>
                {kpi.value}
              </Text>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Table with columns */}
      {data?.tableData && data.tableColumns && (
        <View style={styles.table}>
          <View
            style={[
              styles.tableHeaderRow,
              { borderBottomColor: theme.primary },
            ]}
          >
            {data.tableColumns.map((col, i) => (
              <Text
                key={i}
                style={[
                  styles.tableHeaderCell,
                  {
                    width: `${100 / data.tableColumns!.length}%`,
                    textAlign:
                      col.format === "currency" || col.format === "number"
                        ? "right"
                        : "left",
                  },
                ]}
              >
                {col.label}
              </Text>
            ))}
          </View>
          {data.tableData.map((row, ri) => (
            <View
              key={ri}
              style={ri % 2 === 1 ? styles.tableRowAlt : styles.tableRow}
            >
              {data.tableColumns!.map((col, ci) => (
                <Text
                  key={ci}
                  style={[
                    col.format === "currency" || col.format === "number"
                      ? styles.tableCellRight
                      : styles.tableCell,
                    { width: `${100 / data.tableColumns!.length}%` },
                  ]}
                >
                  {col.format === "currency"
                    ? `$${Number(row[col.key] ?? 0).toLocaleString()}`
                    : String(row[col.key] ?? "")}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Sensitivity table (rent vs occupancy grid) */}
      {data?.tableData && !data.tableColumns && data.tableData.length > 0 && "rent_change" in data.tableData[0] && (
        <SensitivityTable tableData={data.tableData as Record<string, unknown>[]} />
      )}

      {/* Field/Value table (definition-list style, no tableColumns) */}
      {data?.tableData && !data.tableColumns && data.tableData.length > 0 && "field" in data.tableData[0] && (
        <View style={styles.fieldValueTable}>
          {data.tableData.map((row, ri) => (
            <View
              key={ri}
              style={[
                styles.fieldValueRow,
                ri % 2 === 1 ? { backgroundColor: "#F8F8F8" } : {},
              ]}
            >
              <Text style={styles.fieldValueField}>
                {String(row.field ?? "")}
              </Text>
              <Text style={styles.fieldValueValue}>
                {String(row.value ?? "")}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Custom children */}
      {children}

      {/* Footer */}
      <View style={styles.footer} fixed>
        <Text style={styles.footerText}>
          {companyName} | {REPORT_TYPE_LABELS[reportType]}
        </Text>
        <Text
          style={styles.footerPage}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
        />
      </View>
    </Page>
  );
}

/* =========================================================
   Market Feasibility PDF
   ========================================================= */

export function MarketFeasibilityPDF({
  companyName,
  reportData,
  sections,
  sectionsData,
  watermark,
}: {
  companyName: string;
  reportData: MarketFeasibilityData;
  sections: SectionConfig[];
  sectionsData: Record<string, SectionData>;
  watermark: WatermarkType;
}) {
  const enabledSections = sections.filter(
    (s) => s.enabled && s.id !== "cover"
  );

  const propertyName = reportData.properties[0]?.name ?? "Property";
  const subtitle = reportData.properties[0]
    ? [
        reportData.properties[0].address,
        reportData.properties[0].city,
        reportData.properties[0].state,
      ]
        .filter(Boolean)
        .join(", ")
    : undefined;

  return (
    <Document>
      <CoverPage
        reportType="market_feasibility"
        title={`Market Feasibility Study: ${propertyName}`}
        subtitle={subtitle}
        companyName={companyName}
      />

      {enabledSections.map((section, i) => (
        <SectionPage
          key={section.id}
          reportType="market_feasibility"
          sectionNumber={i + 1}
          sectionTitle={section.label}
          data={sectionsData[section.id]}
          watermark={watermark}
          companyName={companyName}
          isAiGenerated={section.aiGenerated}
        />
      ))}
    </Document>
  );
}

/* =========================================================
   Offering Memorandum PDF
   ========================================================= */

export function OfferingMemorandumPDF({
  companyName,
  reportData,
  sections,
  sectionsData,
  watermark,
}: {
  companyName: string;
  reportData: OfferingMemorandumData;
  sections: SectionConfig[];
  sectionsData: Record<string, SectionData>;
  watermark: WatermarkType;
}) {
  const enabledSections = sections.filter(
    (s) => s.enabled && s.id !== "cover"
  );

  const propertyName = reportData.properties[0]?.name ?? "Property";

  return (
    <Document>
      <CoverPage
        reportType="offering_memorandum"
        title={`Offering Memorandum: ${propertyName}`}
        companyName={companyName}
      />

      {enabledSections.map((section, i) => (
        <SectionPage
          key={section.id}
          reportType="offering_memorandum"
          sectionNumber={i + 1}
          sectionTitle={section.label}
          data={sectionsData[section.id]}
          watermark={watermark}
          companyName={companyName}
          isAiGenerated={section.aiGenerated}
        />
      ))}
    </Document>
  );
}

/* =========================================================
   Basis of Design PDF
   ========================================================= */

export function BasisOfDesignPDF({
  companyName,
  reportData,
  sections,
  sectionsData,
  watermark,
}: {
  companyName: string;
  reportData: BasisOfDesignData;
  sections: SectionConfig[];
  sectionsData: Record<string, SectionData>;
  watermark: WatermarkType;
}) {
  const enabledSections = sections.filter(
    (s) => s.enabled && s.id !== "cover"
  );

  const projectName = reportData.projects[0]?.name ?? "Project";

  return (
    <Document>
      <CoverPage
        reportType="basis_of_design"
        title={`Basis of Design: ${projectName}`}
        companyName={companyName}
      />

      {enabledSections.map((section, i) => (
        <SectionPage
          key={section.id}
          reportType="basis_of_design"
          sectionNumber={i + 1}
          sectionTitle={section.label}
          data={sectionsData[section.id]}
          watermark={watermark}
          companyName={companyName}
          isAiGenerated={section.aiGenerated}
        />
      ))}
    </Document>
  );
}
