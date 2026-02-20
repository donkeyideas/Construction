"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  HelpCircle,
  Sparkles,
  X,
  Loader2,
  MessageCircle,
  Send,
} from "lucide-react";

interface Props {
  companyId: string;
  hasProvider: boolean;
  currentPage: string;
  userName: string;
}

/** Preset quick-action questions based on current page context. */
const PAGE_QUESTIONS: Record<string, string[]> = {
  dashboard: [
    "How do I read my KPIs?",
    "What do the financial metrics mean?",
    "How do I customize the dashboard?",
  ],
  projects: [
    "How do I create a project?",
    "How do change orders work?",
    "How do I track project progress?",
  ],
  financial: [
    "How does the chart of accounts work?",
    "What is the audit system?",
    "How do I record a journal entry?",
  ],
  invoices: [
    "How do I create an invoice?",
    "How does payment tracking work?",
    "What is retainage?",
  ],
  safety: [
    "How do I log a safety incident?",
    "What are toolbox talks?",
    "How do safety inspections work?",
  ],
  contracts: [
    "How do I manage contracts?",
    "How do I track submittals?",
    "What is the RFI workflow?",
  ],
  equipment: [
    "How do I add equipment?",
    "How does maintenance tracking work?",
    "How do I schedule equipment?",
  ],
  scheduling: [
    "How do I create a schedule?",
    "How do phases and tasks work?",
    "How do I import from P6 or MS Project?",
  ],
};

const DEFAULT_QUESTIONS: string[] = [
  "How do I import data?",
  "How do I add team members?",
  "What features does Buildwrk offer?",
  "How do I configure AI providers?",
];

/**
 * AI Onboarding Helper — floating help button and chat panel.
 *
 * Renders a fixed-position circular button at the bottom-right corner.
 * When clicked, opens a compact chat-like panel (not full modal) with:
 *   - Contextual greeting based on `currentPage`
 *   - Preset quick-action questions for the current page
 *   - Free-text input for custom questions
 *   - Streaming AI responses from `/api/ai/onboarding-help`
 */
