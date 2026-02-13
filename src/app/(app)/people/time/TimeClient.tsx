"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ProjectOption {
  id: string;
  name: string;
  code: string | null;
}

export default function TimeClient() {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const [formData, setFormData] = useState({
    project_id: "",
    entry_date: today,
    hours: "",
    overtime_hours: "0",
    description: "",
    cost_code: "",
  });

  // Fetch projects when modal opens
  useEffect(() => {
    if (!showCreate) return;
    setLoadingProjects(true);
    const supabase = createClient();
    supabase
      .from("projects")
      .select("id, name, code")
      .order("name", { ascending: true })
      .then(({ data }) => {
        setProjects(
          (data ?? []).map((p: Record<string, unknown>) => ({
            id: p.id as string,
            name: p.name as string,
            code: (p.code as string) || null,
          }))
        );
        setLoadingProjects(false);
      });
  }, [showCreate]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/people/time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: formData.project_id || undefined,
          entry_date: formData.entry_date,
          hours: Number(formData.hours),
          overtime_hours: Number(formData.overtime_hours || 0),
          description: formData.description || undefined,
          cost_code: formData.cost_code || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create time entry");
      }

      // Reset form and close modal
      setFormData({
        project_id: "",
        entry_date: today,
        hours: "",
        overtime_hours: "0",
        description: "",
        cost_code: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create time entry");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <button
        className="btn-primary"
        onClick={() => setShowCreate(true)}
      >
        <Plus size={16} />
        New Time Entry
      </button>

      {/* Create Time Entry Modal */}
      {showCreate && (
        <div className="ticket-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>New Time Entry</h3>
              <button
                className="ticket-modal-close"
                onClick={() => setShowCreate(false)}
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="ticket-form-error">{createError}</div>
            )}

            <form onSubmit={handleCreate} className="ticket-form">
              <div className="ticket-form-group">
                <label className="ticket-form-label">Project</label>
                <select
                  className="ticket-form-select"
                  value={formData.project_id}
                  onChange={(e) =>
                    setFormData({ ...formData, project_id: e.target.value })
                  }
                >
                  <option value="">
                    {loadingProjects ? "Loading projects..." : "Select a project..."}
                  </option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code ? `${p.code} - ` : ""}{p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Entry Date *</label>
                <input
                  type="date"
                  className="ticket-form-input"
                  value={formData.entry_date}
                  onChange={(e) =>
                    setFormData({ ...formData, entry_date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Hours *</label>
                  <input
                    type="number"
                    className="ticket-form-input"
                    value={formData.hours}
                    onChange={(e) =>
                      setFormData({ ...formData, hours: e.target.value })
                    }
                    placeholder="8.0"
                    min={0}
                    max={24}
                    step="0.5"
                    required
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Overtime Hours</label>
                  <input
                    type="number"
                    className="ticket-form-input"
                    value={formData.overtime_hours}
                    onChange={(e) =>
                      setFormData({ ...formData, overtime_hours: e.target.value })
                    }
                    placeholder="0"
                    min={0}
                    max={24}
                    step="0.5"
                  />
                </div>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Description</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="What work was performed?"
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Cost Code</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={formData.cost_code}
                  onChange={(e) =>
                    setFormData({ ...formData, cost_code: e.target.value })
                  }
                  placeholder="e.g., 03-100"
                />
              </div>

              <div className="ticket-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating || !formData.hours || !formData.entry_date}
                >
                  {creating ? "Creating..." : "Create Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
