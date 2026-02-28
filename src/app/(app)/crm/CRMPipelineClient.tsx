"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  Target,
  DollarSign,
  TrendingUp,
  BarChart3,
  User,
  Calendar,
  Plus,
  X,
  Edit3,
  Trash2,
  Upload,
} from "lucide-react";
import { formatCurrency, formatCompactCurrency, formatPercent, formatDateShort, formatDateSafe } from "@/lib/utils/format";
import type { OpportunityStage } from "@/lib/queries/crm";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Opportunity {
  id: string;
  name: string;
  client_name: string | null;
  stage: OpportunityStage;
  estimated_value: number | null;
  probability_pct: number | null;
  expected_close_date: string | null;
  source: string | null;
  notes: string | null;
  assigned_to: string | null;
  assigned_user?: { full_name: string | null; email: string | null } | null;
}

interface PipelineSummary {
  totalPipelineValue: number;
  weightedValue: number;
  winRate: number;
  avgDealSize: number;
  stageBreakdown: {
    stage: string;
    count: number;
    value: number;
  }[];
}

interface CRMPipelineClientProps {
  opportunities: Opportunity[];
  summary: PipelineSummary;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STAGE_COLORS: Record<OpportunityStage, string> = {
  lead: "badge-blue",
  qualification: "badge-amber",
  proposal: "badge-blue",
  negotiation: "badge-amber",
  won: "badge-green",
  lost: "badge-red",
};

const STAGES: OpportunityStage[] = [
  "lead",
  "qualification",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

const IMPORT_SAMPLE: Record<string, string>[] = [
  { name: "Office Tower Renovation", client_name: "Skyline Properties", stage: "proposal", estimated_value: "2500000", probability_pct: "60", expected_close_date: "2026-03-15", source: "referral" },
  { name: "Warehouse Expansion", client_name: "LogiFlow Inc", stage: "lead", estimated_value: "800000", probability_pct: "25", expected_close_date: "2026-05-01", source: "website" },
  { name: "School Gymnasium Rebuild", client_name: "Lincoln County Schools", stage: "negotiation", estimated_value: "4200000", probability_pct: "80", expected_close_date: "2026-02-28", source: "public_bid" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CRMPipelineClient({
  opportunities,
  summary,
}: CRMPipelineClientProps) {
  const router = useRouter();
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const STAGE_LABELS: Record<OpportunityStage, string> = {
    lead: t("stageLead"),
    qualification: t("stageQualification"),
    proposal: t("stageProposal"),
    negotiation: t("stageNegotiation"),
    won: t("stageWon"),
    lost: t("stageLost"),
  };

  const SOURCES = [
    { value: "referral", label: t("sourceReferral") },
    { value: "website", label: t("sourceWebsite") },
    { value: "cold_call", label: t("sourceColdCall") },
    { value: "trade_show", label: t("sourceTradeShow") },
    { value: "existing_client", label: t("sourceExistingClient") },
    { value: "other", label: t("sourceOther") },
  ];

  const IMPORT_COLUMNS: ImportColumn[] = [
    { key: "name", label: t("opportunityName"), required: true },
    { key: "client_name", label: t("clientName"), required: false },
    { key: "stage", label: t("stage"), required: false },
    { key: "estimated_value", label: t("estimatedValueDollar"), required: false, type: "number" },
    { key: "probability_pct", label: t("probabilityPercent"), required: false, type: "number" },
    { key: "expected_close_date", label: t("expectedCloseDate"), required: false, type: "date" },
    { key: "source", label: t("source"), required: false },
  ];

  const [showImport, setShowImport] = useState(false);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createFormData, setCreateFormData] = useState({
    name: "",
    client_name: "",
    stage: "lead" as OpportunityStage,
    estimated_value: "",
    probability_pct: "50",
    expected_close_date: "",
    source: "",
    notes: "",
  });

  // Detail modal
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);

  // Edit modal
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");
  const [editFormData, setEditFormData] = useState({
    name: "",
    client_name: "",
    stage: "lead" as OpportunityStage,
    estimated_value: "",
    probability_pct: "",
    expected_close_date: "",
    source: "",
    notes: "",
  });

  // Delete modal
  const [deletingOpp, setDeletingOpp] = useState<Opportunity | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Group opportunities by stage
  const groupedByStage = new Map<OpportunityStage, Opportunity[]>();
  for (const stage of STAGES) {
    groupedByStage.set(
      stage,
      opportunities.filter((o) => o.stage === stage)
    );
  }

  const isEmpty = opportunities.length === 0;

  // ---------------------------------------------------------------------------
  // Create handlers
  // ---------------------------------------------------------------------------

  function resetCreateForm() {
    setCreateFormData({
      name: "",
      client_name: "",
      stage: "lead",
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
          name: createFormData.name,
          client_name: createFormData.client_name || undefined,
          stage: createFormData.stage,
          estimated_value: createFormData.estimated_value
            ? Number(createFormData.estimated_value)
            : undefined,
          probability_pct: createFormData.probability_pct
            ? Number(createFormData.probability_pct)
            : undefined,
          expected_close_date: createFormData.expected_close_date || undefined,
          source: createFormData.source || undefined,
          notes: createFormData.notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToCreateOpportunity"));
      }

      resetCreateForm();
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : t("failedToCreateOpportunity")
      );
    } finally {
      setCreating(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Detail handlers
  // ---------------------------------------------------------------------------

  function openDetail(opp: Opportunity) {
    setSelectedOpp(opp);
  }

  function closeDetail() {
    setSelectedOpp(null);
  }

  // ---------------------------------------------------------------------------
  // Edit handlers
  // ---------------------------------------------------------------------------

  function openEdit(opp: Opportunity) {
    setEditingOpp(opp);
    setEditFormData({
      name: opp.name,
      client_name: opp.client_name || "",
      stage: opp.stage,
      estimated_value: opp.estimated_value?.toString() || "",
      probability_pct: opp.probability_pct?.toString() || "",
      expected_close_date: opp.expected_close_date || "",
      source: opp.source || "",
      notes: opp.notes || "",
    });
    setEditError("");
    setSelectedOpp(null);
  }

  function closeEdit() {
    setEditingOpp(null);
    setEditError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingOpp) return;

    setEditing(true);
    setEditError("");

    try {
      const res = await fetch(`/api/crm/opportunities/${editingOpp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editFormData.name,
          client_name: editFormData.client_name || null,
          stage: editFormData.stage,
          estimated_value: editFormData.estimated_value
            ? Number(editFormData.estimated_value)
            : null,
          probability_pct: editFormData.probability_pct
            ? Number(editFormData.probability_pct)
            : null,
          expected_close_date: editFormData.expected_close_date || null,
          source: editFormData.source || null,
          notes: editFormData.notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToUpdateOpportunity"));
      }

      closeEdit();
      router.refresh();
    } catch (err: unknown) {
      setEditError(
        err instanceof Error ? err.message : t("failedToUpdateOpportunity")
      );
    } finally {
      setEditing(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Delete handlers
  // ---------------------------------------------------------------------------

  function openDelete(opp: Opportunity) {
    setDeletingOpp(opp);
    setDeleteError("");
    setSelectedOpp(null);
  }

  function closeDelete() {
    setDeletingOpp(null);
    setDeleteError("");
  }

  async function handleDelete() {
    if (!deletingOpp) return;

    setDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(`/api/crm/opportunities/${deletingOpp.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToDeleteOpportunity"));
      }

      closeDelete();
      router.refresh();
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : t("failedToDeleteOpportunity")
      );
    } finally {
      setDeleting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Import handler
  // ---------------------------------------------------------------------------

  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "opportunities", rows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("importFailed"));
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div>
      {/* Header with Create Button */}
      <div className="crm-header">
        <div>
          <h2>{t("salesPipeline")}</h2>
          <p className="crm-header-sub">
            {t("trackOpportunitiesFromLeadToClose")}
          </p>
        </div>
        <div className="crm-header-actions">
          <Link href="/crm/bids" className="ui-btn ui-btn-md ui-btn-secondary">
            {t("bidManagement")}
          </Link>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            {t("importCsv")}
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            {t("newOpportunity")}
          </button>
        </div>
      </div>

      {/* Pipeline Summary */}
      <div className="pipeline-summary">
        <SummaryCard
          label={t("totalPipeline")}
          value={formatCompactCurrency(summary.totalPipelineValue)}
          icon={<DollarSign size={20} />}
        />
        <SummaryCard
          label={t("weightedValue")}
          value={formatCompactCurrency(summary.weightedValue)}
          icon={<TrendingUp size={20} />}
        />
        <SummaryCard
          label={t("winRate")}
          value={formatPercent(summary.winRate)}
          icon={<Target size={20} />}
        />
        <SummaryCard
          label={t("avgDealSize")}
          value={formatCompactCurrency(summary.avgDealSize)}
          icon={<BarChart3 size={20} />}
        />
      </div>

      {/* Empty State */}
      {isEmpty ? (
        <div className="card" style={{ textAlign: "center", padding: "64px 24px" }}>
          <div style={{ marginBottom: 16, color: "var(--border)" }}>
            <Target size={48} />
          </div>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1.15rem",
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            {t("noOpportunitiesYet")}
          </div>
          <p
            style={{
              color: "var(--muted)",
              fontSize: "0.85rem",
              maxWidth: 400,
              margin: "0 auto 20px",
              lineHeight: 1.5,
            }}
          >
            {t("startBuildingYourSalesPipeline")}
          </p>
        </div>
      ) : (
        /* Kanban Board */
        <div className="pipeline-board">
          {STAGES.map((stage) => {
            const stageOpps = groupedByStage.get(stage) || [];
            const stageInfo = summary.stageBreakdown.find(
              (s) => s.stage === stage
            );
            return (
              <div key={stage} className="pipeline-column">
                <div className="pipeline-column-header">
                  <div className="pipeline-column-title">
                    <span className={`badge ${STAGE_COLORS[stage]}`}>
                      {stageOpps.length}
                    </span>
                    <span>{STAGE_LABELS[stage]}</span>
                  </div>
                  <div className="pipeline-column-value">
                    {formatCompactCurrency(stageInfo?.value || 0)}
                  </div>
                </div>
                <div className="pipeline-column-cards">
                  {stageOpps.length === 0 ? (
                    <div className="pipeline-empty">{t("noItems")}</div>
                  ) : (
                    stageOpps.map((opp) => (
                      <PipelineCard
                        key={opp.id}
                        opportunity={opp}
                        onClick={() => openDetail(opp)}
                        dateLocale={dateLocale}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div
          className="ticket-modal-overlay"
          onClick={() => {
            setShowCreate(false);
            resetCreateForm();
          }}
        >
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{t("newOpportunity")}</h3>
              <button
                className="ticket-modal-close"
                onClick={() => {
                  setShowCreate(false);
                  resetCreateForm();
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
                <label className="ticket-form-label">{t("nameRequired")}</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={createFormData.name}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, name: e.target.value })
                  }
                  placeholder={t("opportunityNamePlaceholder")}
                  required
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("clientName")}</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={createFormData.client_name}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, client_name: e.target.value })
                  }
                  placeholder={t("clientOrCompanyNamePlaceholder")}
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("notes")}</label>
                <textarea
                  className="ticket-form-textarea"
                  value={createFormData.notes}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, notes: e.target.value })
                  }
                  placeholder={t("describeTheOpportunityPlaceholder")}
                  rows={3}
                />
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("stage")}</label>
                  <select
                    className="ticket-form-select"
                    value={createFormData.stage}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        stage: e.target.value as OpportunityStage,
                      })
                    }
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {STAGE_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("source")}</label>
                  <select
                    className="ticket-form-select"
                    value={createFormData.source}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, source: e.target.value })
                    }
                  >
                    <option value="">{t("selectSourcePlaceholder")}</option>
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
                  <label className="ticket-form-label">{t("valueDollar")}</label>
                  <input
                    type="number"
                    className="ticket-form-input"
                    value={createFormData.estimated_value}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        estimated_value: e.target.value,
                      })
                    }
                    placeholder={t("estimatedDealValuePlaceholder")}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("probabilityPercentLabel")}</label>
                  <input
                    type="number"
                    className="ticket-form-input"
                    value={createFormData.probability_pct}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
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
                <label className="ticket-form-label">{t("expectedCloseDate")}</label>
                <input
                  type="date"
                  className="ticket-form-input"
                  value={createFormData.expected_close_date}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      expected_close_date: e.target.value,
                    })
                  }
                />
              </div>

              <div className="ticket-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowCreate(false);
                    resetCreateForm();
                  }}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating || !createFormData.name.trim()}
                >
                  {creating ? t("creating") : t("createOpportunity")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedOpp && (
        <div
          className="ticket-modal-overlay"
          onClick={closeDetail}
        >
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{selectedOpp.name}</h3>
              <button className="ticket-modal-close" onClick={closeDetail}>
                <X size={18} />
              </button>
            </div>

            <div className="ticket-detail-body">
              <div className="ticket-detail-row">
                <span className="ticket-detail-label">{t("stage")}</span>
                <span className={`badge ${STAGE_COLORS[selectedOpp.stage]}`}>
                  {STAGE_LABELS[selectedOpp.stage]}
                </span>
              </div>

              {selectedOpp.client_name && (
                <div className="ticket-detail-row">
                  <span className="ticket-detail-label">{t("client")}</span>
                  <span>{selectedOpp.client_name}</span>
                </div>
              )}

              {selectedOpp.notes && (
                <div className="ticket-detail-row">
                  <span className="ticket-detail-label">{t("notes")}</span>
                  <span>{selectedOpp.notes}</span>
                </div>
              )}

              {selectedOpp.estimated_value != null && (
                <div className="ticket-detail-row">
                  <span className="ticket-detail-label">{t("estimatedValue")}</span>
                  <span>{formatCurrency(selectedOpp.estimated_value)}</span>
                </div>
              )}

              {selectedOpp.probability_pct != null && (
                <div className="ticket-detail-row">
                  <span className="ticket-detail-label">{t("probability")}</span>
                  <span>{selectedOpp.probability_pct}%</span>
                </div>
              )}

              {selectedOpp.expected_close_date && (
                <div className="ticket-detail-row">
                  <span className="ticket-detail-label">{t("expectedCloseDate")}</span>
                  <span>
                    {formatDateSafe(selectedOpp.expected_close_date)}
                  </span>
                </div>
              )}

              {selectedOpp.source && (
                <div className="ticket-detail-row">
                  <span className="ticket-detail-label">{t("source")}</span>
                  <span>
                    {SOURCES.find((s) => s.value === selectedOpp.source)?.label ||
                      selectedOpp.source}
                  </span>
                </div>
              )}

              {selectedOpp.assigned_user && (
                <div className="ticket-detail-row">
                  <span className="ticket-detail-label">{t("assignedTo")}</span>
                  <span>
                    {selectedOpp.assigned_user.full_name ||
                      selectedOpp.assigned_user.email}
                  </span>
                </div>
              )}

            </div>

            <div className="ticket-form-actions">
              <button
                className="btn-danger-outline"
                onClick={() => openDelete(selectedOpp)}
              >
                <Trash2 size={16} />
                {t("delete")}
              </button>
              <button
                className="btn-primary"
                onClick={() => openEdit(selectedOpp)}
              >
                <Edit3 size={16} />
                {t("edit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingOpp && (
        <div
          className="ticket-modal-overlay"
          onClick={closeEdit}
        >
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{t("editOpportunity")}</h3>
              <button className="ticket-modal-close" onClick={closeEdit}>
                <X size={18} />
              </button>
            </div>

            {editError && (
              <div className="ticket-form-error">{editError}</div>
            )}

            <form onSubmit={handleEdit} className="ticket-form">
              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("nameRequired")}</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  placeholder={t("opportunityNamePlaceholder")}
                  required
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("clientName")}</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={editFormData.client_name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, client_name: e.target.value })
                  }
                  placeholder={t("clientOrCompanyNamePlaceholder")}
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("notes")}</label>
                <textarea
                  className="ticket-form-textarea"
                  value={editFormData.notes}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, notes: e.target.value })
                  }
                  placeholder={t("additionalNotesPlaceholder")}
                  rows={3}
                />
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("stage")}</label>
                  <select
                    className="ticket-form-select"
                    value={editFormData.stage}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        stage: e.target.value as OpportunityStage,
                      })
                    }
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {STAGE_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("source")}</label>
                  <select
                    className="ticket-form-select"
                    value={editFormData.source}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, source: e.target.value })
                    }
                  >
                    <option value="">{t("selectSourcePlaceholder")}</option>
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
                  <label className="ticket-form-label">{t("valueDollar")}</label>
                  <input
                    type="number"
                    className="ticket-form-input"
                    value={editFormData.estimated_value}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        estimated_value: e.target.value,
                      })
                    }
                    placeholder={t("estimatedDealValuePlaceholder")}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("probabilityPercentLabel")}</label>
                  <input
                    type="number"
                    className="ticket-form-input"
                    value={editFormData.probability_pct}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
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
                <label className="ticket-form-label">{t("expectedCloseDate")}</label>
                <input
                  type="date"
                  className="ticket-form-input"
                  value={editFormData.expected_close_date}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      expected_close_date: e.target.value,
                    })
                  }
                />
              </div>

              <div className="ticket-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeEdit}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={editing || !editFormData.name.trim()}
                >
                  {editing ? t("saving") : t("saveChanges")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImport && (
        <ImportModal
          entityName={t("opportunities")}
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => { setShowImport(false); router.refresh(); }}
        />
      )}

      {/* Delete Modal */}
      {deletingOpp && (
        <div
          className="ticket-modal-overlay"
          onClick={closeDelete}
        >
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{t("deleteOpportunity")}</h3>
              <button className="ticket-modal-close" onClick={closeDelete}>
                <X size={18} />
              </button>
            </div>

            <div className="ticket-delete-confirm">
              <p>
                {t("confirmDeleteOpportunity", { name: deletingOpp.name })}
              </p>
              <p>{t("thisActionCannotBeUndone")}</p>
            </div>

            {deleteError && (
              <div className="ticket-form-error">{deleteError}</div>
            )}

            <div className="ticket-delete-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={closeDelete}
                disabled={deleting}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                className="btn-danger-outline"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? t("deleting") : t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="pipeline-summary-card">
      <div className="pipeline-summary-icon">{icon}</div>
      <div>
        <div className="pipeline-summary-label">{label}</div>
        <div className="pipeline-summary-value">{value}</div>
      </div>
    </div>
  );
}

