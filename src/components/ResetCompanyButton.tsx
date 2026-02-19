"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

export default function ResetCompanyButton() {
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handleDelete() {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/reset-company", { method: "DELETE" });
      const data = await res.json();

      if (res.ok) {
        const deleted = data.results?.filter((r: { deleted: number }) => r.deleted > 0) ?? [];
        const summary = deleted.map((r: { table: string; deleted: number }) => `${r.table}: ${r.deleted}`).join(", ");
        alert(`All data deleted.\n\n${summary || "No data found."}`);
        window.location.reload();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch {
      alert("Network error");
    } finally {
      setLoading(false);
      setConfirmed(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="ui-btn ui-btn-md"
        style={{
          background: confirmed ? "var(--color-red)" : "rgba(239, 68, 68, 0.1)",
          color: confirmed ? "#fff" : "var(--color-red)",
          border: "1px solid var(--color-red)",
        }}
      >
        <Trash2 size={16} />
        {loading ? "Deleting..." : confirmed ? "Click again to confirm" : "Delete All Company Data"}
      </button>
      {confirmed && (
        <button
          onClick={() => setConfirmed(false)}
          className="ui-btn ui-btn-sm ui-btn-secondary"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
