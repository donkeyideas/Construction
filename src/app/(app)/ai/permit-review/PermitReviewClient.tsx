"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Shield,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Download,
  RotateCcw,
  Clock,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Upload,
  FileText,
  Search,
  BarChart3,
  ClipboardCheck,
  ExternalLink,
  X,
  Check,
} from "lucide-react";
import "@/styles/ai-features.css";
import "@/styles/permit-review.css";

// Lazy-load charts to avoid SSR issues with recharts
const SectionFlagChart = dynamic(
  () => import("@/components/charts/PermitAnalyticsCharts").then((m) => m.SectionFlagChart),
  { ssr: false }
);
const StatusDonutChart = dynamic(
  () => import("@/components/charts/PermitAnalyticsCharts").then((m) => m.StatusDonutChart),
  { ssr: false }
);
const ReviewTrendChart = dynamic(
  () => import("@/components/charts/PermitAnalyticsCharts").then((m) => m.ReviewTrendChart),
  { ssr: false }
);

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type OverallStatus = "likely_compliant" | "needs_review" | "issues_found";
type SectionStatus = "pass" | "flag" | "fail";
type IssueSeverity = "critical" | "major" | "minor" | "info";
type ReviewPhase = "idle" | "analyzing" | "results";
type ActiveTab = "review" | "analytics";

const ANALYSIS_STEPS = [
  { label: "Structural", icon: "🏗️", detail: "Load requirements, foundations, structural members" },
  { label: "Fire Safety", icon: "🔥", detail: "Fire-resistance ratings, egress, sprinklers" },
  { label: "Electrical", icon: "⚡", detail: "Service entrance, circuits, grounding" },
  { label: "Plumbing", icon: "🚿", detail: "Fixture counts, water supply, drainage" },
  { label: "Mechanical / HVAC", icon: "❄️", detail: "Ventilation rates, equipment sizing" },
  { label: "Zoning", icon: "📐", detail: "Setbacks, height restrictions, parking" },
  { label: "ADA / Accessibility", icon: "♿", detail: "Accessible routes, door widths, signage" },
  { label: "Environmental", icon: "🌿", detail: "Stormwater, erosion control, energy efficiency" },
];

interface PermitSection {
  name: string;
  status: SectionStatus;
  confidence: number;
  findings: string[];
  code_references: string[];
}

interface PermitIssue {
  severity: IssueSeverity;
  category: string;
  title: string;
  description: string;
  code_reference: string;
  recommendation: string;
}

interface PermitReviewResult {
  id: string | null;
  overallStatus: OverallStatus;
  overallConfidence: number;
  summary: string;
  sections: PermitSection[];
  issues: PermitIssue[];
  recommendations: string[];
  processingTimeMs: number;
  providerName: string;
  modelId: string;
}

interface PastReview {
  id: string;
  title: string;
  overall_status: string;
  overall_confidence: number;
  building_type: string | null;
  jurisdiction: string | null;
  processing_time_ms: number | null;
  created_at: string;
}

interface ProviderOption {
  id: string;
  provider_name: string;
  model_id: string;
  task_type: string;
  is_default: boolean;
}

interface JurisdictionOption {
  id: string;
  jurisdiction_name: string;
  state: string;
  city: string | null;
  county: string | null;
  building_codes: string[] | null;
  portal_name: string | null;
  portal_url: string | null;
  portal_submission_type: string | null;
  portal_contact_info: { phone?: string; email?: string; address?: string; hours?: string } | null;
  typical_review_days: number | null;
}

interface UploadedFile {
  path: string;
  signedUrl: string | null;
  originalName: string;
  size: number;
  mimeType: string;
  ocrStatus: "pending" | "extracting" | "done" | "error";
  extractedText: string;
}

interface ChecklistItem {
  id: string;
  document_name: string;
  description: string;
  required: boolean;
  status: "ready" | "missing" | "needs_update";
  category: string;
  checked: boolean;
}

interface Checklist {
  items: ChecklistItem[];
  generated_at: string;
  jurisdiction: string | null;
  building_type: string | null;
}

interface AnalyticsData {
  stats: {
    totalReviews: number;
    avgConfidence: number;
    avgTimeSeconds: number;
    mostFlaggedSection: string;
    mostFlaggedRate: number;
  } | null;
  charts: {
    statusDistribution: { name: string; value: number; color: string }[];
    reviewsOverTime: { month: string; count: number }[];
    sectionFlagRates: { name: string; flagRate: number; passRate: number; total: number }[];
  } | null;
}

