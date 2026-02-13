"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface MaintenanceClientProps {
  children: React.ReactNode;
}

interface PropertyOption {
  id: string;
  name: string;
}

export default function MaintenanceClient({ children }: MaintenanceClientProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);

  const [formData, setFormData] = useState({
    property_id: "",
    title: "",
    description: "",
    priority: "medium",
    category: "",
    scheduled_date: "",
    estimated_cost: "",
  });

  // Fetch properties when modal opens
  useEffect(() => {
    if (!showCreate) return;
    setLoadingProperties(true);
    const supabase = createClient();
    supabase
      .from("properties")
      .select("id, name")
      .order("name", { ascending: true })
      .then(({ data }) => {
        setProperties(
          (data ?? []).map((p: Record<string, unknown>) => ({
            id: p.id as string,
            name: p.name as string,
          }))
        );
        setLoadingProperties(false);
      });
  }, [showCreate]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/properties/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: formData.property_id,
          title: formData.title,
          description: formData.description || undefined,
          priority: formData.priority,
          category: formData.category || undefined,
          scheduled_date: formData.scheduled_date || undefined,
          estimated_cost: formData.estimated_cost || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create request");
      }

      // Reset form and close modal
      setFormData({
        property_id: "",
        title: "",
        description: "",
        priority: "medium",
        category: "",
        scheduled_date: "",
        estimated_cost: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create request");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      {/* Header with create button */}
      <div className="fin-header">
        <div>
          <h2>Maintenance Requests</h2>
          <p className="fin-header-sub">
            Track work orders, preventive maintenance, and repair requests
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          New Request
        </button>
      </div>

      {children}

      {/* Create Maintenance Request Modal */}
      {showCreate && (
        <div className="ticket-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>New Maintenance Request</h3>
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
                <label className="ticket-form-label">Property *</label>
                <select
                  className="ticket-form-select"
                  value={formData.property_id}
                  onChange={(e) =>
                    setFormData({ ...formData, property_id: e.target.value })
                  }
                  required
                >
                  <option value="">
                    {loadingProperties ? "Loading properties..." : "Select a property..."}
                  </option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Title *</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Brief description of the issue"
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
                  placeholder="Provide more details about the maintenance issue..."
                  rows={4}
                />
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Priority</label>
                  <select
                    className="ticket-form-select"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Category</label>
                  <select
                    className="ticket-form-select"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    <option value="">Select category...</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="electrical">Electrical</option>
                    <option value="hvac">HVAC</option>
                    <option value="structural">Structural</option>
                    <option value="cosmetic">Cosmetic</option>
                    <option value="appliance">Appliance</option>
                    <option value="pest_control">Pest Control</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Scheduled Date</label>
                  <input
                    type="date"
                    className="ticket-form-input"
                    value={formData.scheduled_date}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduled_date: e.target.value })
                    }
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Estimated Cost</label>
                  <input
                    type="number"
                    className="ticket-form-input"
                    value={formData.estimated_cost}
                    onChange={(e) =>
                      setFormData({ ...formData, estimated_cost: e.target.value })
                    }
                    placeholder="0.00"
                    min={0}
                    step="0.01"
                  />
                </div>
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
                  disabled={creating || !formData.title.trim() || !formData.property_id}
                >
                  {creating ? "Creating..." : "Create Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
