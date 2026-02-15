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
  { key: "insurance_gl", label: "General Liability Insurance", category: "Insurance", weight: 8 },
  { key: "insurance_wc", label: "Workers Compensation Insurance", category: "Insurance", weight: 8 },
  { key: "insurance_auto", label: "Auto Liability Insurance", category: "Insurance", weight: 6 },
  { key: "insurance_umbrella", label: "Umbrella/Excess Liability", category: "Insurance", weight: 6 },
  { key: "bond_bid", label: "Bid Bond Capability", category: "Bonding", weight: 7 },
  { key: "bond_performance", label: "Performance Bond Capability", category: "Bonding", weight: 8 },
  { key: "bond_payment", label: "Payment Bond Capability", category: "Bonding", weight: 7 },
  { key: "safety_program", label: "Written Safety Program", category: "Safety", weight: 8 },
  { key: "safety_osha", label: "OSHA 10/30 Certified Staff", category: "Safety", weight: 7 },
  { key: "safety_emr", label: "EMR Below 1.0", category: "Safety", weight: 7 },
  { key: "financial_statements", label: "Financial Statements Available", category: "Financial", weight: 7 },
  { key: "references", label: "3+ Project References", category: "Financial", weight: 7 },
  { key: "license_valid", label: "Valid Contractor License", category: "Compliance", weight: 8 },
  { key: "diversity_cert", label: "Diversity Certification (MBE/WBE/DBE)", category: "Compliance", weight: 6 },
];

const TOTAL_WEIGHT = CHECKLIST_ITEMS.reduce((sum, i) => sum + i.weight, 0);

/**
 * Parse the notes field which may contain JSON with checklist state,
 * or may be a plain text string from before the checklist was saved.
 */
function parseNotesField(raw: string | null): { checklist: string[]; notes: string } {
  if (!raw) return { checklist: [], notes: "" };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.checklist)) {
      return { checklist: parsed.checklist, notes: parsed.notes || "" };
    }
  } catch {
    // Not JSON — treat as plain text notes
  }
  return { checklist: [], notes: raw };
}

function encodeNotesField(checklist: string[], notes: string): string {
  return JSON.stringify({ checklist, notes });
}

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
  const parsed = parseNotesField(data.prequalification_notes);

  const [emrRate, setEmrRate] = useState<string>(data.emr_rate?.toString() ?? "");
  const [bondingCapacity, setBondingCapacity] = useState<string>(data.bonding_capacity?.toString() ?? "");
  const [score, setScore] = useState<number | null>(data.prequalification_score);
  const [notes, setNotes] = useState(parsed.notes);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const key of parsed.checklist) {
      initial[key] = true;
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);

  function toggleItem(key: string) {
    if (readOnly) return;
    const updated = { ...checkedItems, [key]: !checkedItems[key] };
    setCheckedItems(updated);
    // Auto-recalculate score on toggle
    const checkedWeight = CHECKLIST_ITEMS.filter((i) => updated[i.key]).reduce((sum, i) => sum + i.weight, 0);
    setScore(Math.round((checkedWeight / TOTAL_WEIGHT) * 100));
  }

  function calculateScore() {
    const checkedWeight = CHECKLIST_ITEMS.filter((i) => checkedItems[i.key]).reduce((sum, i) => sum + i.weight, 0);
    const newScore = Math.round((checkedWeight / TOTAL_WEIGHT) * 100);
    setScore(newScore);
    return newScore;
  }

  async function handleSave() {
    const newScore = calculateScore();
    const checkedKeys = Object.entries(checkedItems)
      .filter(([, v]) => v)
      .map(([k]) => k);
    const encodedNotes = encodeNotesField(checkedKeys, notes);

    const saveData: PrequalificationData = {
      emr_rate: emrRate ? parseFloat(emrRate) : null,
      bonding_capacity: bondingCapacity ? parseFloat(bondingCapacity) : null,
      prequalification_score: newScore,
      prequalification_notes: encodedNotes,
    };

    setSaving(true);
    try {
      const res = await fetch(`/api/people/contacts/${contactId}`, {
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
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;

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
          flexShrink: 0,
        }}>
          {getScoreIcon(score)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>
            Prequalification Score: {score !== null ? `${score}/100` : "--"}
          </div>
          <div style={{ fontSize: "0.82rem", color: getScoreColor(score), fontWeight: 500 }}>
            {getScoreLabel(score)}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "2px" }}>
            {checkedCount} of {CHECKLIST_ITEMS.length} items verified
          </div>
        </div>
      </div>

      {/* EMR & Bonding - aligned grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "16px",
        marginBottom: "20px",
        padding: "16px",
        borderRadius: "10px",
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}>
        <div>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "6px", color: "var(--foreground)" }}>
            EMR Rate
          </label>
          <input
            type="number"
            className="ticket-form-input"
            placeholder="e.g. 0.85"
            step="0.01"
            min="0"
            value={emrRate}
            onChange={(e) => setEmrRate(e.target.value)}
            disabled={readOnly}
            style={{ width: "100%" }}
          />
          <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "4px" }}>
            Experience Modification Rate. Industry avg: 1.0
          </div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "6px", color: "var(--foreground)" }}>
            Bonding Capacity
          </label>
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted)",
              fontSize: "0.85rem",
              pointerEvents: "none",
            }}>$</span>
            <input
              type="number"
              className="ticket-form-input"
              placeholder="e.g. 5,000,000"
              min="0"
              value={bondingCapacity}
              onChange={(e) => setBondingCapacity(e.target.value)}
              disabled={readOnly}
              style={{ width: "100%", paddingLeft: "22px" }}
            />
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "4px" }}>
            Max single project bond amount
          </div>
        </div>
      </div>

      {/* Checklist by Category */}
      {categories.map((cat) => {
        const catItems = CHECKLIST_ITEMS.filter((i) => i.category === cat);
        const catChecked = catItems.filter((i) => checkedItems[i.key]).length;
        return (
          <div key={cat} style={{ marginBottom: "16px" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}>
              <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--foreground)" }}>
                {cat}
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                {catChecked}/{catItems.length}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {catItems.map((item) => (
                <label
                  key={item.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: `1px solid ${checkedItems[item.key] ? "rgba(34, 197, 94, 0.3)" : "var(--border)"}`,
                    background: checkedItems[item.key] ? "rgba(34, 197, 94, 0.05)" : "transparent",
                    cursor: readOnly ? "default" : "pointer",
                    fontSize: "0.85rem",
                    transition: "all 0.15s ease",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!checkedItems[item.key]}
                    onChange={() => toggleItem(item.key)}
                    disabled={readOnly}
                    style={{ accentColor: "var(--color-green)" }}
                  />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {checkedItems[item.key] && (
                    <CheckCircle2 size={14} style={{ color: "var(--color-green)", flexShrink: 0 }} />
                  )}
                </label>
              ))}
            </div>
          </div>
        );
      })}

      {/* Notes */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "6px", color: "var(--foreground)" }}>
          Notes
        </label>
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
