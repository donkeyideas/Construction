"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Flag,
  ToggleLeft,
  ToggleRight,
  Plus,
  Trash2,
  Edit3,
  Shield,
  Zap,
  Search,
  X,
  Loader2,
} from "lucide-react";

interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  plan_requirements: string[];
  created_at: string;
  updated_at: string;
}

interface Props {
  flags: FeatureFlag[];
}

const PLANS = [
  { value: "starter", label: "Starter" },
  { value: "professional", label: "Professional" },
  { value: "enterprise", label: "Enterprise" },
];

function formatName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const PLAN_COLORS: Record<string, { bg: string; color: string }> = {
  starter: { bg: "rgba(59, 130, 246, 0.1)", color: "var(--color-blue, #3b82f6)" },
  professional: { bg: "rgba(245, 158, 11, 0.1)", color: "var(--color-amber, #f59e0b)" },
  enterprise: { bg: "rgba(139, 92, 246, 0.1)", color: "var(--color-purple, #8b5cf6)" },
};

export default function FeatureFlagsClient({ flags }: Props) {
  const router = useRouter();

  // UI state
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Toggle loading state
  const [toggling, setToggling] = useState<string | null>(null);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newEnabled, setNewEnabled] = useState(false);
  const [newPlans, setNewPlans] = useState<string[]>([]);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editPlans, setEditPlans] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // KPI counts
  const totalFlags = flags.length;
  const enabledFlags = flags.filter((f) => f.is_enabled).length;
  const disabledFlags = flags.filter((f) => !f.is_enabled).length;

  // Filtered flags
  const filtered = flags.filter((f) => {
    const q = search.toLowerCase();
    return f.name.toLowerCase().includes(q) || formatName(f.name).toLowerCase().includes(q);
  });

  // --- Handlers ---

  async function handleToggle(flag: FeatureFlag) {
    setToggling(flag.id);
    setError("");

    try {
      const res = await fetch(`/api/super-admin/feature-flags/${flag.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: !flag.is_enabled }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to toggle feature flag.");
        return;
      }

      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setToggling(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/super-admin/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || undefined,
          is_enabled: newEnabled,
          plan_requirements: newPlans,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create feature flag.");
        return;
      }

      setSuccess("Feature flag created successfully.");
      setNewName("");
      setNewDescription("");
      setNewEnabled(false);
      setNewPlans([]);
      setShowCreate(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(flag: FeatureFlag) {
    setEditingId(flag.id);
    setEditDescription(flag.description || "");
    setEditPlans([...(flag.plan_requirements || [])]);
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDescription("");
    setEditPlans([]);
  }

  async function handleSaveEdit(flagId: string) {
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/super-admin/feature-flags/${flagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: editDescription,
          plan_requirements: editPlans,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update feature flag.");
        return;
      }

      setSuccess("Feature flag updated successfully.");
      cancelEdit();
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(flagId: string) {
    setDeleting(true);
    setError("");

    try {
      const res = await fetch(`/api/super-admin/feature-flags/${flagId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete feature flag.");
        return;
      }

      setSuccess("Feature flag deleted successfully.");
      setDeletingId(null);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  function toggleNewPlan(plan: string) {
    setNewPlans((prev) =>
      prev.includes(plan) ? prev.filter((p) => p !== plan) : [...prev, plan]
    );
  }

  function toggleEditPlan(plan: string) {
    setEditPlans((prev) =>
      prev.includes(plan) ? prev.filter((p) => p !== plan) : [...prev, plan]
    );
  }

  // --- Toggle Switch Component ---
  function ToggleSwitch({
    enabled,
    onClick,
    disabled,
  }: {
    enabled: boolean;
    onClick: () => void;
    disabled?: boolean;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        style={{
          width: 48,
          height: 26,
          borderRadius: 13,
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          background: enabled ? "var(--color-green)" : "var(--border)",
          position: "relative",
          transition: "background 0.2s",
          opacity: disabled ? 0.6 : 1,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: enabled ? 24 : 3,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        />
      </button>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="admin-header">
        <div>
          <h2>Feature Flags</h2>
          <p className="admin-header-sub">
            Manage feature flags to control feature availability across plans
          </p>
        </div>
        <div className="admin-header-actions">
          <button
            className="sa-action-btn primary"
            onClick={() => {
              setShowCreate(true);
              setError("");
              setSuccess("");
            }}
          >
            <Plus size={14} /> New Feature Flag
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="admin-stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <Flag size={18} />
          </div>
          <div className="admin-stat-label">Total Flags</div>
          <div className="admin-stat-value">{totalFlags}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon green">
            <ToggleRight size={18} />
          </div>
          <div className="admin-stat-label">Enabled</div>
          <div className="admin-stat-value">{enabledFlags}</div>
        </div>
        <div className="admin-stat-card">
          <div
            className="admin-stat-icon"
            style={{
              background: "var(--color-muted-bg, #f3f4f6)",
              color: "var(--muted)",
            }}
          >
            <ToggleLeft size={18} />
          </div>
          <div className="admin-stat-label">Disabled</div>
          <div className="admin-stat-value">{disabledFlags}</div>
        </div>
      </div>

      {/* Messages */}
      {error && <div className="invite-error">{error}</div>}
      {success && <div className="invite-success">{success}</div>}

      {/* Search Bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ position: "relative", maxWidth: 400 }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted)",
            }}
          />
          <input
            type="text"
            className="ticket-form-input"
            placeholder="Search flags by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--muted)",
                padding: 4,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Feature Flag Cards */}
      {filtered.length === 0 ? (
        <div
          className="sa-card"
          style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}
        >
          {search
            ? "No feature flags match your search."
            : "No feature flags yet. Create your first one!"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((flag) => (
            <div className="sa-card" key={flag.id} style={{ padding: 0 }}>
              {/* Delete Confirmation */}
              {deletingId === flag.id ? (
                <div style={{ padding: 20 }}>
                  <p style={{ marginBottom: 16, fontWeight: 500 }}>
                    Are you sure you want to delete &quot;{formatName(flag.name)}&quot;? This action cannot be undone.
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="sa-action-btn"
                      onClick={() => setDeletingId(null)}
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                    <button
                      className="sa-action-btn danger"
                      onClick={() => handleDelete(flag.id)}
                      disabled={deleting}
                    >
                      {deleting ? (
                        <Loader2 size={14} className="spin-animation" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      {deleting ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ) : editingId === flag.id ? (
                /* Edit Mode */
                <div style={{ padding: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 16,
                    }}
                  >
                    <Shield
                      size={18}
                      style={{ color: "var(--primary)", flexShrink: 0 }}
                    />
                    <span style={{ fontWeight: 600, fontSize: "1rem" }}>
                      {formatName(flag.name)}
                    </span>
                  </div>

                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Description</label>
                    <textarea
                      className="ticket-form-input"
                      rows={3}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Describe what this feature flag controls..."
                      style={{ resize: "vertical" }}
                    />
                  </div>

                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Plan Requirements</label>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {PLANS.map((plan) => (
                        <label
                          key={plan.value}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            cursor: "pointer",
                            fontSize: "0.9rem",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={editPlans.includes(plan.value)}
                            onChange={() => toggleEditPlan(plan.value)}
                          />
                          {plan.label}
                        </label>
                      ))}
                    </div>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--muted)",
                        marginTop: 4,
                        display: "block",
                      }}
                    >
                      Leave all unchecked to make available to all plans.
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button
                      className="sa-action-btn"
                      onClick={cancelEdit}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      className="sa-action-btn primary"
                      onClick={() => handleSaveEdit(flag.id)}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 size={14} className="spin-animation" />
                      ) : (
                        <Zap size={14} />
                      )}
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div style={{ padding: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 16,
                    }}
                  >
                    {/* Left: Name + Description */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 6,
                        }}
                      >
                        <Flag
                          size={16}
                          style={{
                            color: flag.is_enabled
                              ? "var(--color-green)"
                              : "var(--muted)",
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: "0.95rem",
                          }}
                        >
                          {formatName(flag.name)}
                        </span>
                      </div>
                      {flag.description && (
                        <p
                          style={{
                            color: "var(--muted)",
                            fontSize: "0.85rem",
                            margin: "0 0 0 26px",
                            lineHeight: 1.4,
                          }}
                        >
                          {flag.description}
                        </p>
                      )}
                    </div>

                    {/* Right: Toggle + Actions */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <ToggleSwitch
                          enabled={flag.is_enabled}
                          onClick={() => handleToggle(flag)}
                          disabled={toggling === flag.id}
                        />
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: flag.is_enabled
                              ? "var(--color-green)"
                              : "var(--muted)",
                            minWidth: 55,
                          }}
                        >
                          {flag.is_enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>

                      <button
                        className="sa-action-btn"
                        onClick={() => startEdit(flag)}
                        title="Edit"
                        style={{ padding: "6px 10px" }}
                      >
                        <Edit3 size={14} />
                      </button>

                      <button
                        className="sa-action-btn danger"
                        onClick={() => setDeletingId(flag.id)}
                        title="Delete"
                        style={{ padding: "6px 10px" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Plan Requirement Pills */}
                  {flag.plan_requirements && flag.plan_requirements.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        marginTop: 12,
                        marginLeft: 26,
                        flexWrap: "wrap",
                      }}
                    >
                      {flag.plan_requirements.map((plan) => {
                        const colors = PLAN_COLORS[plan] || {
                          bg: "var(--surface)",
                          color: "var(--muted)",
                        };
                        return (
                          <span
                            key={plan}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "3px 10px",
                              borderRadius: 12,
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              background: colors.bg,
                              color: colors.color,
                              textTransform: "capitalize",
                            }}
                          >
                            {plan === "enterprise" && <Shield size={11} />}
                            {plan === "professional" && <Zap size={11} />}
                            {plan === "starter" && <Flag size={11} />}
                            {plan}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div
          className="ticket-modal-overlay"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="ticket-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ticket-modal-header">
              <h3>New Feature Flag</h3>
              <button
                className="ticket-modal-close"
                onClick={() => setShowCreate(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="ticket-form">
              <div style={{ padding: "1.2rem" }}>
                <p
                  style={{
                    color: "var(--muted)",
                    fontSize: "0.85rem",
                    marginBottom: "1rem",
                  }}
                >
                  Create a new feature flag to control feature availability
                  across different subscription plans.
                </p>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Name *</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    placeholder="e.g. advanced_reports"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Description</label>
                  <textarea
                    className="ticket-form-input"
                    rows={3}
                    placeholder="Describe what this feature flag controls..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    style={{ resize: "vertical" }}
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Enabled</label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginTop: 4,
                    }}
                  >
                    <ToggleSwitch
                      enabled={newEnabled}
                      onClick={() => setNewEnabled(!newEnabled)}
                    />
                    <span
                      style={{
                        fontSize: "0.85rem",
                        color: newEnabled
                          ? "var(--color-green)"
                          : "var(--muted)",
                      }}
                    >
                      {newEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Plan Requirements</label>
                  <div
                    style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
                  >
                    {PLANS.map((plan) => (
                      <label
                        key={plan.value}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          cursor: "pointer",
                          fontSize: "0.9rem",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={newPlans.includes(plan.value)}
                          onChange={() => toggleNewPlan(plan.value)}
                        />
                        {plan.label}
                      </label>
                    ))}
                  </div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--muted)",
                      marginTop: 4,
                      display: "block",
                    }}
                  >
                    Select which plans have access. Leave all unchecked to make
                    available to all plans.
                  </span>
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
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Create Flag"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline spin animation */}
      <style>{`
        .spin-animation {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
