"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Search,
  X,
  Pencil,
  MapPin,
  Globe,
  Phone,
  Users,
  Clock,
  DollarSign,
  Calendar,
  KeyRound,
  Mail,
} from "lucide-react";
import type { PlatformCompany, CompanyMember } from "@/lib/queries/super-admin";

type CompanyRow = PlatformCompany & { member_count: number };

interface Props {
  companies: CompanyRow[];
  membersByCompany: Record<string, CompanyMember[]>;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAddress(c: PlatformCompany): string | null {
  const parts = [c.address_line1, c.address_line2, c.city, c.state, c.zip].filter(Boolean);
  if (parts.length === 0) return null;
  const street = [c.address_line1, c.address_line2].filter(Boolean).join(", ");
  const cityStateZip = [c.city, c.state].filter(Boolean).join(", ") + (c.zip ? ` ${c.zip}` : "");
  return [street, cityStateZip].filter(Boolean).join("\n");
}

function getRoleBadgeStyle(role: string): React.CSSProperties {
  switch (role) {
    case "owner":
      return { background: "rgba(220, 38, 38, 0.1)", color: "var(--color-red)" };
    case "admin":
      return { background: "rgba(180, 83, 9, 0.1)", color: "var(--color-amber)" };
    case "project_manager":
      return { background: "rgba(29, 78, 216, 0.1)", color: "var(--color-blue)" };
    default:
      return { background: "var(--surface)", color: "var(--muted)" };
  }
}

function formatRole(role: string): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getPlanBadgeClass(plan: string): string {
  switch (plan) {
    case "enterprise":
      return "sa-plan-enterprise";
    case "professional":
      return "sa-plan-professional";
    default:
      return "sa-plan-starter";
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "active":
      return "sa-status-active";
    case "trial":
      return "sa-status-trial";
    case "canceled":
      return "sa-status-canceled";
    case "past_due":
      return "sa-status-past_due";
    default:
      return "";
  }
}

export default function CompaniesClient({ companies, membersByCompany }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Detail modal state
  const [selected, setSelected] = useState<CompanyRow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ subscription_plan: "", subscription_status: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  function openDetail(company: CompanyRow) {
    setSelected(company);
    setIsEditing(false);
    setSaveError(null);
    setActionMessage(null);
  }

  function closeDetail() {
    setSelected(null);
    setIsEditing(false);
    setSaveError(null);
    setActionMessage(null);
  }

  function startEditing() {
    if (!selected) return;
    setEditData({
      subscription_plan: selected.subscription_plan,
      subscription_status: selected.subscription_status,
    });
    setIsEditing(true);
    setSaveError(null);
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/super-admin/companies/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription_plan: editData.subscription_plan,
          subscription_status: editData.subscription_status,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to save (${res.status})`);
      }
      setSelected({
        ...selected,
        subscription_plan: editData.subscription_plan,
        subscription_status: editData.subscription_status,
      });
      setIsEditing(false);
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(userId: string, email: string) {
    setSaving(true);
    setActionMessage(null);
    setSaveError(null);
    try {
      const res = await fetch("/api/super-admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to send reset email");
      }
      setActionMessage(`Password reset email sent to ${email}`);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setSaving(false);
    }
  }

  const filtered = companies.filter((c) => {
    const matchesSearch =
      search === "" ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === "all" || c.subscription_plan === planFilter;
    const matchesStatus = statusFilter === "all" || c.subscription_status === statusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const totalActive = companies.filter((c) => c.subscription_status === "active").length;
  const totalTrial = companies.filter((c) => c.subscription_status === "trial").length;
  const totalUsers = companies.reduce((sum, c) => sum + c.member_count, 0);

  const members = selected ? (membersByCompany[selected.id] || []) : [];
  const address = selected ? formatAddress(selected) : null;

  return (
    <>
      <div className="admin-header">
        <div>
          <h2>Companies</h2>
          <p className="admin-header-sub">
            All registered companies on the platform
          </p>
        </div>
      </div>

      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <Building2 size={18} />
          </div>
          <div className="admin-stat-label">Total Companies</div>
          <div className="admin-stat-value">{companies.length}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon green">
            <Building2 size={18} />
          </div>
          <div className="admin-stat-label">Active</div>
          <div className="admin-stat-value">{totalActive}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon amber">
            <Building2 size={18} />
          </div>
          <div className="admin-stat-label">Trial</div>
          <div className="admin-stat-value">{totalTrial}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <Building2 size={18} />
          </div>
          <div className="admin-stat-label">Total Users</div>
          <div className="admin-stat-value">{totalUsers}</div>
        </div>
      </div>

      <div style={{
        display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap",
        alignItems: "center",
      }}>
        <div style={{ position: "relative", flex: "1 1 200px", maxWidth: "320px" }}>
          <Search
            size={14}
            style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}
          />
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="invite-form-input"
            style={{ paddingLeft: "32px", width: "100%" }}
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="invite-form-select"
        >
          <option value="all">All Plans</option>
          <option value="starter">Starter</option>
          <option value="professional">Professional</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="invite-form-select"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="past_due">Past Due</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Slug</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Users</th>
              <th>Industry</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                  No companies found
                </td>
              </tr>
            ) : (
              filtered.map((company) => (
                <tr key={company.id} onClick={() => openDetail(company)} style={{ cursor: "pointer" }}>
                  <td style={{ fontWeight: 500 }}>{company.name}</td>
                  <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                    {company.slug}
                  </td>
                  <td>
                    <span className={`sa-plan-badge ${getPlanBadgeClass(company.subscription_plan)}`}>
                      {company.subscription_plan}
                    </span>
                  </td>
                  <td>
                    <span className={`sa-status-badge ${getStatusBadgeClass(company.subscription_status)}`}>
                      <span className="sa-status-dot" />
                      {company.subscription_status}
                    </span>
                  </td>
                  <td>{company.member_count}</td>
                  <td style={{ color: "var(--muted)" }}>{company.industry_type || "-"}</td>
                  <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                    {formatDate(company.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="ticket-modal-overlay" onClick={closeDetail}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
            {/* Modal Header */}
            <div className="ticket-modal-header">
              <h3>
                {selected.name}
                <span
                  className={`sa-status-badge ${getStatusBadgeClass(selected.subscription_status)}`}
                  style={{ marginLeft: 10, fontSize: "0.75rem" }}
                >
                  <span className="sa-status-dot" />
                  {selected.subscription_status}
                </span>
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {!isEditing && (
                  <button className="ticket-modal-close" onClick={startEditing} title="Edit Subscription">
                    <Pencil size={16} />
                  </button>
                )}
                <button className="ticket-modal-close" onClick={closeDetail}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {saveError && <div className="ticket-form-error">{saveError}</div>}
            {actionMessage && (
              <div style={{
                background: "rgba(22, 163, 74, 0.06)",
                border: "1px solid rgba(22, 163, 74, 0.2)",
                borderRadius: 8,
                padding: "10px 14px",
                color: "var(--color-green)",
                fontSize: "0.85rem",
                margin: "0 0 12px",
              }}>
                {actionMessage}
              </div>
            )}

            {/* ---- Edit Mode ---- */}
            {isEditing && (
              <div style={{ padding: "1.2rem" }}>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Plan</label>
                  <select
                    className="ticket-form-select"
                    value={editData.subscription_plan}
                    onChange={(e) => setEditData({ ...editData, subscription_plan: e.target.value })}
                  >
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Status</label>
                  <select
                    className="ticket-form-select"
                    value={editData.subscription_status}
                    onChange={(e) => setEditData({ ...editData, subscription_status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="past_due">Past Due</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>
                <div className="ticket-form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)} disabled={saving}>
                    Cancel
                  </button>
                  <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {/* ---- View Mode ---- */}
            {!isEditing && (
              <div style={{ padding: "1.25rem" }}>
                {/* Company Info */}
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">Slug</label>
                    <div className="detail-value">{selected.slug}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">Industry</label>
                    <div className="detail-value">{selected.industry_type || "—"}</div>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <DollarSign size={12} /> Plan
                      </span>
                    </label>
                    <div className="detail-value">
                      <span className={`sa-plan-badge ${getPlanBadgeClass(selected.subscription_plan)}`}>
                        {selected.subscription_plan}
                      </span>
                    </div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Calendar size={12} /> Created
                      </span>
                    </label>
                    <div className="detail-value">{formatDate(selected.created_at)}</div>
                  </div>
                </div>

                {selected.trial_ends_at && (
                  <div className="detail-group">
                    <label className="detail-label">Trial Ends</label>
                    <div className="detail-value">{formatDate(selected.trial_ends_at)}</div>
                  </div>
                )}

                {/* Contact & Address */}
                <div style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginTop: 16,
                  marginBottom: 8,
                }}>
                  Contact & Location
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Phone size={12} /> Phone
                      </span>
                    </label>
                    <div className="detail-value">{selected.phone || "—"}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Globe size={12} /> Website
                      </span>
                    </label>
                    <div className="detail-value">
                      {selected.website ? (
                        <a href={selected.website} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-blue)", textDecoration: "none" }}>
                          {selected.website.replace(/^https?:\/\//, "")}
                        </a>
                      ) : "—"}
                    </div>
                  </div>
                </div>

                <div className="detail-group">
                  <label className="detail-label">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={12} /> Address
                    </span>
                  </label>
                  <div className="detail-value" style={{ whiteSpace: "pre-line" }}>
                    {address || "—"}
                  </div>
                </div>

                {/* Settings */}
                <div style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginTop: 16,
                  marginBottom: 8,
                }}>
                  Settings
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <DollarSign size={12} /> Currency
                      </span>
                    </label>
                    <div className="detail-value">{selected.currency || "USD"}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Clock size={12} /> Timezone
                      </span>
                    </label>
                    <div className="detail-value">{selected.timezone || "America/Chicago"}</div>
                  </div>
                </div>

                {/* Members */}
                <div style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginTop: 16,
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}>
                  <Users size={12} /> Members ({members.length})
                </div>

                <div style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  overflow: "hidden",
                }}>
                  {members.length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
                      No members found
                    </div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>User</th>
                          <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Role</th>
                          <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((m) => (
                          <tr key={m.user_id} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "10px 12px" }}>
                              <div style={{ fontWeight: 500 }}>{m.full_name || "No name"}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                                  <Mail size={10} /> {m.email}
                                </span>
                              </div>
                              {m.job_title && (
                                <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{m.job_title}</div>
                              )}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: 6,
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                ...getRoleBadgeStyle(m.role),
                              }}>
                                {formatRole(m.role)}
                              </span>
                              {!m.is_active && (
                                <span style={{
                                  display: "inline-block",
                                  marginLeft: 6,
                                  padding: "2px 6px",
                                  borderRadius: 6,
                                  fontSize: "0.7rem",
                                  background: "var(--surface)",
                                  color: "var(--muted)",
                                }}>
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              <div style={{ display: "flex", gap: 4 }}>
                                <button
                                  onClick={() => handleResetPassword(m.user_id, m.email)}
                                  disabled={saving}
                                  title={`Reset password for ${m.email}`}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    padding: "4px 8px",
                                    border: "1px solid var(--border)",
                                    borderRadius: 6,
                                    background: "transparent",
                                    color: "var(--text)",
                                    fontSize: "0.72rem",
                                    cursor: "pointer",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  <KeyRound size={11} /> Reset PW
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="ticket-form-actions" style={{ marginTop: 16 }}>
                  <button type="button" className="btn-secondary" onClick={closeDetail}>
                    Close
                  </button>
                  <button type="button" className="btn-primary" onClick={startEditing}>
                    <Pencil size={14} /> Edit Subscription
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
