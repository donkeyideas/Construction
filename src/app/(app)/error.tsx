"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div style={{ padding: "60px 24px", textAlign: "center" }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "var(--surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
          fontSize: "1.5rem",
        }}
      >
        !
      </div>
      <h2
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "1.25rem",
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        Something went wrong
      </h2>
      <p
        style={{
          fontSize: "0.9rem",
          color: "var(--muted)",
          marginBottom: 20,
          maxWidth: 400,
          margin: "0 auto 20px",
          lineHeight: 1.5,
        }}
      >
        {error.message || "An unexpected error occurred while loading this page."}
        {error.digest && (
          <span style={{ display: "block", fontSize: "0.75rem", marginTop: 8, opacity: 0.6 }}>
            Error ID: {error.digest}
          </span>
        )}
      </p>
      <button
        onClick={reset}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 18px",
          background: "var(--color-blue)",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: "0.85rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Try Again
      </button>
    </div>
  );
}
