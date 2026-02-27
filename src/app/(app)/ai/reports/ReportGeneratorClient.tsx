"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FileText,
  ClipboardList,
  DollarSign,
  ShieldAlert,
  BarChart3,
  Loader2,
  Copy,
  Download,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Project {
  id: string;
  name: string;
  code: string | null;
  status: string;
}

type ReportType =
  | "project_status"
  | "financial_summary"
  | "safety_compliance"
  | "executive_brief";

interface ReportTypeOption {
  id: ReportType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface ReportGeneratorClientProps {
  companyId: string;
  projects: Project[];
  hasProvider: boolean;
}

// ---------------------------------------------------------------------------
// Markdown table wrapper
// ---------------------------------------------------------------------------

const markdownComponents = {
  table: ({ children, ...props }: React.ComponentPropsWithoutRef<"table">) => (
    <div className="table-wrap">
      <table {...props}>{children}</table>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateForInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getDefaultStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return formatDateForInput(d);
}

function getDefaultEndDate(): string {
  return formatDateForInput(new Date());
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReportGeneratorClient({
  companyId,
  projects,
  hasProvider,
}: ReportGeneratorClientProps) {
  const t = useTranslations("ai");

  const reportTypes: ReportTypeOption[] = useMemo(
    () => [
      {
        id: "project_status",
        label: t("reports.projectStatusReport"),
        icon: <ClipboardList size={20} />,
        description: t("reports.projectStatusDesc"),
      },
      {
        id: "financial_summary",
        label: t("reports.financialSummary"),
        icon: <DollarSign size={20} />,
        description: t("reports.financialSummaryDesc"),
      },
      {
        id: "safety_compliance",
        label: t("reports.safetyComplianceReport"),
        icon: <ShieldAlert size={20} />,
        description: t("reports.safetyComplianceDesc"),
      },
      {
        id: "executive_brief",
        label: t("reports.executiveBrief"),
        icon: <BarChart3 size={20} />,
        description: t("reports.executiveBriefDesc"),
      },
    ],
    [t]
  );

  const [reportType, setReportType] = useState<ReportType>("project_status");
  const [projectId, setProjectId] = useState<string>("all");
  const [startDate, setStartDate] = useState(getDefaultStartDate);
  const [endDate, setEndDate] = useState(getDefaultEndDate);
  const [reportText, setReportText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ---- Generate report ----
  const handleGenerate = useCallback(async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setReportText("");
    setError(null);
    setCopied(false);

    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/ai/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          reportType,
          projectId,
          startDate,
          endDate,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errBody = await response.text();
        let message = "Failed to generate report";
        try {
          const parsed = JSON.parse(errBody);
          if (parsed.error) message = parsed.error;
        } catch {
          // use default message
        }
        setError(message);
        setIsGenerating(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError("No response stream available");
        setIsGenerating(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setReportText(accumulated);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User cancelled
      } else {
        const msg =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError(msg);
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, [companyId, reportType, projectId, startDate, endDate, isGenerating]);

  // ---- Copy to clipboard ----
  const handleCopy = useCallback(async () => {
    if (!reportText) return;
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = reportText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [reportText]);

  // ---- Download as text ----
  const handleDownload = useCallback(() => {
    if (!reportText) return;
    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const typeLabel = reportTypes.find((rt) => rt.id === reportType)?.label ?? "Report";
    a.download = `${typeLabel.replace(/\s+/g, "_")}_${formatDateForInput(new Date())}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [reportText, reportType, reportTypes]);

  // ---- Render: No provider configured ----
  if (!hasProvider) {
    return (
      <div className="ai-feature-page">
        <div className="ai-feature-header">
          <div>
            <h1>
              <FileText size={28} className="sparkle-icon" />
              {t("reports.title")}
            </h1>
            <p className="subtitle">
              {t("reports.subtitle")}
            </p>
          </div>
        </div>

        <div className="ui-card" style={{ textAlign: "center", padding: "48px 24px", maxWidth: 560 }}>
          <AlertTriangle size={36} style={{ color: "var(--color-amber)", marginBottom: 16 }} />
          <div style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: 8, color: "var(--text)", fontFamily: "var(--font-serif)" }}>
            {t("reports.aiProviderRequired")}
          </div>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem", lineHeight: 1.6, marginBottom: 16 }}>
            {t("reports.configureProviderReport")}
          </p>
          <Link href="/admin/ai-providers" className="ui-btn ui-btn-primary ui-btn-md" style={{ display: "inline-flex" }}>
            {t("reports.configureAiProvider")}
          </Link>
        </div>
      </div>
    );
  }

  // ---- Render: Main layout ----
  return (
    <div className="ai-feature-page">
      {/* Header */}
      <div className="ai-feature-header">
        <div>
          <h1>
            <FileText size={28} className="sparkle-icon" />
            {t("reports.title")}
          </h1>
          <p className="subtitle">
            {t("reports.subtitle")}
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="report-gen-layout">
        {/* ---- Left: Report Configuration ---- */}
        <div className="report-config">
          <div className="config-title">{t("reports.reportConfig")}</div>

          {/* Report type selector */}
          <label className="report-field-label">{t("reports.reportType")}</label>
          <div className="report-type-selector">
            {reportTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                className={`report-type-card ${reportType === type.id ? "selected" : ""}`}
                onClick={() => setReportType(type.id)}
              >
                <div className="type-icon">{type.icon}</div>
                <span className="type-label">{type.label}</span>
              </button>
            ))}
          </div>

          {/* Project selector */}
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="project-select" className="report-field-label">
              {t("reports.project")}
            </label>
            <select
              id="project-select"
              className="report-select"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="all">{t("reports.allProjects")}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.code ? ` (${p.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div>
              <label htmlFor="start-date" className="report-field-label">
                {t("reports.startDate")}
              </label>
              <input
                id="start-date"
                type="date"
                className="report-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="end-date" className="report-field-label">
                {t("reports.endDate")}
              </label>
              <input
                id="end-date"
                type="date"
                className="report-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Generate button */}
          <button
            type="button"
            className="ui-btn ui-btn-primary ui-btn-md"
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="spin-icon" />
                {t("reports.generating")}
              </>
            ) : (
              <>
                <FileText size={16} />
                {t("reports.generateReport")}
              </>
            )}
          </button>
        </div>

        {/* ---- Right: Report Preview ---- */}
        <div className="report-preview">
          {/* Preview header with actions */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div className="preview-title" style={{ margin: 0 }}>
              {t("reports.reportPreview")}
            </div>
            {reportText && !isGenerating && (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary ui-btn-sm"
                  onClick={handleCopy}
                >
                  {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                  {copied ? t("documents.copied") : t("reports.copy")}
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary ui-btn-sm"
                  onClick={handleDownload}
                >
                  <Download size={14} />
                  {t("reports.download")}
                </button>
              </div>
            )}
          </div>

          {/* Error state */}
          {error && (
            <div className="report-error">
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Loading skeleton */}
          {isGenerating && !reportText && (
            <div className="report-loading">
              <div className="skeleton-line" />
              <div className="skeleton-line" />
              <div className="skeleton-line" />
              <div className="skeleton-line" />
              <div className="skeleton-line" />
            </div>
          )}

          {/* Generated report -- rendered markdown */}
          {reportText && (
            <div className="report-markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {reportText}
              </ReactMarkdown>
            </div>
          )}

          {/* Empty state */}
          {!reportText && !isGenerating && !error && (
            <div className="report-empty-state">
              <FileText size={48} style={{ opacity: 0.3 }} />
              <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-serif)" }}>
                {t("reports.noReportGenerated")}
              </div>
              <p>
                {t("reports.noReportDesc")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
