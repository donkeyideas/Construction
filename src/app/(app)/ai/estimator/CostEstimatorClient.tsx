"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Calculator,
  Loader2,
  AlertTriangle,
  Copy,
  CheckCircle,
  Download,
} from "lucide-react";
import "@/styles/ai-features.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectRef {
  id: string;
  name: string;
  code: string;
  status: string;
  contractAmount: number;
  projectType: string;
}

interface CostEstimatorClientProps {
  companyId: string;
  hasProvider: boolean;
  projects: ProjectRef[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROJECT_TYPES = [
  "Commercial",
  "Residential",
  "Infrastructure",
  "Industrial",
];

const QUALITY_LEVELS = [
  { id: "economy", label: "Economy" },
  { id: "standard", label: "Standard" },
  { id: "premium", label: "Premium" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CostEstimatorClient({
  companyId,
  hasProvider,
  projects,
}: CostEstimatorClientProps) {
  // Form state
  const [projectType, setProjectType] = useState("Commercial");
  const [squareFootage, setSquareFootage] = useState("");
  const [stories, setStories] = useState("1");
  const [qualityLevel, setQualityLevel] = useState("standard");
  const [location, setLocation] = useState("");
  const [requirements, setRequirements] = useState("");

  // Result state
  const [resultText, setResultText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Suppress unused variable warning - projects available for future reference
  void projects;

  // ---- Generate estimate ----
  const handleGenerate = useCallback(async () => {
    if (isGenerating) return;

    const sf = Number(squareFootage);
    const st = Number(stories);
    if (!sf || sf <= 0 || !st || st <= 0 || !location.trim()) return;

    setIsGenerating(true);
    setResultText("");
    setError(null);
    setCopied(false);

    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/ai/estimate-cost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          projectType,
          squareFootage: sf,
          stories: st,
          qualityLevel,
          location: location.trim(),
          requirements: requirements.trim(),
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errBody = await response.text();
        let message = "Failed to generate cost estimate";
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
        setResultText(accumulated);
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
  }, [
    companyId,
    projectType,
    squareFootage,
    stories,
    qualityLevel,
    location,
    requirements,
    isGenerating,
  ]);

  // ---- Copy to clipboard ----
  const handleCopy = useCallback(async () => {
    if (!resultText) return;
    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = resultText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [resultText]);

  // ---- Download as text ----
  const handleDownload = useCallback(() => {
    if (!resultText) return;
    const blob = new Blob([resultText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    a.download = `Cost_Estimate_${projectType}_${dateStr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [resultText, projectType]);

  // ---- Render: No provider configured ----
  if (!hasProvider) {
    return (
      <div className="ai-feature-page">
        <div className="ai-feature-header">
          <div>
            <h1>
              <Calculator size={28} className="sparkle-icon" />
              AI Cost Estimator
            </h1>
            <p className="subtitle">
              Generate detailed construction cost estimates by CSI division
            </p>
          </div>
        </div>

        <div
          className="prediction-card"
          style={{
            textAlign: "center",
            padding: "48px 24px",
            maxWidth: 560,
          }}
        >
          <AlertTriangle
            size={36}
            style={{ color: "var(--color-amber)", marginBottom: 16 }}
          />
          <div
            style={{
              fontSize: "1.05rem",
              fontWeight: 600,
              marginBottom: 8,
              color: "var(--text)",
              fontFamily: "var(--font-serif)",
            }}
          >
            AI Provider Required
          </div>
          <p
            style={{
              color: "var(--muted)",
              fontSize: "0.88rem",
              lineHeight: 1.6,
              marginBottom: 16,
            }}
          >
            Configure an AI provider in Administration &gt; AI Providers to
            enable cost estimation.
          </p>
          <Link
            href="/admin/ai-providers"
            className="ui-btn ui-btn-primary"
            style={{ display: "inline-flex" }}
          >
            Configure AI Provider
          </Link>
        </div>
      </div>
    );
  }

  // ---- Render: Main layout ----
  const canGenerate =
    Number(squareFootage) > 0 &&
    Number(stories) > 0 &&
    location.trim().length > 0;

  return (
    <div className="ai-feature-page">
      {/* Header */}
      <div className="ai-feature-header">
        <div>
          <h1>
            <Calculator size={28} className="sparkle-icon" />
            AI Cost Estimator
          </h1>
          <p className="subtitle">
            Generate detailed construction cost estimates by CSI division
          </p>
        </div>
      </div>

      {/* Estimator Form */}
      <div className="estimator-form">
        <div className="form-title">Project Parameters</div>

        <div className="form-grid">
          {/* Project Type */}
          <div>
            <label
              htmlFor="project-type"
              style={{
                display: "block",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                marginBottom: 6,
              }}
            >
              Project Type
            </label>
            <select
              id="project-type"
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "0.875rem",
                fontFamily: "var(--font-sans)",
                color: "var(--text)",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                appearance: "auto",
              }}
            >
              {PROJECT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Square Footage */}
          <div>
            <label
              htmlFor="sq-footage"
              style={{
                display: "block",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                marginBottom: 6,
              }}
            >
              Square Footage
            </label>
            <input
              id="sq-footage"
              type="number"
              min="1"
              value={squareFootage}
              onChange={(e) => setSquareFootage(e.target.value)}
              placeholder="e.g. 50000"
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "0.875rem",
                fontFamily: "var(--font-sans)",
                color: "var(--text)",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            />
          </div>

          {/* Number of Stories */}
          <div>
            <label
              htmlFor="stories"
              style={{
                display: "block",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                marginBottom: 6,
              }}
            >
              Number of Stories
            </label>
            <input
              id="stories"
              type="number"
              min="1"
              value={stories}
              onChange={(e) => setStories(e.target.value)}
              placeholder="e.g. 3"
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "0.875rem",
                fontFamily: "var(--font-sans)",
                color: "var(--text)",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            />
          </div>

          {/* Quality Level */}
          <div>
            <label
              htmlFor="quality-level"
              style={{
                display: "block",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                marginBottom: 6,
              }}
            >
              Quality Level
            </label>
            <select
              id="quality-level"
              value={qualityLevel}
              onChange={(e) => setQualityLevel(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "0.875rem",
                fontFamily: "var(--font-sans)",
                color: "var(--text)",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                appearance: "auto",
              }}
            >
              {QUALITY_LEVELS.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label
              htmlFor="location"
              style={{
                display: "block",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                marginBottom: 6,
              }}
            >
              Location / City
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Houston, TX"
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "0.875rem",
                fontFamily: "var(--font-sans)",
                color: "var(--text)",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            />
          </div>

          {/* Special Requirements - full width */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label
              htmlFor="requirements"
              style={{
                display: "block",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                marginBottom: 6,
              }}
            >
              Special Requirements (optional)
            </label>
            <textarea
              id="requirements"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="e.g. LEED Gold certification, seismic zone 4, hurricane-rated windows..."
              rows={3}
              style={{
                width: "100%",
                padding: "12px 14px",
                fontSize: "0.875rem",
                fontFamily: "var(--font-sans)",
                color: "var(--text)",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                resize: "vertical",
                lineHeight: 1.6,
              }}
            />
          </div>
        </div>

        {/* Generate button */}
        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            className="ui-btn ui-btn-primary"
            onClick={handleGenerate}
            disabled={isGenerating || !canGenerate}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {isGenerating ? (
              <>
                <Loader2
                  size={16}
                  style={{ animation: "spin 1s linear infinite" }}
                />
                Generating Estimate...
              </>
            ) : (
              <>
                <Calculator size={16} />
                Generate Estimate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "16px 20px",
            background: "rgba(220, 38, 38, 0.06)",
            border: "1px solid rgba(220, 38, 38, 0.2)",
            borderRadius: 8,
            color: "var(--color-red)",
            fontSize: "0.875rem",
            lineHeight: 1.5,
            marginBottom: 16,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <AlertTriangle
            size={16}
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <span>{error}</span>
        </div>
      )}

      {/* Loading skeleton */}
      {isGenerating && !resultText && (
        <div className="estimator-results">
          <div className="results-title">Generating Cost Estimate...</div>
          <div className="report-loading" style={{ padding: "20px" }}>
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
          </div>
        </div>
      )}

      {/* Results */}
      {resultText && (
        <div className="estimator-results">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div className="results-title" style={{ padding: 0, border: "none" }}>
              Cost Estimate Results
            </div>
            {!isGenerating && (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary"
                  onClick={handleCopy}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.78rem",
                    padding: "6px 12px",
                  }}
                >
                  {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary"
                  onClick={handleDownload}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.78rem",
                    padding: "6px 12px",
                  }}
                >
                  <Download size={14} />
                  Download
                </button>
              </div>
            )}
          </div>
          <div
            className="ai-result-text"
            style={{ padding: "20px", whiteSpace: "pre-wrap" }}
          >
            {resultText}
          </div>
        </div>
      )}
    </div>
  );
}
