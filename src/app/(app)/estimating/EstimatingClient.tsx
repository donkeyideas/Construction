"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Calculator,
  Plus,
  FileText,
  DollarSign,
  Package,
  X,
  Loader2,
  Upload,
} from "lucide-react";
import { formatCurrency, formatCompactCurrency, formatDateSafe } from "@/lib/utils/format";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";

interface Estimate {
  id: string;
  estimate_number: string;
  title: string;
  description: string | null;
  status: string;
  total_cost: number;
  total_price: number;
  margin_pct: number;
  project_id: string | null;
  created_at: string;
}

interface Assembly {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  total_cost: number;
}

interface Project {
  id: string;
  name: string;
  code: string | null;
}

interface EstimatingClientProps {
  estimates: Estimate[];
  assemblies: Assembly[];
  projects: Project[];
  companyId: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  rejected: "Rejected",
};

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "estimate_number", label: "Estimate #", required: false },
  { key: "title", label: "Title", required: true },
  { key: "description", label: "Description", required: false },
  { key: "status", label: "Status", required: false },
  { key: "total_cost", label: "Total Cost ($)", required: false, type: "number" },
  { key: "total_price", label: "Total Price ($)", required: false, type: "number" },
  { key: "margin_pct", label: "Margin %", required: false, type: "number" },
  { key: "overhead_pct", label: "Overhead %", required: false, type: "number" },
  { key: "profit_pct", label: "Profit %", required: false, type: "number" },
  { key: "project_name", label: "Project Name", required: false },
];

const IMPORT_SAMPLE: Record<string, string>[] = [
  { estimate_number: "EST-0001", title: "Foundation Package", description: "Complete foundation scope", status: "draft", total_cost: "450000", total_price: "540000", margin_pct: "20", overhead_pct: "10", profit_pct: "10", project_name: "My Project" },
  { estimate_number: "EST-0002", title: "Structural Steel Package", description: "Steel erection and connections", status: "in_review", total_cost: "1200000", total_price: "1500000", margin_pct: "25", overhead_pct: "10", profit_pct: "15", project_name: "My Project" },
];

function getMarginClass(marginPct: number | null): string {
  if (marginPct == null) return "";
  if (marginPct >= 15) return "margin-positive";
  if (marginPct >= 5) return "margin-low";
  return "margin-negative";
}

