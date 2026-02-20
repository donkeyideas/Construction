"use client";

import { useState, useCallback } from "react";
import {
  Sparkles,
  FileText,
  X,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";

interface Props {
  companyId: string;
  hasProvider: boolean;
  contractTitle?: string;
  contractText?: string;
}

/**
 * AI Contract Analyzer button + modal.
 *
 * Renders an "Analyze Contract" trigger button (`.ai-inline-btn`).
 * When clicked, opens a modal where users can paste contract text
 * (or uses the `contractText` prop if provided). The component then
 * streams an AI-powered clause-by-clause risk analysis from
 * `/api/ai/analyze-contract`, identifying risky clauses, favorable
 * terms, and missing provisions.
 */
export default function AIContractAnalyzer({
  companyId,
  hasProvider,
  contractTitle,
  contractText: initialContractText,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [contractInput, setContractInput] = useState(
    initialContractText || ""
  );
  const [isLoading, setIsLoading] = useState(false);
  const [resultText, setResultText] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // -------------------------------------------------------------------
  // Open modal
  // -------------------------------------------------------------------
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setResultText("");
    setError("");
    setContractInput(initialContractText || "");
  }, [initialContractText]);

  // -------------------------------------------------------------------
  // Close modal
  // -------------------------------------------------------------------
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // -------------------------------------------------------------------
  // Analyze contract via streaming API
  // -------------------------------------------------------------------
  const handleAnalyze = useCallback(async () => {
    if (!contractInput.trim()) return;

    setIsLoading(true);
    setResultText("");
    setError("");

    try {
      const response = await fetch("/api/ai/analyze-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          contractText: contractInput.trim(),
          contractTitle: contractTitle || undefined,
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
        setError(errMsg || "Failed to analyze contract");
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
      console.error("Contract analysis error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [companyId, contractInput, contractTitle]);

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

  return (
    <>
      {/* Trigger button */}
      <button className="ai-inline-btn" onClick={handleOpen}>
        <Sparkles size={14} className="sparkle-icon" />
        <FileText size={14} />
        Analyze Contract
      </button>

      {/* Modal */}
      {isOpen && (
        <>
          <div className="ai-modal-overlay" onClick={handleClose} />

          <div className="ai-modal" style={{ maxWidth: "720px" }}>
            {/* Header */}
            <div className="ai-modal-header">
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Sparkles size={18} className="sparkle-icon" />
                <span className="modal-title">
                  Contract Analysis
                  {contractTitle ? ` — ${contractTitle}` : ""}
                </span>
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
              {/* No provider */}
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
                    contract analysis.
                  </div>
                </div>
              )}

              {/* Contract text input (when no result yet and no pre-filled text) */}
              {hasProvider && !resultText && !isLoading && (
                <>
                  {/* Legend for risk icons */}
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      marginBottom: "12px",
                      fontSize: "0.78rem",
                      color: "var(--muted)",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <AlertTriangle
                        size={12}
                        style={{ color: "var(--color-red)" }}
                      />
                      Risky Clauses
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <CheckCircle
                        size={12}
                        style={{ color: "var(--color-green)" }}
                      />
                      Favorable Terms
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Info
                        size={12}
                        style={{ color: "var(--color-amber)" }}
                      />
                      Missing Clauses
                    </span>
                  </div>

                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      marginBottom: "6px",
                    }}
                  >
                    Contract Text
                  </label>
                  <textarea
                    className="provider-form-input"
                    rows={12}
                    placeholder="Paste the full contract text or specific clauses you want analyzed..."
                    value={contractInput}
                    onChange={(e) => setContractInput(e.target.value)}
                    style={{
                      width: "100%",
                      resize: "vertical",
                      fontFamily: "var(--font-sans)",
                      lineHeight: 1.6,
                      marginBottom: "8px",
                    }}
                  />
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--muted)",
                      marginBottom: "4px",
                    }}
                  >
                    {contractInput.length.toLocaleString()} characters
                  </div>
                </>
              )}

              {/* Loading state */}
              {isLoading && !resultText && (
                <div className="ai-modal-body loading">
                  <Loader2
                    size={24}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  <span>Analyzing contract clauses...</span>
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

              {/* Analyze button (before any result) */}
              {hasProvider && !resultText && !isLoading && (
                <button
                  className="ui-btn ui-btn-primary"
                  onClick={handleAnalyze}
                  disabled={!contractInput.trim()}
                >
                  <Sparkles size={14} />
                  Analyze
                </button>
              )}

              {/* Copy button (after result) */}
              {resultText && !isLoading && (
                <>
                  <button
                    className="ui-btn"
                    onClick={handleCopy}
                    title="Copy to clipboard"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    className="ui-btn"
                    onClick={() => {
                      setResultText("");
                      setError("");
                    }}
                  >
                    <FileText size={14} />
                    Analyze Another
                  </button>
                </>
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
