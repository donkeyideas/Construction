"use client";

import { useState, useCallback } from "react";
import { Sparkles, Mail, X, Loader2, ArrowRight } from "lucide-react";

interface Props {
  companyId: string;
  hasProvider: boolean;
}

interface ParsedItem {
  type: string;
  text: string;
}

/**
 * AI Email Parser button + modal.
 *
 * Renders a "Parse Email" button (`.ai-inline-btn`).
 * When clicked, opens a modal with a textarea to paste email content.
 * Submitting calls `/api/ai/parse-email` which streams structured
 * extraction of action items, entities, dates, and amounts from the
 * email text.
 *
 * Extracted items include a placeholder "Create" button (disabled,
 * with "Coming soon" tooltip) for future integration.
 */
export default function AIEmailParser({ companyId, hasProvider }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resultText, setResultText] = useState("");
  const [error, setError] = useState("");

  // -------------------------------------------------------------------
  // Open modal
  // -------------------------------------------------------------------
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setResultText("");
    setError("");
    setEmailText("");
  }, []);

  // -------------------------------------------------------------------
  // Close modal
  // -------------------------------------------------------------------
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // -------------------------------------------------------------------
  // Parse email via streaming API
  // -------------------------------------------------------------------
  const handleParse = useCallback(async () => {
    if (!emailText.trim()) return;

    setIsLoading(true);
    setResultText("");
    setError("");

    try {
      const response = await fetch("/api/ai/parse-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          emailContent: emailText.trim(),
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
        setError(errMsg || "Failed to parse email");
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
      console.error("Email parse error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [companyId, emailText]);

  // -------------------------------------------------------------------
  // Extract bullet items from the AI result for "Create" buttons
  // -------------------------------------------------------------------
  const extractedItems: ParsedItem[] = resultText
    ? extractActionItems(resultText)
    : [];

  return (
    <>
      {/* Trigger button */}
      <button className="ai-inline-btn" onClick={handleOpen}>
        <Sparkles size={14} className="sparkle-icon" />
        <Mail size={14} />
        Parse Email
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
                <span className="modal-title">AI Email Parser</span>
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
                    email parsing.
                  </div>
                </div>
              )}

              {/* Email input */}
              {hasProvider && !resultText && !isLoading && (
                <>
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
                    Paste Email Content
                  </label>
                  <textarea
                    className="provider-form-input"
                    rows={10}
                    placeholder="Paste the full email text here including subject, sender, and body..."
                    value={emailText}
                    onChange={(e) => setEmailText(e.target.value)}
                    style={{
                      width: "100%",
                      resize: "vertical",
                      fontFamily: "var(--font-sans)",
                      lineHeight: 1.6,
                      marginBottom: "12px",
                    }}
                  />
                </>
              )}

              {/* Loading state */}
              {isLoading && !resultText && (
                <div className="ai-modal-body loading">
                  <Loader2
                    size={24}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  <span>Parsing email content...</span>
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
                    maxHeight: "350px",
                    overflowY: "auto",
                    marginBottom: "12px",
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

              {/* Extracted action items with "Create" placeholders */}
              {extractedItems.length > 0 && !isLoading && (
                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      marginBottom: "8px",
                    }}
                  >
                    Detected Items
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    {extractedItems.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "8px 12px",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          background: "var(--card-bg)",
                          fontSize: "0.84rem",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "1px 8px",
                            borderRadius: "8px",
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            background: "rgba(29, 78, 216, 0.1)",
                            color: "var(--color-blue)",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {item.type}
                        </span>
                        <span
                          style={{
                            flex: 1,
                            color: "var(--text)",
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.text}
                        </span>
                        <button
                          className="ui-btn"
                          disabled
                          title="Coming soon"
                          style={{
                            padding: "3px 10px",
                            fontSize: "0.72rem",
                            opacity: 0.5,
                            cursor: "not-allowed",
                            flexShrink: 0,
                          }}
                        >
                          Create
                          <ArrowRight size={10} />
                        </button>
                      </div>
                    ))}
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
                  <span style={{ fontSize: "0.82rem" }}>Parsing...</span>
                </div>
              )}

              {/* Parse button (before any result) */}
              {hasProvider && !resultText && !isLoading && (
                <button
                  className="ui-btn ui-btn-primary"
                  onClick={handleParse}
                  disabled={!emailText.trim()}
                >
                  <Sparkles size={14} />
                  Parse
                </button>
              )}

              {/* New parse button (after result) */}
              {resultText && !isLoading && (
                <button
                  className="ui-btn"
                  onClick={() => {
                    setResultText("");
                    setEmailText("");
                    setError("");
                  }}
                >
                  <Mail size={14} />
                  Parse Another
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

// ---------------------------------------------------------------------------
// Parse structured items from the AI output
// ---------------------------------------------------------------------------

/**
 * Attempt to extract labelled items from the AI-generated markdown.
 * Looks for lines matching patterns like:
 *   - **RFI**: some description
 *   - **Task**: some description
 *   - [RFI] some description
 * Returns up to 10 items.
 */
function extractActionItems(text: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const lines = text.split("\n");

  // Pattern: "- **TYPE**: description" or "- [TYPE] description" or "- TYPE: description"
  const patterns = [
    /^[-*]\s+\*\*(\w[\w\s]*?)\*\*:\s*(.+)$/,
    /^[-*]\s+\[(\w[\w\s]*?)\]\s*(.+)$/,
    /^[-*]\s+(RFI|Task|Submittal|Action Item|Follow-up|Date|Amount|Contact|Project):\s*(.+)$/i,
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        items.push({
          type: match[1].trim(),
          text: match[2].trim(),
        });
        break;
      }
    }
    if (items.length >= 10) break;
  }

  return items;
}
