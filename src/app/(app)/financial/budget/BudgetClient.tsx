"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  BarChart3,
  DollarSign,
  ClipboardList,
  TrendingDown,
  AlertTriangle,
  Plus,
  X,
  Pencil,
  Trash2,
  Eye,
  Upload,
} from "lucide-react";
import { formatCurrency, formatCompactCurrency, formatPercent } from "@/lib/utils/format";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";
import type { BudgetLineRow } from "@/lib/queries/financial";

const budgetImportColumns: ImportColumn[] = [
  { key: "csi_code", label: "CSI Code", required: true },
  { key: "description", label: "Description", required: true },
  { key: "budgeted_amount", label: "Budgeted Amount", required: false, type: "number" },
  { key: "committed_amount", label: "Committed Amount", required: false, type: "number" },
  { key: "actual_amount", label: "Actual Amount", required: false, type: "number" },
];

const budgetSampleData = [
  { csi_code: "01-00", description: "General Requirements", budgeted_amount: "320000", committed_amount: "310000", actual_amount: "285000" },
  { csi_code: "02-00", description: "Hard Costs - Concrete", budgeted_amount: "1500000", committed_amount: "1500000", actual_amount: "0" },
  { csi_code: "03-10", description: "Architecture & Engineering", budgeted_amount: "450000", committed_amount: "450000", actual_amount: "180000" },
];

interface Project {
  id: string;
  name: string;
  code: string | null;
}

interface BudgetClientProps {
  projects: Project[];
  selectedProjectId: string | null;
  budgetLines: BudgetLineRow[];
}

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
  "21": "Fire Suppression",
  "22": "Plumbing",
  "23": "HVAC",
  "26": "Electrical",
  "31": "Earthwork",
  "32": "Exterior Improvements",
  "33": "Utilities",
};

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