interface PermitReviewClientProps {
  companyId: string;
  hasProvider: boolean;
  providers: ProviderOption[];
  projects: { id: string; name: string; code: string }[];
  pastReviews: PastReview[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUILDING_TYPES = [
  "Commercial Office",
  "Residential Multi-Family",
  "Residential Single-Family",
  "Industrial / Warehouse",
  "Retail / Restaurant",
  "Mixed-Use",
  "Healthcare / Medical",
  "Educational",
  "Hospitality / Hotel",
  "Infrastructure / Public Works",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PermitReviewClient({
  companyId,
  hasProvider,
  providers,
  projects,
  pastReviews: initialPastReviews,
}: PermitReviewClientProps) {
  // Tabs & phase
  const [activeTab, setActiveTab] = useState<ActiveTab>("review");
  const [phase, setPhase] = useState<ReviewPhase>("idle");
  const [analysisStep, setAnalysisStep] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Cycle through analysis steps while analyzing
  useEffect(() => {
    if (phase !== "analyzing") { setAnalysisStep(0); setElapsedSec(0); return; }
    const stepTimer = setInterval(() => {
      setAnalysisStep((s) => (s + 1) % ANALYSIS_STEPS.length);
    }, 2400);
    const clockTimer = setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => { clearInterval(stepTimer); clearInterval(clockTimer); };
  }, [phase]);

  // Form state
  const [documentText, setDocumentText] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [buildingType, setBuildingType] = useState("");
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [selectedProviderId, setSelectedProviderId] = useState("");

  // Jurisdiction search
  const [jurisdictionSearch, setJurisdictionSearch] = useState("");
  const [jurisdictionResults, setJurisdictionResults] = useState<JurisdictionOption[]>([]);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<JurisdictionOption | null>(null);
  const [showJurisdictionDropdown, setShowJurisdictionDropdown] = useState(false);
  const jurisdictionRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // File upload
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Results
  const [result, setResult] = useState<PermitReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Past reviews
  const [pastReviews, setPastReviews] = useState<PastReview[]>(initialPastReviews);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState<string | null>(null);

  // Checklist (Feature 5)
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);

  // Analytics (Feature 4)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Project context card
  const [projectContext, setProjectContext] = useState<Record<string, unknown> | null>(null);

  // ---- Default provider helper ----
  const defaultProvider = providers.find((p) => p.is_default && p.task_type === "documents")
    || providers.find((p) => p.task_type === "documents")
    || providers.find((p) => p.is_default)
    || providers[0];

  // ---- Close jurisdiction dropdown on outside click ----
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (jurisdictionRef.current && !jurisdictionRef.current.contains(e.target as Node)) {
        setShowJurisdictionDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ---- Jurisdiction search ----
  const handleJurisdictionSearch = useCallback((value: string) => {
    setJurisdictionSearch(value);
    setJurisdiction(value);
    setSelectedJurisdiction(null);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (value.length < 2) {
      setJurisdictionResults([]);
      setShowJurisdictionDropdown(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ai/permit-review/jurisdictions?search=${encodeURIComponent(value)}`);
        if (res.ok) {
          const { jurisdictions } = await res.json();
          setJurisdictionResults(jurisdictions || []);
          setShowJurisdictionDropdown(true);
        }
      } catch {
        // silent
      }
    }, 300);
  }, []);

  const handleSelectJurisdiction = useCallback((j: JurisdictionOption) => {
    setSelectedJurisdiction(j);
    setJurisdiction(j.jurisdiction_name);
    setJurisdictionSearch(j.jurisdiction_name);
    setShowJurisdictionDropdown(false);
  }, []);

  // ---- Project auto-fill (Feature 3) ----
  const handleProjectChange = useCallback(async (pid: string) => {
    setProjectId(pid);
    setProjectContext(null);

    if (!pid) return;

    try {
      const res = await fetch(`/api/projects/${pid}/summary`);
      if (!res.ok) return;
      const data = await res.json();
      setProjectContext(data);

      // Auto-fill fields
      if (data.city && data.state) {
        const loc = `${data.city}, ${data.state}`;
        setJurisdiction(loc);
        setJurisdictionSearch(loc);
        // Trigger jurisdiction search for auto-match
        handleJurisdictionSearch(loc);
      }
      if (data.project_type && !buildingType) {
        const typeMap: Record<string, string> = {
          commercial: "Commercial Office",
          residential: "Residential Multi-Family",
          industrial: "Industrial / Warehouse",
          retail: "Retail / Restaurant",
          mixed_use: "Mixed-Use",
          healthcare: "Healthcare / Medical",
          educational: "Educational",
          hospitality: "Hospitality / Hotel",
          infrastructure: "Infrastructure / Public Works",
        };
        const mapped = typeMap[data.project_type?.toLowerCase()] || "";
        if (mapped) setBuildingType(mapped);
      }
      if (data.name && !title) {
        setTitle(`${data.name} Permit Review`);
      }
    } catch {
      // silent
    }
  }, [buildingType, title, handleJurisdictionSearch]);

  // ---- File upload (Feature 1) ----
  const processFile = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const uploadRes = await fetch("/api/ai/permit-review/upload", {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      throw new Error(err.error || "Upload failed");
    }

    const uploadData = await uploadRes.json();
    const newFile: UploadedFile = {
      path: uploadData.path,
      signedUrl: uploadData.signedUrl?.signedUrl || uploadData.signedUrl || null,
      originalName: uploadData.originalName,
      size: uploadData.size,
      mimeType: uploadData.mimeType,
      ocrStatus: "pending",
      extractedText: "",
    };

    setUploadedFiles((prev) => [...prev, newFile]);

    // Auto-trigger OCR
    setUploadedFiles((prev) =>
      prev.map((f) => f.path === newFile.path ? { ...f, ocrStatus: "extracting" as const } : f)
    );

    try {
      const ocrRes = await fetch("/api/ai/permit-review/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          fileUrl: newFile.signedUrl || newFile.path,
          mimeType: newFile.mimeType,
          selectedProviderId: selectedProviderId || undefined,
        }),
      });

      if (ocrRes.ok) {
        const { extractedText } = await ocrRes.json();
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.path === newFile.path ? { ...f, ocrStatus: "done" as const, extractedText } : f
          )
        );
      } else {
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.path === newFile.path ? { ...f, ocrStatus: "error" as const } : f
          )
        );
      }
    } catch {
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.path === newFile.path ? { ...f, ocrStatus: "error" as const } : f
        )
      );
    }
  }, [companyId, selectedProviderId]);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        await processFile(file);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setError(msg);
      }
    }
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const removeFile = useCallback((path: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.path !== path));
  }, []);

  // ---- Combine all document text ----
  const getCombinedText = useCallback(() => {
    const ocrTexts = uploadedFiles
      .filter((f) => f.ocrStatus === "done" && f.extractedText)
      .map((f) => `--- ${f.originalName} ---\n${f.extractedText}`)
      .join("\n\n");

    return [documentText.trim(), ocrTexts].filter(Boolean).join("\n\n");
  }, [documentText, uploadedFiles]);

  // ---- Run analysis ----
  const handleAnalyze = useCallback(async () => {
    const combined = getCombinedText();
    if (phase === "analyzing" || !combined) return;

    setPhase("analyzing");
    setResult(null);
    setError(null);
    setChecklist(null);

    try {
      const response = await fetch("/api/ai/permit-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          documentText: combined,
          jurisdiction: jurisdiction || undefined,
          buildingType: buildingType || undefined,
          projectId: projectId || undefined,
          title: title || "Permit Review",
          selectedProviderId: selectedProviderId || undefined,
          jurisdictionId: selectedJurisdiction?.id || undefined,
          uploadedFiles: uploadedFiles.map((f) => ({
            path: f.path,
            originalName: f.originalName,
            size: f.size,
            mimeType: f.mimeType,
          })),
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        let message = "Failed to analyze permit documents";
        try {
          const parsed = JSON.parse(errBody);
          if (parsed.error) message = parsed.error;
        } catch {
          // use default
        }
        setError(message);
        setPhase("idle");
        return;
      }

      const data = await response.json();
      setResult(data as PermitReviewResult);
      setPhase("results");

      if (data.id) {
        setPastReviews((prev) => [
          {
            id: data.id,
            title: title || "Permit Review",
            overall_status: data.overallStatus,
            overall_confidence: data.overallConfidence,
            building_type: buildingType || null,
            jurisdiction: jurisdiction || null,
            processing_time_ms: data.processingTimeMs,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(msg);
      setPhase("idle");
    }
  }, [companyId, getCombinedText, jurisdiction, buildingType, projectId, title, phase, selectedProviderId, selectedJurisdiction, uploadedFiles]);

  // ---- Load a past review ----
  const handleLoadReview = useCallback(async (reviewId: string) => {
    setLoadingHistory(reviewId);
    try {
      const res = await fetch(`/api/ai/permit-review/${reviewId}`);
      if (!res.ok) return;
      const data = await res.json();
      setResult({
        id: data.id,
        overallStatus: data.overallStatus,
        overallConfidence: data.overallConfidence,
        summary: data.summary,
        sections: data.sections,
        issues: data.issues,
        recommendations: data.recommendations,
        processingTimeMs: data.processingTimeMs,
        providerName: data.providerName,
        modelId: data.modelId,
      });
      setChecklist(data.submissionChecklist || null);
      setPhase("results");
    } catch {
      // silent
    } finally {
      setLoadingHistory(null);
    }
  }, []);

  // ---- New review ----
  const handleNewReview = useCallback(() => {
    setPhase("idle");
    setResult(null);
    setError(null);
    setDocumentText("");
    setJurisdiction("");
    setJurisdictionSearch("");
    setSelectedJurisdiction(null);
    setBuildingType("");
    setProjectId("");
    setTitle("");
    setUploadedFiles([]);
    setChecklist(null);
    setProjectContext(null);
  }, []);

  // ---- Generate checklist (Feature 5) ----
  const handleGenerateChecklist = useCallback(async () => {
    if (!result?.id) return;
    setChecklistLoading(true);
    try {
      const res = await fetch(`/api/ai/permit-review/${result.id}/checklist`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setChecklist(data);
      }
    } catch {
      // silent
    } finally {
      setChecklistLoading(false);
    }
  }, [result]);

  const handleToggleChecklistItem = useCallback(async (itemId: string, checked: boolean) => {
    if (!result?.id || !checklist) return;
    setChecklist((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.id === itemId ? { ...item, checked } : item
        ),
      };
    });

    fetch(`/api/ai/permit-review/${result.id}/checklist`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, checked }),
    }).catch(() => {});
  }, [result, checklist]);

  // ---- Load analytics (Feature 4) ----
  const loadAnalytics = useCallback(async () => {
    if (analyticsLoading) return;
    setAnalyticsLoading(true);
    try {
      const res = await fetch("/api/ai/permit-review/analytics");
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch {
      // silent
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsLoading]);

  useEffect(() => {
    if (activeTab === "analytics") {
      loadAnalytics();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ---- Export as HTML ----
  const handleExport = useCallback(() => {
    if (!result) return;

    const sectionsHtml = (result.sections || [])
      .map(
        (s) =>
          `<tr><td>${s.name}</td><td>${s.status.toUpperCase()}</td><td>${s.confidence}%</td><td>${(s.findings || []).join("; ")}</td></tr>`
      )
      .join("");

    const issuesHtml = (result.issues || [])
      .map(
        (i) =>
          `<div style="margin-bottom:16px;padding:12px;border-left:4px solid ${i.severity === "critical" ? "#dc2626" : i.severity === "major" ? "#d97706" : "#3b82f6"};background:#f9f9f9;">
            <strong>[${i.severity.toUpperCase()}] ${i.title}</strong> &mdash; ${i.category}<br/>
            <p>${i.description}</p>
            <em>Code: ${i.code_reference}</em><br/>
            <strong>Fix:</strong> ${i.recommendation}
          </div>`
      )
      .join("");

    const recsHtml = (result.recommendations || [])
      .map((r, i) => `<li>${i + 1}. ${r}</li>`)
      .join("");

    const checklistHtml = checklist
      ? `<h2>Submission Checklist (${checklist.items.filter((i) => i.checked).length}/${checklist.items.length})</h2>
         <table><thead><tr><th>Status</th><th>Document</th><th>Category</th><th>Description</th><th>Required</th></tr></thead><tbody>
         ${checklist.items.map((ci) => `<tr><td>${ci.checked ? "&#10003;" : ci.status}</td><td>${ci.document_name}</td><td>${ci.category}</td><td>${ci.description}</td><td>${ci.required ? "Yes" : "No"}</td></tr>`).join("")}
         </tbody></table>`
      : "";

    const ahjHtml = selectedJurisdiction?.portal_name
      ? `<h2>AHJ Portal</h2><p><strong>${selectedJurisdiction.portal_name}</strong> &mdash; ${selectedJurisdiction.jurisdiction_name}</p>
         <p>Submission: ${selectedJurisdiction.portal_submission_type || "N/A"} &bull; Typical Review: ${selectedJurisdiction.typical_review_days || "N/A"} days</p>
         ${selectedJurisdiction.portal_url ? `<p><a href="${selectedJurisdiction.portal_url}">${selectedJurisdiction.portal_url}</a></p>` : ""}`
      : "";

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Permit Review Report</title>
<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 20px;color:#222}
h1{font-size:1.6rem}h2{font-size:1.2rem;margin-top:32px}
table{width:100%;border-collapse:collapse;margin:16px 0}
th,td{padding:8px 12px;border:1px solid #ddd;text-align:left;font-size:0.9rem}
th{background:#f5f5f5;font-weight:700}
.badge{display:inline-block;padding:4px 12px;border-radius:6px;font-weight:700;font-size:0.85rem}
.disclaimer{background:#fffbeb;border:1px solid #fde68a;padding:16px;border-radius:8px;margin-top:32px;font-size:0.85rem}</style>
</head><body>
<h1>AI Permit Compliance Review</h1>
<p><strong>Status:</strong> <span class="badge">${(result.overallStatus || "").replace(/_/g, " ").toUpperCase()}</span></p>
<p><strong>Confidence:</strong> ${result.overallConfidence}% &bull; <strong>Review Time:</strong> ${(result.processingTimeMs / 1000).toFixed(1)}s</p>
${result.summary ? `<p>${result.summary}</p>` : ""}
<h2>Section Breakdown</h2>
<table><thead><tr><th>Section</th><th>Status</th><th>Confidence</th><th>Findings</th></tr></thead><tbody>${sectionsHtml}</tbody></table>
<h2>Issues Identified (${(result.issues || []).length})</h2>
${issuesHtml || "<p>No issues found.</p>"}
<h2>Recommendations</h2>
<ol>${recsHtml}</ol>
${checklistHtml}
${ahjHtml}
<div class="disclaimer"><strong>Disclaimer:</strong> This is an AI-assisted preliminary review and does not constitute an official permit approval or code compliance determination. All findings should be verified by a licensed professional and the local Authority Having Jurisdiction (AHJ).</div>
<p style="margin-top:24px;color:#999;font-size:0.8rem">Generated by Buildwrk AI &bull; ${new Date().toLocaleDateString()}</p>
</body></html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Permit_Review_${(title || "Report").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result, title, checklist, selectedJurisdiction]);

  // ---- Status helpers ----
  const statusLabel = (s: OverallStatus) => {
    switch (s) {
      case "likely_compliant": return "Likely Compliant";
      case "needs_review": return "Needs Review";
      case "issues_found": return "Issues Found";
      default: return s;
    }
  };

  const statusIcon = (s: OverallStatus) => {
    switch (s) {
      case "likely_compliant": return <CheckCircle size={18} />;
      case "needs_review": return <AlertTriangle size={18} />;
      case "issues_found": return <XCircle size={18} />;
      default: return null;
    }
  };

  const statusClass = (s: OverallStatus | string) => {
    switch (s) {
      case "likely_compliant": return "likely-compliant";
      case "needs_review": return "needs-review";
      case "issues_found": return "issues-found";
      default: return "";
    }
  };

  const hasDocumentContent = documentText.trim() || uploadedFiles.some((f) => f.ocrStatus === "done");

  // ---- No provider ----
  if (!hasProvider) {
    return (
      <div className="ai-feature-page">
        <div className="ai-feature-header">
          <div>
            <h1>
              <Shield size={28} className="sparkle-icon" />
              AI Permit Review
            </h1>
            <p className="subtitle">
              AI-powered building code compliance analysis in seconds
            </p>
          </div>
        </div>
        <div className="permit-no-provider">
          <AlertTriangle size={48} />
          <h2>AI Provider Required</h2>
          <p>
            Configure an AI provider to use Permit Review. The AI analyzes your
            documents against building codes and returns compliance findings instantly.
          </p>
          <Link href="/admin/ai-providers" className="ui-btn ui-btn-primary" style={{ display: "inline-flex" }}>
            Configure AI Provider
          </Link>
        </div>
      </div>
    );
  }

  // ---- Render ----
  return (
    <div className="ai-feature-page">
      {/* Header */}
      <div className="ai-feature-header">
        <div>
          <h1>
            <Shield size={28} className="sparkle-icon" />
            AI Permit Review
          </h1>
          <p className="subtitle">
            AI-powered building code compliance analysis — review permits against IBC, NEC, NFPA, ADA, and more
          </p>
        </div>
        {phase === "results" && (
          <div className="ai-feature-header-actions">
            <button className="ui-btn ui-btn-secondary" onClick={handleExport}>
              <Download size={16} /> Export Report
            </button>
            <button className="ui-btn ui-btn-primary" onClick={handleNewReview}>
              <RotateCcw size={16} /> New Review
            </button>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="permit-tab-bar">
        <button
          className={`permit-tab ${activeTab === "review" ? "active" : ""}`}
          onClick={() => setActiveTab("review")}
        >
          <Shield size={16} /> Review
        </button>
        <button
          className={`permit-tab ${activeTab === "analytics" ? "active" : ""}`}
          onClick={() => setActiveTab("analytics")}
        >
          <BarChart3 size={16} /> Analytics
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "12px 16px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 10, marginBottom: 20, fontSize: "0.88rem", color: "var(--color-red)" }}>
          {error}
        </div>
      )}

      {/* ==================== REVIEW TAB ==================== */}
      {activeTab === "review" && (
        <>
          {/* ===== IDLE: Input form ===== */}
          {phase === "idle" && (
            <>
              {/* Config panel */}
              <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "20px 24px", marginBottom: 20 }}>
                <div className="permit-config-grid">
                  <label>
                    Building Type
                    <select value={buildingType} onChange={(e) => setBuildingType(e.target.value)}>
                      <option value="">Select type...</option>
                      {BUILDING_TYPES.map((bt) => (
                        <option key={bt} value={bt}>{bt}</option>
                      ))}
                    </select>
                  </label>

                  {/* Jurisdiction with autocomplete (Feature 2) */}
                  <label>
                    Jurisdiction
                    <div className="permit-jurisdiction-wrapper" ref={jurisdictionRef}>
                      <div className="permit-jurisdiction-input-row">
                        <Search size={14} className="permit-jurisdiction-search-icon" />
                        <input
                          type="text"
                          placeholder="Search jurisdictions..."
                          value={jurisdictionSearch}
                          onChange={(e) => handleJurisdictionSearch(e.target.value)}
                          onFocus={() => {
                            if (jurisdictionResults.length > 0) setShowJurisdictionDropdown(true);
                          }}
                        />
                      </div>
                      {showJurisdictionDropdown && jurisdictionResults.length > 0 && (
                        <div className="permit-jurisdiction-dropdown">
                          {jurisdictionResults.map((j) => (
                            <div
                              key={j.id}
                              className="permit-jurisdiction-option"
                              onClick={() => handleSelectJurisdiction(j)}
                            >
                              <span className="permit-jurisdiction-option-name">{j.jurisdiction_name}</span>
                              <span className="permit-jurisdiction-option-meta">
                                {j.state}{j.city ? `, ${j.city}` : ""}
                              </span>
                              {j.building_codes && j.building_codes.length > 0 && (
                                <span className="permit-jurisdiction-codes">
                                  {j.building_codes.slice(0, 3).join(", ")}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>

                  <label>
                    Link to Project (optional)
                    <select value={projectId} onChange={(e) => handleProjectChange(e.target.value)}>
                      <option value="">None</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code ? `${p.code} — ` : ""}{p.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Review Title
                    <input
                      type="text"
                      placeholder="e.g. Office Remodel Permit"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </label>

                  {/* AI Provider selection (Feature 1) */}
                  <label>
                    AI Provider
                    <select
                      value={selectedProviderId}
                      onChange={(e) => setSelectedProviderId(e.target.value)}
                    >
                      <option value="">
                        {defaultProvider
                          ? `${defaultProvider.provider_name} / ${defaultProvider.model_id} (Recommended)`
                          : "Default"}
                      </option>
                      {providers
                        .filter((p) => p.id !== defaultProvider?.id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.provider_name} / {p.model_id}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>

                {/* Selected jurisdiction tags */}
                {selectedJurisdiction && (
                  <div className="permit-jurisdiction-tags">
                    <span className="permit-jurisdiction-tag selected">
                      {selectedJurisdiction.jurisdiction_name}
                      <X size={12} onClick={() => {
                        setSelectedJurisdiction(null);
                        setJurisdiction("");
                        setJurisdictionSearch("");
                      }} />
                    </span>
                    {selectedJurisdiction.building_codes?.map((code) => (
                      <span key={code} className="permit-jurisdiction-tag">{code}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Project context card (Feature 3) */}
              {projectContext && (
                <div className="permit-project-card">
                  <h4>Project Context</h4>
                  <div className="permit-project-grid">
                    <div><span className="label">Location</span><span>{[projectContext.address_line1, projectContext.city, projectContext.state, projectContext.zip].filter(Boolean).join(", ") || "N/A"}</span></div>
                    <div><span className="label">Client</span><span>{(projectContext.client_name as string) || "N/A"}</span></div>
                    <div><span className="label">Contract</span><span>{projectContext.contract_amount ? `$${Number(projectContext.contract_amount).toLocaleString()}` : "N/A"}</span></div>
                    <div><span className="label">Timeline</span><span>{(projectContext.start_date as string) || "?"} to {(projectContext.estimated_end_date as string) || "?"}</span></div>
                  </div>
                </div>
              )}

              {/* File upload zone (Feature 1) */}
              <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "20px 24px", marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)", marginBottom: 8 }}>
                  Upload Documents (PDF, JPG, PNG)
                </label>
                <div
                  className={`permit-upload-zone${isDragging ? " dragging" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={32} />
                  <p>Drag & drop files here or click to browse</p>
                  <span>PDF, JPG, PNG up to 20MB</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    style={{ display: "none" }}
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                </div>

                {/* Uploaded files list */}
                {uploadedFiles.length > 0 && (
                  <div className="permit-file-list">
                    {uploadedFiles.map((f) => (
                      <div key={f.path} className="permit-file-item">
                        <FileText size={16} />
                        <span className="permit-file-name">{f.originalName}</span>
                        <span className="permit-file-size">{(f.size / 1024).toFixed(0)} KB</span>
                        <span className={`permit-ocr-badge ${f.ocrStatus}`}>
                          {f.ocrStatus === "extracting" && <Loader2 size={12} className="analyzing-icon" />}
                          {f.ocrStatus === "done" && <Check size={12} />}
                          {f.ocrStatus}
                        </span>
                        <button className="permit-file-remove" onClick={(e) => { e.stopPropagation(); removeFile(f.path); }}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Document text input */}
              <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "20px 24px", marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)", marginBottom: 8 }}>
                  Permit Application Text {uploadedFiles.length > 0 ? "(additional text — combined with uploaded documents)" : ""}
                </label>
                <textarea
                  className="permit-textarea"
                  placeholder="Paste your building permit application text here — include project descriptions, scope of work, specifications, structural details, site plans, occupancy info, and any other relevant permit documentation..."
                  value={documentText}
                  onChange={(e) => setDocumentText(e.target.value)}
                />
                <div className={`permit-char-count${documentText.length > 100000 ? " over-limit" : ""}`}>
                  {documentText.length.toLocaleString()} / 100,000 characters
                  {uploadedFiles.filter((f) => f.ocrStatus === "done").length > 0 && (
                    <> + {uploadedFiles.filter((f) => f.ocrStatus === "done").length} OCR document{uploadedFiles.filter((f) => f.ocrStatus === "done").length > 1 ? "s" : ""}</>
                  )}
                </div>
              </div>

              {/* Analyze button */}
              <button
                className="ui-btn ui-btn-primary"
                disabled={!hasDocumentContent || documentText.length > 100000 || uploadedFiles.some((f) => f.ocrStatus === "extracting")}
                onClick={handleAnalyze}
                style={{ height: 48, fontSize: "0.95rem", gap: 8 }}
              >
                <Shield size={18} />
                Analyze Permit Documents
              </button>
            </>
          )}

          {/* ===== ANALYZING ===== */}
          {phase === "analyzing" && (
            <div className="permit-analyzing">
              <div className="analyzing-header">
                <Shield size={28} className="analyzing-shield" />
                <h2>Analyzing Permit Documents</h2>
                <p>AI is reviewing your documents against 8 code compliance areas</p>
              </div>

              {/* Progress bar */}
              <div className="analyzing-progress-bar">
                <div className="analyzing-progress-fill" />
              </div>

              {/* Step list */}
              <div className="analyzing-steps">
                {ANALYSIS_STEPS.map((step, i) => {
                  const isPast = i < analysisStep;
                  const isCurrent = i === analysisStep;
                  return (
                    <div
                      key={step.label}
                      className={`analyzing-step ${isPast ? "done" : ""} ${isCurrent ? "active" : ""}`}
                    >
                      <span className="analyzing-step-icon">{isPast ? "✓" : step.icon}</span>
                      <div className="analyzing-step-text">
                        <span className="analyzing-step-label">{step.label}</span>
                        {isCurrent && <span className="analyzing-step-detail">{step.detail}</span>}
                      </div>
                      {isCurrent && <Loader2 size={16} className="analyzing-step-spinner" />}
                    </div>
                  );
                })}
              </div>

              {/* Elapsed timer */}
              <div className="analyzing-elapsed">
                <Clock size={14} />
                <span>{elapsedSec}s elapsed</span>
              </div>
            </div>
          )}

          {/* ===== RESULTS ===== */}
          {phase === "results" && result && (
            <>
              {/* KPI row */}
              <div className="permit-kpi-row">
                <div className="ai-kpi-card">
                  <span className="kpi-label">Overall Status</span>
                  <span className={`permit-status-badge ${statusClass(result.overallStatus)}`}>
                    {statusIcon(result.overallStatus)}
                    {statusLabel(result.overallStatus)}
                  </span>
                </div>
                <div className="ai-kpi-card">
                  <span className="kpi-label">Confidence</span>
                  <span className="kpi-value">{result.overallConfidence}%</span>
                </div>
                <div className="ai-kpi-card">
                  <span className="kpi-label">Review Time</span>
                  <span className="kpi-value" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Clock size={18} style={{ color: "var(--muted)" }} />
                    {(result.processingTimeMs / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>

              {/* Summary */}
              {result.summary && (
                <div className="permit-summary">{result.summary}</div>
              )}

              {/* Section breakdown */}
              {result.sections && result.sections.length > 0 && (
                <div className="permit-sections-card">
                  <h3>Section Breakdown</h3>
                  {result.sections.map((sec, idx) => (
                    <div key={idx} className="permit-section-row">
                      <span className="permit-section-name">{sec.name}</span>
                      <span className={`permit-section-badge ${sec.status}`}>
                        {sec.status}
                      </span>
                      <div className="permit-section-bar">
                        <div
                          className={`permit-section-bar-fill ${sec.status}`}
                          style={{ width: `${sec.confidence}%` }}
                        />
                      </div>
                      <span className="permit-section-pct">{sec.confidence}%</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Issues */}
              {result.issues && result.issues.length > 0 && (
                <div className="permit-issues-card">
                  <h3>
                    <AlertTriangle size={20} style={{ color: "var(--color-amber)" }} />
                    Issues Identified ({result.issues.length})
                  </h3>
                  {result.issues.map((issue, idx) => (
                    <div key={idx} className={`permit-issue-item severity-${issue.severity}`}>
                      <div className="permit-issue-header">
                        <span className={`permit-issue-severity ${issue.severity}`}>
                          {issue.severity}
                        </span>
                        <span className="permit-issue-title">{issue.title}</span>
                        <span className="permit-issue-category">{issue.category}</span>
                      </div>
                      <p className="permit-issue-description">{issue.description}</p>
                      {issue.code_reference && (
                        <p className="permit-issue-code">Code: {issue.code_reference}</p>
                      )}
                      {issue.recommendation && (
                        <p className="permit-issue-fix">
                          <Lightbulb size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                          {issue.recommendation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* No issues */}
              {result.issues && result.issues.length === 0 && (
                <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckCircle size={20} style={{ color: "var(--color-green)" }} />
                  <span style={{ fontSize: "0.92rem", fontWeight: 600 }}>No specific issues identified based on the submitted documents.</span>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="permit-recs-card">
                  <h3>Recommendations</h3>
                  <ol>
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Checklist section (Feature 5) */}
              <div className="permit-checklist-section">
                {!checklist && (
                  <button
                    className="ui-btn ui-btn-secondary"
                    onClick={handleGenerateChecklist}
                    disabled={checklistLoading}
                    style={{ gap: 8 }}
                  >
                    {checklistLoading ? <Loader2 size={16} className="analyzing-icon" /> : <ClipboardCheck size={16} />}
                    Generate Submission Checklist
                  </button>
                )}
                {checklist && checklist.items.length > 0 && (
                  <div className="permit-checklist-card">
                    <div className="permit-checklist-header">
                      <h3><ClipboardCheck size={20} /> Pre-Submission Checklist</h3>
                      <span className="permit-checklist-progress">
                        {checklist.items.filter((i) => i.checked).length} / {checklist.items.length} completed
                      </span>
                    </div>
                    <div className="permit-checklist-bar">
                      <div
                        className="permit-checklist-bar-fill"
                        style={{ width: `${(checklist.items.filter((i) => i.checked).length / checklist.items.length) * 100}%` }}
                      />
                    </div>
                    <div className="permit-checklist-items">
                      {checklist.items.map((item) => (
                        <div
                          key={item.id}
                          className={`permit-checklist-item status-${item.status}${item.checked ? " checked" : ""}`}
                          onClick={() => handleToggleChecklistItem(item.id, !item.checked)}
                        >
                          <div className={`permit-checklist-checkbox${item.checked ? " checked" : ""}`}>
                            {item.checked && <Check size={12} />}
                          </div>
                          <div className="permit-checklist-item-content">
                            <span className="permit-checklist-item-name">{item.document_name}</span>
                            <span className="permit-checklist-item-desc">{item.description}</span>
                          </div>
                          <span className={`permit-checklist-item-status ${item.status}`}>
                            {item.status.replace("_", " ")}
                          </span>
                          {item.required && <span className="permit-checklist-required">Required</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* AHJ Portal Card (Feature 6) */}
              {selectedJurisdiction?.portal_name && (
                <div className="permit-ahj-card">
                  <h3>
                    <ExternalLink size={18} />
                    AHJ Portal — {selectedJurisdiction.jurisdiction_name}
                  </h3>
                  <div className="permit-ahj-grid">
                    <div>
                      <span className="label">Portal</span>
                      <span>{selectedJurisdiction.portal_name}</span>
                    </div>
                    <div>
                      <span className="label">Submission</span>
                      <span style={{ textTransform: "capitalize" }}>{selectedJurisdiction.portal_submission_type?.replace("_", " ") || "N/A"}</span>
                    </div>
                    <div>
                      <span className="label">Typical Review</span>
                      <span>{selectedJurisdiction.typical_review_days ? `${selectedJurisdiction.typical_review_days} business days` : "N/A"}</span>
                    </div>
                    {selectedJurisdiction.portal_contact_info?.phone && (
                      <div>
                        <span className="label">Phone</span>
                        <span>{selectedJurisdiction.portal_contact_info.phone}</span>
                      </div>
                    )}
                    {selectedJurisdiction.portal_contact_info?.email && (
                      <div>
                        <span className="label">Email</span>
                        <span>{selectedJurisdiction.portal_contact_info.email}</span>
                      </div>
                    )}
                  </div>
                  {selectedJurisdiction.portal_url && (
                    <a
                      href={selectedJurisdiction.portal_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ui-btn ui-btn-primary permit-ahj-btn"
                    >
                      <ExternalLink size={16} />
                      Open {selectedJurisdiction.portal_name}
                    </a>
                  )}
                </div>
              )}

              {/* Disclaimer */}
              <div className="permit-disclaimer">
                <Info size={20} />
                <span>
                  <strong>Disclaimer:</strong> This is an AI-assisted preliminary review and does not
                  constitute an official permit approval or code compliance determination. All findings
                  should be verified by a licensed professional and the local Authority Having Jurisdiction (AHJ).
                </span>
              </div>
            </>
          )}

          {/* ===== Past Reviews ===== */}
          {pastReviews.length > 0 && (
            <div className="permit-history-card" style={{ marginTop: phase === "idle" ? 32 : 0 }}>
              <div
                className="permit-history-toggle"
                onClick={() => setShowHistory(!showHistory)}
              >
                <h3>
                  {showHistory ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  Past Reviews ({pastReviews.length})
                </h3>
              </div>
              {showHistory && (
                <div className="permit-history-list">
                  {pastReviews.map((r) => (
                    <div
                      key={r.id}
                      className="permit-history-row"
                      onClick={() => handleLoadReview(r.id)}
                    >
                      <span className={`permit-status-badge ${statusClass(r.overall_status)}`} style={{ fontSize: "0.68rem", padding: "2px 8px" }}>
                        {(r.overall_status || "").replace(/_/g, " ")}
                      </span>
                      <span className="history-title">{r.title}</span>
                      {r.building_type && (
                        <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{r.building_type}</span>
                      )}
                      <span className="history-date">
                        {loadingHistory === r.id ? (
                          <Loader2 size={14} className="analyzing-icon" />
                        ) : (
                          new Date(r.created_at).toLocaleDateString()
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ==================== ANALYTICS TAB (Feature 4) ==================== */}
      {activeTab === "analytics" && (
        <div className="permit-analytics">
          {analyticsLoading && (
            <div className="permit-analyzing" style={{ padding: "40px 24px" }}>
              <Loader2 size={40} className="analyzing-icon" />
              <p>Loading analytics...</p>
            </div>
          )}

          {!analyticsLoading && !analytics?.stats && (
            <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--muted)" }}>
              <BarChart3 size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
              <h3 style={{ fontFamily: "var(--font-serif)", marginBottom: 8 }}>No Analytics Yet</h3>
              <p style={{ fontSize: "0.88rem" }}>Run some permit reviews to see analytics data here.</p>
            </div>
          )}

          {analytics?.stats && analytics.charts && (
            <>
              {/* KPI cards */}
              <div className="permit-analytics-kpis">
                <div className="ai-kpi-card">
                  <span className="kpi-label">Total Reviews</span>
                  <span className="kpi-value">{analytics.stats.totalReviews}</span>
                </div>
                <div className="ai-kpi-card">
                  <span className="kpi-label">Avg Confidence</span>
                  <span className="kpi-value">{analytics.stats.avgConfidence}%</span>
                </div>
                <div className="ai-kpi-card">
                  <span className="kpi-label">Avg Review Time</span>
                  <span className="kpi-value">{analytics.stats.avgTimeSeconds}s</span>
                </div>
                <div className="ai-kpi-card">
                  <span className="kpi-label">Most Flagged</span>
                  <span className="kpi-value" style={{ fontSize: "0.88rem" }}>
                    {analytics.stats.mostFlaggedSection || "N/A"}
                    {analytics.stats.mostFlaggedRate > 0 && (
                      <span style={{ fontSize: "0.75rem", color: "var(--color-amber)", marginLeft: 4 }}>
                        {analytics.stats.mostFlaggedRate}%
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Charts */}
              <div className="permit-analytics-charts">
                <div className="permit-analytics-chart-card">
                  <h4>Status Distribution</h4>
                  <StatusDonutChart data={analytics.charts.statusDistribution} />
                </div>
                <div className="permit-analytics-chart-card">
                  <h4>Reviews Over Time</h4>
                  <ReviewTrendChart data={analytics.charts.reviewsOverTime} />
                </div>
              </div>

              {analytics.charts.sectionFlagRates.length > 0 && (
                <div className="permit-analytics-chart-card" style={{ marginBottom: 24 }}>
                  <h4>Section Flag Rates</h4>
                  <SectionFlagChart data={analytics.charts.sectionFlagRates} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
