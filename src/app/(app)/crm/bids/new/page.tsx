"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [bidNumber, setBidNumber] = useState("");
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [bidDate, setBidDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
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
      setError("Bid number is required.");
      return;
    }
    if (!projectName.trim()) {
      setError("Project name is required.");
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
        setError(data.error || "Failed to create bid.");
        setSaving(false);
        return;
      }

      router.push("/crm/bids");
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!bidNumber.trim()) {
      setError("Bid number is required.");
      return;
    }
    if (!projectName.trim()) {
      setError("Project name is required.");
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
        setError(data.error || "Failed to submit bid.");
        setSaving(false);
        return;
      }

      router.push("/crm/bids");
    } catch {
      setError("Network error. Please try again.");
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
            <h2>New Bid</h2>
            <p className="crm-header-sub">
              Prepare a new bid proposal.
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
            <label className="ui-label">Bid Number *</label>
            <input
              type="text"
              className="ui-input"
              placeholder="e.g., BID-2026-001"
              value={bidNumber}
              onChange={(e) => setBidNumber(e.target.value)}
            />
          </div>

          <div className="ui-field">
            <label className="ui-label">Project Name *</label>
            <input
              type="text"
              className="ui-input"
              placeholder="Project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>

          <div className="ui-field">
            <label className="ui-label">Client Name</label>
            <input
              type="text"
              className="ui-input"
              placeholder="Client or owner name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          <div className="ui-field">
            <label className="ui-label">Bid Date</label>
            <input
              type="date"
              className="ui-input"
              value={bidDate}
              onChange={(e) => setBidDate(e.target.value)}
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

          <div className="ui-field">
            <label className="ui-label">Estimated Cost</label>
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
            <label className="ui-label">Bid Amount</label>
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
            <label className="ui-label">Scope Description</label>
            <textarea
              className="ui-textarea"
              placeholder="Describe the scope of work for this bid..."
              value={scopeDescription}
              onChange={(e) => setScopeDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        {/* Line Items */}
        <div className="bid-line-items">
          <div className="bid-line-items-header">
            <span>Line Items</span>
            <button
              type="button"
              className="ui-btn ui-btn-sm ui-btn-secondary"
              onClick={addLineItem}
            >
              <Plus size={14} />
              Add Item
            </button>
          </div>

          <table className="bid-line-items-table">
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>Description</th>
                <th style={{ width: 80 }}>Qty</th>
                <th style={{ width: 80 }}>Unit</th>
                <th style={{ width: 110 }}>Unit Cost</th>
                <th style={{ width: 110, textAlign: "right" }}>Total</th>
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
                      placeholder="Line item description"
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
              <span className="totals-label">Line Items Total</span>
              <span className="totals-value">
                {formatCurrency(lineItemsTotal)}
              </span>
            </div>
            <div className="bid-totals-row">
              <span className="totals-label">Estimated Cost</span>
              <span className="totals-value">
                {formatCurrency(parsedEstimatedCost)}
              </span>
            </div>
            <div className="bid-totals-row">
              <span className="totals-label">Bid Amount</span>
              <span className="totals-value">
                {formatCurrency(parsedBidAmount)}
              </span>
            </div>
            <div className="bid-totals-row total-final">
              <span className="totals-label">Margin</span>
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
            Save as Draft
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
            Submit Bid
          </button>
          <Link
            href="/crm/bids"
            className="ui-btn ui-btn-md ui-btn-ghost"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
