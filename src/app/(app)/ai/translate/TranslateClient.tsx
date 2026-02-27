"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Languages,
  ArrowRightLeft,
  Loader2,
  AlertTriangle,
  Copy,
  CheckCircle,
} from "lucide-react";
import "@/styles/ai-features.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TranslateClientProps {
  companyId: string;
  hasProvider: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LANGUAGES = [
  { id: "English", label: "English" },
  { id: "Spanish", label: "Spanish" },
  { id: "Portuguese", label: "Portuguese" },
  { id: "French", label: "French" },
  { id: "Chinese", label: "Chinese" },
  { id: "Korean", label: "Korean" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TranslateClient({
  companyId,
  hasProvider,
}: TranslateClientProps) {
  const t = useTranslations("ai");

  const presetPhrases = useMemo(
    () => [
      {
        label: t("translate.hardHatRequired"),
        category: t("translate.presetSafety"),
        text: "All personnel must wear hard hats, safety glasses, and high-visibility vests at all times on the construction site. Failure to comply will result in removal from the jobsite.",
      },
      {
        label: t("translate.dailyLogEntry"),
        category: t("translate.presetDailyLog"),
        text: "Work performed today: Concrete pour on Level 3, slab on grade Section B. Weather conditions: Clear, 78F. Crew size: 24 workers. Equipment on site: Concrete pump, vibrators, finishing machines. No safety incidents reported.",
      },
      {
        label: t("translate.materialRequest"),
        category: t("translate.presetMaterialRequest"),
        text: "Please deliver the following materials to the jobsite by Friday: 500 cubic yards of 4000 PSI concrete, 200 tons of #5 rebar, 50 bundles of wire mesh, and 100 sheets of 3/4 inch plywood. Contact the site superintendent for delivery coordination.",
      },
      {
        label: t("translate.safetyBriefing"),
        category: t("translate.presetSafety"),
        text: "Good morning. Before we start today, remember: check your fall protection before going above 6 feet. Keep your work area clean and clear of tripping hazards. Report any unsafe conditions to your foreman immediately. Let us have a safe and productive day.",
      },
      {
        label: t("translate.changeOrderNotice"),
        category: t("translate.presetDailyLog"),
        text: "This is to notify you that a change order has been issued for additional electrical work in Building A, second floor. The scope includes installation of 20 additional outlets and 4 dedicated circuits. Work must be completed within 10 business days.",
      },
      {
        label: t("translate.inspectionRequest"),
        category: t("translate.presetMaterialRequest"),
        text: "We are requesting a structural inspection for the foundation work completed in Zone C. All rebar placement, form work, and concrete pours have been completed per the approved drawings. Please schedule the inspection at your earliest convenience.",
      },
    ],
    [t]
  );

  // Translation state
  const [sourceLang, setSourceLang] = useState("English");
  const [targetLang, setTargetLang] = useState("Spanish");
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ---- Swap languages ----
  const handleSwap = useCallback(() => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    // Also swap text if translation exists
    if (translatedText) {
      setSourceText(translatedText);
      setTranslatedText(sourceText);
    }
  }, [sourceLang, targetLang, sourceText, translatedText]);

  // ---- Translate ----
  const handleTranslate = useCallback(async () => {
    if (isTranslating || !sourceText.trim()) return;

    setIsTranslating(true);
    setTranslatedText("");
    setError(null);
    setCopied(false);

    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          text: sourceText.trim(),
          sourceLang,
          targetLang,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errBody = await response.text();
        let message = "Failed to translate text";
        try {
          const parsed = JSON.parse(errBody);
          if (parsed.error) message = parsed.error;
        } catch {
          // use default message
        }
        setError(message);
        setIsTranslating(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError("No response stream available");
        setIsTranslating(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setTranslatedText(accumulated);
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
      setIsTranslating(false);
      abortRef.current = null;
    }
  }, [companyId, sourceText, sourceLang, targetLang, isTranslating]);

  // ---- Copy translated text ----
  const handleCopy = useCallback(async () => {
    if (!translatedText) return;
    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = translatedText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [translatedText]);

  // ---- Load preset phrase ----
  const handleLoadPreset = useCallback((text: string) => {
    setSourceText(text);
    setTranslatedText("");
    setError(null);
  }, []);

  // ---- Render: No provider configured ----
  if (!hasProvider) {
    return (
      <div className="ai-feature-page">
        <div className="ai-feature-header">
          <div>
            <h1>
              <Languages size={28} className="sparkle-icon" />
              {t("translate.title")}
            </h1>
            <p className="subtitle">
              {t("translate.subtitle")}
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
            {t("translate.aiProviderRequired")}
          </div>
          <p
            style={{
              color: "var(--muted)",
              fontSize: "0.88rem",
              lineHeight: 1.6,
              marginBottom: 16,
            }}
          >
            {t("translate.configureProviderTranslate")}
          </p>
          <Link
            href="/admin/ai-providers"
            className="ui-btn ui-btn-primary"
            style={{ display: "inline-flex" }}
          >
            {t("translate.configureAiProvider")}
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
            <Languages size={28} className="sparkle-icon" />
            {t("translate.title")}
          </h1>
          <p className="subtitle">
            {t("translate.subtitle")}
          </p>
        </div>
      </div>

      {/* Two-column translation layout */}
      <div className="translate-layout">
        {/* Left panel - Source */}
        <div className="translate-panel">
          <div className="lang-selector">
            <label htmlFor="source-lang">{t("translate.from")}</label>
            <select
              id="source-lang"
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              style={{
                flex: 1,
                padding: "6px 10px",
                fontSize: "0.875rem",
                fontFamily: "var(--font-sans)",
                color: "var(--text)",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                appearance: "auto",
              }}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder={t("translate.enterTextToTranslate")}
          />
        </div>

        {/* Center - Arrow + Swap */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            alignSelf: "center",
            marginTop: 48,
          }}
        >
          <button
            type="button"
            className="translate-arrow"
            onClick={handleSwap}
            title={t("translate.swapLanguages")}
            style={{ cursor: "pointer", border: "1px solid var(--border)" }}
          >
            <ArrowRightLeft size={18} />
          </button>
        </div>

        {/* Right panel - Target */}
        <div className="translate-panel">
          <div className="lang-selector">
            <label htmlFor="target-lang">{t("translate.to")}</label>
            <select
              id="target-lang"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              style={{
                flex: 1,
                padding: "6px 10px",
                fontSize: "0.875rem",
                fontFamily: "var(--font-sans)",
                color: "var(--text)",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                appearance: "auto",
              }}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={translatedText}
            readOnly
            placeholder={
              isTranslating
                ? t("translate.translating")
                : t("translate.translationWillAppear")
            }
            style={{ background: "var(--surface)" }}
          />
          {/* Copy button */}
          {translatedText && !isTranslating && (
            <div className="translate-actions">
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
                {copied ? t("translate.copied") : t("translate.copyTranslation")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Translate button */}
      <div style={{ marginBottom: 24 }}>
        <button
          type="button"
          className="ui-btn ui-btn-primary"
          onClick={handleTranslate}
          disabled={isTranslating || !sourceText.trim()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {isTranslating ? (
            <>
              <Loader2
                size={16}
                style={{ animation: "spin 1s linear infinite" }}
              />
              {t("translate.translating")}
            </>
          ) : (
            <>
              <Languages size={16} />
              {t("translate.translate")}
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

      {/* Preset Phrases */}
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: 24,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "1.05rem",
            fontWeight: 600,
            marginBottom: 16,
            color: "var(--text)",
          }}
        >
          {t("translate.commonPhrases")}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 10,
          }}
        >
          {presetPhrases.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleLoadPreset(preset.text)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: "12px 16px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 8,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "var(--font-sans)",
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--surface)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--color-blue)",
                }}
              >
                {preset.category}
              </span>
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "var(--text)",
                }}
              >
                {preset.label}
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--muted)",
                  lineHeight: 1.4,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {preset.text}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
