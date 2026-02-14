"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import {
  SUPPORTED_LOCALES,
  getLocaleFromCookie,
  setLocaleCookie,
  type Locale,
} from "@/lib/i18n";

export default function LanguageSwitcher() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("en");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setLocale(getLocaleFromCookie());
  }, []);

  function switchLocale(newLocale: Locale) {
    setLocaleCookie(newLocale);
    setLocale(newLocale);
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
