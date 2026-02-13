"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

export default function PeopleClient() {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [formData, setFormData] = useState({
    contact_type: "employee",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company_name: "",
    job_title: "",
    notes: "",
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_type: formData.contact_type,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          company_name: formData.company_name || undefined,
          job_title: formData.job_title || undefined,
          notes: formData.notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add contact");
      }

      // Reset form and close modal
      setFormData({
        contact_type: "employee",
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        company_name: "",
        job_title: "",
        notes: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to add contact");
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
        Add Contact
      </button>

      {/* Create Contact Modal */}
      {showCreate && (
        <div className="ticket-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>Add New Contact</h3>
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
                <label className="ticket-form-label">Type *</label>
                <select
                  className="ticket-form-select"
                  value={formData.contact_type}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_type: e.target.value })
                  }
                >
                  <option value="employee">Employee</option>
                  <option value="subcontractor">Subcontractor</option>
                  <option value="vendor">Vendor</option>
                  <option value="client">Client</option>
                  <option value="inspector">Inspector</option>
                </select>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">First Name *</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    placeholder="First name"
                    required
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Last Name *</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                    placeholder="Last name"
                    required
                  />
                </div>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Email</label>
                  <input
                    type="email"
                    className="ticket-form-input"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="email@example.com"
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Phone</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Company Name</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={formData.company_name}
                    onChange={(e) =>
                      setFormData({ ...formData, company_name: e.target.value })
                    }
                    placeholder="Company or organization"
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Title / Position</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={formData.job_title}
                    onChange={(e) =>
                      setFormData({ ...formData, job_title: e.target.value })
                    }
                    placeholder="Job title or role"
                  />
                </div>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Notes</label>
                <textarea
                  className="ticket-form-textarea"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Optional notes about this contact..."
                  rows={3}
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
                  disabled={creating || !formData.first_name.trim() || !formData.last_name.trim()}
                >
                  {creating ? "Adding..." : "Add Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
