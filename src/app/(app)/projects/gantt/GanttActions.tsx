"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, X, Upload, Trash2 } from "lucide-react";
import ImportModal from "@/components/ImportModal";
import { type ImportColumn } from "@/lib/utils/csv-parser";

const PHASE_COLORS = [
  { key: "blue", value: "#3b82f6" },
  { key: "green", value: "#10b981" },
  { key: "amber", value: "#f59e0b" },
  { key: "purple", value: "#8b5cf6" },
  { key: "red", value: "#ef4444" },
  { key: "cyan", value: "#06b6d4" },
  { key: "pink", value: "#ec4899" },
  { key: "lime", value: "#84cc16" },
];

// ---------------------------------------------------------------------------
// Import column definitions
// ---------------------------------------------------------------------------

const PHASE_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "name", label: "Phase Name", required: true },
  { key: "color", label: "Color (hex)", required: false },
  { key: "start_date", label: "Start Date", required: false, type: "date" },
  { key: "end_date", label: "End Date", required: false, type: "date" },
  { key: "project_name", label: "Project Name", required: false },
];

const PHASE_IMPORT_SAMPLE: Record<string, string>[] = [
  { name: "Pre-Construction", color: "#8b5cf6", start_date: "2026-01-15", end_date: "2026-02-28" },
  { name: "Foundation", color: "#3b82f6", start_date: "2026-03-01", end_date: "2026-04-15" },
  { name: "Structural Framing", color: "#10b981", start_date: "2026-04-16", end_date: "2026-06-30" },
];

const TASK_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "name", label: "Task Name", required: true },
  { key: "phase_name", label: "Phase Name", required: false },
  { key: "priority", label: "Priority", required: false },
  { key: "start_date", label: "Start Date", required: false, type: "date" },
  { key: "end_date", label: "End Date", required: false, type: "date" },
  { key: "completion_pct", label: "Completion %", required: false, type: "number" },
  { key: "is_milestone", label: "Milestone (true/false)", required: false },
  { key: "is_critical_path", label: "Critical Path (true/false)", required: false },
  { key: "project_name", label: "Project Name", required: false },
];