export default function EstimatingClient({
  estimates,
  assemblies,
  projects,
  companyId,
}: EstimatingClientProps) {
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const router = useRouter();
  const [tab, setTab] = useState<"estimates" | "assemblies">("estimates");
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    project_id: "",
    overhead_pct: "10",
    profit_pct: "10",
  });

  const totalEstimates = estimates.length;
  const totalValue = estimates.reduce((sum, e) => sum + (e.total_price || 0), 0);
  const avgMargin = totalEstimates > 0
    ? estimates.reduce((sum, e) => sum + (e.margin_pct || 0), 0) / totalEstimates
    : 0;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const number = `EST-${String(totalEstimates + 1).padStart(4, "0")}`;
      const res = await fetch("/api/estimating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimate_number: number,
          title: formData.title,
          description: formData.description || null,
          project_id: formData.project_id || null,
          overhead_pct: parseFloat(formData.overhead_pct) || 10,
          profit_pct: parseFloat(formData.profit_pct) || 10,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("estimatingCreateFailed"));
      }

      setShowCreate(false);
      setFormData({ title: "", description: "", project_id: "", overhead_pct: "10", profit_pct: "10" });
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : t("estimatingCreateFailed"));
    } finally {
      setCreating(false);
    }
  }

  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "estimates", rows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Import failed");
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  return (
    <div>
      {/* Header - matches CRM Bids layout */}
      <div className="crm-header">
        <div>
          <h2>{t("estimatingTitle")}</h2>
          <p className="crm-header-sub">
            {t("estimatingSubtitle")}
          </p>
        </div>
        <div className="crm-header-actions">
          <button
            className="ui-btn ui-btn-md ui-btn-secondary"
            onClick={() => setShowImport(true)}
          >
            <Upload size={16} />
            Import CSV
          </button>
          <button
            className="ui-btn ui-btn-md ui-btn-primary"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={16} />
            {t("estimatingNewEstimate")}
          </button>
        </div>
      </div>

      {/* KPIs - matches Dashboard kpi-grid */}
      <div className="kpi-grid">
        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">{t("estimatingTotalEstimates")}</span>
            <span className="kpi-value">{totalEstimates}</span>
          </div>
          <div className="kpi-icon"><FileText size={22} /></div>
        </div>
        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">{t("estimatingTotalValue")}</span>
            <span className="kpi-value">{formatCompactCurrency(totalValue)}</span>
          </div>
          <div className="kpi-icon"><DollarSign size={22} /></div>
        </div>
        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">{t("estimatingAvgMargin")}</span>
            <span className="kpi-value">{avgMargin.toFixed(1)}%</span>
          </div>
          <div className="kpi-icon"><Calculator size={22} /></div>
        </div>
        <div className="card kpi">
          <div className="kpi-info">
            <span className="kpi-label">{t("estimatingAssemblies")}</span>
            <span className="kpi-value">{assemblies.length}</span>
          </div>
          <div className="kpi-icon"><Package size={22} /></div>
        </div>
      </div>

      {/* Tabs - same as CRM people tabs */}
      <div className="people-tab-bar">
        <button
          className={`people-tab ${tab === "estimates" ? "active" : ""}`}
          onClick={() => setTab("estimates")}
        >
          {t("estimatingEstimatesTab")}
        </button>
        <button
          className={`people-tab ${tab === "assemblies" ? "active" : ""}`}
          onClick={() => setTab("assemblies")}
        >
          {t("estimatingAssembliesTab")}
        </button>
      </div>

      {/* Estimates Tab */}
      {tab === "estimates" && (
        <>
          {estimates.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "64px 24px" }}>
              <div style={{ marginBottom: 16, color: "var(--border)" }}>
                <Calculator size={48} />
              </div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.15rem", fontWeight: 600, marginBottom: 8 }}>
                {t("estimatingNoEstimatesTitle")}
              </div>
              <div style={{ color: "var(--muted)", fontSize: "0.85rem", maxWidth: "400px", margin: "0 auto 20px" }}>
                {t("estimatingNoEstimatesDesc")}
              </div>
              <button
                className="ui-btn ui-btn-md ui-btn-primary"
                onClick={() => setShowCreate(true)}
              >
                <Plus size={16} /> {t("estimatingCreateEstimate")}
              </button>
            </div>
          ) : (
            <div className="card" style={{ overflowX: "auto" }}>
              <table className="bid-table">
                <thead>
                  <tr>
                    <th>{t("estimatingColNumber")}</th>
                    <th>{t("estimatingColTitle")}</th>
                    <th>{t("estimatingColProject")}</th>
                    <th>{t("estimatingColStatus")}</th>
                    <th className="amount-col">{t("estimatingColCost")}</th>
                    <th className="amount-col">{t("estimatingColPrice")}</th>
                    <th className="margin-col">{t("estimatingColMargin")}</th>
                    <th>{t("estimatingColCreated")}</th>
                  </tr>
                </thead>
                <tbody>
                  {estimates.map((est) => {
                    const project = projects.find((p) => p.id === est.project_id);
                    return (
                      <tr
                        key={est.id}
                        style={{ cursor: "pointer" }}
                        onClick={() => router.push(`/estimating/${est.id}`)}
                      >
                        <td><span style={{ fontWeight: 600 }}>{est.estimate_number}</span></td>
                        <td>{est.title}</td>
                        <td>{project ? `${project.code || ""} ${project.name}`.trim() : "—"}</td>
                        <td>
                          <span className={`bid-status bid-status-${est.status === "approved" ? "won" : est.status === "rejected" ? "lost" : est.status === "in_review" ? "submitted" : "in_progress"}`}>
                            {STATUS_LABELS[est.status] || est.status}
                          </span>
                        </td>
                        <td className="amount-col">{formatCurrency(est.total_cost)}</td>
                        <td className="amount-col">{formatCurrency(est.total_price)}</td>
                        <td className={`margin-col ${getMarginClass(est.margin_pct)}`}>
                          {est.margin_pct?.toFixed(1)}%
                        </td>
                        <td suppressHydrationWarning>{formatDateSafe(est.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Assemblies Tab */}
      {tab === "assemblies" && (
        <>
          {assemblies.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "64px 24px" }}>
              <div style={{ marginBottom: 16, color: "var(--border)" }}>
                <Package size={48} />
              </div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.15rem", fontWeight: 600, marginBottom: 8 }}>
                {t("estimatingNoAssembliesTitle")}
              </div>
              <div style={{ color: "var(--muted)", fontSize: "0.85rem", maxWidth: "400px", margin: "0 auto" }}>
                {t("estimatingNoAssembliesDesc")}
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
              {assemblies.map((a) => (
                <div key={a.id} className="card" style={{ padding: "16px" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{a.name}</div>
                  {a.description && <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "4px" }}>{a.description}</div>}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px" }}>
                    <DollarSign size={14} style={{ color: "var(--color-green)" }} />
                    <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{formatCurrency(a.total_cost)}</span>
                    {a.category && (
                      <span className="bid-status" style={{ marginLeft: "auto" }}>{a.category}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Modal - matches ticket modal pattern */}
      {showCreate && (
        <div className="ticket-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <div className="ticket-modal-header">
              <h3>{t("estimatingNewEstimate")}</h3>
              <button className="ticket-modal-close" onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="ticket-modal-content">
                {createError && <div className="settings-form-message error">{createError}</div>}
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("estimatingFormTitle")} *</label>
                  <input className="ticket-form-input" required value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("estimatingFormDescription")}</label>
                  <textarea className="ticket-form-textarea" rows={2} value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("estimatingFormProject")}</label>
                  <select className="ticket-form-select" value={formData.project_id} onChange={(e) => setFormData((p) => ({ ...p, project_id: e.target.value }))}>
                    <option value="">{t("estimatingNoProject")}</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.code ? `${p.code} - ` : ""}{p.name}</option>)}
                  </select>
                </div>
                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("estimatingOverheadPct")}</label>
                    <input className="ticket-form-input" type="number" min="0" step="0.5" value={formData.overhead_pct} onChange={(e) => setFormData((p) => ({ ...p, overhead_pct: e.target.value }))} />
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("estimatingProfitPct")}</label>
                    <input className="ticket-form-input" type="number" min="0" step="0.5" value={formData.profit_pct} onChange={(e) => setFormData((p) => ({ ...p, profit_pct: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="ticket-modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>{t("cancel")}</button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? <Loader2 size={14} className="spin-icon" /> : <Plus size={14} />}
                  {creating ? t("estimatingCreating") : t("estimatingCreateEstimate")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImport && (
        <ImportModal
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          entityName="Estimates"
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
