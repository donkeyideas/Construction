"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";

type Locale = "en" | "es";

const SUPPORTED_LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "\u{1F1FA}\u{1F1F8}" },
  { code: "es", label: "Espa\u00F1ol", flag: "\u{1F1EA}\u{1F1F8}" },
];

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

  const current = SUPPORTED_LOCALES.find((l) => l.code === locale);

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
        {current?.flag} {current?.label}
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
            overflow: "hidden",
            minWidth: "140px",
          }}>
            {SUPPORTED_LOCALES.map((l) => (
              <button
                key={l.code}
                onClick={() => switchLocale(l.code)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                  background: l.code === locale ? "rgba(59, 130, 246, 0.05)" : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--foreground)",
                  fontSize: "0.85rem",
                  textAlign: "left",
                  fontWeight: l.code === locale ? 600 : 400,
                }}
              >
                {l.flag} {l.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
