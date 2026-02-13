"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { value: "plans", label: "Plans" },
  { value: "drawings", label: "Drawings" },
  { value: "specs", label: "Specifications" },
  { value: "submittals", label: "Submittals" },
  { value: "as_builts", label: "As-Builts" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Project {
  id: string;
  name: string;
}

export default function PlanRoomCreateButton() {
  const router = useRouter();

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [formData, setFormData] = useState({
    project_id: "",
    name: "",
    description: "",
    category: "plans",
    version: "1",
    file_url: "",
    tags: "",
  });

  // Fetch projects when modal opens
  useEffect(() => {
    if (!showCreate) return;

    async function fetchProjects() {
      setLoadingProjects(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("projects")
          .select("id, name")
          .order("name");
        setProjects(data ?? []);
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      } finally {
        setLoadingProjects(false);
      }
    }

    fetchProjects();
  }, [showCreate]);

  function resetForm() {
    setFormData({
      project_id: "",
      name: "",
      description: "",
      category: "plans",
      version: "1",
      file_url: "",
      tags: "",
    });
    setCreateError("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/documents/plan-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: formData.project_id,
          name: formData.name,
          description: formData.description || undefined,
          category: formData.category,
          version: formData.version ? Number(formData.version) : 1,
          file_url: formData.file_url || undefined,
          tags: formData.tags || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload plan");
      }

      resetForm();
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to upload plan"
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setShowCreate(true)}>
        <Plus size={16} />
        Upload Plans
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
              <h3>Upload Plans</h3>
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
                <label className="ticket-form-label">Project *</label>
                <select
                  className="ticket-form-select"
                  value={formData.project_id}
                  onChange={(e) =>
                    setFormData({ ...formData, project_id: e.target.value })
                  }
                  required
                >
                  <option value="">
                    {loadingProjects
                      ? "Loading projects..."
                      : "Select a project..."}
                  </option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Document Name *</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Floor Plan - Level 1"
                  required
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Description</label>
                <textarea
                  className="ticket-form-textarea"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe this document..."
                  rows={3}
                />
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Category</label>
                  <select
                    className="ticket-form-select"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Version</label>
                  <input
                    type="number"
                    className="ticket-form-input"
                    value={formData.version}
                    onChange={(e) =>
                      setFormData({ ...formData, version: e.target.value })
                    }
                    min="1"
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">
                  File URL / Filename
                </label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={formData.file_url}
                  onChange={(e) =>
                    setFormData({ ...formData, file_url: e.target.value })
                  }
                  placeholder="https://... or filename.pdf"
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Tags</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  placeholder="Comma-separated tags (e.g., structural, foundation, rev-a)"
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    creating ||
                    !formData.name.trim() ||
                    !formData.project_id
                  }
                >
                  {creating ? "Uploading..." : "Upload Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
