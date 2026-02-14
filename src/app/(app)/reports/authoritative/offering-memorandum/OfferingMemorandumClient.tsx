"use client";

import { useState, useCallback } from "react";
import { Building2, MapPin, Users, DollarSign, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ReportWizard } from "@/components/reports/ReportWizard";
import { ReportToolbar } from "@/components/reports/ReportToolbar";
import { ReportPreview } from "@/components/reports/ReportPreview";
import { NarrativeEditor } from "@/components/reports/NarrativeEditor";
import { CashFlowProjectionChart } from "@/components/reports/charts/CashFlowProjectionChart";
import { RentCompChart } from "@/components/reports/charts/RentCompChart";
import {
  OFFERING_MEMORANDUM_SECTIONS,
  REPORT_THEMES,
} from "@/types/authoritative-reports";
import type {
  SectionConfig,
  SectionData,
  OfferingMemorandumData,
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

interface Props {
  properties: Property[];
  companyId: string;
  companyName: string;
}

const STEPS = [
  { label: "Select Property" },
  { label: "Configure & Generate" },
  { label: "Preview & Download" },
];

const theme = REPORT_THEMES.offering_memorandum;

function fmt(n: number | null | undefined): string {
  if (n == null) return "$0";
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function pct(n: number | null | undefined): string {
  if (n == null) return "0%";
  return `${n.toFixed(1)}%`;
}

export function OfferingMemorandumClient({ properties, companyId, companyName }: Props) {
  const [step, setStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparative, setComparative] = useState(false);
  const [sections, setSections] = useState<SectionConfig[]>(
    OFFERING_MEMORANDUM_SECTIONS.map((s) => ({ ...s }))
  );
  const [sectionsData, setSectionsData] = useState<Record<string, SectionData>>({});
  const [reportData, setReportData] = useState<OfferingMemorandumData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingSections, setGeneratingSections] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [watermark, setWatermark] = useState<WatermarkType>(null);

  const toggleProperty = (id: string) => {
    if (comparative) {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
      );
    } else {
      setSelectedIds([id]);
    }
  };

  const selectedProperties = properties.filter((p) => selectedIds.includes(p.id));

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/authoritative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "fetch_data",
          reportType: "offering_memorandum",
          propertyIds: selectedIds,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
        return data as OfferingMemorandumData;
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
    return null;
  }, [selectedIds]);

  const generateNarrative = useCallback(
    async (sectionId: string, data: OfferingMemorandumData) => {
      setGeneratingSections((prev) => new Set([...prev, sectionId]));
      try {
        const res = await fetch("/api/reports/authoritative/generate-narrative", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportType: "offering_memorandum",
            sectionId,
            data,
            companyName,
            propertyName: data.properties[0]?.name ?? "",
          }),
        });
        if (res.ok) {
          const { narrative } = await res.json();
          setSectionsData((prev) => ({
            ...prev,
            [sectionId]: { ...prev[sectionId], narrative },
          }));
        }
      } catch (err) {
        console.error(`Failed to generate ${sectionId}:`, err);
      }
      setGeneratingSections((prev) => {
        const next = new Set(prev);
        next.delete(sectionId);
        return next;
      });
    },
    [companyName]
  );

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    const data = await fetchData();
    if (!data) { setIsGenerating(false); return; }

    const newData: Record<string, SectionData> = {};

    // Unit mix & rent roll
    newData.unit_mix_rent_roll = {
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
    };

    // Financial performance
    if (data.properties.length > 0) {
      const p = data.properties[0];
      const capRate = p.current_value && p.noi
        ? ((p.noi * 12) / p.current_value) * 100
        : 0;

      newData.financial_performance = {
        kpis: [
          { label: "Monthly Revenue", value: fmt(p.monthly_revenue) },
          { label: "Monthly Expenses", value: fmt(p.monthly_expenses) },
          { label: "Monthly NOI", value: fmt(p.noi) },
          { label: "Annual NOI", value: fmt(p.noi * 12) },
          { label: "Current Value", value: fmt(p.current_value) },
          { label: "Cap Rate", value: pct(capRate) },
        ],
      };
    }

    // Cash flow chart data
    newData.cash_flow = {
      chartType: "cash_flow",
      chartData: data.cashFlowMonths as unknown as Record<string, unknown>[],
    };

    // Sensitivity
    if (data.properties.length > 0) {
      const p = data.properties[0];
      const occupancyScenarios = [-10, -5, 0, 5, 10];
      const rentScenarios = [-10, -5, 0, 5, 10];
      newData.sensitivity = {
        tableData: rentScenarios.map((rentDelta) => {
          const row: Record<string, unknown> = {
            rent_change: `${rentDelta >= 0 ? "+" : ""}${rentDelta}% Rent`,
          };
          for (const occDelta of occupancyScenarios) {
            const adjRevenue = p.monthly_revenue * (1 + rentDelta / 100) * (1 + occDelta / 100);
            const adjNOI = adjRevenue - p.monthly_expenses;
            const annualNOI = adjNOI * 12;
            const capRate = p.current_value ? (annualNOI / p.current_value) * 100 : 0;
            row[`occ_${occDelta}`] = capRate.toFixed(2) + "%";
          }
          return row;
        }),
      };
    }

    // Contracts
    newData.vendor_contracts = {
      tableData: data.contracts.map((c) => ({
        number: c.contract_number,
        type: c.contract_type.replace(/_/g, " "),
        party: c.party_name,
        amount: c.contract_amount,
        status: c.status,
      })),
      tableColumns: [
        { key: "number", label: "Contract #" },
        { key: "type", label: "Type" },
        { key: "party", label: "Party" },
        { key: "amount", label: "Amount", format: "currency" },
        { key: "status", label: "Status" },
      ],
    };

    setSectionsData(newData);

    const aiSections = sections.filter((s) => s.enabled && s.aiGenerated);
    await Promise.all(aiSections.map((s) => generateNarrative(s.id, data)));

    setStep(2);
    setIsGenerating(false);
  }, [fetchData, generateNarrative, sections]);

  const handleDownloadPDF = useCallback(async () => {
    setIsDownloading(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { OfferingMemorandumPDF } = await import("@/components/reports/pdf/PDFDocument");
      const blob = await pdf(
        OfferingMemorandumPDF({ companyName, reportData: reportData!, sections, sectionsData, watermark })
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Offering-Memorandum-${selectedProperties[0]?.name ?? "Report"}-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { console.error("PDF generation failed:", err); }
    setIsDownloading(false);
  }, [companyName, reportData, sections, sectionsData, watermark, selectedProperties]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await fetch("/api/reports/authoritative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          reportType: "offering_memorandum",
          title: `Offering Memorandum - ${selectedProperties.map((p) => p.name).join(", ")}`,
          propertyIds: selectedIds,
          sectionConfig: sections,
          sectionsData,
          watermark,
        }),
      });
    } catch (err) { console.error("Save failed:", err); }
    setIsSaving(false);
  }, [selectedIds, selectedProperties, sections, sectionsData, watermark]);

  const toggleSection = (id: string) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));

  const updateNarrative = (id: string, text: string) =>
    setSectionsData((prev) => ({ ...prev, [id]: { ...prev[id], narrative: text } }));

  const renderSection = (sectionId: string, data: SectionData | undefined) => {
    const sectionCfg = sections.find((s) => s.id === sectionId);
    return (
      <>
        {sectionCfg?.aiGenerated && (
          <NarrativeEditor
            text={data?.narrative ?? ""}
            onChange={(text) => updateNarrative(sectionId, text)}
            onRegenerate={reportData ? () => generateNarrative(sectionId, reportData) : undefined}
            isGenerating={generatingSections.has(sectionId)}
          />
        )}
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
              {data.tableData.map((row, i) => (
                <tr key={i}>
                  {data.tableColumns!.map((col) => (
                    <td key={col.key} className={col.format === "currency" ? "currency" : ""}>
                      {col.format === "currency" ? fmt(row[col.key] as number) : String(row[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data?.chartType === "cash_flow" && data.chartData && (
          <CashFlowProjectionChart
            data={data.chartData as { month: string; cashIn: number; cashOut: number; net: number }[]}
            primaryColor={theme.primary}
            accentColor={theme.accent}
          />
        )}
        {sectionId === "sensitivity" && data?.tableData && (
          <div className="sensitivity-grid">
            <div className="sensitivity-cell header" />
            {[-10, -5, 0, 5, 10].map((occ) => (
              <div key={occ} className="sensitivity-cell header">{occ >= 0 ? "+" : ""}{occ}% Occ</div>
            ))}
            {(data.tableData as Record<string, unknown>[]).map((row, i) => (
              <>
                <div key={`rh-${i}`} className="sensitivity-cell row-header">{String(row.rent_change)}</div>
                {[-10, -5, 0, 5, 10].map((occ) => (
                  <div key={`${i}-${occ}`} className={`sensitivity-cell${occ === 0 && String(row.rent_change).includes("+0") ? " highlight" : ""}`}>
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
      <Link href="/reports/authoritative" style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--muted)", textDecoration: "none", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
        <ArrowLeft size={14} /> Back to Authoritative Reports
      </Link>
      <h2 style={{ fontFamily: "var(--font-serif, Georgia, serif)", marginBottom: "0.5rem" }}>Offering Memorandum</h2>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        Create an investor-ready offering memorandum for your property or portfolio.
      </p>

      <ReportWizard steps={STEPS} currentStep={step} onStepClick={setStep}>
        {step === 0 && (
          <div className="subject-selection">
            <div className="subject-selection-header">
              <h3>Select Property</h3>
              <label className="comparative-toggle">
                <input type="checkbox" checked={comparative} onChange={(e) => { setComparative(e.target.checked); if (!e.target.checked && selectedIds.length > 1) setSelectedIds([selectedIds[0]]); }} />
                Multi-Property Portfolio
              </label>
            </div>
            {properties.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>No properties found.</div>
            ) : (
              <div className="subject-cards">
                {properties.map((p) => (
                  <div key={p.id} className={`subject-card${selectedIds.includes(p.id) ? " selected" : ""}`} onClick={() => toggleProperty(p.id)}>
                    <div className="subject-card-name">{p.name}</div>
                    <div className="subject-card-meta">
                      <span className="subject-card-stat"><Building2 size={12} />{p.property_type?.replace(/_/g, " ")}</span>
                      <span className="subject-card-stat"><MapPin size={12} />{[p.city, p.state].filter(Boolean).join(", ")}</span>
                      <span className="subject-card-stat"><Users size={12} />{p.occupied_units}/{p.total_units} units</span>
                      <span className="subject-card-stat"><DollarSign size={12} />NOI: {fmt(p.noi)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedIds.length > 0 && (
              <button className="report-toolbar-btn primary" style={{ alignSelf: "flex-end", marginTop: "1rem" }} onClick={() => setStep(1)} type="button">
                Next: Configure Sections
              </button>
            )}
          </div>
        )}
        {step === 1 && (
          <div>
            <h3 style={{ marginBottom: "1rem" }}>Configure Report Sections</h3>
            <div className="section-config">
              {sections.map((s) => (
                <label key={s.id} className="section-config-item">
                  <input type="checkbox" checked={s.enabled} onChange={() => toggleSection(s.id)} disabled={s.id === "cover"} />
                  <span className="section-config-label">{s.label}</span>
                  {s.aiGenerated && <span className="section-config-ai-badge">AI</span>}
                </label>
              ))}
            </div>
            <ReportToolbar onGenerate={handleGenerate} onUpdateData={() => fetchData()} onDownloadPDF={handleDownloadPDF} onSave={handleSave} isGenerating={isGenerating} isDownloading={isDownloading} isSaving={isSaving} hasData={!!reportData} watermark={watermark} onWatermarkChange={setWatermark} />
          </div>
        )}
        {step === 2 && (
          <div>
            <ReportToolbar onGenerate={handleGenerate} onUpdateData={() => fetchData()} onDownloadPDF={handleDownloadPDF} onSave={handleSave} isGenerating={isGenerating} isDownloading={isDownloading} isSaving={isSaving} hasData={!!reportData} watermark={watermark} onWatermarkChange={setWatermark} />
            <ReportPreview
              reportType="offering_memorandum"
              title={selectedProperties.length === 1 ? `Offering Memorandum: ${selectedProperties[0].name}` : `Offering Memorandum: ${selectedProperties.length} Properties`}
              companyName={companyName}
              generatedAt={reportData?.generatedAt}
              sections={sections}
              sectionsData={sectionsData}
              renderSection={renderSection}
            />
          </div>
        )}
      </ReportWizard>
    </div>
  );
}
