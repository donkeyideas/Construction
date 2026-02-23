"use client";

import { useState, useEffect, useCallback } from "react";
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
  Globe,
  Trash2,
  Activity,
  LogIn,
  FileText,
  FolderOpen,
  Contact,
  Clock,
  TrendingUp,
  CreditCard,
  Loader2,
} from "lucide-react";
import type { PlatformUser, UserMembership } from "@/lib/queries/super-admin";

type UserRow = PlatformUser & { memberships: UserMembership[] };

interface UserAnalytics {
  totalLogins: number;
  totalActions: number;
  lastLogin: { at: string; ip: string | null; userAgent: string | null } | null;
  companyAnalytics: Record<string, {
    subscription_plan: string;
    subscription_status: string;
    projects: number;
    invoices: number;
    contacts: number;
    documents: number;
  }>;
  recentActivity: Array<{ action: string; entityType: string; createdAt: string }>;
  weeklyLogins: number[];
  loginsLast28Days: number;
}

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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

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

  const fetchAnalytics = useCallback(async (userId: string) => {
    setAnalyticsLoading(true);
    setAnalytics(null);
    try {
      const res = await fetch(`/api/super-admin/users/${userId}/analytics`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch {
      // Silent fail — analytics are supplementary
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  function openModal(user: UserRow) {
    setSelectedUser(user);
    setSaveError(null);
    setActionMessage(null);
    fetchAnalytics(user.id);
  }

  function closeModal() {
    setSelectedUser(null);
    setSaveError(null);
    setActionMessage(null);
    setConfirmDelete(false);
    setAnalytics(null);
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

  async function handleDeleteUser() {
    if (!selectedUser) return;
    setSaving(true);
    setSaveError(null);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/super-admin/users/${selectedUser.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user.");
      closeModal();
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to delete user.");
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
        const activeMembership = selectedUser.memberships.find((m) => m.is_active);
        const sectionLabelStyle: React.CSSProperties = {
          fontSize: "0.72rem",
          fontWeight: 600,
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginTop: 20,
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 5,
        };
        const miniStatStyle: React.CSSProperties = {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "10px 0",
          flex: "1 1 0",
          minWidth: 0,
        };
        const miniStatValue: React.CSSProperties = {
          fontSize: "1.15rem",
          fontWeight: 700,
          lineHeight: 1.2,
        };
        const miniStatLabel: React.CSSProperties = {
          fontSize: "0.68rem",
          color: "var(--muted)",
          marginTop: 2,
        };
        return (
          <div className="ticket-modal-overlay" onClick={closeModal}>
            <div className="ticket-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, maxHeight: "90vh", overflow: "auto" }}>
              <div className="ticket-modal-header">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "var(--color-blue)", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: "0.95rem", flexShrink: 0,
                  }}>
                    {getInitials(selectedUser.full_name, selectedUser.email)}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, lineHeight: 1.3 }}>
                      {selectedUser.full_name || selectedUser.email}
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                      <span style={{
                        display: "inline-block", padding: "1px 7px", borderRadius: 6,
                        fontSize: "0.7rem", fontWeight: 600,
                        ...getDashboardBadgeStyle(dashLabel),
                      }}>
                        {dashboardLabels[dashLabel] || dashLabel}
                      </span>
                      {selectedUser.is_platform_admin && (
                        <span className="sa-badge sa-badge-amber" style={{ fontSize: "0.68rem" }}>
                          {t("platformAdmin")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button className="ticket-modal-close" onClick={closeModal}>
                  <X size={18} />
                </button>
              </div>

              {saveError && <div className="ticket-form-error">{saveError}</div>}
              {actionMessage && (
                <div style={{
                  background: "rgba(22, 163, 74, 0.06)",
                  border: "1px solid rgba(22, 163, 74, 0.2)",
                  borderRadius: 8, padding: "10px 14px",
                  color: "var(--color-green)", fontSize: "0.85rem",
                  margin: "0 0 12px",
                }}>
                  {actionMessage}
                </div>
              )}

              <div style={{ padding: "1.25rem" }}>
                {/* ── Platform Usage Stats ── */}
                <div style={sectionLabelStyle}>
                  <Activity size={13} /> PLATFORM USAGE
                </div>

                {analyticsLoading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0", color: "var(--muted)", fontSize: "0.85rem" }}>
                    <Loader2 size={16} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} /> Loading analytics...
                  </div>
                ) : analytics ? (
                  <>
                    <div style={{
                      display: "flex", gap: 1, borderRadius: 8, overflow: "hidden",
                      border: "1px solid var(--border)", marginBottom: 12,
                    }}>
                      <div style={{ ...miniStatStyle, background: "var(--surface)" }}>
                        <div style={miniStatValue}>{analytics.totalLogins}</div>
                        <div style={miniStatLabel}>Total Logins</div>
                      </div>
                      <div style={{ ...miniStatStyle, background: "var(--surface)" }}>
                        <div style={miniStatValue}>{analytics.loginsLast28Days}</div>
                        <div style={miniStatLabel}>Last 28 Days</div>
                      </div>
                      <div style={{ ...miniStatStyle, background: "var(--surface)" }}>
                        <div style={miniStatValue}>{analytics.totalActions}</div>
                        <div style={miniStatLabel}>Actions</div>
                      </div>
                      <div style={{ ...miniStatStyle, background: "var(--surface)" }}>
                        <div style={miniStatValue}>
                          {(() => {
                            const joined = new Date(selectedUser.created_at);
                            const days = Math.floor((Date.now() - joined.getTime()) / (1000 * 60 * 60 * 24));
                            if (days < 1) return "<1d";
                            if (days < 30) return `${days}d`;
                            if (days < 365) return `${Math.floor(days / 30)}mo`;
                            return `${(days / 365).toFixed(1)}yr`;
                          })()}
                        </div>
                        <div style={miniStatLabel}>Account Age</div>
                      </div>
                    </div>

                    {/* Weekly login sparkline */}
                    <div style={{
                      display: "flex", alignItems: "flex-end", gap: 3,
                      height: 32, marginBottom: 8,
                    }}>
                      <span style={{ fontSize: "0.68rem", color: "var(--muted)", marginRight: 4, alignSelf: "center" }}>Logins/wk:</span>
                      {[...analytics.weeklyLogins].reverse().map((count, i) => {
                        const max = Math.max(...analytics.weeklyLogins, 1);
                        const h = Math.max((count / max) * 28, 3);
                        return (
                          <div
                            key={i}
                            title={`${count} logins, ${3 - i} weeks ago`}
                            style={{
                              width: 18, height: h, borderRadius: 3,
                              background: i === 3 ? "var(--color-blue)" : "var(--border)",
                              transition: "height 0.3s",
                            }}
                          />
                        );
                      })}
                      <span style={{ fontSize: "0.65rem", color: "var(--muted)", marginLeft: 4, alignSelf: "center" }}>
                        {analytics.weeklyLogins[0]} this wk
                      </span>
                    </div>

                    {/* Last login */}
                    {analytics.lastLogin && (
                      <div style={{
                        fontSize: "0.78rem", color: "var(--muted)",
                        display: "flex", alignItems: "center", gap: 6, marginBottom: 4,
                      }}>
                        <LogIn size={12} />
                        Last login: {formatDate(analytics.lastLogin.at, dateLocale)}
                        {analytics.lastLogin.ip && (
                          <span style={{ opacity: 0.7 }}>({analytics.lastLogin.ip})</span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: "0.82rem", color: "var(--muted)", padding: "8px 0" }}>
                    No analytics available
                  </div>
                )}

                {/* ── Profile Details ── */}
                <div style={sectionLabelStyle}>
                  <Mail size={13} /> PROFILE
                </div>

                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px",
                  fontSize: "0.82rem", marginBottom: 4,
                }}>
                  <div>
                    <div style={{ color: "var(--muted)", fontSize: "0.72rem", marginBottom: 2 }}>Email</div>
                    <div>{selectedUser.email}</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--muted)", fontSize: "0.72rem", marginBottom: 2 }}>Phone</div>
                    <div>{selectedUser.phone || "—"}</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--muted)", fontSize: "0.72rem", marginBottom: 2 }}>Job Title</div>
                    <div>{selectedUser.job_title || "—"}</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--muted)", fontSize: "0.72rem", marginBottom: 2 }}>Joined</div>
                    <div>
                      {formatDate(selectedUser.created_at, dateLocale)}
                      {selectedUser.accepted_terms_at && (
                        <span style={{ fontSize: "0.7rem", color: "var(--color-green)", marginLeft: 6 }}>Terms accepted</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Company Memberships ── */}
                <div style={sectionLabelStyle}>
                  <Building2 size={13} /> COMPANY MEMBERSHIPS ({selectedUser.memberships.length})
                </div>

                {selectedUser.memberships.length === 0 ? (
                  <div style={{ padding: "12px 0", color: "var(--muted)", fontSize: "0.82rem" }}>
                    {t("noCompanyMemberships")}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {selectedUser.memberships.map((m) => {
                      const ca = analytics?.companyAnalytics[m.company_id];
                      return (
                        <div key={m.company_id} style={{
                          border: "1px solid var(--border)", borderRadius: 8,
                          padding: "12px", background: "var(--surface)",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>{m.company_name}</span>
                              <span style={{
                                display: "inline-block", padding: "1px 7px", borderRadius: 6,
                                fontSize: "0.7rem", fontWeight: 600,
                                ...getRoleBadgeStyle(m.role),
                              }}>
                                {formatRole(m.role)}
                              </span>
                              {!m.is_active && (
                                <span style={{
                                  padding: "1px 6px", borderRadius: 6,
                                  fontSize: "0.68rem", background: "var(--surface)", color: "var(--muted)",
                                }}>
                                  {t("inactive")}
                                </span>
                              )}
                            </div>
                            {ca && (
                              <span style={{
                                display: "inline-block", padding: "1px 7px", borderRadius: 6,
                                fontSize: "0.68rem", fontWeight: 600,
                                background: ca.subscription_status === "active" ? "rgba(22, 163, 74, 0.08)" : "var(--surface)",
                                color: ca.subscription_status === "active" ? "var(--color-green)" : "var(--muted)",
                              }}>
                                <CreditCard size={10} style={{ marginRight: 3 }} />
                                {ca.subscription_plan.charAt(0).toUpperCase() + ca.subscription_plan.slice(1)}
                              </span>
                            )}
                          </div>

                          {/* Company details row */}
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: "0.75rem", color: "var(--muted)", marginBottom: ca ? 8 : 0 }}>
                            {m.company_industry && <span>{m.company_industry}</span>}
                            {m.company_industry && m.company_size && <span>·</span>}
                            {m.company_size && <span>{m.company_size}</span>}
                            {m.joined_at && <span>· Joined {formatDate(m.joined_at, dateLocale)}</span>}
                          </div>

                          {/* Usage stats */}
                          {ca && (
                            <div style={{ display: "flex", gap: 16, fontSize: "0.78rem" }}>
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <FolderOpen size={12} style={{ color: "var(--color-blue)" }} /> {ca.projects} projects
                              </span>
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <FileText size={12} style={{ color: "var(--color-amber)" }} /> {ca.invoices} invoices
                              </span>
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <Contact size={12} style={{ color: "var(--color-green)" }} /> {ca.contacts} contacts
                              </span>
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <FileText size={12} style={{ color: "var(--muted)" }} /> {ca.documents} docs
                              </span>
                            </div>
                          )}

                          {/* Selected modules */}
                          {m.selected_modules && m.selected_modules.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                              {m.selected_modules.map((mod) => (
                                <span
                                  key={mod}
                                  style={{
                                    display: "inline-block", padding: "1px 6px", borderRadius: 5,
                                    fontSize: "0.68rem", fontWeight: 600,
                                    background: "rgba(59, 130, 246, 0.08)", color: "var(--color-blue)",
                                  }}
                                >
                                  {mod.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── Recent Activity ── */}
                {analytics && analytics.recentActivity.length > 0 && (
                  <>
                    <div style={sectionLabelStyle}>
                      <Clock size={13} /> RECENT ACTIVITY
                    </div>
                    <div style={{
                      border: "1px solid var(--border)", borderRadius: 8,
                      overflow: "hidden", maxHeight: 200, overflowY: "auto",
                    }}>
                      {analytics.recentActivity.map((act, i) => (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "6px 12px", fontSize: "0.78rem",
                          borderBottom: i < analytics.recentActivity.length - 1 ? "1px solid var(--border)" : "none",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Activity size={11} style={{ color: "var(--muted)" }} />
                            <span>{act.action.replace(/_/g, " ")}</span>
                            {act.entityType && (
                              <span style={{ color: "var(--muted)", fontSize: "0.72rem" }}>
                                ({act.entityType})
                              </span>
                            )}
                          </div>
                          <span style={{ color: "var(--muted)", fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                            {formatDate(act.createdAt, dateLocale)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ── Actions ── */}
                <div style={{ ...sectionLabelStyle, marginTop: 20 }}>
                  {t("actions")}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
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
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setConfirmDelete(true)}
                    disabled={saving}
                    style={{ fontSize: "0.82rem", color: "var(--color-red)", borderColor: "rgba(220,38,38,0.3)" }}
                  >
                    <Trash2 size={14} /> Delete Account
                  </button>
                </div>

                {confirmDelete && (
                  <div style={{
                    background: "rgba(220, 38, 38, 0.06)",
                    border: "1px solid rgba(220, 38, 38, 0.25)",
                    borderRadius: 8, padding: "12px 14px", marginBottom: 12,
                  }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-red)", marginBottom: 6 }}>
                      Are you sure you want to delete this account?
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 10, lineHeight: 1.5 }}>
                      This will permanently remove <strong>{selectedUser.email}</strong>, their profile, company memberships, and any companies they created that have no other members. This action cannot be undone.
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ backgroundColor: "var(--color-red)", fontSize: "0.82rem" }}
                        onClick={handleDeleteUser}
                        disabled={saving}
                      >
                        {saving ? "Deleting..." : "Yes, Delete Account"}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setConfirmDelete(false)}
                        disabled={saving}
                        style={{ fontSize: "0.82rem" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

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
