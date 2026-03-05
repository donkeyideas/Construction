"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
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
} from "lucide-react";
import "@/styles/ai-features.css";
import "@/styles/permit-review.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OverallStatus = "likely_compliant" | "needs_review" | "issues_found";
type SectionStatus = "pass" | "flag" | "fail";
type IssueSeverity = "critical" | "major" | "minor" | "info";
type ReviewPhase = "idle" | "analyzing" | "results";

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

interface PermitReviewClientProps {
  companyId: string;
  hasProvider: boolean;
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
  projects,
  pastReviews: initialPastReviews,
}: PermitReviewClientProps) {
  // Phase
  const [phase, setPhase] = useState<ReviewPhase>("idle");

  // Form state
  const [documentText, setDocumentText] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [buildingType, setBuildingType] = useState("");
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");

  // Results
  const [result, setResult] = useState<PermitReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Past reviews
  const [pastReviews, setPastReviews] = useState<PastReview[]>(initialPastReviews);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState<string | null>(null);

  // ---- Run analysis ----
  const handleAnalyze = useCallback(async () => {
    if (phase === "analyzing" || !documentText.trim()) return;

    setPhase("analyzing");
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/ai/permit-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          documentText: documentText.trim(),
          jurisdiction: jurisdiction || undefined,
          buildingType: buildingType || undefined,
          projectId: projectId || undefined,
          title: title || "Permit Review",
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

      // Refresh past reviews
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
  }, [companyId, documentText, jurisdiction, buildingType, projectId, title, phase]);

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
    setBuildingType("");
    setProjectId("");
    setTitle("");
  }, []);

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
  }, [result, title]);

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

      {/* Error */}
      {error && (
        <div style={{ padding: "12px 16px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 10, marginBottom: 20, fontSize: "0.88rem", color: "var(--color-red)" }}>
          {error}
        </div>
      )}

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
              <label>
                Jurisdiction
                <input
                  type="text"
                  placeholder="e.g. City of Miami, FL"
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                />
              </label>
              <label>
                Link to Project (optional)
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
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
            </div>
          </div>

          {/* Document text input */}
          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "20px 24px", marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)", marginBottom: 8 }}>
              Permit Application Documents
            </label>
            <textarea
              className="permit-textarea"
              placeholder="Paste your building permit application text here — include project descriptions, scope of work, specifications, structural details, site plans, occupancy info, and any other relevant permit documentation..."
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
            />
            <div className={`permit-char-count${documentText.length > 100000 ? " over-limit" : ""}`}>
              {documentText.length.toLocaleString()} / 100,000 characters
            </div>
          </div>

          {/* Analyze button */}
          <button
            className="ui-btn ui-btn-primary"
            disabled={!documentText.trim() || documentText.length > 100000}
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
          <Loader2 size={64} className="analyzing-icon" />
          <h2>Analyzing Permit Documents</h2>
          <p>Reviewing against 8 code compliance areas — Structural, Fire Safety, Electrical, Plumbing, Mechanical, Zoning, ADA, Environmental...</p>
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
    </div>
  );
}
