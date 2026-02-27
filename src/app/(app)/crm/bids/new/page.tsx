"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { getLocalToday } from "@/lib/utils/timezone";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total: number;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function NewBidPage() {
  const router = useRouter();
  const t = useTranslations("crm");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [bidNumber, setBidNumber] = useState("");
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [bidDate, setBidDate] = useState(getLocalToday);
  const [dueDate, setDueDate] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [scopeDescription, setScopeDescription] = useState("");

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: generateId(),
      description: "",
      quantity: 1,
      unit: "LS",
      unit_cost: 0,
      total: 0,
    },
  ]);

  const addLineItem = useCallback(() => {
    setLineItems((prev) => [
      ...prev,
      {
        id: generateId(),
        description: "",
        quantity: 1,
        unit: "LS",
        unit_cost: 0,
        total: 0,
      },
    ]);
  }, []);

  const removeLineItem = useCallback((id: string) => {
    setLineItems((prev) => prev.filter((li) => li.id !== id));
  }, []);

  const updateLineItem = useCallback(
    (id: string, field: keyof LineItem, value: string | number) => {
      setLineItems((prev) =>
        prev.map((li) => {
          if (li.id !== id) return li;
          const updated = { ...li, [field]: value };
          // Recalculate total
          if (field === "quantity" || field === "unit_cost") {
            updated.total = Number(updated.quantity) * Number(updated.unit_cost);
          }
          return updated;
        })
      );
    },
    []
  );

  // Calculated totals
  const lineItemsTotal = lineItems.reduce((sum, li) => sum + li.total, 0);
  const parsedBidAmount = parseFloat(bidAmount) || 0;
  const parsedEstimatedCost = parseFloat(estimatedCost) || 0;
  const marginPct =
    parsedBidAmount > 0
      ? ((parsedBidAmount - parsedEstimatedCost) / parsedBidAmount) * 100
      : 0;

  async function handleSave() {
    if (!bidNumber.trim()) {
      setError(t("bids.bidNumberRequired"));
      return;
    }
    if (!projectName.trim()) {
      setError(t("bids.projectNameRequired"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/crm/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bid_number: bidNumber.trim(),
          project_name: projectName.trim(),
          client_name: clientName.trim() || null,
          bid_date: bidDate || null,
          due_date: dueDate || null,
          estimated_cost: parsedEstimatedCost || null,
          bid_amount: parsedBidAmount || null,
          scope_description: scopeDescription.trim() || null,
          line_items: lineItems
            .filter((li) => li.description.trim())
            .map((li) => ({
              description: li.description,
              quantity: li.quantity,
              unit: li.unit,
              unit_cost: li.unit_cost,
              total: li.total,
            })),
          status: "in_progress",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t("bids.failedCreate"));
        setSaving(false);
        return;
      }

      router.push("/crm/bids");
    } catch {
      setError(t("bids.networkError"));
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!bidNumber.trim()) {
      setError(t("bids.bidNumberRequired"));
      return;
    }
    if (!projectName.trim()) {
      setError(t("bids.projectNameRequired"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/crm/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bid_number: bidNumber.trim(),
          project_name: projectName.trim(),
          client_name: clientName.trim() || null,
          bid_date: bidDate || null,
          due_date: dueDate || null,
          estimated_cost: parsedEstimatedCost || null,
          bid_amount: parsedBidAmount || null,
          scope_description: scopeDescription.trim() || null,
          line_items: lineItems
            .filter((li) => li.description.trim())
            .map((li) => ({
              description: li.description,
              quantity: li.quantity,
              unit: li.unit,
              unit_cost: li.unit_cost,
              total: li.total,
            })),
          status: "submitted",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t("bids.failedSubmit"));
        setSaving(false);
        return;
      }

      router.push("/crm/bids");
    } catch {
      setError(t("bids.networkError"));
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="crm-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/crm/bids"
            className="ui-btn ui-btn-sm ui-btn-ghost"
            style={{ padding: "0 8px" }}
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2>{t("bids.newBid")}</h2>
            <p className="crm-header-sub">
              {t("bids.newBidDesc")}
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "10px 16px",
            background: "var(--color-red-light)",
            border: "1px solid var(--color-red)",
            borderRadius: 8,
            marginBottom: 20,
            fontSize: "0.85rem",
            color: "var(--color-red)",
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      <div className="card bid-form">
        {/* Basic Info */}
        <div className="bid-form-grid">
          <div className="ui-field">
            <label className="ui-label">{t("bids.bidNumberLabel")}</label>
            <input
              type="text"
              className="ui-input"
              placeholder={t("bids.bidNumberPlaceholder")}
              value={bidNumber}
              onChange={(e) => setBidNumber(e.target.value)}
            />
          </div>

          <div className="ui-field">
            <label className="ui-label">{t("bids.projectNameLabel")}</label>
            <input
              type="text"
              className="ui-input"
              placeholder={t("bids.projectNamePlaceholder")}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>

          <div className="ui-field">
            <label className="ui-label">{t("bids.clientName")}</label>
            <input
              type="text"
              className="ui-input"
              placeholder={t("bids.clientNamePlaceholder")}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          <div className="ui-field">
            <label className="ui-label">{t("bids.bidDate")}</label>
            <input
              type="date"
              className="ui-input"
              value={bidDate}
              onChange={(e) => setBidDate(e.target.value)}
            />
          </div>

          <div className="ui-field">
            <label className="ui-label">{t("bids.dueDate")}</label>
            <input
              type="date"
              className="ui-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="ui-field">
            <label className="ui-label">{t("bids.estimatedCost")}</label>
            <input
              type="number"
              className="ui-input"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
            />
          </div>

          <div className="ui-field">
            <label className="ui-label">{t("bids.bidAmount")}</label>
            <input
              type="number"
              className="ui-input"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
            />
          </div>

          <div className="ui-field bid-form-full">
            <label className="ui-label">{t("bids.scopeDescription")}</label>
            <textarea
              className="ui-textarea"
              placeholder={t("bids.scopeDescriptionPlaceholder")}
              value={scopeDescription}
              onChange={(e) => setScopeDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        {/* Line Items */}
        <div className="bid-line-items">
          <div className="bid-line-items-header">
            <span>{t("bids.lineItems")}</span>
            <button
              type="button"
              className="ui-btn ui-btn-sm ui-btn-secondary"
              onClick={addLineItem}
            >
              <Plus size={14} />
              {t("bids.addItem")}
            </button>
          </div>

          <table className="bid-line-items-table">
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>{t("bids.description")}</th>
                <th style={{ width: 80 }}>{t("bids.qty")}</th>
                <th style={{ width: 80 }}>{t("bids.unit")}</th>
                <th style={{ width: 110 }}>{t("bids.unitCost")}</th>
                <th style={{ width: 110, textAlign: "right" }}>{t("bids.total")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li) => (
                <tr key={li.id}>
                  <td>
                    <input
                      type="text"
                      className="li-input"
                      placeholder={t("bids.lineItemPlaceholder")}
                      value={li.description}
                      onChange={(e) =>
                        updateLineItem(li.id, "description", e.target.value)
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
                      type="text"
                      className="li-input li-input-sm"
                      value={li.unit}
                      onChange={(e) =>
                        updateLineItem(li.id, "unit", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="li-input li-input-sm"
                      min="0"
                      step="0.01"
                      value={li.unit_cost}
                      onChange={(e) =>
                        updateLineItem(
                          li.id,
                          "unit_cost",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </td>
                  <td className="li-amount">
                    {formatCurrency(li.total)}
                  </td>
                  <td>
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        className="li-remove-btn"
                        onClick={() => removeLineItem(li.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="bid-totals">
          <div className="bid-totals-box">
            <div className="bid-totals-row">
              <span className="totals-label">{t("bids.lineItemsTotal")}</span>
              <span className="totals-value">
                {formatCurrency(lineItemsTotal)}
              </span>
            </div>
            <div className="bid-totals-row">
              <span className="totals-label">{t("bids.estimatedCost")}</span>
              <span className="totals-value">
                {formatCurrency(parsedEstimatedCost)}
              </span>
            </div>
            <div className="bid-totals-row">
              <span className="totals-label">{t("bids.bidAmount")}</span>
              <span className="totals-value">
                {formatCurrency(parsedBidAmount)}
              </span>
            </div>
            <div className="bid-totals-row total-final">
              <span className="totals-label">{t("bids.margin")}</span>
              <span
                className="totals-value"
                style={{
                  color:
                    marginPct >= 15
                      ? "var(--color-green)"
                      : marginPct >= 5
                        ? "var(--color-amber)"
                        : marginPct > 0
                          ? "var(--color-red)"
                          : "var(--text)",
                }}
              >
                {marginPct > 0 ? `${marginPct.toFixed(1)}%` : "--"}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bid-form-actions">
          <button
            type="button"
            className="ui-btn ui-btn-md ui-btn-secondary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <span className="ui-btn-spinner" />
            ) : null}
            {t("bids.saveAsDraft")}
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-md ui-btn-primary"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <span className="ui-btn-spinner" />
            ) : null}
            {t("bids.submitBid")}
          </button>
          <Link
            href="/crm/bids"
            className="ui-btn ui-btn-md ui-btn-ghost"
          >
            {t("bids.cancel")}
          </Link>
        </div>
      </div>
    </div>
  );
}
