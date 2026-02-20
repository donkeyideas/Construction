"use client";

import { useState, useCallback } from "react";
import { Sparkles, X, Loader2, Copy, Check } from "lucide-react";

interface AIDailyLogModalProps {
  companyId: string;
  projectId: string;
  projectName: string;
  date: string;
  onClose: () => void;
  onInsert: (text: string) => void;
}

export default function AIDailyLogModal({
  companyId,
  projectId,
  projectName,
  date,
  onClose,
  onInsert,
}: AIDailyLogModalProps) {
  const [notes, setNotes] = useState("");
  const [weather, setWeather] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // -------------------------------------------------------------------
  // Generate daily log via streaming API
  // -------------------------------------------------------------------
  const handleGenerate = useCallback(async () => {
    if (!notes.trim()) return;

    setIsGenerating(true);
    setGeneratedText("");
    setError("");

    try {
      const response = await fetch("/api/ai/generate-daily-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          projectId,
          date,
          notes,
          weather: weather || undefined,
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
        setError(errMsg || "Failed to generate daily log");
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
      console.error("Daily log generation error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [companyId, projectId, date, notes, weather]);

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
            <span className="modal-title">AI Daily Log Generator</span>
          </div>
          <button className="modal-close" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="ai-modal-body">
          {/* Project & date context */}
          <div
            style={{
              fontSize: "0.82rem",
              color: "var(--muted)",
              marginBottom: "16px",
            }}
          >
            Project: <strong>{projectName}</strong> &middot; Date:{" "}
            <strong>{date}</strong>
          </div>

          {/* Notes textarea */}
          <div style={{ marginBottom: "12px" }}>
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
              Field Notes
            </label>
            <textarea
              className="provider-form-input"
              rows={5}
              placeholder="Enter your field notes, bullet points, or key activities..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isGenerating}
              style={{
                width: "100%",
                resize: "vertical",
                fontFamily: "var(--font-sans)",
                lineHeight: 1.6,
              }}
            />
          </div>

          {/* Weather input (optional) */}
          <div style={{ marginBottom: "16px" }}>
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
              Weather (optional)
            </label>
            <input
              type="text"
              className="provider-form-input"
              placeholder="e.g., Sunny, 78°F, light wind"
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              disabled={isGenerating}
              style={{ width: "100%" }}
            />
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
              <Loader2 size={16} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
              <span>Generating daily log...</span>
            </div>
          )}

          {/* Generated text result */}
          {generatedText && (
            <div
              style={{
                marginTop: "8px",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "16px",
                background: "var(--surface)",
                maxHeight: "300px",
                overflowY: "auto",
              }}
            >
              <div className="ai-result-text" style={{ whiteSpace: "pre-wrap" }}>
                {generatedText}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ai-modal-footer">
          {!generatedText && !isGenerating && (
            <button
              className="ui-btn ui-btn-primary"
              onClick={handleGenerate}
              disabled={!notes.trim()}
            >
              <Sparkles size={14} />
              Generate
            </button>
          )}

          {isGenerating && generatedText && (
            <div className="ai-generating">
              <span className="generating-dot" />
              <span className="generating-dot" />
              <span className="generating-dot" />
              <span style={{ fontSize: "0.82rem" }}>Generating...</span>
            </div>
          )}

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
                Insert into Log
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