export default function BudgetClient({
  projects,
  selectedProjectId,
  budgetLines: initialLines,
}: BudgetClientProps) {
  const router = useRouter();
  const t = useTranslations("financial");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";
  const [lines, setLines] = useState<BudgetLineRow[]>(initialLines);

  // Sync state when server re-renders after import/refresh
  useEffect(() => {
    setLines(initialLines);
  }, [initialLines]);

  // Import modal
  const [showImport, setShowImport] = useState(false);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createForm, setCreateForm] = useState({
    csi_code: "",
    description: "",
    budgeted_amount: "",
    committed_amount: "",
    actual_amount: "",
  });

  // Detail modal
  const [detailLine, setDetailLine] = useState<BudgetLineRow | null>(null);

  // Edit modal
  const [editLine, setEditLine] = useState<BudgetLineRow | null>(null);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState({
    csi_code: "",
    description: "",
    budgeted_amount: "",
    committed_amount: "",
    actual_amount: "",
  });

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Compute totals
  const totalBudget = lines.reduce((s, l) => s + (l.budgeted_amount ?? 0), 0);
  const totalCommitted = lines.reduce((s, l) => s + (l.committed_amount ?? 0), 0);
  const totalActual = lines.reduce((s, l) => s + (l.actual_amount ?? 0), 0);
  const totalVariance = lines.reduce((s, l) => s + (l.variance ?? 0), 0);

  const handleCreate = async () => {
    if (!selectedProjectId) return;
    if (!createForm.csi_code || !createForm.description) {
      setCreateError(t("csiCodeAndDescriptionRequired"));
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/financial/budget-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: selectedProjectId,
          csi_code: createForm.csi_code,
          description: createForm.description,
          budgeted_amount: parseFloat(createForm.budgeted_amount) || 0,
          committed_amount: parseFloat(createForm.committed_amount) || 0,
          actual_amount: parseFloat(createForm.actual_amount) || 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setCreateError(data.error || t("failedToCreateBudgetLine"));
        return;
      }
      setShowCreate(false);
      setCreateForm({ csi_code: "", description: "", budgeted_amount: "", committed_amount: "", actual_amount: "" });
      router.refresh();
    } catch {
      setCreateError(t("networkError"));
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async () => {
    if (!editLine) return;
    setEditing(true);
    setEditError("");
    try {
      const res = await fetch(`/api/financial/budget-lines/${editLine.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csi_code: editForm.csi_code,
          description: editForm.description,
          budgeted_amount: parseFloat(editForm.budgeted_amount) || 0,
          committed_amount: parseFloat(editForm.committed_amount) || 0,
          actual_amount: parseFloat(editForm.actual_amount) || 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setEditError(data.error || t("failedToUpdate"));
        return;
      }
      setEditLine(null);
      router.refresh();
    } catch {
      setEditError(t("networkError"));
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/financial/budget-lines/${id}`, { method: "DELETE" });
      if (res.ok) {
        setLines((prev) => prev.filter((l) => l.id !== id));
        setDetailLine(null);
        router.refresh();
      }
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (line: BudgetLineRow) => {
    setDetailLine(null);
    setEditForm({
      csi_code: line.csi_code,
      description: line.description,
      budgeted_amount: String(line.budgeted_amount),
      committed_amount: String(line.committed_amount),
      actual_amount: String(line.actual_amount),
    });
    setEditLine(line);
    setEditError("");
  };

  return (
    <>
      {/* Project Tabs */}
      <div className="fin-tab-bar" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0 }}>
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/financial/budget?projectId=${project.id}`}
            className={`fin-tab ${selectedProjectId === project.id ? "active" : ""}`}
          >
            {project.code ? `${project.code} - ` : ""}{project.name}
          </Link>
        ))}
      </div>

      {selectedProjectId && (
        <>
          {/* KPI Row */}
          <div className="financial-kpi-row" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            <div className="fin-kpi">
              <div className="fin-kpi-icon blue"><DollarSign size={18} /></div>
              <span className="fin-kpi-label">{t("totalBudget")}</span>
              <span className="fin-kpi-value">{formatCompactCurrency(totalBudget)}</span>
            </div>
            <div className="fin-kpi">
              <div className="fin-kpi-icon amber"><ClipboardList size={18} /></div>
              <span className="fin-kpi-label">{t("totalCommitted")}</span>
              <span className="fin-kpi-value">{formatCompactCurrency(totalCommitted)}</span>
            </div>
            <div className="fin-kpi">
              <div className="fin-kpi-icon red"><TrendingDown size={18} /></div>
              <span className="fin-kpi-label">{t("totalActual")}</span>
              <span className="fin-kpi-value">{formatCompactCurrency(totalActual)}</span>
            </div>
            <div className="fin-kpi">
              <div className="fin-kpi-icon green"><AlertTriangle size={18} /></div>
              <span className="fin-kpi-label">{t("totalVariance")}</span>
              <span className={`fin-kpi-value ${totalVariance >= 0 ? "positive" : "negative"}`}>
                {formatCompactCurrency(totalVariance)}
              </span>
            </div>
          </div>

          {/* Add Budget Line / Import Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 16 }}>
            <button className="ui-btn ui-btn-secondary ui-btn-md" onClick={() => setShowImport(true)}>
              <Upload size={16} />
              {t("importCsv")}
            </button>
            <button className="ui-btn ui-btn-primary ui-btn-md" onClick={() => { setCreateError(""); setShowCreate(true); }}>
              <Plus size={16} />
              {t("addBudgetLine")}
            </button>
          </div>

          {/* Budget Table */}
          {lines.length > 0 ? (
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
                      <th style={{ width: 160 }}>{t("budgetUsed")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => {
                      const pctUsed = line.budgeted_amount > 0 ? (line.actual_amount / line.budgeted_amount) * 100 : 0;
                      const barClass = getBudgetBarClass(line.budgeted_amount, line.actual_amount);
                      const varianceClass = getVarianceClass(line.budgeted_amount, line.actual_amount);

                      return (
                        <tr key={line.id} style={{ cursor: "pointer" }} onClick={() => setDetailLine(line)}>
                          <td style={{ color: "var(--color-blue)", fontWeight: 600 }}>{line.csi_code}</td>
                          <td>{line.description}</td>
                          <td className="num-col">{formatCurrency(line.budgeted_amount)}</td>
                          <td className="num-col">{formatCurrency(line.committed_amount)}</td>
                          <td className="num-col">{formatCurrency(line.actual_amount)}</td>
                          <td className={`num-col ${varianceClass}`} style={{ fontWeight: 600 }}>
                            {formatCurrency(line.variance)}
                          </td>
                          <td>
                            <div className="budget-bar">
                              <div className={`budget-bar-fill ${barClass}`} style={{ width: `${Math.min(pctUsed, 100)}%` }} />
                            </div>
                            <span className={`budget-percent ${varianceClass}`}>{formatPercent(pctUsed)}</span>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Totals */}
                    <tr className="summary-row">
                      <td colSpan={2} style={{ fontWeight: 700 }}>
                        {t("projectTotal", { name: selectedProject?.name ?? t("project") })}
                      </td>
                      <td className="num-col" style={{ fontWeight: 700 }}>{formatCurrency(totalBudget)}</td>
                      <td className="num-col" style={{ fontWeight: 700 }}>{formatCurrency(totalCommitted)}</td>
                      <td className="num-col" style={{ fontWeight: 700 }}>{formatCurrency(totalActual)}</td>
                      <td className={`num-col ${getVarianceClass(totalBudget, totalActual)}`} style={{ fontWeight: 700 }}>
                        {formatCurrency(totalVariance)}
                      </td>
                      <td>
                        <div className="budget-bar">
                          <div
                            className={`budget-bar-fill ${getBudgetBarClass(totalBudget, totalActual)}`}
                            style={{ width: `${Math.min(totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0, 100)}%` }}
                          />
                        </div>
                        <span className={`budget-percent ${getVarianceClass(totalBudget, totalActual)}`}>
                          {formatPercent(totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0)}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="fin-chart-card">
              <div className="fin-empty">
                <div className="fin-empty-icon"><BarChart3 size={48} /></div>
                <div className="fin-empty-title">{t("noBudgetLines")}</div>
                <div className="fin-empty-desc">
                  {t("noBudgetLinesDesc")}
                </div>
                <button className="ui-btn ui-btn-primary ui-btn-md" style={{ marginTop: 12 }} onClick={() => setShowCreate(true)}>
                  <Plus size={16} />
                  {t("addBudgetLine")}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {detailLine && (
        <div className="ticket-modal-overlay" onClick={() => setDetailLine(null)}>
          <div className="ticket-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{detailLine.csi_code} - {detailLine.description}</h3>
              <button className="ticket-modal-close" onClick={() => setDetailLine(null)}><X size={18} /></button>
            </div>
            <div className="ticket-detail-body">
              <div className="ticket-detail-row">
                <span className="ticket-detail-label">{t("csiCode")}</span>
                <span style={{ fontWeight: 600, color: "var(--color-blue)" }}>{detailLine.csi_code}</span>
              </div>
              <div className="ticket-detail-row">
                <span className="ticket-detail-label">{t("division")}</span>
                <span>{csiDivisions[detailLine.csi_code.substring(0, 2)] ?? t("other")}</span>
              </div>
              <div className="ticket-detail-row">
                <span className="ticket-detail-label">{t("budgeted")}</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(detailLine.budgeted_amount)}</span>
              </div>
              <div className="ticket-detail-row">
                <span className="ticket-detail-label">{t("committed")}</span>
                <span>{formatCurrency(detailLine.committed_amount)}</span>
              </div>
              <div className="ticket-detail-row">
                <span className="ticket-detail-label">{t("actual")}</span>
                <span>{formatCurrency(detailLine.actual_amount)}</span>
              </div>
              <div className="ticket-detail-row">
                <span className="ticket-detail-label">{t("variance")}</span>
                <span className={detailLine.variance >= 0 ? "positive" : "negative"} style={{ fontWeight: 600 }}>
                  {formatCurrency(detailLine.variance)}
                </span>
              </div>
              <div className="ticket-detail-row">
                <span className="ticket-detail-label">{t("percentUsed")}</span>
                <span className={getVarianceClass(detailLine.budgeted_amount, detailLine.actual_amount)} style={{ fontWeight: 600 }}>
                  {detailLine.budgeted_amount > 0
                    ? formatPercent((detailLine.actual_amount / detailLine.budgeted_amount) * 100)
                    : "0%"}
                </span>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
                <button className="ui-btn ui-btn-primary ui-btn-sm" style={{ flex: 1 }} onClick={() => openEdit(detailLine)}>
                  <Pencil size={14} />
                  {t("edit")}
                </button>
                <button
                  className="btn-danger-outline"
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  onClick={() => handleDelete(detailLine.id)}
                  disabled={deletingId === detailLine.id}
                >
                  <Trash2 size={14} />
                  {deletingId === detailLine.id ? t("deleting") : t("delete")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="ticket-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="ticket-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{t("addBudgetLine")}</h3>
              <button className="ticket-modal-close" onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <div className="ticket-form">
              {createError && <div className="ticket-form-error">{createError}</div>}
              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("csiCodeRequired")}</label>
                  <select
                    className="ticket-form-select"
                    value={createForm.csi_code}
                    onChange={(e) => {
                      const code = e.target.value;
                      setCreateForm((f) => ({
                        ...f,
                        csi_code: code,
                        description: csiDivisions[code] ?? f.description,
                      }));
                    }}
                  >
                    <option value="">{t("selectCsiDivision")}</option>
                    {Object.entries(csiDivisions).map(([code, name]) => (
                      <option key={code} value={code}>{code} - {name}</option>
                    ))}
                  </select>
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("descriptionRequired")}</label>
                  <input
                    className="ticket-form-input"
                    value={createForm.description}
                    onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder={t("budgetLineDescriptionPlaceholder")}
                  />
                </div>
              </div>
              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("budgetedAmount")}</label>
                  <input
                    className="ticket-form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={createForm.budgeted_amount}
                    onChange={(e) => setCreateForm((f) => ({ ...f, budgeted_amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("committedAmount")}</label>
                  <input
                    className="ticket-form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={createForm.committed_amount}
                    onChange={(e) => setCreateForm((f) => ({ ...f, committed_amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("actualAmount")}</label>
                <input
                  className="ticket-form-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={createForm.actual_amount}
                  onChange={(e) => setCreateForm((f) => ({ ...f, actual_amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="ticket-form-actions">
                <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>{t("cancel")}</button>
                <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                  {creating ? t("creating") : t("addBudgetLine")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImport && selectedProjectId && (
        <ImportModal
          entityName="Budget Lines"
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
            if (!res.ok) throw new Error(data.error || "Import failed");
            router.refresh();
            return { success: data.success, errors: data.errors };
          }}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Edit Modal */}
      {editLine && (
        <div className="ticket-modal-overlay" onClick={() => setEditLine(null)}>
          <div className="ticket-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{t("editBudgetLine")}</h3>
              <button className="ticket-modal-close" onClick={() => setEditLine(null)}><X size={18} /></button>
            </div>
            <div className="ticket-form">
              {editError && <div className="ticket-form-error">{editError}</div>}
              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("csiCode")}</label>
                  <input
                    className="ticket-form-input"
                    value={editForm.csi_code}
                    onChange={(e) => setEditForm((f) => ({ ...f, csi_code: e.target.value }))}
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("description")}</label>
                  <input
                    className="ticket-form-input"
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>
              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("budgetedAmount")}</label>
                  <input
                    className="ticket-form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.budgeted_amount}
                    onChange={(e) => setEditForm((f) => ({ ...f, budgeted_amount: e.target.value }))}
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("committedAmount")}</label>
                  <input
                    className="ticket-form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.committed_amount}
                    onChange={(e) => setEditForm((f) => ({ ...f, committed_amount: e.target.value }))}
                  />
                </div>
              </div>
              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("actualAmount")}</label>
                <input
                  className="ticket-form-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.actual_amount}
                  onChange={(e) => setEditForm((f) => ({ ...f, actual_amount: e.target.value }))}
                />
              </div>
              <div className="ticket-form-actions">
                <button className="btn btn-ghost" onClick={() => setEditLine(null)}>{t("cancel")}</button>
                <button className="btn btn-primary" onClick={handleEdit} disabled={editing}>
                  {editing ? t("saving") : t("saveChanges")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
