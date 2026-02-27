"use client";

import { Suspense, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Save,
  Send,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/format";

interface LineItemRow {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  csi_code: string;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0");
  return `INV-${year}-${seq}`;
}

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

function defaultDueDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center" }}>Loading...</div>}>
      <NewInvoiceForm />
    </Suspense>
  );
}

function NewInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = (searchParams.get("type") === "payable" ? "payable" : "receivable") as "payable" | "receivable";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [invoiceType, setInvoiceType] = useState<"payable" | "receivable">(initialType);
  const [invoiceNumber, setInvoiceNumber] = useState(generateInvoiceNumber);
  const [vendorOrClient, setVendorOrClient] = useState("");
  const [projectId, setProjectId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayString);
  const [dueDate, setDueDate] = useState(defaultDueDateString);
  const [notes, setNotes] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [deferralStartDate, setDeferralStartDate] = useState("");
  const [deferralEndDate, setDeferralEndDate] = useState("");

  // Line items
  const [lineItems, setLineItems] = useState<LineItemRow[]>([
    { id: generateId(), description: "", quantity: 1, unit_price: 0, csi_code: "" },
  ]);

  const addLineItem = useCallback(() => {
    setLineItems((prev) => [
      ...prev,
      { id: generateId(), description: "", quantity: 1, unit_price: 0, csi_code: "" },
    ]);
  }, []);

  const removeLineItem = useCallback((id: string) => {
    setLineItems((prev) => (prev.length === 1 ? prev : prev.filter((li) => li.id !== id)));
  }, []);

  const updateLineItem = useCallback(
    (id: string, field: keyof LineItemRow, value: string | number) => {
      setLineItems((prev) =>
        prev.map((li) => (li.id === id ? { ...li, [field]: value } : li))
      );
    },
    []
  );

  // Calculations
  const subtotal = lineItems.reduce(
    (sum, li) => sum + li.quantity * li.unit_price,
    0
  );
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  async function handleSubmit(status: "draft" | "pending") {
    setError(null);
    setSaving(true);

    try {
      const supabase = createClient();

      const payload = {
        invoice_number: invoiceNumber,
        invoice_type: invoiceType,
        vendor_name: invoiceType === "payable" ? vendorOrClient : undefined,
        client_name: invoiceType === "receivable" ? vendorOrClient : undefined,
        project_id: projectId || undefined,
        invoice_date: invoiceDate,
        due_date: dueDate,
        subtotal,
        tax_amount: taxAmount,
        total_amount: total,
        line_items: lineItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unit_price,
          amount: li.quantity * li.unit_price,
          csi_code: li.csi_code || undefined,
        })),
        notes: notes || undefined,
        status,
        deferral_start_date: deferralStartDate || undefined,
        deferral_end_date: deferralEndDate || undefined,
      };

      const res = await fetch("/api/financial/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create invoice");
      }

      router.push("/financial/invoices");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <Link
            href="/financial/invoices"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.82rem",
              color: "var(--muted)",
              textDecoration: "none",
              marginBottom: "8px",
            }}
          >
            <ArrowLeft size={14} />
            Back to Invoices
          </Link>
          <h2>New Invoice</h2>
          <p className="fin-header-sub">Create a new payable or receivable invoice.</p>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            marginBottom: "20px",
            background: "var(--color-red-light)",
            border: "1px solid var(--color-red)",
            borderRadius: "8px",
            color: "var(--color-red)",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </div>
      )}

      <div className="invoice-form">
        {/* Type Selector */}
        <div className="invoice-type-selector">
          <button
            type="button"
            className={`invoice-type-option ${invoiceType === "receivable" ? "active" : ""}`}
            onClick={() => setInvoiceType("receivable")}
          >
            <ArrowUpRight size={20} />
            Accounts Receivable (AR)
          </button>
          <button
            type="button"
            className={`invoice-type-option ${invoiceType === "payable" ? "active" : ""}`}
            onClick={() => setInvoiceType("payable")}
          >
            <ArrowDownLeft size={20} />
            Accounts Payable (AP)
          </button>
        </div>

        {/* Form Fields */}
        <div className="invoice-form-grid">
          <div className="ui-field">
            <label className="ui-label">Invoice Number</label>
            <input
              type="text"
              className="ui-input"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </div>

          <div className="ui-field">
            <label className="ui-label">
              {invoiceType === "payable" ? "Vendor Name" : "Client Name"}
            </label>
            <input
              type="text"
              className="ui-input"
              placeholder={invoiceType === "payable" ? "Enter vendor name" : "Enter client name"}
              value={vendorOrClient}
              onChange={(e) => setVendorOrClient(e.target.value)}
            />
          </div>

          <div className="ui-field">
            <label className="ui-label">Project ID (optional)</label>
            <input
              type="text"
              className="ui-input"
              placeholder="Enter project ID"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            />
          </div>

          <div className="ui-field">
            <label className="ui-label">Tax Rate (%)</label>
            <input
              type="number"
              className="ui-input"
              min="0"
              max="100"
              step="0.01"
              value={taxRate}
              onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="ui-field">
            <label className="ui-label">Invoice Date</label>
            <input
              type="date"
              className="ui-input"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>

          <div className="ui-field">
            <label className="ui-label">Due Date</label>
            <input
              type="date"
              className="ui-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="ui-field invoice-form-full">
            <label className="ui-label">Notes</label>
            <textarea
              className="ui-textarea"
              placeholder="Additional notes or payment terms..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Deferral Fields */}
          <div className="ui-field">
            <label className="ui-label">Deferral Start Date (optional)</label>
            <input
              type="date"
              className="ui-input"
              value={deferralStartDate}
              onChange={(e) => setDeferralStartDate(e.target.value)}
            />
          </div>

          <div className="ui-field">
            <label className="ui-label">Deferral End Date (optional)</label>
            <input
              type="date"
              className="ui-input"
              value={deferralEndDate}
              onChange={(e) => setDeferralEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Line Items */}
        <div className="line-items-section">
          <div className="line-items-section-title">
            <span>Line Items</span>
            <button
              type="button"
              className="ui-btn ui-btn-outline ui-btn-sm"
              onClick={addLineItem}
            >
              <Plus size={14} />
              Add Line
            </button>
          </div>

          <table className="line-items-table">
            <thead>
              <tr>
                <th style={{ width: "35%" }}>Description</th>
                <th>CSI Code</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li) => {
                const lineAmount = li.quantity * li.unit_price;
                return (
                  <tr key={li.id}>
                    <td>
                      <input
                        type="text"
                        className="li-input"
                        placeholder="Item description"
                        value={li.description}
                        onChange={(e) =>
                          updateLineItem(li.id, "description", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="li-input li-input-sm"
                        placeholder="00 00 00"
                        value={li.csi_code}
                        onChange={(e) =>
                          updateLineItem(li.id, "csi_code", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="li-input li-input-sm"
                        min="0"
                        step="1"
                        value={li.quantity}
                        onChange={(e) =>
                          updateLineItem(
                            li.id,
                            "quantity",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="li-input li-input-sm"
                        min="0"
                        step="0.01"
                        value={li.unit_price}
                        onChange={(e) =>
                          updateLineItem(
                            li.id,
                            "unit_price",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </td>
                    <td className="li-amount">
                      {formatCurrency(lineAmount)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="li-remove-btn"
                        onClick={() => removeLineItem(li.id)}
                        title="Remove line item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="invoice-totals">
          <div className="invoice-totals-box">
            <div className="totals-row">
              <span className="totals-label">Subtotal</span>
              <span className="totals-value">{formatCurrency(subtotal)}</span>
            </div>
            <div className="totals-row">
              <span className="totals-label">Tax ({taxRate}%)</span>
              <span className="totals-value">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="totals-row total-final">
              <span className="totals-label">Total</span>
              <span className="totals-value">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="invoice-form-actions">
          <button
            type="button"
            className="ui-btn ui-btn-secondary ui-btn-md"
            onClick={() => handleSubmit("draft")}
            disabled={saving}
          >
            {saving ? <span className="ui-btn-spinner" /> : <Save size={16} />}
            Save as Draft
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-primary ui-btn-md"
            onClick={() => handleSubmit("pending")}
            disabled={saving}
          >
            {saving ? <span className="ui-btn-spinner" /> : <Send size={16} />}
            Submit
          </button>
          <Link
            href="/financial/invoices"
            className="ui-btn ui-btn-ghost ui-btn-md"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
