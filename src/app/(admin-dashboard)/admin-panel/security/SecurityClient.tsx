"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Key,
  Lock,
  Monitor,
  History,
  X,
  CheckCircle2,
  XCircle,
  LogOut,
} from "lucide-react";
import type {
  SecuritySettingsRow,
  LoginHistoryRow,
  ActiveSessionRow,
} from "@/lib/queries/security";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SecurityClientProps {
  settings: SecuritySettingsRow | null;
  loginHistory: LoginHistoryRow[];
  sessions: ActiveSessionRow[];
}

type SecurityTab = "passwords" | "2fa" | "sessions" | "history";

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "project_manager", label: "Project Manager" },
  { value: "accountant", label: "Accountant" },
  { value: "superintendent", label: "Superintendent" },
];

// ---------------------------------------------------------------------------
// Default Settings
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS: Omit<SecuritySettingsRow, "id" | "company_id" | "created_at" | "updated_at"> = {
  min_password_length: 8,
  require_uppercase: true,
  require_lowercase: true,
  require_numbers: true,
  require_special_chars: false,
  password_expiry_days: 90,
  require_2fa: false,
  require_2fa_for_roles: [],
  session_timeout_minutes: 480,
  max_concurrent_sessions: 5,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SecurityClient({
  settings,
  loginHistory,
  sessions,
}: SecurityClientProps) {
  const router = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState<SecurityTab>("passwords");

  // Password policy state
  const [minLength, setMinLength] = useState(settings?.min_password_length ?? DEFAULT_SETTINGS.min_password_length);
  const [requireUpper, setRequireUpper] = useState(settings?.require_uppercase ?? DEFAULT_SETTINGS.require_uppercase);
  const [requireLower, setRequireLower] = useState(settings?.require_lowercase ?? DEFAULT_SETTINGS.require_lowercase);
  const [requireNumbers, setRequireNumbers] = useState(settings?.require_numbers ?? DEFAULT_SETTINGS.require_numbers);
  const [requireSpecial, setRequireSpecial] = useState(settings?.require_special_chars ?? DEFAULT_SETTINGS.require_special_chars);
  const [expiryDays, setExpiryDays] = useState(settings?.password_expiry_days ?? DEFAULT_SETTINGS.password_expiry_days);

  // 2FA state
  const [require2fa, setRequire2fa] = useState(settings?.require_2fa ?? DEFAULT_SETTINGS.require_2fa);
  const [require2faRoles, setRequire2faRoles] = useState<string[]>(settings?.require_2fa_for_roles ?? DEFAULT_SETTINGS.require_2fa_for_roles);

  // Session settings state
  const [sessionTimeout, setSessionTimeout] = useState(settings?.session_timeout_minutes ?? DEFAULT_SETTINGS.session_timeout_minutes);
  const [maxSessions, setMaxSessions] = useState(settings?.max_concurrent_sessions ?? DEFAULT_SETTINGS.max_concurrent_sessions);

  // History filter
  const [historyDateFilter, setHistoryDateFilter] = useState("");

  // UI state
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Save Password Policy
  // -----------------------------------------------------------------------
  async function savePasswordPolicy() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/security/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          min_password_length: minLength,
          require_uppercase: requireUpper,
          require_lowercase: requireLower,
          require_numbers: requireNumbers,
          require_special_chars: requireSpecial,
          password_expiry_days: expiryDays,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save." });
        return;
      }

      setMessage({ type: "success", text: "Password policy saved." });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------------------------------------------
  // Save 2FA Settings
  // -----------------------------------------------------------------------
  async function save2faSettings() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/security/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          require_2fa: require2fa,
          require_2fa_for_roles: require2faRoles,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save." });
        return;
      }

      setMessage({ type: "success", text: "Two-factor settings saved." });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------------------------------------------
  // Save Session Settings
  // -----------------------------------------------------------------------
  async function saveSessionSettings() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/security/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_timeout_minutes: sessionTimeout,
          max_concurrent_sessions: maxSessions,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save." });
        return;
      }

      setMessage({ type: "success", text: "Session settings saved." });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------------------------------------------
  // Revoke Session
  // -----------------------------------------------------------------------
  async function revokeSession(sessionId: string) {
    setRevoking(sessionId);

    try {
      const res = await fetch(`/api/admin/security/sessions/${sessionId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to revoke session.");
        return;
      }

      router.refresh();
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setRevoking(null);
    }
  }

  // -----------------------------------------------------------------------
  // Revoke All Sessions
  // -----------------------------------------------------------------------
  async function revokeAllSessions() {
    if (!window.confirm("Revoke all active sessions? All users will be logged out.")) return;

    setRevoking("all");

    try {
      for (const session of sessions) {
        await fetch(`/api/admin/security/sessions/${session.id}`, {
          method: "DELETE",
        });
      }
      router.refresh();
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setRevoking(null);
    }
  }

  // -----------------------------------------------------------------------
  // Toggle 2FA role
  // -----------------------------------------------------------------------
  function toggle2faRole(role: string) {
    setRequire2faRoles((prev) =>
      prev.includes(role)
        ? prev.filter((r) => r !== role)
        : [...prev, role]
    );
  }

  // -----------------------------------------------------------------------
  // Format helpers
  // -----------------------------------------------------------------------
  function formatDate(ts: string): string {
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function parseDevice(ua: string | null): string {
    if (!ua) return "Unknown";
    if (ua.includes("Mobile")) return "Mobile";
    if (ua.includes("Tablet")) return "Tablet";
    return "Desktop";
  }

  // Filter history by date
  const filteredHistory = historyDateFilter
    ? loginHistory.filter((h) =>
        h.created_at.startsWith(historyDateFilter)
      )
    : loginHistory;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div>
      {/* Header */}
      <div className="security-header">
        <div>
          <h2>Security</h2>
          <p className="security-header-sub">
            Manage password policies, two-factor authentication, and session controls.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="security-tabs">
        {(
          [
            { key: "passwords", label: "Password Policies", icon: Key },
            { key: "2fa", label: "Two-Factor Auth", icon: Lock },
            { key: "sessions", label: "Sessions", icon: Monitor },
            { key: "history", label: "Login History", icon: History },
          ] as { key: SecurityTab; label: string; icon: React.ElementType }[]
        ).map((tab) => (
          <button
            key={tab.key}
            className={`security-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => {
              setActiveTab(tab.key);
              setMessage(null);
            }}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      {message && (
        <div className={`security-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* === Password Policies Tab === */}
      {activeTab === "passwords" && (
        <div className="security-panel">
          <div className="security-form-section">
            <div className="security-form-section-title">Password Requirements</div>

            <div className="security-form-group">
              <label className="security-form-label">Minimum Password Length</label>
              <input
                type="number"
                className="security-form-input"
                value={minLength}
                onChange={(e) => setMinLength(parseInt(e.target.value, 10) || 8)}
                min={6}
                max={128}
              />
            </div>

            <div className="security-toggle-group">
              <label className="security-toggle-row">
                <span className="security-toggle-label">Require uppercase letters</span>
                <button
                  type="button"
                  className={`security-toggle ${requireUpper ? "on" : ""}`}
                  onClick={() => setRequireUpper(!requireUpper)}
                />
              </label>
              <label className="security-toggle-row">
                <span className="security-toggle-label">Require lowercase letters</span>
                <button
                  type="button"
                  className={`security-toggle ${requireLower ? "on" : ""}`}
                  onClick={() => setRequireLower(!requireLower)}
                />
              </label>
              <label className="security-toggle-row">
                <span className="security-toggle-label">Require numbers</span>
                <button
                  type="button"
                  className={`security-toggle ${requireNumbers ? "on" : ""}`}
                  onClick={() => setRequireNumbers(!requireNumbers)}
                />
              </label>
              <label className="security-toggle-row">
                <span className="security-toggle-label">Require special characters</span>
                <button
                  type="button"
                  className={`security-toggle ${requireSpecial ? "on" : ""}`}
                  onClick={() => setRequireSpecial(!requireSpecial)}
                />
              </label>
            </div>

            <div className="security-form-group">
              <label className="security-form-label">Password Expiry (days)</label>
              <input
                type="number"
                className="security-form-input"
                value={expiryDays}
                onChange={(e) => setExpiryDays(parseInt(e.target.value, 10) || 90)}
                min={0}
                max={365}
              />
              <span className="security-form-hint">Set to 0 to disable password expiration.</span>
            </div>

            <div className="security-form-actions">
              <button
                className="btn-primary"
                onClick={savePasswordPolicy}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Password Policy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === Two-Factor Auth Tab === */}
      {activeTab === "2fa" && (
        <div className="security-panel">
          <div className="security-form-section">
            <div className="security-form-section-title">Two-Factor Authentication</div>

            <label className="security-toggle-row" style={{ marginBottom: 20 }}>
              <span className="security-toggle-label">
                <strong>Require 2FA for all users</strong>
                <br />
                <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                  When enabled, all users must set up two-factor authentication.
                </span>
              </span>
              <button
                type="button"
                className={`security-toggle ${require2fa ? "on" : ""}`}
                onClick={() => setRequire2fa(!require2fa)}
              />
            </label>

            <div className="security-form-section-title" style={{ fontSize: "0.95rem" }}>
              Require 2FA for Specific Roles
            </div>
            <div className="security-checkbox-group">
              {ROLE_OPTIONS.map((role) => (
                <label key={role.value} className="security-checkbox-item">
                  <input
                    type="checkbox"
                    checked={require2faRoles.includes(role.value)}
                    onChange={() => toggle2faRole(role.value)}
                  />
                  {role.label}
                </label>
              ))}
            </div>

            <div className="security-form-actions">
              <button
                className="btn-primary"
                onClick={save2faSettings}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save 2FA Settings"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === Sessions Tab === */}
      {activeTab === "sessions" && (
        <div className="security-panel">
          <div className="security-form-section">
            <div className="security-form-section-title">Session Settings</div>

            <div className="security-form-row">
              <div className="security-form-group">
                <label className="security-form-label">Session Timeout (minutes)</label>
                <input
                  type="number"
                  className="security-form-input"
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(parseInt(e.target.value, 10) || 480)}
                  min={5}
                  max={10080}
                />
              </div>
              <div className="security-form-group">
                <label className="security-form-label">Max Concurrent Sessions</label>
                <input
                  type="number"
                  className="security-form-input"
                  value={maxSessions}
                  onChange={(e) => setMaxSessions(parseInt(e.target.value, 10) || 5)}
                  min={1}
                  max={50}
                />
              </div>
            </div>

            <div className="security-form-actions">
              <button
                className="btn-primary"
                onClick={saveSessionSettings}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Session Settings"}
              </button>
            </div>
          </div>

          {/* Active Sessions Table */}
          <div className="security-form-section">
            <div className="security-sessions-header">
              <div className="security-form-section-title">Active Sessions ({sessions.length})</div>
              {sessions.length > 0 && (
                <button
                  className="btn-secondary security-revoke-all"
                  onClick={revokeAllSessions}
                  disabled={revoking === "all"}
                >
                  <LogOut size={14} />
                  {revoking === "all" ? "Revoking..." : "Revoke All"}
                </button>
              )}
            </div>

            {sessions.length > 0 ? (
              <div className="security-table-wrap">
                <table className="security-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Device</th>
                      <th>IP Address</th>
                      <th>Last Active</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <tr key={session.id}>
                        <td className="security-user-cell">
                          {session.user_profile?.full_name || session.user_profile?.email || session.user_id.slice(0, 8)}
                        </td>
                        <td>{parseDevice(session.user_agent)}</td>
                        <td className="security-muted">{session.ip_address ?? "--"}</td>
                        <td className="security-muted">{formatDate(session.last_active_at)}</td>
                        <td>
                          <button
                            className="btn-secondary security-revoke-btn"
                            onClick={() => revokeSession(session.id)}
                            disabled={revoking === session.id}
                          >
                            <X size={13} />
                            {revoking === session.id ? "Revoking..." : "Revoke"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="security-empty">
                <Monitor size={32} />
                <div>No active sessions found.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === Login History Tab === */}
      {activeTab === "history" && (
        <div className="security-panel">
          <div className="security-form-section">
            <div className="security-sessions-header">
              <div className="security-form-section-title">Login History</div>
              <div className="security-filter">
                <label className="security-form-label" style={{ marginBottom: 0 }}>Date Filter</label>
                <input
                  type="date"
                  className="security-form-input security-date-input"
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                />
                {historyDateFilter && (
                  <button
                    className="btn-secondary"
                    onClick={() => setHistoryDateFilter("")}
                    style={{ padding: "6px 10px", fontSize: "0.78rem" }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {filteredHistory.length > 0 ? (
              <div className="security-table-wrap">
                <table className="security-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Time</th>
                      <th>IP Address</th>
                      <th>Status</th>
                      <th>Device</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((entry) => (
                      <tr key={entry.id}>
                        <td className="security-user-cell">
                          {entry.user_profile?.full_name || entry.email || "--"}
                        </td>
                        <td className="security-muted">{formatDate(entry.created_at)}</td>
                        <td className="security-muted">{entry.ip_address ?? "--"}</td>
                        <td>
                          <span className={`security-status-badge ${entry.status}`}>
                            {entry.status === "success" ? (
                              <><CheckCircle2 size={12} /> Success</>
                            ) : (
                              <><XCircle size={12} /> Failed</>
                            )}
                          </span>
                        </td>
                        <td className="security-muted">{parseDevice(entry.user_agent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="security-empty">
                <History size={32} />
                <div>No login history found{historyDateFilter ? " for this date" : ""}.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
