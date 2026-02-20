"use client";

import { useState, useCallback } from "react";
import { Sparkles, X, Loader2, Copy, Check } from "lucide-react";

interface Props {
  companyId: string;
  projectId: string;
  projectName: string;
  hasProvider: boolean;
}

/**
 * AI Schedule Optimizer button + modal.
 *
 * Renders a compact "AI Optimize" trigger button (`.ai-inline-btn`).
 * When clicked, opens a modal that streams schedule optimization
 * recommendations from the existing `/api/ai/generate-report` endpoint
 * using the "project_status" report type scoped to the given project.
 *
 * If the company has no AI provider configured, a configuration
 * prompt is shown instead.
 */
export default function AIScheduleOptimizer({
  companyId,
  projectId,
  projectName,
  hasProvider,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resultText, setResultText] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // -------------------------------------------------------------------
  // Open modal and start streaming analysis
  // -------------------------------------------------------------------
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setResultText("");
    setError("");

    if (!hasProvider) return;

    // Start generating immediately on open
    streamOptimization();
  }, [hasProvider]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------
  // Stream schedule optimisation from the report endpoint
  // -------------------------------------------------------------------
  const streamOptimization = useCallback(async () => {
    setIsLoading(true);
    setResultText("");
    setError("");

    try {
      // Build a date range: last 90 days to 90 days from now
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 90);
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 90);

      const response = await fetch("/api/ai/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          reportType: "project_status",
          projectId,
          startDate: startDate.toISOString().slice(0, 10),
          endDate: endDate.toISOString().slice(0, 10),
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        let errMsg: string;
        try {
          errMsg = JSON.parse(errBody).error || errBody;
        } catch {
          errMsg = errBody;
        }
        setError(errMsg || "Failed to generate schedule analysis");
        setIsLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError("Streaming not supported in this browser");
        setIsLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setResultText(fullText);
      }
    } catch (err) {
      console.error("Schedule optimization error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [companyId, projectId]);

  // -------------------------------------------------------------------
  // Copy result to clipboard
  // -------------------------------------------------------------------
  const handleCopy = useCallback(async () => {
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

  // -------------------------------------------------------------------
  // Close modal
  // -------------------------------------------------------------------
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <>
      {/* Trigger button */}
      <button className="ai-inline-btn" onClick={handleOpen}>
        <Sparkles size={14} className="sparkle-icon" />
        AI Optimize
      </button>

      {/* Modal */}
      {isOpen && (
        <>
          <div className="ai-modal-overlay" onClick={handleClose} />

          <div className="ai-modal" style={{ maxWidth: "700px" }}>
            {/* Header */}
            <div className="ai-modal-header">
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Sparkles size={18} className="sparkle-icon" />
                <span className="modal-title">Schedule Optimization</span>
              </div>
              <button
                className="modal-close"
                onClick={handleClose}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="ai-modal-body">
              {/* No provider configured */}
              {!hasProvider && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "32px 16px",
                    color: "var(--muted)",
                  }}
                >
                  <Sparkles
                    size={32}
                    style={{
                      color: "var(--color-amber)",
                      marginBottom: "12px",
                    }}
                  />
                  <div
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      color: "var(--text)",
                      marginBottom: "6px",
                    }}
                  >
                    AI Provider Required
                  </div>
                  <div style={{ fontSize: "0.85rem", lineHeight: 1.6 }}>
                    Configure an AI provider in{" "}
                    <strong>Administration &gt; AI Providers</strong> to enable
                    schedule optimization analysis.
                  </div>
                </div>
              )}

              {/* Loading state */}
              {hasProvider && isLoading && !resultText && (
                <div className="ai-modal-body loading">
                  <Loader2
                    size={24}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  <span>Analyzing schedule for {projectName}...</span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div
                  className="provider-message error"
                  style={{ marginBottom: "12px" }}
                >
                  {error}
                </div>
              )}

              {/* Streaming / completed result */}
              {resultText && (
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "16px",
                    background: "var(--surface)",
                    maxHeight: "420px",
                    overflowY: "auto",
                  }}
                >
                  <div
                    className="ai-result-text"
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {resultText}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="ai-modal-footer">
              {/* Streaming indicator */}
              {isLoading && resultText && (
                <div className="ai-generating">
                  <span className="generating-dot" />
                  <span className="generating-dot" />
                  <span className="generating-dot" />
                  <span style={{ fontSize: "0.82rem" }}>Analyzing...</span>
                </div>
              )}

              {/* Copy button (only when result is ready) */}
              {resultText && !isLoading && (
                <button
                  className="ui-btn"
                  onClick={handleCopy}
                  title="Copy to clipboard"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              )}

              <button className="ui-btn" onClick={handleClose}>
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
