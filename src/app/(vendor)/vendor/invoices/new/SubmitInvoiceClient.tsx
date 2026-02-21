"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Receipt,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface Project {
  project_id: string;
  projects: { id: string; name: string; status: string }[] | { id: string; name: string; status: string } | null;
}

interface Props {
  projects: Project[];
}

function getProjectName(p: Project): string {
  if (!p.projects) return p.project_id;
  if (Array.isArray(p.projects)) return p.projects[0]?.name || p.project_id;
  return p.projects.name || p.project_id;
}

const PAYMENT_TERMS = [
  { value: "due_on_receipt", label: "Due on Receipt" },
  { value: "net_10", label: "Net 10" },
  { value: "net_15", label: "Net 15" },
  { value: "net_30", label: "Net 30" },
  { value: "net_45", label: "Net 45" },
  { value: "net_60", label: "Net 60" },
  { value: "net_90", label: "Net 90" },
];

export default function SubmitInvoiceClient({ projects }: Props) {
  const router = useRouter();
  const t = useTranslations("vendor");

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [projectId, setProjectId] = useState("");
  const [amount, setAmount] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("net_30");
  const [description, setDescription] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  function addLineItem() {
    setLineItems([
      ...lineItems,
      { description: "", quantity: 1, unit_price: 0, amount: 0 },
    ]);
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string | number) {
    const updated = [...lineItems];
    const item = { ...updated[index] };

    if (field === "description") {
      item.description = value as string;
    } else if (field === "quantity") {
      item.quantity = Number(value) || 0;
      item.amount = item.quantity * item.unit_price;
    } else if (field === "unit_price") {
      item.unit_price = Number(value) || 0;
      item.amount = item.quantity * item.unit_price;
    } else if (field === "amount") {
      item.amount = Number(value) || 0;
    }

    updated[index] = item;
    setLineItems(updated);
  }

  function removeLineItem(index: number) {
    setLineItems(lineItems.filter((_, i) => i !== index));
  }

  const lineItemsTotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
  const subtotal = Number(amount) || 0;
  const tax = Number(taxAmount) || 0;
  const total = subtotal + tax;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invoiceNumber.trim() || subtotal <= 0) return;

    setSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await fetch("/api/vendor/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_number: invoiceNumber.trim(),
          project_id: projectId || undefined,
          amount: subtotal,
          tax_amount: tax,
          due_date: dueDate || undefined,
          payment_terms: paymentTerms,
          description: description.trim() || undefined,
          line_items: lineItems.length > 0 ? lineItems : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit invoice");
      }

      setSubmitResult({
        type: "success",
        message: t("invoiceSubmittedSuccess"),
      });

      // Reset form
      setInvoiceNumber("");
      setProjectId("");
      setAmount("");
      setTaxAmount("");
      setDueDate("");
      setPaymentTerms("net_30");
      setDescription("");
      setLineItems([]);

      // Redirect to invoices list after 2s
      setTimeout(() => router.push("/vendor/invoices"), 2000);
    } catch (err: unknown) {
      setSubmitResult({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to submit invoice",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>{t("submitInvoiceTitle")}</h2>
          <p className="fin-header-sub">{t("submitInvoiceSubtitle")}</p>
        </div>
      </div>

      {submitResult && (
        <div
          className={`vendor-alert ${
            submitResult.type === "success" ? "vendor-alert-success" : "vendor-alert-error"
          }`}
        >
          {submitResult.type === "success" ? (
            <CheckCircle size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {submitResult.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="fin-chart-card vendor-invoice-form">
        <div className="vendor-form-grid">
          {/* Invoice Number */}
          <div className="vendor-form-field">
            <label>{t("invoiceNumber")}</label>
            <input
              type="text"
              className="ui-input"
              placeholder="INV-2026-001"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              required
            />
          </div>

          {/* Project */}
          <div className="vendor-form-field">
            <label>{t("labelProject")}</label>
            <select
              className="ui-input"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">{t("selectProject")}</option>
              {projects.map((p) => (
                <option key={p.project_id} value={p.project_id}>
                  {getProjectName(p)}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div className="vendor-form-field">
            <label>{t("labelAmount")} *</label>
            <input
              type="number"
              className="ui-input"
              placeholder="0.00"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {/* Tax Amount */}
          <div className="vendor-form-field">
            <label>{t("taxAmount")}</label>
            <input
              type="number"
              className="ui-input"
              placeholder="0.00"
              step="0.01"
              min="0"
              value={taxAmount}
              onChange={(e) => setTaxAmount(e.target.value)}
            />
          </div>

          {/* Due Date */}
          <div className="vendor-form-field">
            <label>{t("dueDate")}</label>
            <input
              type="date"
              className="ui-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Payment Terms */}
          <div className="vendor-form-field">
            <label>{t("paymentTerms")}</label>
            <select
              className="ui-input"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
            >
              {PAYMENT_TERMS.map((pt) => (
                <option key={pt.value} value={pt.value}>
                  {pt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="vendor-form-field" style={{ gridColumn: "span 2" }}>
            <label>{t("descriptionNotes")}</label>
            <textarea
              className="ui-input"
              rows={3}
              placeholder={t("descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ resize: "vertical", minHeight: 60 }}
            />
          </div>
        </div>

        {/* Line Items */}
        <div className="vendor-line-items">
          <div className="vendor-line-items-header">
            <h4>{t("lineItems")}</h4>
            <button
              type="button"
              className="ui-btn ui-btn-outline ui-btn-sm"
              onClick={addLineItem}
            >
              <Plus size={14} />
              {t("addLineItem")}
            </button>
          </div>

          {lineItems.length > 0 && (
            <table className="invoice-table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>{t("description")}</th>
                  <th style={{ width: 80 }}>{t("qty")}</th>
                  <th style={{ width: 120 }}>{t("unitPrice")}</th>
                  <th style={{ width: 120, textAlign: "right" }}>{t("labelAmount")}</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((li, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        type="text"
                        className="ui-input"
                        value={li.description}
                        onChange={(e) =>
                          updateLineItem(idx, "description", e.target.value)
                        }
                        placeholder="Item description"
                        style={{ fontSize: "0.85rem" }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="ui-input"
                        value={li.quantity || ""}
                        onChange={(e) =>
                          updateLineItem(idx, "quantity", e.target.value)
                        }
                        min="0"
                        step="1"
                        style={{ fontSize: "0.85rem" }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="ui-input"
                        value={li.unit_price || ""}
                        onChange={(e) =>
                          updateLineItem(idx, "unit_price", e.target.value)
                        }
                        min="0"
                        step="0.01"
                        style={{ fontSize: "0.85rem" }}
                      />
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                      {formatCurrency(li.amount)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="vendor-remove-btn"
                        onClick={() => removeLineItem(idx)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {lineItems.length > 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: "right", fontWeight: 600 }}>
                      {t("lineItemsTotal")}:
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>
                      {formatCurrency(lineItemsTotal)}
                    </td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Totals Summary */}
        <div className="vendor-invoice-summary">
          <div className="vendor-summary-row">
            <span>{t("subtotal")}</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {tax > 0 && (
            <div className="vendor-summary-row">
              <span>{t("taxAmount")}</span>
              <span>{formatCurrency(tax)}</span>
            </div>
          )}
          <div className="vendor-summary-row vendor-summary-total">
            <span>{t("totalAmount")}</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="vendor-form-actions">
          <button
            type="button"
            className="ui-btn ui-btn-outline ui-btn-md"
            onClick={() => router.back()}
            disabled={submitting}
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            className="ui-btn ui-btn-primary ui-btn-md"
            disabled={submitting || !invoiceNumber.trim() || subtotal <= 0}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="spin" />
                {t("submitting")}
              </>
            ) : (
              <>
                <Receipt size={16} />
                {t("submitForReview")}
              </>
            )}
          </button>
        </div>
      </form>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
