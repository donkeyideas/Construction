"use client";

import { useState } from "react";
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Save,
  Loader2,
} from "lucide-react";

interface PrequalificationData {
  emr_rate: number | null;
  bonding_capacity: number | null;
  prequalification_score: number | null;
  prequalification_notes: string | null;
}

interface PrequalificationChecklistProps {
  contactId: string;
  data: PrequalificationData;
  onSave?: (data: PrequalificationData) => void;
  readOnly?: boolean;
}

const CHECKLIST_ITEMS = [
  { key: "insurance_gl", label: "General Liability Insurance", category: "Insurance" },
  { key: "insurance_wc", label: "Workers Compensation Insurance", category: "Insurance" },
  { key: "insurance_auto", label: "Auto Liability Insurance", category: "Insurance" },
  { key: "insurance_umbrella", label: "Umbrella/Excess Liability", category: "Insurance" },
  { key: "bond_bid", label: "Bid Bond Capability", category: "Bonding" },
  { key: "bond_performance", label: "Performance Bond Capability", category: "Bonding" },
  { key: "bond_payment", label: "Payment Bond Capability", category: "Bonding" },
  { key: "safety_program", label: "Written Safety Program", category: "Safety" },
  { key: "safety_osha", label: "OSHA 10/30 Certified Staff", category: "Safety" },
  { key: "safety_emr", label: "EMR Below 1.0", category: "Safety" },
  { key: "financial_statements", label: "Financial Statements Available", category: "Financial" },
  { key: "references", label: "3+ Project References", category: "Financial" },
  { key: "license_valid", label: "Valid Contractor License", category: "Compliance" },
  { key: "diversity_cert", label: "Diversity Certification (MBE/WBE/DBE)", category: "Compliance" },
];

function getScoreColor(score: number | null): string {
  if (score === null) return "var(--muted)";
  if (score >= 80) return "var(--color-green)";
  if (score >= 60) return "var(--color-amber)";
  return "var(--color-red)";
}

function getScoreIcon(score: number | null) {
  if (score === null) return <Shield size={20} />;
  if (score >= 80) return <CheckCircle2 size={20} />;
  if (score >= 60) return <AlertTriangle size={20} />;
  return <XCircle size={20} />;
}

function getScoreLabel(score: number | null): string {
  if (score === null) return "Not Evaluated";
  if (score >= 80) return "Approved";
  if (score >= 60) return "Conditional";
  return "Not Qualified";
}

export default function PrequalificationChecklist({
  contactId,
  data,
  onSave,
  readOnly = false,
}: PrequalificationChecklistProps) {
  const [emrRate, setEmrRate] = useState<string>(data.emr_rate?.toString() ?? "");
  const [bondingCapacity, setBondingCapacity] = useState<string>(data.bonding_capacity?.toString() ?? "");
  const [score, setScore] = useState<number | null>(data.prequalification_score);
  const [notes, setNotes] = useState(data.prequalification_notes ?? "");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  function toggleItem(key: string) {
    if (readOnly) return;
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function calculateScore() {
    const checked = Object.values(checkedItems).filter(Boolean).length;
    const total = CHECKLIST_ITEMS.length;
    const newScore = Math.round((checked / total) * 100);
    setScore(newScore);
    return newScore;
  }

  async function handleSave() {
    const newScore = calculateScore();
    const saveData: PrequalificationData = {
      emr_rate: emrRate ? parseFloat(emrRate) : null,
      bonding_capacity: bondingCapacity ? parseFloat(bondingCapacity) : null,
      prequalification_score: newScore,
      prequalification_notes: notes || null,
    };

    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveData),
      });
      if (res.ok && onSave) {
        onSave(saveData);
      }
    } catch { /* ignore */ }
    setSaving(false);
  }

  const categories = [...new Set(CHECKLIST_ITEMS.map((i) => i.category))];

  return (
    <div>
      {/* Score Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "16px",
        borderRadius: "10px",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        marginBottom: "20px",
      }}>
        <div style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `${getScoreColor(score)}15`,
          color: getScoreColor(score),
        }}>
          {getScoreIcon(score)}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>
            Prequalification Score: {score !== null ? `${score}/100` : "--"}
          </div>
          <div style={{ fontSize: "0.82rem", color: getScoreColor(score), fontWeight: 500 }}>
            {getScoreLabel(score)}
          </div>
        </div>
      </div>

      {/* EMR & Bonding */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
        <div>
          <label className="settings-field-label">EMR Rate (Experience Modification Rate)</label>
          <input
            type="number"
            className="settings-field-input"
            placeholder="e.g. 0.85"
            step="0.01"
            min="0"
            value={emrRate}
            onChange={(e) => setEmrRate(e.target.value)}
            disabled={readOnly}
          />
          <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "4px" }}>
            Industry average is 1.0. Lower is better.
          </div>
        </div>
        <div>
          <label className="settings-field-label">Bonding Capacity ($)</label>
          <input
            type="number"
            className="settings-field-input"
            placeholder="e.g. 5000000"
            min="0"
            value={bondingCapacity}
            onChange={(e) => setBondingCapacity(e.target.value)}
            disabled={readOnly}
          />
          <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "4px" }}>
            Maximum single project bond amount.
          </div>
        </div>
      </div>

      {/* Checklist by Category */}
      {categories.map((cat) => (
        <div key={cat} style={{ marginBottom: "16px" }}>
          <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "8px", color: "var(--foreground)" }}>
            {cat}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {CHECKLIST_ITEMS.filter((i) => i.category === cat).map((item) => (
              <label
                key={item.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: checkedItems[item.key] ? "rgba(34, 197, 94, 0.05)" : "transparent",
                  cursor: readOnly ? "default" : "pointer",
                  fontSize: "0.85rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={!!checkedItems[item.key]}
                  onChange={() => toggleItem(item.key)}
                  disabled={readOnly}
                  style={{ accentColor: "var(--color-green)" }}
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>
      ))}

      {/* Notes */}
      <div style={{ marginBottom: "16px" }}>
        <label className="settings-field-label">Notes</label>
        <textarea
          className="ticket-form-textarea"
          placeholder="Additional prequalification notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={readOnly}
          rows={3}
          style={{ width: "100%" }}
        />
      </div>

      {/* Actions */}
      {!readOnly && (
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => calculateScore()}
            className="btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem" }}
          >
            <Shield size={14} /> Calculate Score
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem" }}
          >
            {saving ? <Loader2 size={14} className="spin-icon" /> : <Save size={14} />}
            Save Evaluation
          </button>
        </div>
      )}
    </div>
  );
}
