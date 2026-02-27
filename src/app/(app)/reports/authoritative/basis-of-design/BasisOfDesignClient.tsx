"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { HardHat, MapPin, DollarSign, Percent, ArrowLeft, X } from "lucide-react";
import Link from "next/link";
import { ReportWizard } from "@/components/reports/ReportWizard";
import { ReportToolbar } from "@/components/reports/ReportToolbar";
import { ReportPreview } from "@/components/reports/ReportPreview";
import { NarrativeEditor } from "@/components/reports/NarrativeEditor";
import { CostVarianceChart } from "@/components/reports/charts/CostVarianceChart";
import {
  BASIS_OF_DESIGN_SECTIONS,
  REPORT_THEMES,
} from "@/types/authoritative-reports";
import type {
  SectionConfig,
  SectionData,
  BasisOfDesignData,
  WatermarkType,
} from "@/types/authoritative-reports";

interface Project {
  id: string;
  name: string;
  code: string;
  status: string;
  project_type: string | null;
  client_name: string | null;
  contract_amount: number | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  completion_pct: number;
  start_date: string | null;
  estimated_end_date: string | null;
}

interface Props {
  projects: Project[];
  companyId: string;
  companyName: string;
}

const theme = REPORT_THEMES.basis_of_design;

function fmt(n: number | null | undefined): string {
  if (n == null) return "$0";
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function BasisOfDesignClient({ projects, companyId, companyName }: Props) {
  const t = useTranslations("reports");
  const STEPS = useMemo(() => [
    { label: t("basisOfDesign.stepSelectProject") },
    { label: t("basisOfDesign.stepConfigure") },
    { label: t("basisOfDesign.stepPreview") },
  ], [t]);
  const [step, setStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparative, setComparative] = useState(false);
  const [sections, setSections] = useState<SectionConfig[]>(
    BASIS_OF_DESIGN_SECTIONS.map((s) => ({ ...s }))
  );
  const [sectionsData, setSectionsData] = useState<Record<string, SectionData>>({});
  const [reportData, setReportData] = useState<BasisOfDesignData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingSections, setGeneratingSections] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [watermark, setWatermark] = useState<WatermarkType>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const toggleProject = (id: string) => {
    if (comparative) {
      setSelectedIds((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
    } else {
      setSelectedIds([id]);
    }
  };

  const selectedProjects = projects.filter((p) => selectedIds.includes(p.id));

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/authoritative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "fetch_data",
          reportType: "basis_of_design",
          projectIds: selectedIds,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
        return data as BasisOfDesignData;
      }
    } catch (err) { console.error("Failed to fetch data:", err); }
    return null;
  }, [selectedIds]);

  const generateNarrative = useCallback(async (sectionId: string, data: BasisOfDesignData) => {
    setGeneratingSections((prev) => new Set([...prev, sectionId]));
    try {
      const res = await fetch("/api/reports/authoritative/generate-narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType: "basis_of_design", sectionId, data, companyName, propertyName: data.projects[0]?.name ?? "" }),
      });
      if (res.ok) {
        const { narrative } = await res.json();
        setSectionsData((prev) => ({ ...prev, [sectionId]: { ...prev[sectionId], narrative } }));
      } else {
        setSectionsData((prev) => ({
          ...prev,
          [sectionId]: {
            ...prev[sectionId],
            narrative: t("aiNarrativeUnavailable"),
          },
        }));
      }
    } catch (err) {
      console.error(`Failed to generate ${sectionId}:`, err);
      setSectionsData((prev) => ({
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          narrative: t("aiNarrativeUnavailable"),
        },
      }));
    }
    setGeneratingSections((prev) => { const next = new Set(prev); next.delete(sectionId); return next; });
  }, [companyName]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    const data = await fetchData();
    if (!data) { setIsGenerating(false); return; }

    const newData: Record<string, SectionData> = {};

    // Project summary
    if (data.projects.length > 0) {
      const p = data.projects[0];
      newData.project_summary = {
        kpis: [
          { label: t("basisOfDesign.contractAmount"), value: fmt(p.contract_amount) },
          { label: t("basisOfDesign.estimatedCost"), value: fmt(p.estimated_cost) },
          { label: t("basisOfDesign.actualCost"), value: fmt(p.actual_cost) },
          { label: t("basisOfDesign.completion"), value: `${p.completion_pct}%` },
          { label: t("basisOfDesign.status"), value: p.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) },
        ],
        tableData: [
          { field: t("basisOfDesign.projectCode"), value: p.code },
          { field: t("basisOfDesign.client"), value: p.client_name ?? t("na") },
          { field: t("basisOfDesign.type"), value: p.project_type ?? t("na") },
          { field: t("basisOfDesign.projectManager"), value: p.project_manager ?? t("na") },
          { field: t("basisOfDesign.superintendent"), value: p.superintendent ?? t("na") },
          { field: t("basisOfDesign.startDate"), value: p.start_date ? new Date(p.start_date).toLocaleDateString() : t("na") },
          { field: t("basisOfDesign.estEndDate"), value: p.estimated_end_date ? new Date(p.estimated_end_date).toLocaleDateString() : t("na") },
        ],
      };
    }

    // Materials / budget lines
    newData.materials = {
      tableData: data.budgetLines.slice(0, 20).map((b) => ({
        code: b.csi_code,
        description: b.description,
        budgeted: b.budgeted_amount,
        actual: b.actual_amount,
        variance: b.variance,
      })),
      tableColumns: [
        { key: "code", label: t("basisOfDesign.csiCode") },
        { key: "description", label: t("basisOfDesign.description") },
        { key: "budgeted", label: t("basisOfDesign.budgeted"), format: "currency" },
        { key: "actual", label: t("basisOfDesign.actual"), format: "currency" },
        { key: "variance", label: t("basisOfDesign.variance"), format: "currency" },
      ],
    };

    // Budget summary chart
    const budgetByDivision = new Map<string, { budgeted: number; actual: number }>();
    for (const b of data.budgetLines) {
      const div = b.csi_code.split("-")[0] || b.csi_code.substring(0, 2);
      const existing = budgetByDivision.get(div) ?? { budgeted: 0, actual: 0 };
      existing.budgeted += b.budgeted_amount;
      existing.actual += b.actual_amount;
      budgetByDivision.set(div, existing);
    }
    newData.budget_summary = {
      chartType: "cost_variance",
      chartData: Array.from(budgetByDivision.entries()).map(([cat, d]) => ({
        category: `Div ${cat}`,
        budgeted: d.budgeted,
        actual: d.actual,
      })),
      kpis: [
        { label: t("basisOfDesign.totalBudgeted"), value: fmt(data.budgetLines.reduce((s, b) => s + b.budgeted_amount, 0)) },
        { label: t("basisOfDesign.totalActual"), value: fmt(data.budgetLines.reduce((s, b) => s + b.actual_amount, 0)) },
        { label: t("basisOfDesign.totalVariance"), value: fmt(data.budgetLines.reduce((s, b) => s + b.variance, 0)) },
        { label: t("basisOfDesign.budgetLines"), value: String(data.budgetLines.length) },
      ],
    };

    // Schedule
    newData.schedule = {
      tableData: data.tasks.filter((tk) => tk.is_milestone || tk.is_critical_path).slice(0, 15).map((tk) => ({
        name: tk.name,
        phase: tk.phase_name ?? "—",
        start: tk.start_date ? new Date(tk.start_date).toLocaleDateString() : "—",
        end: tk.end_date ? new Date(tk.end_date).toLocaleDateString() : "—",
        completion: `${tk.completion_pct}%`,
        critical: tk.is_critical_path ? t("yes") : "",
      })),
      tableColumns: [
        { key: "name", label: t("basisOfDesign.task") },
        { key: "phase", label: t("basisOfDesign.phase") },
        { key: "start", label: t("basisOfDesign.start") },
        { key: "end", label: t("basisOfDesign.end") },
        { key: "completion", label: t("basisOfDesign.complete") },
        { key: "critical", label: t("basisOfDesign.criticalPath") },
      ],
    };

    // Change orders
    newData.change_orders = {
      tableData: data.changeOrders.map((c) => ({
        title: c.title,
        amount: c.amount,
        status: c.status,
        impact: c.schedule_impact_days != null ? `${c.schedule_impact_days} days` : "—",
        date: new Date(c.created_at).toLocaleDateString(),
      })),
      tableColumns: [
        { key: "title", label: t("basisOfDesign.description") },
        { key: "amount", label: t("basisOfDesign.amount"), format: "currency" },
        { key: "status", label: t("basisOfDesign.status") },
        { key: "impact", label: t("basisOfDesign.scheduleImpact") },
        { key: "date", label: t("basisOfDesign.date") },
      ],
    };

    // Systems & equipment
    newData.systems_equipment = {
      tableData: data.equipment.map((e) => ({
        name: e.name,
        type: e.equipment_type,
        make: e.make ?? "—",
        model: e.model ?? "—",
        serial: e.serial_number ?? "—",
        status: e.status,
      })),
      tableColumns: [
        { key: "name", label: t("basisOfDesign.equipment") },
        { key: "type", label: t("basisOfDesign.type") },
        { key: "make", label: t("basisOfDesign.make") },
        { key: "model", label: t("basisOfDesign.model") },
        { key: "serial", label: t("basisOfDesign.serialNumber") },
        { key: "status", label: t("basisOfDesign.status") },
      ],
    };

    // Quality & safety
    newData.quality_safety = {
      tableData: data.safetyInspections.map((i) => ({
        type: i.inspection_type.replace(/_/g, " "),
        date: new Date(i.inspection_date).toLocaleDateString(),
        status: i.status,
        findings: i.findings_count,
      })),
      tableColumns: [
        { key: "type", label: t("basisOfDesign.inspectionType") },
        { key: "date", label: t("basisOfDesign.date") },
        { key: "status", label: t("basisOfDesign.status") },
        { key: "findings", label: t("basisOfDesign.findings"), format: "number" },
      ],
    };

    setSectionsData(newData);
    setStep(2);
    setIsGenerating(false);

    // Generate AI narratives in the background; don't block report display
    const aiSections = sections.filter((s) => s.enabled && s.aiGenerated);
    try {
      await Promise.all(aiSections.map((s) => generateNarrative(s.id, data)));
    } catch (err) {
      console.error("AI narrative generation failed:", err);
    }
  }, [fetchData, generateNarrative, sections]);

  const handleDownloadPDF = useCallback(async () => {
    setIsDownloading(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { BasisOfDesignPDF } = await import("@/components/reports/pdf/PDFDocument");
      const blob = await pdf(
        BasisOfDesignPDF({ companyName, reportData: reportData!, sections, sectionsData, watermark })
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Basis-of-Design-${selectedProjects[0]?.name ?? "Report"}-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { console.error("PDF generation failed:", err); }
    setIsDownloading(false);
  }, [companyName, reportData, sections, sectionsData, watermark, selectedProjects]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await fetch("/api/reports/authoritative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          reportType: "basis_of_design",
          title: `Basis of Design - ${selectedProjects.map((p) => p.name).join(", ")}`,
          projectIds: selectedIds,
          sectionConfig: sections,
          sectionsData,
          watermark,
        }),
      });
    } catch (err) { console.error("Save failed:", err); }
    setIsSaving(false);
  }, [selectedIds, selectedProjects, sections, sectionsData, watermark]);

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
            <thead><tr>{data.tableColumns.map((col) => <th key={col.key} className={col.format === "currency" ? "currency" : col.format === "number" ? "number" : ""}>{col.label}</th>)}</tr></thead>
            <tbody>
              {data.tableData.map((row, i) => (
                <tr key={i}>
                  {data.tableColumns!.map((col) => (
                    <td key={col.key} className={col.format === "currency" ? "currency" : col.format === "number" ? "number" : ""}>
                      {col.format === "currency" ? fmt(row[col.key] as number) : String(row[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data?.tableData && !data.tableColumns && Array.isArray(data.tableData) && data.tableData.length > 0 && "field" in data.tableData[0] && (
          <table className="report-data-table">
            <tbody>
              {data.tableData.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, width: "30%" }}>{String(row.field)}</td>
                  <td>{String(row.value ?? "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data?.chartType === "cost_variance" && data.chartData && (
          <CostVarianceChart
            data={data.chartData as { category: string; budgeted: number; actual: number }[]}
            primaryColor={theme.primary}
            accentColor={theme.accent}
          />
        )}
      </>
    );
  };

  return (
    <div>
      <Link href="/reports/authoritative" style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--muted)", textDecoration: "none", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
        <ArrowLeft size={14} /> {t("backToAuthoritativeReports")}
      </Link>
      <h2 style={{ fontFamily: "var(--font-serif, Georgia, serif)", marginBottom: "0.5rem" }}>{t("basisOfDesign.title")}</h2>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        {t("basisOfDesign.subtitle")}
      </p>

      <ReportWizard steps={STEPS} currentStep={step} onStepClick={setStep}>
        {step === 0 && (
          <div className="subject-selection">
            <div className="subject-selection-header">
              <h3>{t("basisOfDesign.selectProject")}</h3>
              <label className="comparative-toggle">
                <input type="checkbox" checked={comparative} onChange={(e) => { setComparative(e.target.checked); if (!e.target.checked && selectedIds.length > 1) setSelectedIds([selectedIds[0]]); }} />
                {t("basisOfDesign.multiProjectMode")}
              </label>
            </div>
            {projects.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>{t("basisOfDesign.noProjectsFound")}</div>
            ) : (
              <div className="subject-cards">
                {projects.map((p) => (
                  <div key={p.id} className={`subject-card${selectedIds.includes(p.id) ? " selected" : ""}`} onClick={() => toggleProject(p.id)}>
                    <div className="subject-card-name">{p.name}</div>
                    <div className="subject-card-meta">
                      <span className="subject-card-stat"><HardHat size={12} />{p.status.replace(/_/g, " ")}</span>
                      <span className="subject-card-stat"><DollarSign size={12} />{fmt(p.contract_amount)}</span>
                      <span className="subject-card-stat"><Percent size={12} />{t("basisOfDesign.percentComplete", { pct: p.completion_pct })}</span>
                      {p.client_name && <span className="subject-card-stat">{p.client_name}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedIds.length > 0 && (
              <button className="report-toolbar-btn primary" style={{ alignSelf: "flex-end", marginTop: "1rem" }} onClick={() => setStep(1)} type="button">
                {t("nextConfigureSections")}
              </button>
            )}
          </div>
        )}
        {step === 1 && (
          <div>
            <h3 style={{ marginBottom: "1rem" }}>{t("configureReportSections")}</h3>
            <div className="section-config">
              {sections.map((s) => (
                <label key={s.id} className="section-config-item">
                  <input type="checkbox" checked={s.enabled} onChange={() => toggleSection(s.id)} disabled={s.id === "cover"} />
                  <span className="section-config-label">{s.label}</span>
                  {s.aiGenerated && <span className="section-config-ai-badge">AI</span>}
                </label>
              ))}
            </div>
            <ReportToolbar onGenerate={handleGenerate} onUpdateData={() => fetchData()} onDownloadPDF={handleDownloadPDF} onSave={handleSave} onView={reportData ? () => setShowPreviewModal(true) : undefined} isGenerating={isGenerating} isDownloading={isDownloading} isSaving={isSaving} hasData={!!reportData} watermark={watermark} onWatermarkChange={setWatermark} />
          </div>
        )}
        {step === 2 && (
          <div>
            <ReportToolbar onGenerate={handleGenerate} onUpdateData={() => fetchData()} onDownloadPDF={handleDownloadPDF} onSave={handleSave} onView={reportData ? () => setShowPreviewModal(true) : undefined} isGenerating={isGenerating} isDownloading={isDownloading} isSaving={isSaving} hasData={!!reportData} watermark={watermark} onWatermarkChange={setWatermark} />
            <ReportPreview
              reportType="basis_of_design"
              title={selectedProjects.length === 1 ? t("basisOfDesign.titleWithName", { name: selectedProjects[0].name }) : t("basisOfDesign.titleWithCount", { count: selectedProjects.length })}
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
              <h3>{t("reportPreview")}</h3>
              <button className="report-preview-modal-close" onClick={() => setShowPreviewModal(false)} type="button">
                <X size={14} /> {t("close")}
              </button>
            </div>
            <div className="report-preview-modal-body">
              <ReportPreview
                reportType="basis_of_design"
                title={selectedProjects.length === 1 ? t("basisOfDesign.titleWithName", { name: selectedProjects[0].name }) : t("basisOfDesign.titleWithCount", { count: selectedProjects.length })}
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
