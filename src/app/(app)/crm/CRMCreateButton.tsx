"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STAGES = [
  { value: "prospecting", label: "Prospecting" },
  { value: "qualification", label: "Qualification" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
];

const SOURCES = [
  { value: "referral", label: "Referral" },
  { value: "website", label: "Website" },
  { value: "cold_call", label: "Cold Call" },
  { value: "trade_show", label: "Trade Show" },
  { value: "existing_client", label: "Existing Client" },
  { value: "other", label: "Other" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CRMCreateButton() {
  const router = useRouter();

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    client_name: "",
    description: "",
    stage: "prospecting",
    estimated_value: "",
    probability_pct: "50",
    expected_close_date: "",
    source: "",
    notes: "",
  });

  function resetForm() {
    setFormData({
      name: "",
      client_name: "",
      description: "",
      stage: "prospecting",
      estimated_value: "",
      probability_pct: "50",
      expected_close_date: "",
      source: "",
      notes: "",
    });
    setCreateError("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          client_name: formData.client_name || undefined,
          description: formData.description || undefined,
          stage: formData.stage,
          estimated_value: formData.estimated_value
            ? Number(formData.estimated_value)
            : undefined,
          probability_pct: formData.probability_pct
            ? Number(formData.probability_pct)
            : undefined,
          expected_close_date: formData.expected_close_date || undefined,
          source: formData.source || undefined,
          notes: formData.notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create opportunity");
      }

      resetForm();
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create opportunity"
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setShowCreate(true)}>
        <Plus size={16} />
        New Opportunity
      </button>

      {showCreate && (
        <div
          className="ticket-modal-overlay"
          onClick={() => {
            setShowCreate(false);
            resetForm();
          }}
        >
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>New Opportunity</h3>
              <button
                className="ticket-modal-close"
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="ticket-form-error">{createError}</div>
            )}

            <form onSubmit={handleCreate} className="ticket-form">
              <div className="ticket-form-group">
                <label className="ticket-form-label">Name *</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Opportunity name"
                  required
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Client Name</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={formData.client_name}
                  onChange={(e) =>
                    setFormData({ ...formData, client_name: e.target.value })
                  }
                  placeholder="Client or company name"
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Description</label>
                <textarea
                  className="ticket-form-textarea"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe the opportunity..."
                  rows={3}
                />
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Stage</label>
                  <select
                    className="ticket-form-select"
                    value={formData.stage}
                    onChange={(e) =>
                      setFormData({ ...formData, stage: e.target.value })
                    }
                  >
                    {STAGES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Source</label>
                  <select
                    className="ticket-form-select"
                    value={formData.source}
                    onChange={(e) =>
                      setFormData({ ...formData, source: e.target.value })
                    }
                  >
                    <option value="">Select source...</option>
                    {SOURCES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">
                    Value ($)
                  </label>
                  <input
                    type="number"
                    className="ticket-form-input"
                    value={formData.estimated_value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estimated_value: e.target.value,
                      })
                    }
                    placeholder="Estimated deal value"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">
                    Probability (%)
                  </label>
                  <input
                    type="number"
                    className="ticket-form-input"
                    value={formData.probability_pct}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        probability_pct: e.target.value,
                      })
                    }
                    placeholder="0-100"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">
                  Expected Close Date
                </label>
                <input
                  type="date"
                  className="ticket-form-input"
                  value={formData.expected_close_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expected_close_date: e.target.value,
                    })
                  }
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Notes</label>
                <textarea
                  className="ticket-form-textarea"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>

              <div className="ticket-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowCreate(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating || !formData.name.trim()}
                >
                  {creating ? "Creating..." : "Create Opportunity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
