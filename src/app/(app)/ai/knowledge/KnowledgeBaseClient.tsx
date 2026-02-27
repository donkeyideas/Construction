"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Trash2,
  FileText,
  Search,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import "@/styles/ai-features.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KBDocument {
  id: string;
  title: string;
  content: string;
  wordCount: number;
}

interface KnowledgeBaseClientProps {
  companyId: string;
  hasProvider: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `kb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function KnowledgeBaseClient({
  companyId,
  hasProvider,
}: KnowledgeBaseClientProps) {
  const t = useTranslations("ai");

  // Document management state
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");

  // Query state
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ---- Add document to knowledge base ----
  const handleAddDocument = useCallback(() => {
    const title = docTitle.trim();
    const content = docContent.trim();
    if (!title || !content) return;

    const newDoc: KBDocument = {
      id: generateId(),
      title,
      content,
      wordCount: countWords(content),
    };

    setDocuments((prev) => [...prev, newDoc]);
    setDocTitle("");
    setDocContent("");
  }, [docTitle, docContent]);

  // ---- Remove document ----
  const handleDeleteDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  // ---- Query knowledge base ----
  const handleAsk = useCallback(async () => {
    if (isQuerying || !question.trim() || documents.length === 0) return;

    setIsQuerying(true);
    setAnswer("");
    setError(null);

    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/ai/knowledge-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          question: question.trim(),
          documents: documents.map((d) => ({
            title: d.title,
            content: d.content,
          })),
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errBody = await response.text();
        let message = "Failed to query knowledge base";
        try {
          const parsed = JSON.parse(errBody);
          if (parsed.error) message = parsed.error;
        } catch {
          // use default message
        }
        setError(message);
        setIsQuerying(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError("No response stream available");
        setIsQuerying(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setAnswer(accumulated);
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
      setIsQuerying(false);
      abortRef.current = null;
    }
  }, [companyId, question, documents, isQuerying]);

  // ---- Render: No provider configured ----
  if (!hasProvider) {
    return (
      <div className="ai-feature-page">
        <div className="ai-feature-header">
          <div>
            <h1>
              <BookOpen size={28} className="sparkle-icon" />
              {t("knowledge.title")}
            </h1>
            <p className="subtitle">
              {t("knowledge.subtitle")}
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
            {t("knowledge.aiProviderRequired")}
          </div>
          <p
            style={{
              color: "var(--muted)",
              fontSize: "0.88rem",
              lineHeight: 1.6,
              marginBottom: 16,
            }}
          >
            {t("knowledge.configureProviderKb")}
          </p>
          <Link
            href="/admin/ai-providers"
            className="ui-btn ui-btn-primary"
            style={{ display: "inline-flex" }}
          >
            {t("knowledge.configureAiProvider")}
          </Link>
        </div>
      </div>
    );
  }

  // ---- Render: Main layout ----
  return (
    <div className="ai-feature-page">
      {/* Header */}
      <div className="ai-feature-header">
        <div>
          <h1>
            <BookOpen size={28} className="sparkle-icon" />
            {t("knowledge.title")}
          </h1>
          <p className="subtitle">
            {t("knowledge.subtitle")}
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="kb-upload-section">
        <div className="section-title">{t("knowledge.addDocument")}</div>

        <div style={{ marginBottom: 12 }}>
          <label
            htmlFor="doc-title"
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
            {t("knowledge.documentTitle")}
          </label>
          <input
            id="doc-title"
            type="text"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            placeholder={t("knowledge.documentTitlePlaceholder")}
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

        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="doc-content"
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
            {t("knowledge.documentContent")}
          </label>
          <textarea
            id="doc-content"
            value={docContent}
            onChange={(e) => setDocContent(e.target.value)}
            placeholder={t("knowledge.documentContentPlaceholder")}
            rows={8}
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

        <button
          type="button"
          className="ui-btn ui-btn-primary"
          onClick={handleAddDocument}
          disabled={!docTitle.trim() || !docContent.trim()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Plus size={16} />
          {t("knowledge.addToKnowledgeBase")}
        </button>
      </div>

      {/* File List */}
      {documents.length > 0 && (
        <div className="kb-file-list">
          {documents.map((doc) => (
            <div key={doc.id} className="kb-file-item">
              <div className="file-icon">
                <FileText size={16} />
              </div>
              <span className="file-name">{doc.title}</span>
              <span className="file-size">
                {t("knowledge.words", { count: doc.wordCount.toLocaleString() })}
              </span>
              <button
                type="button"
                className="file-delete"
                onClick={() => handleDeleteDocument(doc.id)}
                title={t("knowledge.removeDocument")}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Query Section */}
      <div className="kb-query-section">
        <div className="section-title">{t("knowledge.askQuestion")}</div>

        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={
                documents.length === 0
                  ? t("knowledge.addDocsFirst")
                  : t("knowledge.askAboutDocs")
              }
              disabled={documents.length === 0}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: "0.875rem",
                fontFamily: "var(--font-sans)",
                color: "var(--text)",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            />
          </div>
          <button
            type="button"
            className="ui-btn ui-btn-primary"
            onClick={handleAsk}
            disabled={
              isQuerying || !question.trim() || documents.length === 0
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
            }}
          >
            {isQuerying ? (
              <>
                <Loader2
                  size={16}
                  style={{ animation: "spin 1s linear infinite" }}
                />
                {t("knowledge.asking")}
              </>
            ) : (
              <>
                <Search size={16} />
                {t("knowledge.ask")}
              </>
            )}
          </button>
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
              marginTop: 12,
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
        {isQuerying && !answer && (
          <div className="report-loading" style={{ marginTop: 12 }}>
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
          </div>
        )}

        {/* Result */}
        {answer && (
          <div className="kb-result-card">
            <div
              className="result-answer"
              style={{ whiteSpace: "pre-wrap" }}
            >
              {answer}
            </div>
            <div className="result-source">
              <FileText size={12} />
              {t("knowledge.basedOnDocs", { count: documents.length })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
