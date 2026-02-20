"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/components/theme-provider";

export function VariantSelectorModal() {
  const { variant, setVariant } = useTheme();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Show modal only if user has never picked a variant
    const stored = localStorage.getItem("buildwrk-variant");
    if (!stored) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  function handleSelect(v: "classic" | "corporate") {
    setVariant(v);
    setShow(false);
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        maxWidth: "640px",
        width: "100%",
        padding: "40px 32px",
        boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
      }}>
        <h2 style={{
          fontFamily: "var(--font-serif)",
          fontSize: "1.5rem",
          fontWeight: 700,
          textAlign: "center",
          marginBottom: "8px",
          color: "var(--text)",
        }}>
          Choose Your Dashboard Style
        </h2>
        <p style={{
          textAlign: "center",
          color: "var(--muted)",
          fontSize: "0.9rem",
          marginBottom: "32px",
        }}>
          You can switch between these at any time from the topbar.
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
        }}>
          {/* Classic card */}
          <button
            onClick={() => handleSelect("classic")}
            style={{
              background: variant === "classic" ? "var(--color-blue-light)" : "var(--surface)",
              border: variant === "classic" ? "2px solid var(--color-blue)" : "2px solid var(--border)",
              borderRadius: "12px",
              padding: "24px 20px",
              cursor: "pointer",
              textAlign: "left",
              transition: "border-color 0.2s, background 0.2s",
            }}
          >
            {/* Preview bar */}
            <div style={{
              display: "flex",
              gap: "6px",
              marginBottom: "16px",
            }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "4px", background: "#b45309" }} />
              <div style={{ width: "24px", height: "24px", borderRadius: "4px", background: "#1d4ed8" }} />
              <div style={{ width: "24px", height: "24px", borderRadius: "4px", background: "#f5f0eb" }} />
            </div>
            <div style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--text)",
              marginBottom: "6px",
            }}>
              Classic
            </div>
            <div style={{
              fontSize: "0.8rem",
              color: "var(--muted)",
              lineHeight: 1.5,
            }}>
              Warm tones, serif headings, elegant underline animations
            </div>
          </button>

          {/* Corporate card */}
          <button
            onClick={() => handleSelect("corporate")}
            style={{
              background: variant === "corporate" ? "rgba(44,82,130,0.1)" : "var(--surface)",
              border: variant === "corporate" ? "2px solid #2c5282" : "2px solid var(--border)",
              borderRadius: "12px",
              padding: "24px 20px",
              cursor: "pointer",
              textAlign: "left",
              transition: "border-color 0.2s, background 0.2s",
            }}
          >
            {/* Preview bar */}
            <div style={{
              display: "flex",
              gap: "6px",
              marginBottom: "16px",
            }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "4px", background: "#2c5282" }} />
              <div style={{ width: "24px", height: "24px", borderRadius: "4px", background: "#c9a84c" }} />
              <div style={{ width: "24px", height: "24px", borderRadius: "4px", background: "#f0f2f5" }} />
            </div>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--text)",
              marginBottom: "6px",
            }}>
              Corporate
            </div>
            <div style={{
              fontSize: "0.8rem",
              color: "var(--muted)",
              lineHeight: 1.5,
            }}>
              Blue &amp; gold palette, clean sans-serif, grouped navigation
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
