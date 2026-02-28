"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

interface Props {
  invoiceId: string;
  invoiceType: string;
}

export default function DeleteInvoiceButton({ invoiceId, invoiceType }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/financial/invoices/${invoiceId}?hard=true`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete invoice");
      }
      // Navigate back to the appropriate list
      const backPath = invoiceType === "payable" ? "/financial/ap" : "/financial/ar";
      router.push(backPath);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete invoice");
      setDeleting(false);
    }
  }

  if (confirming) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {error && (
          <span style={{ color: "var(--color-red)", fontSize: "0.78rem" }}>{error}</span>
        )}
        <button
          className="ui-btn ui-btn-outline ui-btn-sm"
          onClick={() => { setConfirming(false); setError(""); }}
          disabled={deleting}
        >
          Cancel
        </button>
        <button
          className="ui-btn ui-btn-danger ui-btn-sm"
          onClick={handleDelete}
          disabled={deleting}
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          {deleting ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
          {deleting ? "Deleting..." : "Confirm Delete"}
        </button>
      </div>
    );
  }

  return (
    <button
      className="ui-btn ui-btn-danger ui-btn-md"
      onClick={() => setConfirming(true)}
      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
    >
      <Trash2 size={16} />
      Delete
    </button>
  );
}
