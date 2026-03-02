"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
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
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
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

interface PropertyOption {
  id: string;
  name: string;
}

function parseContext(v: string): { project_id: string | undefined; property_id: string | undefined } {
  if (!v) return { project_id: undefined, property_id: undefined };
  if (v.startsWith("proj:")) return { project_id: v.slice(5), property_id: undefined };
  if (v.startsWith("prop:")) return { project_id: undefined, property_id: v.slice(5) };
  return { project_id: undefined, property_id: undefined };
}

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
  const t = useTranslations("financial.newInvoicePage");
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center" }}>{t("loading")}</div>}>
      <NewInvoiceForm />
    </Suspense>
  );
}

function NewInvoiceForm() {
  const t = useTranslations("financial.newInvoicePage");
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const lockedType = typeParam === "payable" || typeParam === "receivable" ? typeParam : null;
  const initialType = (typeParam === "payable" ? "payable" : "receivable") as "payable" | "receivable";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lookup data
  const [glAccounts, setGlAccounts] = useState<GLAccount[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);

  // Form state
  const [invoiceType, setInvoiceType] = useState<"payable" | "receivable">(initialType);
  const [invoiceNumber, setInvoiceNumber] = useState(generateInvoiceNumber);
  const [vendorOrClient, setVendorOrClient] = useState("");
  const [contextId, setContextId] = useState("");
  const [glAccountId, setGlAccountId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayString);
  const [dueDate, setDueDate] = useState(defaultDueDateString);
  const [notes, setNotes] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [deferralStartDate, setDeferralStartDate] = useState("");
  const [deferralEndDate, setDeferralEndDate] = useState("");
  const [showDeferral, setShowDeferral] = useState(false);

  // Load GL accounts and projects on mount
  useEffect(() => {
    const supabase = createClient();
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: membership } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      if (!membership) return;
      const companyId = membership.company_id;

      const [acctRes, projRes, propData] = await Promise.all([
        supabase
          .from("chart_of_accounts")
          .select("id, account_number, name, account_type")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("account_number"),
        supabase
          .from("projects")
          .select("id, name, code")
          .eq("company_id", companyId)
          .order("name"),
        fetch("/api/properties").then((r) => r.ok ? r.json() : []),
      ]);
      if (acctRes.data) setGlAccounts(acctRes.data);
      if (projRes.data) setProjects(projRes.data);
      if (Array.isArray(propData)) setProperties(propData);
    }
    loadData();
  }, []);

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

      const { project_id, property_id } = parseContext(contextId);
      const payload = {
        invoice_number: invoiceNumber,
        invoice_type: invoiceType,
        vendor_name: invoiceType === "payable" ? vendorOrClient : undefined,
        client_name: invoiceType === "receivable" ? vendorOrClient : undefined,
        project_id,
        property_id,
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
        gl_account_id: glAccountId || undefined,
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
            {t("backToInvoices")}
          </Link>
          <h2>{t("title")}</h2>
          <p className="fin-header-sub">{t("subtitle")}</p>
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
        {/* Type Selector — hidden when type is locked via URL param */}
        {lockedType ? (
          <div className="invoice-type-selector">
            <button
              type="button"
              className="invoice-type-option active"
              style={{ cursor: "default", flex: 1 }}
            >
              {lockedType === "payable" ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
              {lockedType === "payable" ? t("accountsPayableAp") : t("accountsReceivableAr")}
            </button>
          </div>
        ) : (
          <div className="invoice-type-selector">
            <button
              type="button"
              className={`invoice-type-option ${invoiceType === "receivable" ? "active" : ""}`}
              onClick={() => setInvoiceType("receivable")}
            >
              <ArrowUpRight size={20} />
              {t("accountsReceivableAr")}
            </button>
            <button
              type="button"
              className={`invoice-type-option ${invoiceType === "payable" ? "active" : ""}`}
              onClick={() => setInvoiceType("payable")}
            >
              <ArrowDownLeft size={20} />
              {t("accountsPayableAp")}
            </button>
          </div>
        )}

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
            <label className="ui-label">Project / Property (optional)</label>
            <select
              className="ui-input"
              value={contextId}
              onChange={(e) => setContextId(e.target.value)}
            >
              <option value="">— None —</option>
              {projects.length > 0 && (
                <optgroup label="Projects">
                  {projects.map((p) => (
                    <option key={p.id} value={`proj:${p.id}`}>
                      {p.code ? `${p.code} — ` : ""}{p.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {properties.length > 0 && (
                <optgroup label="Properties">
                  {properties.map((p) => (
                    <option key={p.id} value={`prop:${p.id}`}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
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

        {/* Deferred / Prepaid — checkbox toggle */}
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
                {invoiceType === "payable" ? "Prepaid Expense" : t("deferredRevenue")}
              </span>
              {!showDeferral && (
                <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                  {invoiceType === "payable"
                    ? "Check to spread this expense over a period (e.g., insurance, subscriptions, retainers)"
                    : "Check to spread revenue recognition over a period (e.g., retainers, prepaid contracts)"}
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
                  {invoiceType === "payable"
                    ? <>The initial JE will debit <strong>Prepaid Expenses</strong> (asset). Monthly entries will transfer the balance to the expense account over the period above.</>
                    : <>The initial invoice JE will credit <strong>Deferred Revenue</strong> (liability). Monthly recognition entries will transfer the balance to Revenue over the period above.</>}
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
          <Link
            href="/financial/invoices"
            className="ui-btn ui-btn-secondary ui-btn-md"
          >
            {t("cancel")}
          </Link>
          <button
            type="button"
            className="ui-btn ui-btn-secondary ui-btn-md"
            onClick={() => handleSubmit("draft")}
            disabled={saving}
          >
            {saving ? <span className="ui-btn-spinner" /> : <Save size={16} />}
            {t("saveAsDraft")}
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-primary ui-btn-md"
            onClick={() => handleSubmit("pending")}
            disabled={saving}
          >
            {saving ? <span className="ui-btn-spinner" /> : <Send size={16} />}
            {t("submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