export default function AIOnboardingHelper({
  companyId,
  hasProvider,
  currentPage,
  userName,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resultText, setResultText] = useState("");
  const [error, setError] = useState("");
  const resultEndRef = useRef<HTMLDivElement>(null);

  // Resolve page-specific questions
  const pageKey = currentPage.toLowerCase().replace(/[^a-z]/g, "");
  const quickQuestions =
    PAGE_QUESTIONS[pageKey] || DEFAULT_QUESTIONS;

  // Auto-scroll result area
  useEffect(() => {
    resultEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [resultText]);

  // -------------------------------------------------------------------
  // Toggle panel
  // -------------------------------------------------------------------
  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      // Reset on open
      setResultText("");
      setError("");
      setQuestion("");
    }
  }, [isOpen]);

  // -------------------------------------------------------------------
  // Ask a question (streaming)
  // -------------------------------------------------------------------
  const handleAsk = useCallback(
    async (q?: string) => {
      const text = (q || question).trim();
      if (!text) return;

      setIsLoading(true);
      setResultText("");
      setError("");

      try {
        const response = await fetch("/api/ai/onboarding-help", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId,
            question: text,
            currentPage,
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
          setError(errMsg || "Failed to get an answer");
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
        console.error("Onboarding help error:", err);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [companyId, currentPage, question]
  );

  // -------------------------------------------------------------------
  // Handle Enter key in input
  // -------------------------------------------------------------------
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleAsk();
      }
    },
    [handleAsk]
  );

  // Human-readable page name
  const pageName =
    currentPage.charAt(0).toUpperCase() + currentPage.slice(1);

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={handleToggle}
        title="Buildwrk Assistant"
        aria-label="Open help assistant"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 200,
          width: "52px",
          height: "52px",
          borderRadius: "50%",
          background: "var(--color-blue)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(29, 78, 216, 0.35)",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform =
            "scale(1.08)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
      >
        {isOpen ? <X size={22} /> : <HelpCircle size={22} />}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "88px",
            right: "24px",
            zIndex: 210,
            width: "380px",
            maxWidth: "calc(100vw - 48px)",
            maxHeight: "520px",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.12)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "ai-modal-enter 0.2s ease",
          }}
        >
          {/* Panel header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "14px 16px",
              borderBottom: "1px solid var(--border)",
              background: "var(--surface)",
            }}
          >
            <Sparkles
              size={16}
              style={{ color: "var(--color-amber)", flexShrink: 0 }}
            />
            <span
              style={{
                flex: 1,
                fontFamily: "var(--font-serif)",
                fontSize: "0.95rem",
                fontWeight: 600,
                color: "var(--text)",
              }}
            >
              Buildwrk Assistant
            </span>
            <button
              onClick={handleToggle}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px",
                borderRadius: "4px",
              }}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Panel body */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {/* No provider */}
            {!hasProvider && (
              <div
                style={{
                  textAlign: "center",
                  padding: "24px 8px",
                  color: "var(--muted)",
                }}
              >
                <Sparkles
                  size={28}
                  style={{
                    color: "var(--color-amber)",
                    marginBottom: "10px",
                  }}
                />
                <div
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: "var(--text)",
                    marginBottom: "4px",
                  }}
                >
                  AI Provider Required
                </div>
                <div style={{ fontSize: "0.82rem", lineHeight: 1.6 }}>
                  Configure an AI provider in{" "}
                  <strong>Administration &gt; AI Providers</strong> to enable
                  the assistant.
                </div>
              </div>
            )}

            {/* Greeting + context */}
            {hasProvider && !resultText && !isLoading && (
              <>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text)",
                    lineHeight: 1.6,
                  }}
                >
                  Hi{userName ? ` ${userName}` : ""}! I can help you navigate
                  Buildwrk. You are on the{" "}
                  <strong>{pageName}</strong> page.
                </div>

                {/* Quick questions */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Quick Questions
                  </div>
                  {quickQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setQuestion(q);
                        handleAsk(q);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 12px",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "0.82rem",
                        color: "var(--text)",
                        fontFamily: "var(--font-sans)",
                        textAlign: "left",
                        transition: "background 0.15s, border-color 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor =
                          "var(--color-blue)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor =
                          "var(--border)";
                      }}
                    >
                      <MessageCircle
                        size={12}
                        style={{
                          color: "var(--color-blue)",
                          flexShrink: 0,
                        }}
                      />
                      {q}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Loading state */}
            {isLoading && !resultText && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "16px 0",
                  color: "var(--muted)",
                  fontSize: "0.84rem",
                }}
              >
                <Loader2
                  size={18}
                  style={{ animation: "spin 1s linear infinite" }}
                />
                <span>Thinking...</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                className="provider-message error"
                style={{ fontSize: "0.82rem" }}
              >
                {error}
              </div>
            )}

            {/* Result */}
            {resultText && (
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "12px",
                }}
              >
                <div
                  className="ai-result-text"
                  style={{ whiteSpace: "pre-wrap", fontSize: "0.84rem" }}
                >
                  {resultText}
                </div>
                <div ref={resultEndRef} />
              </div>
            )}

            {/* Streaming indicator */}
            {isLoading && resultText && (
              <div className="ai-generating" style={{ paddingLeft: "4px" }}>
                <span className="generating-dot" />
                <span className="generating-dot" />
                <span className="generating-dot" />
              </div>
            )}

            {/* Ask another button (after result) */}
            {resultText && !isLoading && (
              <button
                onClick={() => {
                  setResultText("");
                  setQuestion("");
                  setError("");
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--color-blue)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                  alignSelf: "flex-start",
                  transition: "background 0.15s",
                }}
              >
                <MessageCircle size={12} />
                Ask another question
              </button>
            )}
          </div>

          {/* Input area (always visible when provider exists) */}
          {hasProvider && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 16px",
                borderTop: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <input
                type="text"
                placeholder="Ask a question..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  fontSize: "0.84rem",
                  fontFamily: "var(--font-sans)",
                  color: "var(--text)",
                  outline: "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor =
                    "var(--color-blue)";
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor =
                    "var(--border)";
                }}
              />
              <button
                onClick={() => handleAsk()}
                disabled={!question.trim() || isLoading}
                title="Ask"
                style={{
                  width: "34px",
                  height: "34px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    question.trim() && !isLoading
                      ? "var(--color-blue)"
                      : "var(--surface)",
                  color:
                    question.trim() && !isLoading ? "#fff" : "var(--muted)",
                  border: "none",
                  borderRadius: "6px",
                  cursor:
                    question.trim() && !isLoading
                      ? "pointer"
                      : "not-allowed",
                  flexShrink: 0,
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                <Send size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
