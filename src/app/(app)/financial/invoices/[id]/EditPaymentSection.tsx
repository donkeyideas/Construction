"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Save, X, Loader2 } from "lucide-react";

interface PaymentInfo {
  id: string;
  payment_date: string;
  amount: number;
  method: string;
  reference_number: string | null;
  bank_account_id: string | null;
  bank_account_name: string | null;
  notes: string | null;
}

interface BankOption {
  id: string;
  name: string;
  bank_name: string;
  account_number_last4: string | null;
}

interface EditPaymentSectionProps {
  payments: PaymentInfo[];
  invoiceId: string;
  bankAccounts: BankOption[];
}

export default function EditPaymentSection({
  payments,
  invoiceId,
  bankAccounts,
}: EditPaymentSectionProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editMethod, setEditMethod] = useState("");
  const [editBankAccountId, setEditBankAccountId] = useState("");
  const [editReference, setEditReference] = useState("");
  const [editNotes, setEditNotes] = useState("");

  if (payments.length === 0) return null;

  function startEdit(p: PaymentInfo) {
    setEditingId(p.id);
    setEditMethod(p.method || "Check");
    setEditBankAccountId(p.bank_account_id || "");
    setEditReference(p.reference_number || "");
    setEditNotes(p.notes || "");
    setError(null);
    setSuccess(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function handleSave(paymentId: string) {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/financial/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: editMethod,
          bank_account_id: editBankAccountId || null,
          reference_number: editReference || null,
          notes: editNotes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update payment");
      }

      setEditingId(null);
      setSuccess("Payment updated successfully.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.78rem",
    color: "var(--muted)",
    marginBottom: 4,
    fontWeight: 500,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 34,
    padding: "0 10px",
    fontSize: "0.82rem",
    fontFamily: "var(--font-sans)",
    color: "var(--text)",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    boxSizing: "border-box",
  };

  return (
    <div style={{ marginTop: 16 }}>
      {success && (
        <div style={{
          padding: "8px 14px",
          borderRadius: 6,
          background: "var(--color-green-light)",
          color: "var(--color-green)",
          fontSize: "0.82rem",
          fontWeight: 500,
          marginBottom: 12,
        }}>
          {success}
        </div>
      )}

      {payments.map((p) => {
        const isEditing = editingId === p.id;
        if (!isEditing) {
          return (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 0",
              }}
            >
              <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                Payment on {new Date(p.payment_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                {" — "}${p.amount.toFixed(2)} via {p.method}
                {p.bank_account_name ? ` (${p.bank_account_name})` : ""}
              </span>
              <button
                type="button"
                className="ui-btn ui-btn-ghost ui-btn-sm"
                onClick={() => startEdit(p)}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.78rem" }}
              >
                <Edit3 size={13} />
                Edit
              </button>
            </div>
          );
        }

        return (
          <div
            key={p.id}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 12 }}>
              Edit Payment — ${p.amount.toFixed(2)} on {new Date(p.payment_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>

            {error && (
              <div style={{
                padding: "8px 12px",
                borderRadius: 6,
                background: "var(--color-red-light)",
                color: "var(--color-red)",
                fontSize: "0.82rem",
                marginBottom: 12,
              }}>
                {error}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Method</label>
                <select
                  value={editMethod}
                  onChange={(e) => setEditMethod(e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="Check">Check</option>
                  <option value="ACH">ACH</option>
                  <option value="Wire">Wire</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Bank Account</label>
                <select
                  value={editBankAccountId}
                  onChange={(e) => setEditBankAccountId(e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="">-- None --</option>
                  {bankAccounts.map((ba) => (
                    <option key={ba.id} value={ba.id}>
                      {ba.name} — {ba.bank_name}{ba.account_number_last4 ? ` (••${ba.account_number_last4})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Reference Number</label>
                <input
                  type="text"
                  value={editReference}
                  onChange={(e) => setEditReference(e.target.value)}
                  placeholder="e.g., Check #1234"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Optional notes"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="ui-btn ui-btn-outline ui-btn-sm"
                onClick={cancelEdit}
                disabled={saving}
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <X size={13} />
                Cancel
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-primary ui-btn-sm"
                onClick={() => handleSave(p.id)}
                disabled={saving}
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                {saving ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