function PipelineCard({
  opportunity,
  onClick,
  dateLocale,
}: {
  opportunity: Opportunity;
  onClick: () => void;
  dateLocale: string;
}) {
  const assignedName =
    opportunity.assigned_user?.full_name ||
    opportunity.assigned_user?.email ||
    null;

  return (
    <div className="pipeline-card" onClick={onClick} style={{ cursor: "pointer" }}>
      <div className="pipeline-card-name">{opportunity.name}</div>
      {opportunity.client_name && (
        <div className="pipeline-card-client">{opportunity.client_name}</div>
      )}
      <div className="pipeline-card-details">
        {opportunity.estimated_value != null && (
          <div className="pipeline-card-value">
            <DollarSign size={13} />
            {formatCurrency(opportunity.estimated_value)}
          </div>
        )}
        {opportunity.probability_pct != null && (
          <div className="pipeline-card-prob">
            {opportunity.probability_pct}%
          </div>
        )}
      </div>
      <div className="pipeline-card-footer">
        {assignedName && (
          <div className="pipeline-card-assigned">
            <User size={12} />
            <span>{assignedName}</span>
          </div>
        )}
        {opportunity.expected_close_date && (
          <div className="pipeline-card-date">
            <Calendar size={12} />
            <span>
              {formatDateShort(opportunity.expected_close_date)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
