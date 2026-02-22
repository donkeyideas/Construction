"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, X, Loader2 } from "lucide-react";

interface BankAccountOption {
  id: string;
  name: string;
  bank_name: string;
  account_number_last4: string | null;
  is_default: boolean;
}

interface RecordPaymentButtonProps {
  invoiceId: string;
  balanceDue: number;
  invoiceType: string;
  bankAccounts?: BankAccountOption[];
}

export default function RecordPaymentButton({
  invoiceId,
  balanceDue,
  invoiceType,
  bankAccounts = [],
}: RecordPaymentButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const defaultBankId = bankAccounts.find((b) => b.is_default)?.id || bankAccounts[0]?.id || "";
  const [amount, setAmount] = useState(balanceDue);
  const [paymentDate, setPaymentDate] = useState(today);
  const [bankAccountId, setBankAccountId] = useState(defaultBankId);
  const [method, setMethod] = useState("Check");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  if (balanceDue <= 0) {
    return null;
  }

  function handleOpen() {
    setAmount(balanceDue);
    setPaymentDate(today);
    setBankAccountId(defaultBankId);
    setMethod("Check");
    setReferenceNumber("");
    setNotes("");
    setError(null);
    setOpen(true);
  }

  function handleClose() {
    if (!loading) {
      setOpen(false);
      setError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (amount <= 0) {
      setError("Payment amount must be greater than zero.");
      return;
    }

    if (amount > balanceDue) {
      setError(`Payment amount cannot exceed the balance due of $${balanceDue.toFixed(2)}.`);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/financial/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: invoiceId,
          payment_date: paymentDate,
          amount,
          method,
          bank_account_id: bankAccountId || undefined,
          reference_number: referenceNumber || undefined,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to record payment");
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.82rem",
    fontWeight: 600,
    color: "var(--text)",
    marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 38,
    padding: "0 12px",
    fontSize: "0.85rem",
    fontFamily: "var(--font-sans)",
    color: "var(--text)",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    boxSizing: "border-box",
  };

  return (
    <>
      <button
        className="ui-btn ui-btn-primary ui-btn-md"
        type="button"
        onClick={handleOpen}
      >
        <DollarSign size={16} />
        Record Payment
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(2px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 0,
              width: "100%",
              maxWidth: 480,
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px 24px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div>
                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "1.15rem",
                    fontWeight: 700,
                    margin: 0,
                  }}
                >
                  Record Payment
                </h3>
                <p
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--muted)",
                    margin: "4px 0 0",
                  }}
                >
                  {invoiceType === "payable"
                    ? "Record an outgoing payment"
                    : "Record an incoming payment"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--muted)",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit}>
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 18 }}>
                {error && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "var(--color-red-light)",
                      color: "var(--color-red)",
                      fontSize: "0.82rem",
                      fontWeight: 500,
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* Amount */}
                <div>
                  <label style={labelStyle}>
                    Amount <span style={{ color: "var(--color-red)" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--muted)",
                        fontSize: "0.85rem",
                        pointerEvents: "none",
                      }}
                    >
                      $
                    </span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      min={0.01}
                      max={balanceDue}
                      step={0.01}
                      required
                      style={{ ...inputStyle, paddingLeft: 28 }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--muted)",
                      marginTop: 4,
                      display: "block",
                    }}
                  >
                    Balance due: ${balanceDue.toFixed(2)}
                  </span>
                </div>

                {/* Payment Date */}
                <div>
                  <label style={labelStyle}>
                    Payment Date <span style={{ color: "var(--color-red)" }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>

                {/* Bank Account */}
                {bankAccounts.length > 0 && (
                  <div>
                    <label style={labelStyle}>
                      Bank Account <span style={{ color: "var(--color-red)" }}>*</span>
                    </label>
                    <select
                      value={bankAccountId}
                      onChange={(e) => setBankAccountId(e.target.value)}
                      required
                      style={{ ...inputStyle, cursor: "pointer" }}
                    >
                      {bankAccounts.map((ba) => (
                        <option key={ba.id} value={ba.id}>
                          {ba.name} — {ba.bank_name}{ba.account_number_last4 ? ` (••${ba.account_number_last4})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Method */}
                <div>
                  <label style={labelStyle}>
                    Method <span style={{ color: "var(--color-red)" }}>*</span>
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    required
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    <option value="Check">Check</option>
                    <option value="ACH">ACH</option>
                    <option value="Wire">Wire</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                {/* Reference Number */}
                <div>
                  <label style={labelStyle}>Reference Number</label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g., Check #1234"
                    style={inputStyle}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label style={labelStyle}>Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional payment notes..."
                    rows={3}
                    style={{
                      ...inputStyle,
                      height: "auto",
                      padding: "10px 12px",
                      resize: "vertical",
                      fontFamily: "var(--font-sans)",
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  padding: "16px 24px",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <button
                  type="button"
                  className="ui-btn ui-btn-outline ui-btn-md"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ui-btn ui-btn-primary ui-btn-md"
                  disabled={loading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    minWidth: 140,
                    justifyContent: "center",
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign size={16} />
                      Record Payment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
