"use client";

export function PrintButtons() {
  return (
    <div style={{
      position: "fixed", top: 20, right: 20,
      display: "flex", gap: 8, zIndex: 999,
    }}>
      <button
        type="button"
        onClick={() => window.print()}
        style={{
          padding: "8px 20px", borderRadius: 6, border: "none",
          background: "#0f172a", color: "#fff",
          fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
        }}
      >
        Print / Save PDF
      </button>
      <button
        type="button"
        onClick={() => window.close()}
        style={{
          padding: "8px 20px", borderRadius: 6, border: "none",
          background: "#e2e8f0", color: "#1e293b",
          fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
        }}
      >
        Close
      </button>
    </div>
  );
}
