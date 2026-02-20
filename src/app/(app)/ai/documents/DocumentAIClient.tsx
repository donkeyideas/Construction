"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  FileSearch,
  Upload,
  Loader2,
  Copy,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  ClipboardList,
} from "lucide-react";
import "@/styles/ai-features.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DocumentType =
  | "contract"
  | "insurance_certificate"
  | "lien_waiver"
  | "invoice"
  | "change_order"
  | "permit"
  | "other";

interface DocumentTypeOption {
  id: DocumentType;
  label: string;
}

interface ExtractedField {
  name: string;
  value: string | null;
  confidence: "high" | "medium" | "low";
}

interface DocumentAIClientProps {
  companyId: string;
  hasProvider: boolean;
}

// ---------------------------------------------------------------------------
// Document type definitions
// ---------------------------------------------------------------------------

const DOCUMENT_TYPES: DocumentTypeOption[] = [
  { id: "contract", label: "Contract" },
  { id: "insurance_certificate", label: "Insurance Certificate" },
  { id: "lien_waiver", label: "Lien Waiver" },
  { id: "invoice", label: "Invoice" },
  { id: "change_order", label: "Change Order" },
  { id: "permit", label: "Permit" },
  { id: "other", label: "Other" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DocumentAIClient({
  companyId,
  hasProvider,
}: DocumentAIClientProps) {
  // State
  const [documentType, setDocumentType] = useState<DocumentType>("contract");
  const [documentText, setDocumentText] = useState("");
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ---- Extract data ----
  const handleExtract = useCallback(async () => {
    if (isExtracting || !documentText.trim()) return;

    setIsExtracting(true);
    setExtractedFields([]);
    setError(null);
    setCopied(false);

    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/ai/extract-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          documentText: documentText.trim(),
          documentType,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errBody = await response.text();
        let message = "Failed to extract document data";
        try {
          const parsed = JSON.parse(errBody);
          if (parsed.error) message = parsed.error;
        } catch {
          // use default message
        }
        setError(message);
        setIsExtracting(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError("No response stream available");
        setIsExtracting(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
      }

      // Parse the accumulated JSON response
      try {
        // The AI may return the JSON wrapped in markdown code fences
        let jsonStr = accumulated.trim();
        // Strip markdown code fences if present
        if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
        }
        const parsed = JSON.parse(jsonStr);
        if (parsed.fields && Array.isArray(parsed.fields)) {
          setExtractedFields(parsed.fields);
        } else {
          setError("Unexpected response format from AI. Please try again.");
        }
      } catch {
        setError("Failed to parse extraction results. The AI response was not valid JSON. Please try again.");
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
      setIsExtracting(false);
      abortRef.current = null;
    }
  }, [companyId, documentText, documentType, isExtracting]);

  // ---- Copy as JSON ----
  const handleCopyJson = useCallback(async () => {
    if (extractedFields.length === 0) return;
    const json = JSON.stringify({ fields: extractedFields }, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = json;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [extractedFields]);

  // ---- Re-extract ----
  const handleReextract = useCallback(() => {
    setExtractedFields([]);
    setError(null);
    setCopied(false);
    handleExtract();
  }, [handleExtract]);

  // ---- Confidence badge class ----
  const getConfidenceClass = (confidence: string): string => {
    switch (confidence) {
      case "high":
        return "confidence-high";
      case "medium":
        return "confidence-medium";
      case "low":
        return "confidence-low";
      default:
        return "confidence-low";
    }
  };

  // ---- Render: No provider configured ----
  if (!hasProvider) {
    return (
      <div className="ai-feature-page">
        <div className="ai-feature-header">
          <div>
            <h1>
              <FileSearch size={28} className="sparkle-icon" />
              Document AI
            </h1>
            <p className="subtitle">
              Extract structured data from construction documents using AI
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
            enable document extraction.
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
  return (
    <div className="ai-feature-page">
      {/* Header */}
      <div className="ai-feature-header">
        <div>
          <h1>
            <FileSearch size={28} className="sparkle-icon" />
            Document AI
          </h1>
          <p className="subtitle">
            Extract structured data from construction documents using AI
          </p>
        </div>
      </div>

      {/* Document Type Selector */}
      <div style={{ marginBottom: 20 }}>
        <label
          htmlFor="doc-type-select"
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
          Document Type
        </label>
        <select
          id="doc-type-select"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value as DocumentType)}
          style={{
            width: "100%",
            maxWidth: 400,
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
          {DOCUMENT_TYPES.map((dt) => (
            <option key={dt.id} value={dt.id}>
              {dt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Upload Zone with Textarea */}
      <div className="doc-upload-zone" style={{ cursor: "default", alignItems: "stretch" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="upload-icon">
            <Upload size={22} />
          </div>
          <div style={{ textAlign: "left" }}>
            <div className="upload-text">Paste Document Text</div>
            <div className="upload-hint">
              Paste the text content of your document below for AI extraction
            </div>
          </div>
        </div>
        <textarea
          value={documentText}
          onChange={(e) => setDocumentText(e.target.value)}
          placeholder="Paste the full text of your contract, insurance certificate, lien waiver, invoice, change order, permit, or other construction document here..."
          style={{
            width: "100%",
            minHeight: 200,
            padding: "12px 14px",
            fontSize: "0.875rem",
            fontFamily: "var(--font-sans)",
            color: "var(--text)",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            resize: "vertical",
            lineHeight: 1.6,
            marginTop: 12,
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Extract Button */}
      <div style={{ marginBottom: 24 }}>
        <button
          type="button"
          className="ui-btn ui-btn-primary"
          onClick={handleExtract}
          disabled={isExtracting || !documentText.trim()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 24px",
          }}
        >
          {isExtracting ? (
            <>
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              Extracting...
            </>
          ) : (
            <>
              <FileSearch size={16} />
              Extract Data
            </>
          )}
        </button>
      </div>

      {/* Error state */}
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
            marginBottom: 24,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading skeleton */}
      {isExtracting && extractedFields.length === 0 && (
        <div className="report-loading" style={{ marginBottom: 24 }}>
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
        </div>
      )}

      {/* Results Section */}
      {extractedFields.length > 0 && (
        <>
          <div className="doc-extracted-data">
            <div className="extracted-title">Extracted Data</div>
            {extractedFields.map((field, idx) => (
              <div key={idx} className="doc-field-row">
                <div className="field-name">{field.name}</div>
                <div className="field-value">
                  {field.value !== null ? field.value : "Not found"}
                </div>
                <span className={`confidence-badge ${getConfidenceClass(field.confidence)}`}>
                  {field.confidence}
                </span>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            <button
              type="button"
              className="ui-btn ui-btn-secondary"
              onClick={handleCopyJson}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.82rem",
              }}
            >
              {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy as JSON"}
            </button>
            <button
              type="button"
              className="ui-btn ui-btn-secondary"
              onClick={() => {
                /* Placeholder for future Create Record functionality */
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.82rem",
              }}
            >
              <ClipboardList size={14} />
              Create Record
            </button>
            <button
              type="button"
              className="ui-btn ui-btn-secondary"
              onClick={handleReextract}
              disabled={isExtracting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.82rem",
              }}
            >
              <RotateCcw size={14} />
              Re-extract
            </button>
          </div>
        </>
      )}

      {/* Empty state (no extraction yet, no loading) */}
      {extractedFields.length === 0 && !isExtracting && !error && documentText.trim() === "" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 200,
            color: "var(--muted)",
            textAlign: "center",
            gap: 12,
          }}
        >
          <FileSearch size={48} style={{ opacity: 0.3 }} />
          <div
            style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "var(--text)",
              fontFamily: "var(--font-serif)",
            }}
          >
            No Document Loaded
          </div>
          <p
            style={{
              fontSize: "0.85rem",
              lineHeight: 1.6,
              maxWidth: 400,
              margin: 0,
            }}
          >
            Select a document type, paste the text content of your construction
            document above, and click Extract Data to pull structured
            information using AI.
          </p>
        </div>
      )}
    </div>
  );
}
