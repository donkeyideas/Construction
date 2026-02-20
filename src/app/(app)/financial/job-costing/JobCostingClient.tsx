"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  BarChart3,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Plus,
  X,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";
import type { BudgetLineRow, JobCostingSummary } from "@/lib/queries/financial";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

interface Project {
  id: string;
  name: string;
}

interface JobCostingClientProps {
  projects: Project[];
  selectedProjectId: string | null;
  summary: JobCostingSummary | null;
}

/* ------------------------------------------------------------------
   Constants
   ------------------------------------------------------------------ */

const csiDivisions: Record<string, string> = {
  "01": "General Requirements",
  "02": "Existing Conditions",
  "03": "Concrete",
  "04": "Masonry",
  "05": "Metals",
  "06": "Wood, Plastics, Composites",
  "07": "Thermal & Moisture Protection",
  "08": "Openings",
  "09": "Finishes",
  "10": "Specialties",
  "11": "Equipment",
  "12": "Furnishings",
  "13": "Special Construction",
  "14": "Conveying Equipment",
  "21": "Fire Suppression",
  "22": "Plumbing",
  "23": "HVAC",
  "26": "Electrical",
  "27": "Communications",
  "28": "Electronic Safety & Security",
  "31": "Earthwork",
  "32": "Exterior Improvements",
  "33": "Utilities",
};

const csiOptions = Object.entries(csiDivisions).map(([code, name]) => ({
  value: code,
  label: `${code} - ${name}`,
}));

const budgetImportColumns: ImportColumn[] = [
  { key: "csi_code", label: "CSI Code", required: true },
  { key: "description", label: "Description", required: true },
  { key: "budgeted_amount", label: "Budgeted Amount", required: false, type: "number" },
  { key: "committed_amount", label: "Committed Amount", required: false, type: "number" },
  { key: "actual_amount", label: "Actual Amount", required: false, type: "number" },
];

