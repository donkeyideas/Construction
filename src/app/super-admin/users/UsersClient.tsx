"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Users,
  Shield,
  Search,
  X,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Building2,
  KeyRound,
  LayoutDashboard,
  Home,
  Truck,
} from "lucide-react";
import type { PlatformUser, UserMembership } from "@/lib/queries/super-admin";

type UserRow = PlatformUser & { memberships: UserMembership[] };

interface Props {
  users: UserRow[];
}

function formatDate(dateStr: string, loc: string): string {
  return new Date(dateStr).toLocaleDateString(loc, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.substring(0, 2).toUpperCase();
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

function getDashboardLabel(user: UserRow): string {
  if (user.is_platform_admin) return "Super Admin";
  if (user.portal_type === "tenant") return "Tenant";
  if (user.portal_type === "vendor") return "Vendor";
  return "App";
}

function getDashboardBadgeStyle(label: string): React.CSSProperties {
  switch (label) {
    case "Super Admin":
      return { background: "rgba(180, 83, 9, 0.1)", color: "var(--color-amber)" };
    case "Tenant":
      return { background: "rgba(22, 163, 74, 0.08)", color: "var(--color-green)" };
    case "Vendor":
      return { background: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6" };
    default:
      return { background: "rgba(29, 78, 216, 0.1)", color: "var(--color-blue)" };
  }
}

export default function UsersClient({ users }: Props) {
  const router = useRouter();
  const t = useTranslations("superAdmin");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const dashboardLabels: Record<string, string> = {
    "Super Admin": t("superAdminLabel"),
    "Tenant": t("tenant"),
    "Vendor": t("vendor"),
    "App": t("app"),
  };

  const [search, setSearch] = useState("");
  const [adminFilter, setAdminFilter] = useState("all");
  const [dashboardFilter, setDashboardFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    const matchesSearch =
      search === "" ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(search.toLowerCase()));
    const matchesAdmin =
      adminFilter === "all" ||
      (adminFilter === "admin" && u.is_platform_admin) ||
      (adminFilter === "user" && !u.is_platform_admin);
    const label = getDashboardLabel(u);
    const matchesDashboard =
      dashboardFilter === "all" || label === dashboardFilter;
    return matchesSearch && matchesAdmin && matchesDashboard;
  });

  const totalUsers = users.length;
  const appUsers = users.filter((u) => !u.portal_type && !u.is_platform_admin).length;
  const tenantUsers = users.filter((u) => u.portal_type === "tenant").length;
  const vendorUsers = users.filter((u) => u.portal_type === "vendor").length;

  function openModal(user: UserRow) {
    setSelectedUser(user);
    setSaveError(null);
    setActionMessage(null);
  }

  function closeModal() {
    setSelectedUser(null);
    setSaveError(null);
    setActionMessage(null);
  }

  async function handleToggleAdmin() {
    if (!selectedUser) return;
    setSaving(true);
    setSaveError(null);
    setActionMessage(null);
    try {
      const newStatus = !selectedUser.is_platform_admin;
      const res = await fetch(`/api/super-admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_platform_admin: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("failedUpdateUser"));
      setSelectedUser({ ...selectedUser, is_platform_admin: newStatus });
      setActionMessage(newStatus ? t("grantedAdmin") : t("revokedAdmin"));
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("failedUpdateUser"));
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!selectedUser) return;
    setSaving(true);
    setActionMessage(null);
    setSaveError(null);
    try {
      const res = await fetch("/api/super-admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedUser.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || t("failedSendReset"));
      }
      setActionMessage(t("passwordResetSent", { email: selectedUser.email }));
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("failedResetPassword"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="admin-header">
        <div>
          <h2>{t("platformUsers")}</h2>
          <p className="admin-header-sub">
            {t("allUsersDesc")}
          </p>
        </div>
      </div>

      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <Users size={18} />
          </div>
          <div className="admin-stat-label">{t("totalUsers")}</div>
          <div className="admin-stat-value">{totalUsers}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <LayoutDashboard size={18} />
          </div>
          <div className="admin-stat-label">{t("appUsers")}</div>
          <div className="admin-stat-value">{appUsers}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon green">
            <Home size={18} />
          </div>
          <div className="admin-stat-label">{t("tenants")}</div>
          <div className="admin-stat-value">{tenantUsers}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: "rgba(139, 92, 246, 0.08)", color: "#8b5cf6" }}>
            <Truck size={18} />
          </div>
          <div className="admin-stat-label">{t("vendors")}</div>
          <div className="admin-stat-value">{vendorUsers}</div>
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
            placeholder={t("searchUsers")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="invite-form-input"
            style={{ paddingLeft: "32px", width: "100%" }}
          />
        </div>
        <select
          value={dashboardFilter}
          onChange={(e) => setDashboardFilter(e.target.value)}
          className="invite-form-select"
        >
          <option value="all">{t("allDashboards")}</option>
          <option value="App">{t("app")}</option>
          <option value="Tenant">{t("tenant")}</option>
          <option value="Vendor">{t("vendor")}</option>
          <option value="Super Admin">{t("superAdminLabel")}</option>
        </select>
        <select
          value={adminFilter}
          onChange={(e) => setAdminFilter(e.target.value)}
          className="invite-form-select"
        >
          <option value="all">{t("allRoles")}</option>
          <option value="admin">{t("platformAdmins")}</option>
          <option value="user">{t("regularUsers")}</option>
        </select>
      </div>

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>{t("user")}</th>
              <th>{t("email")}</th>
              <th>{t("dashboard")}</th>
              <th>{t("companies2")}</th>
              <th>{t("platformAdmin")}</th>
              <th>{t("joined")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                  {t("noUsersFound")}
                </td>
              </tr>
            ) : (
              filtered.map((user) => {
                const dashLabel = getDashboardLabel(user);
                return (
                  <tr key={user.id} onClick={() => openModal(user)} style={{ cursor: "pointer" }}>
                    <td>
                      <div className="member-info">
                        <div className="member-avatar">
                          {getInitials(user.full_name, user.email)}
                        </div>
                        <div>
                          <div className="member-name">
                            {user.full_name || t("noName")}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: "var(--muted)" }}>{user.email}</td>
                    <td>
                      <span style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        ...getDashboardBadgeStyle(dashLabel),
                      }}>
                        {dashboardLabels[dashLabel] || dashLabel}
                      </span>
                    </td>
                    <td>
                      {user.memberships.length === 0 ? (
                        <span style={{ color: "var(--muted)" }}>{t("none")}</span>
                      ) : (
                        user.memberships
                          .filter((m) => m.is_active)
                          .map((m, i) => (
                            <span key={m.company_id}>
                              {i > 0 && ", "}
                              {m.company_name}
                            </span>
                          ))
                      )}
                    </td>
                    <td>
                      {user.is_platform_admin ? (
                        <span className="sa-badge sa-badge-amber">{t("admin")}</span>
                      ) : (
                        <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>-</span>
                      )}
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                      {formatDate(user.created_at, dateLocale)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (() => {
        const dashLabel = getDashboardLabel(selectedUser);
        return (
          <div className="ticket-modal-overlay" onClick={closeModal}>
            <div className="ticket-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
              <div className="ticket-modal-header">
                <h3>
                  {selectedUser.full_name || selectedUser.email}
                  {selectedUser.is_platform_admin && (
                    <span
                      className="sa-badge sa-badge-amber"
                      style={{ marginLeft: 10, fontSize: "0.72rem" }}
                    >
                      {t("platformAdmin")}
                    </span>
                  )}
                </h3>
                <button className="ticket-modal-close" onClick={closeModal}>
                  <X size={18} />
                </button>
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

              <div style={{ padding: "1.25rem" }}>
                {/* Profile Info */}
                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">{t("fullName")}</label>
                    <div className="detail-value">{selectedUser.full_name || "—"}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <LayoutDashboard size={12} /> {t("dashboard")}
                      </span>
                    </label>
                    <div className="detail-value">
                      <span style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        ...getDashboardBadgeStyle(dashLabel),
                      }}>
                        {dashboardLabels[dashLabel] || dashLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-group">
                  <label className="detail-label">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Mail size={12} /> {t("email")}
                    </span>
                  </label>
                  <div className="detail-value">{selectedUser.email}</div>
                </div>

                <div className="detail-row">
                  <div className="detail-group">
                    <label className="detail-label">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Phone size={12} /> {t("phone")}
                      </span>
                    </label>
                    <div className="detail-value">{selectedUser.phone || "—"}</div>
                  </div>
                  <div className="detail-group">
                    <label className="detail-label">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Briefcase size={12} /> {t("jobTitle")}
                      </span>
                    </label>
                    <div className="detail-value">{selectedUser.job_title || "—"}</div>
                  </div>
                </div>

                <div className="detail-group">
                  <label className="detail-label">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={12} /> {t("joined")}
                    </span>
                  </label>
                  <div className="detail-value">{formatDate(selectedUser.created_at, dateLocale)}</div>
                </div>

                {/* Company Memberships */}
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
                  <Building2 size={12} /> {t("companyMemberships", { count: selectedUser.memberships.length })}
                </div>

                <div style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  overflow: "hidden",
                }}>
                  {selectedUser.memberships.length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
                      {t("noCompanyMemberships")}
                    </div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{t("company")}</th>
                          <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{t("role")}</th>
                          <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{t("joined")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedUser.memberships.map((m) => (
                          <tr key={m.company_id} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "10px 12px", fontWeight: 500 }}>
                              {m.company_name}
                              {!m.is_active && (
                                <span style={{
                                  marginLeft: 6,
                                  padding: "2px 6px",
                                  borderRadius: 6,
                                  fontSize: "0.7rem",
                                  background: "var(--surface)",
                                  color: "var(--muted)",
                                }}>
                                  {t("inactive")}
                                </span>
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
                            </td>
                            <td style={{ padding: "10px 12px", color: "var(--muted)", fontSize: "0.8rem" }}>
                              {m.joined_at ? formatDate(m.joined_at, dateLocale) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Actions */}
                <div style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginTop: 16,
                  marginBottom: 8,
                }}>
                  {t("actions")}
                </div>

                <div style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 8,
                }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleResetPassword}
                    disabled={saving}
                    style={{ fontSize: "0.82rem" }}
                  >
                    <KeyRound size={14} /> {t("resetPassword")}
                  </button>
                  {selectedUser.is_platform_admin ? (
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ backgroundColor: "var(--color-red)", fontSize: "0.82rem" }}
                      onClick={handleToggleAdmin}
                      disabled={saving}
                    >
                      <Shield size={14} /> {saving ? t("saving") : t("revokeAdmin")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleToggleAdmin}
                      disabled={saving}
                      style={{ fontSize: "0.82rem" }}
                    >
                      <Shield size={14} /> {saving ? t("saving") : t("grantAdmin")}
                    </button>
                  )}
                </div>

                <div className="ticket-form-actions">
                  <button type="button" className="btn-secondary" onClick={closeModal}>
                    {t("close")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
