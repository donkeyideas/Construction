"use client";

import { useState, useCallback } from "react";
import { Building2, MapPin, Users, DollarSign, ArrowLeft, X } from "lucide-react";
import Link from "next/link";
import { ReportWizard } from "@/components/reports/ReportWizard";
import { ReportToolbar } from "@/components/reports/ReportToolbar";
import { ReportPreview } from "@/components/reports/ReportPreview";
import { NarrativeEditor } from "@/components/reports/NarrativeEditor";
import { RentCompChart } from "@/components/reports/charts/RentCompChart";
import { CashFlowProjectionChart } from "@/components/reports/charts/CashFlowProjectionChart";
import {
  MARKET_FEASIBILITY_SECTIONS,
  REPORT_THEMES,
} from "@/types/authoritative-reports";
import type {
  SectionConfig,
  SectionData,
  MarketFeasibilityData,
  WatermarkType,
} from "@/types/authoritative-reports";

interface Property {
  id: string;
  name: string;
  property_type: string;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  total_units: number;
  occupied_units: number;
  occupancy_rate: number | null;
  monthly_revenue: number | null;
  noi: number | null;
  current_value: number | null;
}

interface MarketFeasibilityClientProps {
  properties: Property[];
  companyId: string;
  companyName: string;
}

const WIZARD_STEPS = [
  { label: "Select Property" },
  { label: "Configure & Generate" },
  { label: "Preview & Download" },
];

const theme = REPORT_THEMES.market_feasibility;

