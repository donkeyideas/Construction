"use client";

import { useState, useRef, useCallback } from "react";
import {
  Camera,
  Sparkles,
  X,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle,
  ImageIcon,
} from "lucide-react";

interface Props {
  companyId: string;
  hasProvider: boolean;
  projectName?: string;
}

/**
 * AI Photo Analysis button + modal.
 *
 * Renders an "AI Photo Analysis" trigger button (`.ai-inline-btn`).
 * When clicked, opens a modal with:
 *   - An image file input with preview
 *   - A text area where the user describes what they see in the photo
 *   - AI analyzes the description for progress, safety, and quality
 *
 * Since text-based streaming cannot process raw image data, the user
 * provides a description of the photo and the AI returns a structured
 * construction site assessment.
 *
 * Streams from `/api/ai/analyze-photo`.
 */
export default function AIPhotoAnalysis({
  companyId,
  hasProvider,
  projectName,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resultText, setResultText] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------------
  // Open modal
  // -------------------------------------------------------------------
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setResultText("");
    setError("");
    setDescription("");
    setImagePreview(null);
  }, []);

  // -------------------------------------------------------------------
  // Close modal
  // -------------------------------------------------------------------
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // -------------------------------------------------------------------
  // Handle image file selection (preview only)
  // -------------------------------------------------------------------
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setError("Please select an image file (JPG, PNG, etc.)");
        return;
      }

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
      setError("");
    },
    []
  );

  // -------------------------------------------------------------------
  // Analyze photo description via streaming API
  // -------------------------------------------------------------------
  const handleAnalyze = useCallback(async () => {
    if (!description.trim()) return;

    setIsLoading(true);
    setResultText("");
    setError("");

    try {
      const response = await fetch("/api/ai/analyze-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          description: description.trim(),
          projectName: projectName || undefined,
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
        setError(errMsg || "Failed to analyze photo");
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
      console.error("Photo analysis error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [companyId, description, projectName]);

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
        <Camera size={14} />
        AI Photo Analysis
      </button>

      {/* Modal */}
      {isOpen && (
        <>
          <div className="ai-modal-overlay" onClick={handleClose} />

          <div className="ai-modal" style={{ maxWidth: "680px" }}>
            {/* Header */}
            <div className="ai-modal-header">
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Sparkles size={18} className="sparkle-icon" />
                <span className="modal-title">
                  Photo Analysis
                  {projectName ? ` — ${projectName}` : ""}
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
                    photo analysis.
                  </div>
                </div>
              )}

              {/* Input form */}
              {hasProvider && !resultText && !isLoading && (
                <>
                  {/* Image upload zone */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "12px",
                      padding: "20px",
                      border: "2px dashed var(--border)",
                      borderRadius: "10px",
                      marginBottom: "16px",
                      cursor: "pointer",
                      transition: "border-color 0.2s",
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                    />

                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Selected photo"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "200px",
                          borderRadius: "8px",
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <>
                        <div
                          style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "12px",
                            background: "var(--surface)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--muted)",
                          }}
                        >
                          <ImageIcon size={24} />
                        </div>
                        <div
                          style={{
                            fontSize: "0.88rem",
                            fontWeight: 500,
                            color: "var(--text)",
                          }}
                        >
                          Click to upload a site photo (optional)
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--muted)",
                          }}
                        >
                          JPG, PNG, or HEIC — for visual reference only
                        </div>
                      </>
                    )}
                  </div>

                  {/* Analysis types legend */}
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      marginBottom: "10px",
                      fontSize: "0.78rem",
                      color: "var(--muted)",
                      flexWrap: "wrap",
                    }}
                  >
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
                      Progress
                    </span>
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
                      Safety
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Camera
                        size={12}
                        style={{ color: "var(--color-blue)" }}
                      />
                      Quality
                    </span>
                  </div>

                  {/* Description textarea */}
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
                    Describe what you see in the photo
                  </label>
                  <textarea
                    className="provider-form-input"
                    rows={6}
                    placeholder="Describe the construction site photo in detail: what structures are visible, work in progress, equipment on site, workers and their PPE, any visible hazards or quality issues..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
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
                      lineHeight: 1.5,
                    }}
                  >
                    The more detail you provide, the more accurate the analysis
                    will be. Mention materials, weather conditions, number of
                    workers, equipment, and any concerns.
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
                  <span>Analyzing site conditions...</span>
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
                  disabled={!description.trim()}
                >
                  <Sparkles size={14} />
                  Analyze
                </button>
              )}

              {/* Post-result actions */}
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
                      setDescription("");
                      setImagePreview(null);
                      setError("");
                    }}
                  >
                    <Camera size={14} />
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
