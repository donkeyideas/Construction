"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calculator,
  Plus,
  FileText,
  DollarSign,
  TrendingUp,
  Package,
  X,
  Loader2,
} from "lucide-react";

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

const STATUS_BADGE: Record<string, string> = {
  draft: "inv-status inv-status-draft",
  in_review: "inv-status inv-status-pending",
  approved: "inv-status inv-status-approved",
  rejected: "inv-status inv-status-overdue",
};

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export default function EstimatingClient({
  estimates,
  assemblies,
  projects,
  companyId,
}: EstimatingClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"estimates" | "assemblies">("estimates");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    project_id: "",
    overhead_pct: "10",
    profit_pct: "10",
  });

  // KPIs
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
        throw new Error(data.error || "Failed to create estimate");
      }

      setShowCreate(false);
      setFormData({ title: "", description: "", project_id: "", overhead_pct: "10", profit_pct: "10" });
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Estimating</h2>
          <p className="fin-header-sub">Create cost estimates and manage reusable assemblies</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Estimate
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="fin-kpi-row">
        <div className="fin-kpi-card">
          <div className="fin-kpi-label">Total Estimates</div>
          <div className="fin-kpi-value">{totalEstimates}</div>
        </div>
        <div className="fin-kpi-card">
          <div className="fin-kpi-label">Total Value</div>
          <div className="fin-kpi-value">{formatCurrency(totalValue)}</div>
        </div>
        <div className="fin-kpi-card">
          <div className="fin-kpi-label">Avg. Margin</div>
          <div className="fin-kpi-value">{avgMargin.toFixed(1)}%</div>
        </div>
        <div className="fin-kpi-card">
          <div className="fin-kpi-label">Assemblies</div>
          <div className="fin-kpi-value">{assemblies.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="fin-tabs" style={{ marginBottom: "16px" }}>
        <button className={`fin-tab ${tab === "estimates" ? "active" : ""}`} onClick={() => setTab("estimates")}>
          <FileText size={14} /> Estimates
        </button>
        <button className={`fin-tab ${tab === "assemblies" ? "active" : ""}`} onClick={() => setTab("assemblies")}>
          <Package size={14} /> Assemblies
        </button>
      </div>

      {/* Estimates Tab */}
      {tab === "estimates" && (
        <>
          {estimates.length === 0 ? (
            <div className="fin-empty">
              <div className="fin-empty-icon"><Calculator size={48} /></div>
              <div className="fin-empty-title">No Estimates Yet</div>
              <div className="fin-empty-desc">Create your first cost estimate to start tracking project budgets.</div>
              <button className="btn-primary" onClick={() => setShowCreate(true)} style={{ marginTop: "16px" }}>
                <Plus size={16} /> Create Estimate
              </button>
            </div>
          ) : (
            <div className="fin-table-wrap">
              <table className="fin-table">
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Title</th>
                    <th>Project</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Cost</th>
                    <th style={{ textAlign: "right" }}>Price</th>
                    <th style={{ textAlign: "right" }}>Margin</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {estimates.map((est) => {
                    const project = projects.find((p) => p.id === est.project_id);
                    return (
                      <tr key={est.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/estimating/${est.id}`)}>
                        <td><span style={{ fontWeight: 600 }}>{est.estimate_number}</span></td>
                        <td>{est.title}</td>
                        <td>{project ? `${project.code || ""} ${project.name}`.trim() : "--"}</td>
                        <td><span className={STATUS_BADGE[est.status] || "inv-status"}>{est.status.replace("_", " ")}</span></td>
                        <td style={{ textAlign: "right" }}>{formatCurrency(est.total_cost)}</td>
                        <td style={{ textAlign: "right" }}>{formatCurrency(est.total_price)}</td>
                        <td style={{ textAlign: "right" }}>{est.margin_pct?.toFixed(1)}%</td>
                        <td>{new Date(est.created_at).toLocaleDateString()}</td>
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
            <div className="fin-empty">
              <div className="fin-empty-icon"><Package size={48} /></div>
              <div className="fin-empty-title">No Assemblies Yet</div>
              <div className="fin-empty-desc">Create reusable assembly templates (e.g., &quot;Standard Bathroom&quot;) to speed up estimating.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
              {assemblies.map((a) => (
                <div key={a.id} style={{
                  padding: "16px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                }}>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{a.name}</div>
                  {a.description && <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "4px" }}>{a.description}</div>}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px" }}>
                    <DollarSign size={14} style={{ color: "var(--color-green)" }} />
                    <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{formatCurrency(a.total_cost)}</span>
                    {a.category && (
                      <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "999px", background: "var(--border)", marginLeft: "auto" }}>{a.category}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="ticket-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <div className="ticket-modal-header">
              <h3>New Estimate</h3>
              <button className="ticket-modal-close" onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="ticket-modal-content">
                {createError && <div className="settings-form-message error">{createError}</div>}
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Title *</label>
                  <input className="ticket-form-input" required value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Description</label>
                  <textarea className="ticket-form-textarea" rows={2} value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Project</label>
                  <select className="ticket-form-select" value={formData.project_id} onChange={(e) => setFormData((p) => ({ ...p, project_id: e.target.value }))}>
                    <option value="">No project (standalone)</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.code ? `${p.code} - ` : ""}{p.name}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Overhead %</label>
                    <input className="ticket-form-input" type="number" min="0" step="0.5" value={formData.overhead_pct} onChange={(e) => setFormData((p) => ({ ...p, overhead_pct: e.target.value }))} />
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Profit %</label>
                    <input className="ticket-form-input" type="number" min="0" step="0.5" value={formData.profit_pct} onChange={(e) => setFormData((p) => ({ ...p, profit_pct: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="ticket-modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? <Loader2 size={14} className="spin-icon" /> : <TrendingUp size={14} />}
                  {creating ? "Creating..." : "Create Estimate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