function fmt(n: number | null | undefined): string {
  if (n == null) return "$0";
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function pct(n: number | null | undefined): string {
  if (n == null) return "0%";
  return `${n.toFixed(1)}%`;
}

export function MarketFeasibilityClient({
  properties,
  companyId,
  companyName,
}: MarketFeasibilityClientProps) {
  const [step, setStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparative, setComparative] = useState(false);
  const [sections, setSections] = useState<SectionConfig[]>(
    MARKET_FEASIBILITY_SECTIONS.map((s) => ({ ...s }))
  );
  const [sectionsData, setSectionsData] = useState<Record<string, SectionData>>(
    {}
  );
  const [reportData, setReportData] = useState<MarketFeasibilityData | null>(
    null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingSections, setGeneratingSections] = useState<Set<string>>(
    new Set()
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [watermark, setWatermark] = useState<WatermarkType>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Toggle property selection
  const toggleProperty = (id: string) => {
    if (comparative) {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
      );
    } else {
      setSelectedIds([id]);
    }
  };

  const selectedProperties = properties.filter((p) =>
    selectedIds.includes(p.id)
  );

  // Fetch data from server
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/authoritative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "fetch_data",
          reportType: "market_feasibility",
          propertyIds: selectedIds,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
        return data as MarketFeasibilityData;
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
    return null;
  }, [selectedIds]);

  // Generate AI narratives for a section
  const generateNarrative = useCallback(
    async (sectionId: string, data: MarketFeasibilityData) => {
      setGeneratingSections((prev) => new Set([...prev, sectionId]));
      try {
        const res = await fetch(
          "/api/reports/authoritative/generate-narrative",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reportType: "market_feasibility",
              sectionId,
              data,
              companyName,
              propertyName: data.properties[0]?.name ?? "",
            }),
          }
        );
        if (res.ok) {
          const { narrative } = await res.json();
          setSectionsData((prev) => ({
            ...prev,
            [sectionId]: {
              ...prev[sectionId],
              narrative,
            },
          }));
        } else {
          setSectionsData((prev) => ({
            ...prev,
            [sectionId]: {
              ...prev[sectionId],
              narrative:
                "AI narrative generation not available. Configure an AI provider in Admin > AI Providers to enable auto-generated narratives.",
            },
          }));
        }
      } catch (err) {
        console.error(`Failed to generate ${sectionId}:`, err);
        setSectionsData((prev) => ({
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            narrative:
              "AI narrative generation not available. Configure an AI provider in Admin > AI Providers to enable auto-generated narratives.",
          },
        }));
      }
      setGeneratingSections((prev) => {
        const next = new Set(prev);
        next.delete(sectionId);
        return next;
      });
    },
    [companyName]
  );

  // Generate full report
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    const data = await fetchData();
    if (!data) {
      setIsGenerating(false);
      return;
    }

    // Build data-only sections
    const newSectionsData: Record<string, SectionData> = {};

    // Property Overview KPIs
    if (data.properties.length > 0) {
      const p = data.properties[0];
      newSectionsData.property_overview = {
        kpis: [
          { label: "Total Units", value: String(p.total_units), icon: "building" },
          { label: "Occupancy", value: pct(p.occupancy_rate), icon: "users" },
          { label: "Monthly Revenue", value: fmt(p.monthly_revenue), icon: "dollar" },
          { label: "NOI", value: fmt(p.noi), icon: "trending" },
          { label: "Current Value", value: fmt(p.current_value), icon: "building" },
          {
            label: "Cap Rate",
            value:
              p.current_value && p.noi
                ? pct(((p.noi * 12) / p.current_value) * 100)
                : "N/A",
            icon: "percent",
          },
        ],
        tableData: [
          {
            field: "Address",
            value: [p.address, p.city, p.state, p.zip].filter(Boolean).join(", "),
          },
          { field: "Property Type", value: p.property_type.replace(/_/g, " ") },
          { field: "Year Built", value: p.year_built ?? "N/A" },
          { field: "Total Sq Ft", value: p.total_sqft?.toLocaleString() ?? "N/A" },
        ],
      };
    }

    // Unit mix
    newSectionsData.unit_mix = {
      tableData: data.unitMix.map((u) => ({
        type: u.unit_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        count: u.count,
        avg_sqft: u.avg_sqft,
        avg_rent: u.avg_market_rent,
        occupied: u.occupied,
        vacant: u.vacant,
      })),
      tableColumns: [
        { key: "type", label: "Unit Type" },
        { key: "count", label: "Count", format: "number" },
        { key: "avg_sqft", label: "Avg Sq Ft", format: "number" },
        { key: "avg_rent", label: "Avg Rent", format: "currency" },
        { key: "occupied", label: "Occupied", format: "number" },
        { key: "vacant", label: "Vacant", format: "number" },
      ],
      chartType: "rent_comp",
      chartData: data.unitMix.map((u) => ({
        unit_type: u.unit_type,
        avg_market_rent: u.avg_market_rent,
      })),
    };

    // Financial Pro Forma
    newSectionsData.financial_proforma = {
      kpis: [
        { label: "Total Revenue", value: fmt(data.financialSummary.totalRevenue) },
        { label: "Total Expenses", value: fmt(data.financialSummary.totalExpenses) },
        { label: "Net Income", value: fmt(data.financialSummary.netIncome) },
        { label: "Accounts Receivable", value: fmt(data.financialSummary.totalAR) },
        { label: "Accounts Payable", value: fmt(data.financialSummary.totalAP) },
      ],
    };

    // Sensitivity analysis
    if (data.properties.length > 0) {
      const p = data.properties[0];
      const baseNOI = p.noi;
      const baseValue = p.current_value ?? 0;
      const occupancyScenarios = [-10, -5, 0, 5, 10];
      const rentScenarios = [-10, -5, 0, 5, 10];

      newSectionsData.sensitivity = {
        tableData: rentScenarios.map((rentDelta) => {
          const row: Record<string, unknown> = {
            rent_change: `${rentDelta >= 0 ? "+" : ""}${rentDelta}% Rent`,
          };
          for (const occDelta of occupancyScenarios) {
            const adjRevenue =
              p.monthly_revenue * (1 + rentDelta / 100) * (1 + occDelta / 100);
            const adjNOI = adjRevenue - p.monthly_expenses;
            const annualNOI = adjNOI * 12;
            const capRate = baseValue > 0 ? (annualNOI / baseValue) * 100 : 0;
            row[`occ_${occDelta}`] = capRate.toFixed(2) + "%";
          }
          return row;
        }),
      };
    }

    // Competitive analysis
    if (data.portfolioComps.length > 0) {
      newSectionsData.competitive_analysis = {
        ...newSectionsData.competitive_analysis,
        tableData: data.portfolioComps.map((c) => ({
          name: c.name,
          type: c.property_type,
          units: c.total_units,
          occupancy: pct(c.occupancy_rate),
          noi: fmt(c.noi),
          rent_per_unit:
            c.total_units > 0
              ? fmt(c.monthly_revenue / c.total_units)
              : "$0",
        })),
        tableColumns: [
          { key: "name", label: "Property" },
          { key: "type", label: "Type" },
          { key: "units", label: "Units", format: "number" },
          { key: "occupancy", label: "Occupancy" },
          { key: "noi", label: "Monthly NOI" },
          { key: "rent_per_unit", label: "Rent/Unit" },
        ],
      };
    }

    setSectionsData(newSectionsData);
    setStep(2);
    setIsGenerating(false);

    // Generate AI narratives in the background; don't block report display
    const aiSections = sections.filter((s) => s.enabled && s.aiGenerated);
    try {
      await Promise.all(
        aiSections.map((s) => generateNarrative(s.id, data))
      );
    } catch (err) {
      console.error("AI narrative generation failed:", err);
    }
  }, [fetchData, generateNarrative, sections]);

  // Update data (refresh)
  const handleUpdateData = useCallback(async () => {
    setIsGenerating(true);
    await fetchData();
    setIsGenerating(false);
  }, [fetchData]);

  // Download PDF via browser print
  const handleDownloadPDF = useCallback(() => {
    setShowPreviewModal(true);
    // Wait for modal to render, then trigger print
    setTimeout(() => window.print(), 400);
  }, []);

  // Save draft
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await fetch("/api/reports/authoritative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          reportType: "market_feasibility",
          title: `Market Feasibility - ${selectedProperties.map((p) => p.name).join(", ")}`,
          propertyIds: selectedIds,
          sectionConfig: sections,
          sectionsData,
          watermark,
        }),
      });
    } catch (err) {
      console.error("Save failed:", err);
    }
    setIsSaving(false);
  }, [selectedIds, selectedProperties, sections, sectionsData, watermark]);

  // Toggle section
  const toggleSection = (sectionId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, enabled: !s.enabled } : s
      )
    );
  };

  // Update narrative
  const updateNarrative = (sectionId: string, text: string) => {
    setSectionsData((prev) => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], narrative: text },
    }));
  };

  // Render section content for preview
  const renderSection = (sectionId: string, data: SectionData | undefined) => {
    const sectionConfig = sections.find((s) => s.id === sectionId);
    const isGenLoading = generatingSections.has(sectionId);

    return (
      <>
        {/* AI narrative */}
        {sectionConfig?.aiGenerated && (
          <NarrativeEditor
            text={data?.narrative ?? ""}
            onChange={(text) => updateNarrative(sectionId, text)}
            onRegenerate={
              reportData
                ? () => generateNarrative(sectionId, reportData)
                : undefined
            }
            isGenerating={isGenLoading}
          />
        )}

        {/* KPIs */}
        {data?.kpis && (
          <div className="report-kpi-grid">
            {data.kpis.map((kpi, i) => (
              <div key={i} className="report-kpi-card">
                <div className="report-kpi-value">{kpi.value}</div>
                <div className="report-kpi-label">{kpi.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        {data?.tableData && data.tableColumns && (
          <table className="report-data-table">
            <thead>
              <tr>
                {data.tableColumns.map((col) => (
                  <th key={col.key} className={col.format === "currency" ? "currency" : col.format === "number" ? "number" : ""}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.tableData.map((row, i) => (
                <tr key={i}>
                  {data.tableColumns!.map((col) => (
                    <td
                      key={col.key}
                      className={
                        col.format === "currency"
                          ? "currency"
                          : col.format === "number"
                            ? "number"
                            : col.format === "percent"
                              ? "percent"
                              : ""
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

        {/* Simple key-value table (property overview) */}
        {data?.tableData &&
          !data.tableColumns &&
          Array.isArray(data.tableData) &&
          data.tableData.length > 0 &&
          "field" in data.tableData[0] && (
            <table className="report-data-table">
              <tbody>
                {data.tableData.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, width: "30%" }}>
                      {String(row.field)}
                    </td>
                    <td>{String(row.value ?? "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        {/* Charts */}
        {data?.chartType === "rent_comp" && data.chartData && (
          <RentCompChart
            data={
              data.chartData as {
                unit_type: string;
                avg_market_rent: number;
              }[]
            }
            color={theme.primary}
            accentColor={theme.accent}
          />
        )}

        {/* Sensitivity grid */}
        {sectionId === "sensitivity" && data?.tableData && (
          <div className="sensitivity-grid">
            <div className="sensitivity-cell header" />
            {[-10, -5, 0, 5, 10].map((occ) => (
              <div key={occ} className="sensitivity-cell header">
                {occ >= 0 ? "+" : ""}
                {occ}% Occ
              </div>
            ))}
            {(data.tableData as Record<string, unknown>[]).map((row, i) => (
              <>
                <div key={`rh-${i}`} className="sensitivity-cell row-header">
                  {String(row.rent_change)}
                </div>
                {[-10, -5, 0, 5, 10].map((occ) => (
                  <div
                    key={`${i}-${occ}`}
                    className={`sensitivity-cell${occ === 0 && String(row.rent_change).includes("+0") ? " highlight" : ""}`}
                  >
                    {String(row[`occ_${occ}`] ?? "")}
                  </div>
                ))}
              </>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <div>
      {/* Back link */}
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

      <h2
        style={{
          fontFamily: "var(--font-serif, Georgia, serif)",
          marginBottom: "0.5rem",
        }}
      >
        Market Feasibility Study
      </h2>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        Select a property, configure sections, and generate an investor-ready report.
      </p>

      <ReportWizard steps={WIZARD_STEPS} currentStep={step} onStepClick={setStep}>
        {/* Step 1: Select Property */}
        {step === 0 && (
          <div className="subject-selection">
            <div className="subject-selection-header">
              <h3>Select Property</h3>
              <label className="comparative-toggle">
                <input
                  type="checkbox"
                  checked={comparative}
                  onChange={(e) => {
                    setComparative(e.target.checked);
                    if (!e.target.checked && selectedIds.length > 1) {
                      setSelectedIds([selectedIds[0]]);
                    }
                  }}
                />
                Comparative Mode
              </label>
            </div>

            {properties.length === 0 ? (
              <div
                style={{
                  padding: "3rem",
                  textAlign: "center",
                  color: "var(--muted)",
                }}
              >
                No properties found. Add properties to get started.
              </div>
            ) : (
              <div className="subject-cards">
                {properties.map((p) => (
                  <div
                    key={p.id}
                    className={`subject-card${selectedIds.includes(p.id) ? " selected" : ""}`}
                    onClick={() => toggleProperty(p.id)}
                  >
                    <div className="subject-card-name">{p.name}</div>
                    <div className="subject-card-meta">
                      <span className="subject-card-stat">
                        <Building2 size={12} />
                        {p.property_type?.replace(/_/g, " ")}
                      </span>
                      <span className="subject-card-stat">
                        <MapPin size={12} />
                        {[p.city, p.state].filter(Boolean).join(", ")}
                      </span>
                      <span className="subject-card-stat">
                        <Users size={12} />
                        {p.occupied_units}/{p.total_units} units
                      </span>
                      <span className="subject-card-stat">
                        <DollarSign size={12} />
                        NOI: {fmt(p.noi)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedIds.length > 0 && (
              <button
                className="report-toolbar-btn primary"
                style={{ alignSelf: "flex-end", marginTop: "1rem" }}
                onClick={() => setStep(1)}
                type="button"
              >
                Next: Configure Sections
              </button>
            )}
          </div>
        )}

        {/* Step 2: Configure & Generate */}
        {step === 1 && (
          <div>
            <h3 style={{ marginBottom: "1rem" }}>Configure Report Sections</h3>
            <div className="section-config">
              {sections.map((s) => (
                <label key={s.id} className="section-config-item">
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    onChange={() => toggleSection(s.id)}
                    disabled={s.id === "cover"}
                  />
                  <span className="section-config-label">{s.label}</span>
                  {s.aiGenerated && (
                    <span className="section-config-ai-badge">AI</span>
                  )}
                </label>
              ))}
            </div>

            <ReportToolbar
              onGenerate={handleGenerate}
              onUpdateData={handleUpdateData}
              onDownloadPDF={handleDownloadPDF}
              onSave={handleSave}
              onView={reportData ? () => setShowPreviewModal(true) : undefined}
              isGenerating={isGenerating}
              isDownloading={isDownloading}
              isSaving={isSaving}
              hasData={!!reportData}
              watermark={watermark}
              onWatermarkChange={setWatermark}
            />
          </div>
        )}

        {/* Step 3: Preview & Download */}
        {step === 2 && (
          <div>
            <ReportToolbar
              onGenerate={handleGenerate}
              onUpdateData={handleUpdateData}
              onDownloadPDF={handleDownloadPDF}
              onSave={handleSave}
              onView={reportData ? () => setShowPreviewModal(true) : undefined}
              isGenerating={isGenerating}
              isDownloading={isDownloading}
              isSaving={isSaving}
              hasData={!!reportData}
              watermark={watermark}
              onWatermarkChange={setWatermark}
            />

            <ReportPreview
              reportType="market_feasibility"
              title={
                selectedProperties.length === 1
                  ? `Market Feasibility Study: ${selectedProperties[0].name}`
                  : `Market Feasibility Study: ${selectedProperties.length} Properties`
              }
              subtitle={
                selectedProperties.length === 1
                  ? [
                      selectedProperties[0].address_line1,
                      selectedProperties[0].city,
                      selectedProperties[0].state,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : undefined
              }
              companyName={companyName}
              generatedAt={reportData?.generatedAt}
              sections={sections}
              sectionsData={sectionsData}
              renderSection={renderSection}
            />
          </div>
        )}
      </ReportWizard>

      {/* Preview Modal */}
      {showPreviewModal && reportData && (
        <div className="report-preview-modal-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="report-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="report-preview-modal-header">
              <h3>Report Preview</h3>
              <button className="report-preview-modal-close" onClick={() => setShowPreviewModal(false)} type="button">
                <X size={14} /> Close
              </button>
            </div>
            <div className="report-preview-modal-body">
              <ReportPreview
                reportType="market_feasibility"
                title={
                  selectedProperties.length === 1
                    ? `Market Feasibility Study: ${selectedProperties[0].name}`
                    : `Market Feasibility Study: ${selectedProperties.length} Properties`
                }
                subtitle={
                  selectedProperties.length === 1
                    ? [
                        selectedProperties[0].address_line1,
                        selectedProperties[0].city,
                        selectedProperties[0].state,
                      ]
                        .filter(Boolean)
                        .join(", ")
                    : undefined
                }
                companyName={companyName}
                generatedAt={reportData.generatedAt}
                sections={sections}
                sectionsData={sectionsData}
                renderSection={renderSection}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
