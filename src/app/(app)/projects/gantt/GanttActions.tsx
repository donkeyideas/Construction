"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Upload } from "lucide-react";
import ImportModal from "@/components/ImportModal";
import { type ImportColumn } from "@/lib/utils/csv-parser";

const PHASE_COLORS = [
  { label: "Blue", value: "#3b82f6" },
  { label: "Green", value: "#10b981" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Red", value: "#ef4444" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Pink", value: "#ec4899" },
  { label: "Lime", value: "#84cc16" },
];

// ---------------------------------------------------------------------------
// Import column definitions
// ---------------------------------------------------------------------------

const PHASE_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "name", label: "Phase Name", required: true },
  { key: "color", label: "Color (hex)", required: false },
  { key: "start_date", label: "Start Date", required: false, type: "date" },
  { key: "end_date", label: "End Date", required: false, type: "date" },
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
        throw new Error(data.error || "Failed to create phase");
      }
      setPhaseName("");
      setPhaseColor("#3b82f6");
      setPhaseStart("");
      setPhaseEnd("");
      setShowPhaseForm(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create phase");
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
        throw new Error(data.error || "Failed to create task");
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
      setError(err instanceof Error ? err.message : "Failed to create task");
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
    if (!res.ok) throw new Error(data.error || "Import failed");
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
    if (!res.ok) throw new Error(data.error || "Import failed");
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          className="btn-secondary"
          onClick={() => { setShowPhaseForm(!showPhaseForm); setShowTaskForm(false); setError(""); }}
        >
          <Plus size={16} /> Add Phase
        </button>
        <button
          className="btn-secondary"
          onClick={() => { setShowTaskForm(!showTaskForm); setShowPhaseForm(false); setError(""); }}
        >
          <Plus size={16} /> Add Task
        </button>
        <button
          className="btn-secondary"
          onClick={() => { closeAllForms(); setShowImportPhases(true); }}
        >
          <Upload size={16} /> Import Phases
        </button>
        <button
          className="btn-secondary"
          onClick={() => { closeAllForms(); setShowImportTasks(true); }}
        >
          <Upload size={16} /> Import Tasks
        </button>
      </div>

      {/* Add Phase Form */}
      {showPhaseForm && (
        <div className="fin-chart-card" style={{ marginTop: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: "0.9rem" }}>New Phase</h4>
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
                <label className="form-label">Name *</label>
                <input
                  className="form-input"
                  required
                  placeholder="e.g. Foundation"
                  value={phaseName}
                  onChange={(e) => setPhaseName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Color</label>
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
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={phaseStart}
                  onChange={(e) => setPhaseStart(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
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
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Creating..." : "Create Phase"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Task Form */}
      {showTaskForm && (
        <div className="fin-chart-card" style={{ marginTop: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: "0.9rem" }}>New Task</h4>
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
                <label className="form-label">Name *</label>
                <input
                  className="form-input"
                  required
                  placeholder="e.g. Pour concrete slab"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phase</label>
                <select
                  className="form-select"
                  value={taskPhaseId}
                  onChange={(e) => setTaskPhaseId(e.target.value)}
                >
                  <option value="">No phase</option>
                  {phases.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="form-select"
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 20 }}>
                <input
                  type="checkbox"
                  id="gantt-milestone"
                  checked={taskMilestone}
                  onChange={(e) => setTaskMilestone(e.target.checked)}
                />
                <label htmlFor="gantt-milestone" style={{ fontSize: "0.85rem", cursor: "pointer" }}>Milestone</label>
              </div>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={taskStart}
                  onChange={(e) => setTaskStart(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
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
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Creating..." : "Create Task"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Import Phases Modal */}
      {showImportPhases && (
        <ImportModal
          entityName="Phases"
          columns={PHASE_IMPORT_COLUMNS}
          sampleData={PHASE_IMPORT_SAMPLE}
          onImport={handleImportPhases}
          onClose={() => setShowImportPhases(false)}
        />
      )}

      {/* Import Tasks Modal */}
      {showImportTasks && (
        <ImportModal
          entityName="Tasks"
          columns={TASK_IMPORT_COLUMNS}
          sampleData={TASK_IMPORT_SAMPLE}
          onImport={handleImportTasks}
          onClose={() => setShowImportTasks(false)}
        />
      )}
    </div>
  );
}
