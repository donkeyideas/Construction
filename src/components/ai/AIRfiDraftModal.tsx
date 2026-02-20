"use client";

import { useState, useCallback } from "react";
import { Sparkles, X, Loader2, Copy, Check, RefreshCw } from "lucide-react";

interface AIRfiDraftModalProps {
  companyId: string;
  rfiId: string;
  rfiNumber: string;
  rfiSubject: string;
  rfiQuestion: string;
  onClose: () => void;
  onInsert: (text: string) => void;
}

export default function AIRfiDraftModal({
  companyId,
  rfiId,
  rfiNumber,
  rfiSubject,
  rfiQuestion,
  onClose,
  onInsert,
}: AIRfiDraftModalProps) {
  const [generatedText, setGeneratedText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // -------------------------------------------------------------------
  // Generate (or regenerate) a draft RFI response via streaming API
  // -------------------------------------------------------------------
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setGeneratedText("");
    setError("");

    try {
      const response = await fetch("/api/ai/draft-rfi-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, rfiId }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        let errMsg: string;
        try {
          errMsg = JSON.parse(errBody).error || errBody;
        } catch {
          errMsg = errBody;
        }
        setError(errMsg || "Failed to generate RFI draft response");
        setIsGenerating(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError("Streaming not supported");
        setIsGenerating(false);
        return;
      }

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setGeneratedText(fullText);
      }
    } catch (err) {
      console.error("RFI draft generation error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [companyId, rfiId]);

  // -------------------------------------------------------------------
  // Copy generated text to clipboard
  // -------------------------------------------------------------------
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for insecure contexts
      const textarea = document.createElement("textarea");
      textarea.value = generatedText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedText]);

  // -------------------------------------------------------------------
  // Insert text into the parent form
  // -------------------------------------------------------------------
  const handleInsert = useCallback(() => {
    onInsert(generatedText);
    onClose();
  }, [generatedText, onInsert, onClose]);

  return (
    <>
      {/* Overlay */}
      <div className="ai-modal-overlay" onClick={onClose} />

      {/* Modal */}
      <div className="ai-modal">
        {/* Header */}
        <div className="ai-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={18} className="sparkle-icon" />
            <span className="modal-title">AI Draft Response</span>
          </div>
          <button className="modal-close" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="ai-modal-body">
          {/* RFI context (readonly) */}
          <div
            style={{
              marginBottom: "16px",
              padding: "14px 16px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: "6px",
              }}
            >
              RFI #{rfiNumber}: {rfiSubject}
            </div>
            <div
              style={{
                fontSize: "0.85rem",
                color: "var(--text)",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {rfiQuestion}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="provider-message error" style={{ marginBottom: "12px" }}>
              {error}
            </div>
          )}

          {/* Generating indicator */}
          {isGenerating && !generatedText && (
            <div className="ai-generating" style={{ marginBottom: "12px" }}>
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              <span>Generating draft response...</span>
            </div>
          )}

          {/* Generated text result */}
          {generatedText && (
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "16px",
                background: "var(--surface)",
                maxHeight: "320px",
                overflowY: "auto",
              }}
            >
              <div className="ai-result-text" style={{ whiteSpace: "pre-wrap" }}>
                {generatedText}
              </div>
            </div>
          )}

          {/* Initial state: prompt to generate */}
          {!generatedText && !isGenerating && !error && (
            <div
              style={{
                textAlign: "center",
                padding: "24px 0",
                color: "var(--muted)",
                fontSize: "0.85rem",
              }}
            >
              Click <strong>Generate Draft</strong> to create an AI-powered
              response for this RFI.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ai-modal-footer">
          {/* Generate / Regenerate button */}
          {!isGenerating && (
            <button
              className={`ui-btn ${!generatedText ? "ui-btn-primary" : ""}`}
              onClick={handleGenerate}
            >
              {generatedText ? (
                <>
                  <RefreshCw size={14} />
                  Regenerate
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Generate Draft
                </>
              )}
            </button>
          )}

          {/* In-progress indicator in footer */}
          {isGenerating && generatedText && (
            <div className="ai-generating">
              <span className="generating-dot" />
              <span className="generating-dot" />
              <span className="generating-dot" />
              <span style={{ fontSize: "0.82rem" }}>Generating...</span>
            </div>
          )}

          {/* Copy + Use buttons (only when generation is complete) */}
          {generatedText && !isGenerating && (
            <>
              <button
                className="ui-btn"
                onClick={handleCopy}
                title="Copy to clipboard"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button className="ui-btn ui-btn-primary" onClick={handleInsert}>
                Use as Response
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
