"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STAGE_VALUES = [
  "prospecting",
  "qualification",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
] as const;

const SOURCE_VALUES = [
  "referral",
  "website",
  "cold_call",
  "trade_show",
  "existing_client",
  "other",
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CRMCreateButton() {
  const router = useRouter();
  const t = useTranslations("crm");

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
        throw new Error(data.error || t("opportunity.failedCreate"));
      }

      resetForm();
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : t("opportunity.failedCreate")
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setShowCreate(true)}>
        <Plus size={16} />
        {t("opportunity.new")}
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
              <h3>{t("opportunity.new")}</h3>
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
                <label className="ticket-form-label">{t("opportunity.nameRequired")}</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={t("opportunity.namePlaceholder")}
                  required
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("opportunity.clientName")}</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={formData.client_name}
                  onChange={(e) =>
                    setFormData({ ...formData, client_name: e.target.value })
                  }
                  placeholder={t("opportunity.clientNamePlaceholder")}
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("opportunity.description")}</label>
                <textarea
                  className="ticket-form-textarea"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder={t("opportunity.descriptionPlaceholder")}
                  rows={3}
                />
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("opportunity.stage")}</label>
                  <select
                    className="ticket-form-select"
                    value={formData.stage}
                    onChange={(e) =>
                      setFormData({ ...formData, stage: e.target.value })
                    }
                  >
                    {STAGE_VALUES.map((val) => (
                      <option key={val} value={val}>
                        {t(`opportunity.stages.${val}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("opportunity.source")}</label>
                  <select
                    className="ticket-form-select"
                    value={formData.source}
                    onChange={(e) =>
                      setFormData({ ...formData, source: e.target.value })
                    }
                  >
                    <option value="">{t("opportunity.selectSource")}</option>
                    {SOURCE_VALUES.map((val) => (
                      <option key={val} value={val}>
                        {t(`opportunity.sources.${val}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">
                    {t("opportunity.value")}
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
                    placeholder={t("opportunity.valuePlaceholder")}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">
                    {t("opportunity.probability")}
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
                  {t("opportunity.expectedCloseDate")}
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
                <label className="ticket-form-label">{t("opportunity.notes")}</label>
                <textarea
                  className="ticket-form-textarea"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder={t("opportunity.notesPlaceholder")}
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
                  {t("opportunity.cancel")}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating || !formData.name.trim()}
                >
                  {creating ? t("opportunity.creating") : t("opportunity.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
