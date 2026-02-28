"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Save,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils/format";

interface GLAccount {
  id: string;
  account_number: string;
  name: string;
  account_type: string;
}

interface ProjectOption {
  id: string;
  name: string;
  code: string;
}

interface LineItemData {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  csi_code?: string;
}

interface LineItemRow {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  csi_code: string;
}

interface InvoiceData {
  invoice_number: string;
  invoice_type: "payable" | "receivable";
  vendor_name: string;
  client_name: string;
  project_id: string;
  gl_account_id: string;
  invoice_date: string;
  due_date: string;
  notes: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  line_items: LineItemData[];
  deferral_start_date: string;
  deferral_end_date: string;
}

interface Props {
  invoiceId: string;
  invoice: InvoiceData;
  glAccounts: GLAccount[];
  projects: ProjectOption[];
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export default function EditInvoiceClient({ invoiceId, invoice, glAccounts, projects }: Props) {
  const t = useTranslations("financial.newInvoicePage");
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state — pre-filled from invoice
  const [invoiceType] = useState<"payable" | "receivable">(invoice.invoice_type);
  const [invoiceNumber, setInvoiceNumber] = useState(invoice.invoice_number);
  const [vendorOrClient, setVendorOrClient] = useState(
    invoice.invoice_type === "payable" ? invoice.vendor_name : invoice.client_name
  );
  const [projectId, setProjectId] = useState(invoice.project_id);
  const [glAccountId, setGlAccountId] = useState(invoice.gl_account_id);
  const [invoiceDate, setInvoiceDate] = useState(invoice.invoice_date);
  const [dueDate, setDueDate] = useState(invoice.due_date);
  const [notes, setNotes] = useState(invoice.notes);
  const [deferralStartDate, setDeferralStartDate] = useState(invoice.deferral_start_date);
  const [deferralEndDate, setDeferralEndDate] = useState(invoice.deferral_end_date);
  const [showDeferral, setShowDeferral] = useState(
    !!(invoice.deferral_start_date || invoice.deferral_end_date)
  );

  // Compute tax rate from existing values
  const initialTaxRate = invoice.subtotal > 0 ? (invoice.tax_amount / invoice.subtotal) * 100 : 0;
  const [taxRate, setTaxRate] = useState(Math.round(initialTaxRate * 100) / 100);

  // Line items
  const [lineItems, setLineItems] = useState<LineItemRow[]>(
    invoice.line_items.length > 0
      ? invoice.line_items.map((li) => ({
          id: generateId(),
          description: li.description ?? "",
          quantity: li.quantity ?? 1,
          unit_price: li.unit_price ?? 0,
          csi_code: li.csi_code ?? "",
        }))
      : [{ id: generateId(), description: "", quantity: 1, unit_price: 0, csi_code: "" }]
  );

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
  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  async function handleSave() {
    setError(null);
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        invoice_number: invoiceNumber,
        vendor_name: invoiceType === "payable" ? vendorOrClient : undefined,
        client_name: invoiceType === "receivable" ? vendorOrClient : undefined,
        project_id: projectId || null,
        gl_account_id: glAccountId || null,
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
        notes: notes || null,
        deferral_start_date: deferralStartDate || null,
        deferral_end_date: deferralEndDate || null,
      };

      const res = await fetch(`/api/financial/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update invoice");
      }

      router.push(`/financial/invoices/${invoiceId}`);
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
            href={`/financial/invoices/${invoiceId}`}
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
            Back to Invoice
          </Link>
          <h2>Edit {invoiceNumber}</h2>
          <p className="fin-header-sub">
            {invoiceType === "payable" ? "Accounts Payable" : "Accounts Receivable"}
          </p>
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
        {/* Type indicator (not editable) */}
        <div className="invoice-type-selector">
          <button
            type="button"
            className="invoice-type-option active"
            style={{ cursor: "default", flex: 1 }}
          >
            {invoiceType === "payable" ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
            {invoiceType === "payable" ? t("accountsPayableAp") : t("accountsReceivableAr")}
          </button>
        </div>

        {/* Form Fields */}
        <div className="invoice-form-grid">
          <div className="ui-field">
            <label className="ui-label">{t("invoiceNumber")}</label>
            <input
              type="text"
              className="ui-input"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </div>

          <div className="ui-field">
            <label className="ui-label">
              {invoiceType === "payable" ? t("vendorName") : t("clientNameLabel")}
            </label>
            <input
              type="text"
              className="ui-input"
              placeholder={invoiceType === "payable" ? t("enterVendorName") : t("enterClientName")}
              value={vendorOrClient}
              onChange={(e) => setVendorOrClient(e.target.value)}
            />
          </div>

          <div className="ui-field">
            <label className="ui-label">{t("glAccount")}</label>
            <select
              className="ui-input"
              value={glAccountId}
              onChange={(e) => setGlAccountId(e.target.value)}
            >
              <option value="">{t("selectGlAccount")}</option>
              {glAccounts
                .filter((a) =>
                  invoiceType === "payable"
                    ? a.account_type === "expense" || a.account_type === "asset" || a.account_type === "cost_of_goods_sold"
                    : a.account_type === "revenue" || a.account_type === "asset"
                )
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.account_number} — {a.name}
                  </option>
                ))}
              {glAccounts.length > 0 && (
                <optgroup label={t("allAccounts")}>
                  {glAccounts
                    .filter((a) =>
                      invoiceType === "payable"
                        ? a.account_type !== "expense" && a.account_type !== "asset" && a.account_type !== "cost_of_goods_sold"
                        : a.account_type !== "revenue" && a.account_type !== "asset"
                    )
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.account_number} — {a.name} ({a.account_type})
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="ui-field">
            <label className="ui-label">{t("projectOptional")}</label>
            <select
              className="ui-input"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">{t("selectProject")}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code ? `${p.code} — ` : ""}{p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="ui-field">
            <label className="ui-label">{t("taxRatePercent")}</label>
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
            <label className="ui-label">{t("invoiceDate")}</label>
            <input
              type="date"
              className="ui-input"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>

          <div className="ui-field">
            <label className="ui-label">{t("dueDate")}</label>
            <input
              type="date"
              className="ui-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="ui-field invoice-form-full">
            <label className="ui-label">{t("notes")}</label>
            <textarea
              className="ui-textarea"
              placeholder={t("notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Deferred Revenue — checkbox toggle */}
        <div style={{
          marginTop: 16,
          marginBottom: 8,
          padding: "12px 16px",
          border: showDeferral ? "1px solid var(--color-blue)" : "1px solid var(--border)",
          borderRadius: 8,
          background: showDeferral ? "var(--color-blue-light, rgba(59,130,246,0.06))" : "var(--bg-subtle, var(--surface))",
          transition: "border-color 0.15s, background 0.15s",
        }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={showDeferral}
              onChange={(e) => {
                setShowDeferral(e.target.checked);
                if (!e.target.checked) { setDeferralStartDate(""); setDeferralEndDate(""); }
              }}
              style={{ width: 16, height: 16, accentColor: "var(--color-blue)", cursor: "pointer", flexShrink: 0 }}
            />
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                {t("deferredRevenue")}
              </span>
              {!showDeferral && (
                <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                  Check to spread revenue recognition over a period (e.g., retainers, prepaid contracts)
                </span>
              )}
            </span>
          </label>
          {showDeferral && (
            <div className="invoice-form-grid" style={{ marginTop: 12 }}>
              <div className="ui-field">
                <label className="ui-label">{t("deferralStartDate")}</label>
                <input
                  type="date"
                  className="ui-input"
                  value={deferralStartDate}
                  onChange={(e) => setDeferralStartDate(e.target.value)}
                />
              </div>
              <div className="ui-field">
                <label className="ui-label">{t("deferralEndDate")}</label>
                <input
                  type="date"
                  className="ui-input"
                  value={deferralEndDate}
                  onChange={(e) => setDeferralEndDate(e.target.value)}
                />
              </div>
              <div className="ui-field invoice-form-full" style={{ margin: 0 }}>
                <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: 0 }}>
                  Saving will regenerate the journal entry to credit <strong>Deferred Revenue</strong> (liability) and rebuild the monthly recognition schedule.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Line Items */}
        <div className="line-items-section">
          <div className="line-items-section-title">
            <span>{t("lineItems")}</span>
            <button
              type="button"
              className="ui-btn ui-btn-outline ui-btn-sm"
              onClick={addLineItem}
            >
              <Plus size={14} />
              {t("addLine")}
            </button>
          </div>

          <table className="line-items-table">
            <thead>
              <tr>
                <th style={{ width: "35%" }}>{t("description")}</th>
                <th>{t("csiCode")}</th>
                <th>{t("qty")}</th>
                <th>{t("unitPrice")}</th>
                <th style={{ textAlign: "right" }}>{t("amount")}</th>
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
                        placeholder={t("itemDescriptionPlaceholder")}
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
                        title={t("removeLineItem")}
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
              <span className="totals-label">{t("subtotal")}</span>
              <span className="totals-value">{formatCurrency(subtotal)}</span>
            </div>
            <div className="totals-row">
              <span className="totals-label">{t("taxLabel", { rate: taxRate })}</span>
              <span className="totals-value">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="totals-row total-final">
              <span className="totals-label">{t("total")}</span>
              <span className="totals-value">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="invoice-form-actions">
          <button
            type="button"
            className="ui-btn ui-btn-primary ui-btn-md"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <span className="ui-btn-spinner" /> : <Save size={16} />}
            Save Changes
          </button>
          <Link
            href={`/financial/invoices/${invoiceId}`}
            className="ui-btn ui-btn-ghost ui-btn-md"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