const budgetSampleData = [
  { csi_code: "01", description: "General Requirements", budgeted_amount: "320000", committed_amount: "310000", actual_amount: "285000" },
  { csi_code: "05", description: "Structural Steel", budgeted_amount: "280000", committed_amount: "275000", actual_amount: "0" },
  { csi_code: "26", description: "Electrical", budgeted_amount: "450000", committed_amount: "410000", actual_amount: "180000" },
];

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function formatCurrencyWithLocale(n: number, dateLocale: string): string {
  return new Intl.NumberFormat(dateLocale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

function getDivisionCode(csiCode: string): string {
  return csiCode.replace(/\s/g, "").substring(0, 2);
}

function getDivisionName(divCode: string): string {
  return csiDivisions[divCode] ?? `Division ${divCode}`;
}

function getVarianceClass(budgeted: number, actual: number): string {
  if (budgeted === 0) return "";
  const pctUsed = (actual / budgeted) * 100;
  if (pctUsed > 100) return "variance-negative";
  if (pctUsed >= 90) return "variance-warning";
  return "variance-positive";
}

function getBudgetBarClass(budgeted: number, actual: number): string {
  if (budgeted === 0) return "under";
  const pctUsed = (actual / budgeted) * 100;
  if (pctUsed > 100) return "over";
  if (pctUsed >= 90) return "warning";
  return "under";
}

function groupByDivision(
  lines: BudgetLineRow[]
): Map<string, BudgetLineRow[]> {
  const map = new Map<string, BudgetLineRow[]>();
  for (const line of lines) {
    const div = getDivisionCode(line.csi_code);
    if (!map.has(div)) {
      map.set(div, []);
    }
    map.get(div)!.push(line);
  }
  return map;
}

/* ------------------------------------------------------------------
   Empty Form State
   ------------------------------------------------------------------ */

const emptyForm = {
  csi_code: "01",
  description: "",
  budgeted_amount: "",
  committed_amount: "",
  actual_amount: "",
};

/* ------------------------------------------------------------------
   Main Component
   ------------------------------------------------------------------ */

export default function JobCostingClient({
  projects,
  selectedProjectId,
  summary,
}: JobCostingClientProps) {
  const router = useRouter();
  const t = useTranslations("financial");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  // Import modal state
  const [showImport, setShowImport] = useState(false);

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [selectedLine, setSelectedLine] = useState<BudgetLineRow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [formData, setFormData] = useState(emptyForm);
  const [editData, setEditData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Earned Value Metrics
  const bcws = summary?.totalBudgeted ?? 0;
  const bcwp = summary
    ? summary.lines.reduce((sum, l) => {
        if (l.budgeted_amount === 0) return sum;
        const earnedRatio = Math.min(l.actual_amount / l.budgeted_amount, 1);
        return sum + l.budgeted_amount * earnedRatio;
      }, 0)
    : 0;
  const acwp = summary?.totalActual ?? 0;
  const cpi = acwp > 0 ? bcwp / acwp : 0;
  const spi = bcws > 0 ? bcwp / bcws : 0;

  const divisions = summary ? groupByDivision(summary.lines) : new Map();

  /* ---- Handlers ---- */

  function openCreate() {
    setFormData(emptyForm);
    setError(null);
    setShowCreate(true);
  }

  function openDetail(line: BudgetLineRow) {
    setSelectedLine(line);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setError(null);
  }

  function startEdit() {
    if (!selectedLine) return;
    setEditData({
      csi_code: selectedLine.csi_code,
      description: selectedLine.description,
      budgeted_amount: String(selectedLine.budgeted_amount),
      committed_amount: String(selectedLine.committed_amount),
      actual_amount: String(selectedLine.actual_amount),
    });
    setIsEditing(true);
    setError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProjectId) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/financial/budget-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: selectedProjectId,
          csi_code: formData.csi_code,
          description: formData.description,
          budgeted_amount: parseFloat(formData.budgeted_amount) || 0,
          committed_amount: parseFloat(formData.committed_amount) || 0,
          actual_amount: parseFloat(formData.actual_amount) || 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToCreateBudgetLine"));
      }

      setShowCreate(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToCreate"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLine) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/financial/budget-lines/${selectedLine.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            csi_code: editData.csi_code,
            description: editData.description,
            budgeted_amount: parseFloat(editData.budgeted_amount) || 0,
            committed_amount: parseFloat(editData.committed_amount) || 0,
            actual_amount: parseFloat(editData.actual_amount) || 0,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToUpdateBudgetLine"));
      }

      setSelectedLine(null);
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToUpdate"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!selectedLine) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/financial/budget-lines/${selectedLine.id}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToDeleteBudgetLine"));
      }

      setSelectedLine(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToDelete"));
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ---- Budget Line Form (reused for create & edit) ---- */

  function renderForm(
    data: typeof emptyForm,
    setData: (d: typeof emptyForm) => void,
    onSubmit: (e: React.FormEvent) => void,
    submitLabel: string
  ) {
    return (
      <form className="ticket-form" onSubmit={onSubmit}>
        {error && <div className="ticket-form-error">{error}</div>}

        <div className="ticket-form-row">
          <div className="ticket-form-group">
            <label className="ticket-form-label">{t("csiDivisionRequired")}</label>
            <select
              className="ticket-form-select"
              value={data.csi_code}
              onChange={(e) =>
                setData({ ...data, csi_code: e.target.value })
              }
              required
            >
              {csiOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="ticket-form-group">
            <label className="ticket-form-label">{t("descriptionRequired")}</label>
            <input
              className="ticket-form-input"
              value={data.description}
              onChange={(e) =>
                setData({ ...data, description: e.target.value })
              }
              placeholder={t("descriptionPlaceholder")}
              required
            />
          </div>
        </div>

        <div className="ticket-form-row">
          <div className="ticket-form-group">
            <label className="ticket-form-label">{t("budgetedAmount")}</label>
            <input
              className="ticket-form-input"
              type="number"
              step="0.01"
              min="0"
              value={data.budgeted_amount}
              onChange={(e) =>
                setData({ ...data, budgeted_amount: e.target.value })
              }
              placeholder="0.00"
            />
          </div>
          <div className="ticket-form-group">
            <label className="ticket-form-label">{t("committedAmount")}</label>
            <input
              className="ticket-form-input"
              type="number"
              step="0.01"
              min="0"
              value={data.committed_amount}
              onChange={(e) =>
                setData({ ...data, committed_amount: e.target.value })
              }
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="ticket-form-row">
          <div className="ticket-form-group">
            <label className="ticket-form-label">{t("actualAmount")}</label>
            <input
              className="ticket-form-input"
              type="number"
              step="0.01"
              min="0"
              value={data.actual_amount}
              onChange={(e) =>
                setData({ ...data, actual_amount: e.target.value })
              }
              placeholder="0.00"
            />
          </div>
          <div className="ticket-form-group" />
        </div>

        <div className="ticket-form-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setShowCreate(false);
              setIsEditing(false);
            }}
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? t("saving") : submitLabel}
          </button>
        </div>
      </form>
    );
  }

  /* ---- Render ---- */

  // Sample data loader
  const [loadingSample, setLoadingSample] = useState(false);

  async function loadSampleData() {
    if (!selectedProjectId) return;
    setLoadingSample(true);
    setError(null);

    const sampleLines = [
      { csi_code: "01", description: "General Requirements", budgeted_amount: 320000, committed_amount: 310000, actual_amount: 285000 },
      { csi_code: "03", description: "Concrete Foundation", budgeted_amount: 450000, committed_amount: 425000, actual_amount: 380000 },
      { csi_code: "05", description: "Structural Steel", budgeted_amount: 680000, committed_amount: 675000, actual_amount: 520000 },
      { csi_code: "06", description: "Rough Carpentry", budgeted_amount: 195000, committed_amount: 190000, actual_amount: 165000 },
      { csi_code: "07", description: "Roofing & Waterproofing", budgeted_amount: 275000, committed_amount: 260000, actual_amount: 0 },
      { csi_code: "08", description: "Doors & Windows", budgeted_amount: 180000, committed_amount: 175000, actual_amount: 0 },
      { csi_code: "09", description: "Drywall & Finishes", budgeted_amount: 310000, committed_amount: 0, actual_amount: 0 },
      { csi_code: "22", description: "Plumbing", budgeted_amount: 225000, committed_amount: 220000, actual_amount: 95000 },
      { csi_code: "23", description: "HVAC", budgeted_amount: 385000, committed_amount: 380000, actual_amount: 140000 },
      { csi_code: "26", description: "Electrical", budgeted_amount: 420000, committed_amount: 410000, actual_amount: 175000 },
      { csi_code: "31", description: "Site Earthwork", budgeted_amount: 150000, committed_amount: 148000, actual_amount: 148000 },
      { csi_code: "32", description: "Exterior Improvements", budgeted_amount: 120000, committed_amount: 0, actual_amount: 0 },
    ];

    try {
      for (const line of sampleLines) {
        const res = await fetch("/api/financial/budget-lines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: selectedProjectId,
            ...line,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || t("failedToCreateSampleData"));
        }
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToLoadSampleData"));
    } finally {
      setLoadingSample(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>{t("jobCosting")}</h2>
          <p className="fin-header-sub">
            {t("jobCostingDesc")}
          </p>
        </div>
        {selectedProjectId && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="ui-btn ui-btn-secondary ui-btn-md" onClick={() => setShowImport(true)}>
              <Upload size={16} />
              {t("importCsv")}
            </button>
            <button className="ui-btn ui-btn-primary ui-btn-md" onClick={openCreate}>
              <Plus size={16} />
              {t("addBudgetLine")}
            </button>
          </div>
        )}
      </div>

      {/* Project Selector */}
      <div className="job-cost-header">
        <div className="job-cost-selector">
          <label>{t("projectLabel")}</label>
          {projects.length > 0 ? (
            <select
              className="fin-filter-select"
              defaultValue={selectedProjectId ?? ""}
              onChange={(e) => {
                router.push(
                  `/financial/job-costing?projectId=${e.target.value}`
                );
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              {t("noProjectsFound")}
            </span>
          )}
        </div>
      </div>

      {selectedProjectId && summary && summary.lines.length > 0 ? (
        <>
          {/* Earned Value Metrics */}
          <div className="ev-metrics">
            <div className="ev-metric">
              <div className="ev-metric-label">{t("bcwpLabel")}</div>
              <div className="ev-metric-value">{formatCurrencyWithLocale(bcwp, dateLocale)}</div>
              <div className="ev-metric-desc">
                {t("bcwpDesc")}
              </div>
            </div>
            <div className="ev-metric">
              <div className="ev-metric-label">{t("bcwsLabel")}</div>
              <div className="ev-metric-value">{formatCurrencyWithLocale(bcws, dateLocale)}</div>
              <div className="ev-metric-desc">
                {t("bcwsDesc")}
              </div>
            </div>
            <div className="ev-metric">
              <div className="ev-metric-label">{t("acwpLabel")}</div>
              <div className="ev-metric-value">{formatCurrencyWithLocale(acwp, dateLocale)}</div>
              <div className="ev-metric-desc">
                {t("acwpDesc")}
              </div>
            </div>
            <div className="ev-metric">
              <div className="ev-metric-label">{t("cpiLabel")}</div>
              <div
                className="ev-metric-value"
                style={{
                  color:
                    cpi >= 1
                      ? "var(--color-green)"
                      : cpi >= 0.9
                      ? "var(--color-amber)"
                      : "var(--color-red)",
                }}
              >
                {cpi.toFixed(2)}
              </div>
              <div className="ev-metric-desc">{t("cpiDesc")}</div>
            </div>
            <div className="ev-metric">
              <div className="ev-metric-label">{t("spiLabel")}</div>
              <div
                className="ev-metric-value"
                style={{
                  color:
                    spi >= 1
                      ? "var(--color-green)"
                      : spi >= 0.9
                      ? "var(--color-amber)"
                      : "var(--color-red)",
                }}
              >
                {spi.toFixed(2)}
              </div>
              <div className="ev-metric-desc">{t("spiDesc")}</div>
            </div>
          </div>

          {/* Job Cost Table */}
          <div className="fin-chart-card" style={{ padding: 0 }}>
            <div style={{ overflowX: "auto" }}>
              <table className="job-cost-table">
                <thead>
                  <tr>
                    <th>{t("csiCode")}</th>
                    <th>{t("description")}</th>
                    <th className="num-col">{t("budgeted")}</th>
                    <th className="num-col">{t("committed")}</th>
                    <th className="num-col">{t("actual")}</th>
                    <th className="num-col">{t("variance")}</th>
                    <th style={{ width: "140px" }}>{t("percentUsed")}</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(divisions.entries()).map(
                    ([divCode, divLines]: [string, BudgetLineRow[]]) => {
                      const divBudget = divLines.reduce(
                        (s, l) => s + l.budgeted_amount,
                        0
                      );
                      const divCommitted = divLines.reduce(
                        (s, l) => s + l.committed_amount,
                        0
                      );
                      const divActual = divLines.reduce(
                        (s, l) => s + l.actual_amount,
                        0
                      );
                      const divVariance = divLines.reduce(
                        (s, l) => s + l.variance,
                        0
                      );

                      return (
                        <DivisionGroup
                          key={divCode}
                          divCode={divCode}
                          lines={divLines}
                          totals={{
                            budgeted: divBudget,
                            committed: divCommitted,
                            actual: divActual,
                            variance: divVariance,
                          }}
                          onRowClick={openDetail}
                          dateLocale={dateLocale}
                        />
                      );
                    }
                  )}

                  {/* Summary Row */}
                  <tr className="summary-row">
                    <td colSpan={2} style={{ fontWeight: 700 }}>
                      {t("projectTotalLabel")}
                    </td>
                    <td className="num-col" style={{ fontWeight: 700 }}>
                      {formatCurrencyWithLocale(summary.totalBudgeted, dateLocale)}
                    </td>
                    <td className="num-col" style={{ fontWeight: 700 }}>
                      {formatCurrencyWithLocale(summary.totalCommitted, dateLocale)}
                    </td>
                    <td className="num-col" style={{ fontWeight: 700 }}>
                      {formatCurrencyWithLocale(summary.totalActual, dateLocale)}
                    </td>
                    <td
                      className={`num-col ${getVarianceClass(summary.totalBudgeted, summary.totalActual)}`}
                      style={{ fontWeight: 700 }}
                    >
                      {formatCurrencyWithLocale(summary.totalVariance, dateLocale)}
                    </td>
                    <td>
                      <BudgetBarCell
                        budgeted={summary.totalBudgeted}
                        actual={summary.totalActual}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : selectedProjectId &&
        summary &&
        summary.lines.length === 0 ? (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <BarChart3 size={48} />
            </div>
            <div className="fin-empty-title">{t("noBudgetLines")}</div>
            <div className="fin-empty-desc">
              {t("noBudgetLinesJobCostingDesc")}
            </div>
            {error && <div className="ticket-form-error" style={{ marginBottom: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={openCreate}>
                <Plus size={16} />
                {t("addBudgetLine")}
              </button>
              <button
                className="btn btn-ghost"
                onClick={loadSampleData}
                disabled={loadingSample}
              >
                {loadingSample ? t("loading") : t("loadSampleData")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <BarChart3 size={48} />
            </div>
            <div className="fin-empty-title">{t("selectAProject")}</div>
            <div className="fin-empty-desc">
              {projects.length === 0
                ? t("createProjectFirst")
                : t("chooseProjectDesc")}
            </div>
          </div>
        </div>
      )}

      {/* ===== Import CSV Modal ===== */}
      {showImport && selectedProjectId && (
        <ImportModal
          entityName={t("budgetLines")}
          columns={budgetImportColumns}
          sampleData={budgetSampleData}
          onImport={async (rows) => {
            const res = await fetch("/api/import", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                entity: "project_budget_lines",
                rows,
                project_id: selectedProjectId,
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || t("importFailed"));
            router.refresh();
            return { success: data.success, errors: data.errors };
          }}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* ===== Create Modal ===== */}
      {showCreate && (
        <div
          className="ticket-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreate(false);
          }}
        >
          <div className="ticket-modal">
            <div className="ticket-modal-header">
              <h3>{t("addBudgetLine")}</h3>
              <button
                className="ticket-modal-close"
                onClick={() => setShowCreate(false)}
              >
                <X size={18} />
              </button>
            </div>
            {renderForm(formData, setFormData, handleCreate, t("addBudgetLine"))}
          </div>
        </div>
      )}

      {/* ===== Detail / Edit Modal ===== */}
      {selectedLine && (
        <div
          className="ticket-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedLine(null);
          }}
        >
          <div className="ticket-modal">
            <div className="ticket-modal-header">
              <h3>{isEditing ? t("editBudgetLine") : t("budgetLineDetail")}</h3>
              <button
                className="ticket-modal-close"
                onClick={() => setSelectedLine(null)}
              >
                <X size={18} />
              </button>
            </div>

            {isEditing ? (
              renderForm(editData, setEditData, handleUpdate, t("saveChanges"))
            ) : showDeleteConfirm ? (
              <div>
                <p style={{ marginBottom: "16px" }}>
                  {t("deleteConfirmation")}
                </p>
                {error && <div className="ticket-form-error">{error}</div>}
                <div className="ticket-form-actions">
                  <button
                    className="btn btn-ghost"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    {t("cancel")}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? t("deleting") : t("delete")}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="ticket-form" style={{ gap: "12px" }}>
                  <div className="ticket-form-row">
                    <div className="ticket-form-group">
                      <span className="ticket-form-label">{t("csiCode")}</span>
                      <span>{selectedLine.csi_code}</span>
                    </div>
                    <div className="ticket-form-group">
                      <span className="ticket-form-label">{t("description")}</span>
                      <span>{selectedLine.description}</span>
                    </div>
                  </div>
                  <div className="ticket-form-row">
                    <div className="ticket-form-group">
                      <span className="ticket-form-label">{t("budgeted")}</span>
                      <span>
                        {formatCurrencyWithLocale(selectedLine.budgeted_amount, dateLocale)}
                      </span>
                    </div>
                    <div className="ticket-form-group">
                      <span className="ticket-form-label">{t("committed")}</span>
                      <span>
                        {formatCurrencyWithLocale(selectedLine.committed_amount, dateLocale)}
                      </span>
                    </div>
                  </div>
                  <div className="ticket-form-row">
                    <div className="ticket-form-group">
                      <span className="ticket-form-label">{t("actual")}</span>
                      <span>
                        {formatCurrencyWithLocale(selectedLine.actual_amount, dateLocale)}
                      </span>
                    </div>
                    <div className="ticket-form-group">
                      <span className="ticket-form-label">{t("variance")}</span>
                      <span
                        className={getVarianceClass(
                          selectedLine.budgeted_amount,
                          selectedLine.actual_amount
                        )}
                      >
                        {formatCurrencyWithLocale(selectedLine.variance, dateLocale)}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className="ticket-form-actions"
                  style={{ marginTop: "20px" }}
                >
                  <button
                    className="btn btn-ghost"
                    style={{ color: "var(--color-red)" }}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 size={14} />
                    {t("delete")}
                  </button>
                  <button className="btn btn-primary" onClick={startEdit}>
                    <Pencil size={14} />
                    {t("edit")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   Sub-components
   ------------------------------------------------------------------ */

function DivisionGroup({
  divCode,
  lines,
  totals,
  onRowClick,
  dateLocale,
}: {
  divCode: string;
  lines: BudgetLineRow[];
  totals: {
    budgeted: number;
    committed: number;
    actual: number;
    variance: number;
  };
  onRowClick: (line: BudgetLineRow) => void;
  dateLocale: string;
}) {
  return (
    <>
      <tr className="division-row">
        <td colSpan={2} style={{ fontWeight: 700 }}>
          Division {divCode} -- {getDivisionName(divCode)}
        </td>
        <td className="num-col">{formatCurrencyWithLocale(totals.budgeted, dateLocale)}</td>
        <td className="num-col">{formatCurrencyWithLocale(totals.committed, dateLocale)}</td>
        <td className="num-col">{formatCurrencyWithLocale(totals.actual, dateLocale)}</td>
        <td
          className={`num-col ${getVarianceClass(totals.budgeted, totals.actual)}`}
        >
          {formatCurrencyWithLocale(totals.variance, dateLocale)}
        </td>
        <td>
          <BudgetBarCell budgeted={totals.budgeted} actual={totals.actual} />
        </td>
      </tr>
      {lines.map((line) => (
        <tr
          key={line.id}
          style={{ cursor: "pointer" }}
          onClick={() => onRowClick(line)}
        >
          <td
            style={{
              paddingLeft: "28px",
              color: "var(--color-blue)",
              fontWeight: 500,
            }}
          >
            {line.csi_code}
          </td>
          <td>{line.description}</td>
          <td className="num-col">
            {formatCurrencyWithLocale(line.budgeted_amount, dateLocale)}
          </td>
          <td className="num-col">
            {formatCurrencyWithLocale(line.committed_amount, dateLocale)}
          </td>
          <td className="num-col">
            {formatCurrencyWithLocale(line.actual_amount, dateLocale)}
          </td>
          <td
            className={`num-col ${getVarianceClass(line.budgeted_amount, line.actual_amount)}`}
          >
            {formatCurrencyWithLocale(line.variance, dateLocale)}
          </td>
          <td>
            <BudgetBarCell
              budgeted={line.budgeted_amount}
              actual={line.actual_amount}
            />
          </td>
        </tr>
      ))}
    </>
  );
}

function BudgetBarCell({
  budgeted,
  actual,
}: {
  budgeted: number;
  actual: number;
}) {
  const pctUsed = budgeted > 0 ? (actual / budgeted) * 100 : 0;
  const barClass = getBudgetBarClass(budgeted, actual);
  const varianceClass = getVarianceClass(budgeted, actual);

  return (
    <div>
      <div className="budget-bar">
        <div
          className={`budget-bar-fill ${barClass}`}
          style={{ width: `${Math.min(pctUsed, 100)}%` }}
        />
      </div>
      <span className={`budget-percent ${varianceClass}`}>
        {formatPercent(pctUsed)}
      </span>
    </div>
  );
}
