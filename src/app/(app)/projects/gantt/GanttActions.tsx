"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

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

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>
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
    </div>
  );
}