const TASK_IMPORT_SAMPLE: Record<string, string>[] = [
  { name: "Site survey & staking", phase_name: "Pre-Construction", priority: "high", start_date: "2026-01-15", end_date: "2026-01-20", completion_pct: "100", is_milestone: "false", is_critical_path: "true" },
  { name: "Permits approved", phase_name: "Pre-Construction", priority: "critical", start_date: "2026-02-01", end_date: "2026-02-01", completion_pct: "0", is_milestone: "true", is_critical_path: "true" },
  { name: "Excavation & grading", phase_name: "Foundation", priority: "high", start_date: "2026-03-01", end_date: "2026-03-15", completion_pct: "0", is_milestone: "false", is_critical_path: "true" },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Phase {
  id: string;
  name: string;
}

interface Props {
  projectId: string;
  phases: Phase[];
}

export default function GanttActions({ projectId, phases }: Props) {
  const router = useRouter();
  const t = useTranslations("projects");
  const [showPhaseForm, setShowPhaseForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [phaseName, setPhaseName] = useState("");
  const [phaseColor, setPhaseColor] = useState("#3b82f6");
  const [phaseStart, setPhaseStart] = useState("");
  const [phaseEnd, setPhaseEnd] = useState("");

  const [taskName, setTaskName] = useState("");
  const [taskPhaseId, setTaskPhaseId] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskStart, setTaskStart] = useState("");
  const [taskEnd, setTaskEnd] = useState("");
  const [taskMilestone, setTaskMilestone] = useState(false);

  const [showImportPhases, setShowImportPhases] = useState(false);
  const [showImportTasks, setShowImportTasks] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function closeAllForms() {
    setShowPhaseForm(false);
    setShowTaskForm(false);
    setError("");
  }

  async function handleAddPhase(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/phases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: phaseName,
          color: phaseColor,
          start_date: phaseStart || undefined,
          end_date: phaseEnd || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("gantt.failedCreatePhase"));
      }
      setPhaseName("");
      setPhaseColor("#3b82f6");
      setPhaseStart("");
      setPhaseEnd("");
      setShowPhaseForm(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("gantt.failedCreatePhase"));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: taskName,
          phase_id: taskPhaseId || undefined,
          priority: taskPriority,
          start_date: taskStart || undefined,
          end_date: taskEnd || undefined,
          is_milestone: taskMilestone,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("gantt.failedCreateTask"));
      }
      setTaskName("");
      setTaskPhaseId("");
      setTaskPriority("medium");
      setTaskStart("");
      setTaskEnd("");
      setTaskMilestone(false);
      setShowTaskForm(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("gantt.failedCreateTask"));
    } finally {
      setSaving(false);
    }
  }

  async function handleImportPhases(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "phases", rows, project_id: projectId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("gantt.importFailed"));
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  async function handleImportTasks(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "tasks", rows, project_id: projectId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("gantt.importFailed"));
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  async function handleDeleteAll() {
    if (!confirm(t("gantt.deleteConfirm"))) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/phases`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteAll: true }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || t("gantt.deleteFailed"));
      }
      router.refresh();
    } catch {
      alert(t("gantt.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          className="btn-secondary"
          onClick={() => { setShowPhaseForm(!showPhaseForm); setShowTaskForm(false); setError(""); }}
        >
          <Plus size={16} /> {t("gantt.addPhase")}
        </button>
        <button
          className="btn-secondary"
          onClick={() => { setShowTaskForm(!showTaskForm); setShowPhaseForm(false); setError(""); }}
        >
          <Plus size={16} /> {t("gantt.addTask")}
        </button>
        <button
          className="btn-secondary"
          onClick={() => { closeAllForms(); setShowImportPhases(true); }}
        >
          <Upload size={16} /> {t("gantt.importPhases")}
        </button>
        <button
          className="btn-secondary"
          onClick={() => { closeAllForms(); setShowImportTasks(true); }}
        >
          <Upload size={16} /> {t("gantt.importTasks")}
        </button>
        {phases.length > 0 && (
          <button
            className="btn-secondary"
            style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
            onClick={handleDeleteAll}
            disabled={deleting}
          >
            <Trash2 size={16} /> {deleting ? t("gantt.deleting") : t("gantt.deleteAll")}
          </button>
        )}
      </div>

      {/* Add Phase Form */}
      {showPhaseForm && (
        <div className="fin-chart-card" style={{ marginTop: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: "0.9rem" }}>{t("gantt.newPhase")}</h4>
            <button
              onClick={() => { setShowPhaseForm(false); setError(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleAddPhase}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">{t("gantt.nameRequired")}</label>
                <input
                  className="form-input"
                  required
                  placeholder={t("gantt.phaseNamePlaceholder")}
                  value={phaseName}
                  onChange={(e) => setPhaseName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t("gantt.color")}</label>
                <div style={{ display: "flex", gap: 6, alignItems: "center", paddingTop: 4 }}>
                  {PHASE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setPhaseColor(c.value)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 4,
                        background: c.value,
                        border: phaseColor === c.value ? "2px solid var(--text)" : "2px solid transparent",
                        cursor: "pointer",
                        padding: 0,
                      }}
                      title={t(`gantt.colors.${c.key}`)}
                    />
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t("gantt.startDate")}</label>
                <input
                  type="date"
                  className="form-input"
                  value={phaseStart}
                  onChange={(e) => setPhaseStart(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t("gantt.endDate")}</label>
                <input
                  type="date"
                  className="form-input"
                  value={phaseEnd}
                  onChange={(e) => setPhaseEnd(e.target.value)}
                />
              </div>
            </div>
            {error && <p style={{ color: "var(--color-red)", fontSize: "0.85rem", marginTop: 8 }}>{error}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button type="button" className="btn-secondary" onClick={() => { setShowPhaseForm(false); setError(""); }}>
                {t("gantt.cancel")}
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? t("gantt.creating") : t("gantt.createPhase")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Task Form */}
      {showTaskForm && (
        <div className="fin-chart-card" style={{ marginTop: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: "0.9rem" }}>{t("gantt.newTask")}</h4>
            <button
              onClick={() => { setShowTaskForm(false); setError(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleAddTask}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">{t("gantt.nameRequired")}</label>
                <input
                  className="form-input"
                  required
                  placeholder={t("gantt.taskNamePlaceholder")}
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t("gantt.phase")}</label>
                <select
                  className="form-select"
                  value={taskPhaseId}
                  onChange={(e) => setTaskPhaseId(e.target.value)}
                >
                  <option value="">{t("gantt.noPhase")}</option>
                  {phases.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t("gantt.priority")}</label>
                <select
                  className="form-select"
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                >
                  <option value="low">{t("gantt.priorityLow")}</option>
                  <option value="medium">{t("gantt.priorityMedium")}</option>
                  <option value="high">{t("gantt.priorityHigh")}</option>
                  <option value="critical">{t("gantt.priorityCritical")}</option>
                </select>
              </div>
              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 20 }}>
                <input
                  type="checkbox"
                  id="gantt-milestone"
                  checked={taskMilestone}
                  onChange={(e) => setTaskMilestone(e.target.checked)}
                />
                <label htmlFor="gantt-milestone" style={{ fontSize: "0.85rem", cursor: "pointer" }}>{t("gantt.milestone")}</label>
              </div>
              <div className="form-group">
                <label className="form-label">{t("gantt.startDate")}</label>
                <input
                  type="date"
                  className="form-input"
                  value={taskStart}
                  onChange={(e) => setTaskStart(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t("gantt.endDate")}</label>
                <input
                  type="date"
                  className="form-input"
                  value={taskEnd}
                  onChange={(e) => setTaskEnd(e.target.value)}
                />
              </div>
            </div>
            {error && <p style={{ color: "var(--color-red)", fontSize: "0.85rem", marginTop: 8 }}>{error}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button type="button" className="btn-secondary" onClick={() => { setShowTaskForm(false); setError(""); }}>
                {t("gantt.cancel")}
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? t("gantt.creating") : t("gantt.createTask")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Import Phases Modal */}
      {showImportPhases && (
        <ImportModal
          entityName={t("gantt.phases")}
          columns={PHASE_IMPORT_COLUMNS}
          sampleData={PHASE_IMPORT_SAMPLE}
          onImport={handleImportPhases}
          onClose={() => setShowImportPhases(false)}
        />
      )}

      {/* Import Tasks Modal */}
      {showImportTasks && (
        <ImportModal
          entityName={t("gantt.tasks")}
          columns={TASK_IMPORT_COLUMNS}
          sampleData={TASK_IMPORT_SAMPLE}
          onImport={handleImportTasks}
          onClose={() => setShowImportTasks(false)}
        />
      )}
    </div>
  );
}
