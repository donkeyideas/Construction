"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";
import { SUPPORTED_LOCALES, LOCALE_META, type Locale } from "@/i18n/locales";

export default function LanguageSwitcher() {
  const router = useRouter();
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);

  async function switchLocale(newLocale: Locale) {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: newLocale }),
    });
    setOpen(false);
    router.refresh();
  }

  const current = LOCALE_META[locale];

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 10px",
          borderRadius: "6px",
          border: "1px solid var(--border)",
          background: "transparent",
          cursor: "pointer",
          color: "var(--foreground)",
          fontSize: "0.8rem",
        }}
        title="Change language"
      >
        <Globe size={14} />
        {current?.flag} {current?.nativeName}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
          <div style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            zIndex: 100,
            overflow: "hidden auto",
            minWidth: "200px",
            maxHeight: "320px",
          }}>
            {SUPPORTED_LOCALES.map((code) => {
              const meta = LOCALE_META[code];
              return (
                <button
                  key={code}
                  onClick={() => switchLocale(code)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "none",
                    borderBottom: "1px solid var(--border)",
                    background: code === locale ? "rgba(59, 130, 246, 0.05)" : "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "var(--foreground)",
                    fontSize: "0.85rem",
                    textAlign: "left",
                    fontWeight: code === locale ? 600 : 400,
                  }}
                >
                  <span>{meta.flag}</span>
                  <span>{meta.nativeName}</span>
                  {meta.nativeName !== meta.label && (
                    <span style={{
                      fontSize: "0.7rem",
                      color: "var(--muted)",
                      marginInlineStart: "auto",
                    }}>
                      {meta.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
