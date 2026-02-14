"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Key,
  Clock,
  ScrollText,
  Monitor,
  Save,
  Loader2,
  LogOut,
  Check,
  AlertTriangle,
} from "lucide-react";
import type { SecuritySettingsRow } from "@/lib/queries/security";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AuditLogEntry {
  id: string;
  created_at: string;
  action: string;
  entity_type: string;
  details: Record<string, string> | null;
}

interface SessionEntry {
  id: string;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  last_active_at: string;
  created_at: string;
  user_profile?: { full_name: string | null; email: string | null } | null;
}

interface LoginEntry {
  id: string;
  email: string;
  ip_address: string | null;
  status: "success" | "failed";
  failure_reason: string | null;
  created_at: string;
  user_profile?: { full_name: string | null; email: string | null } | null;
}

interface SecurityClientProps {
  settings: SecuritySettingsRow | null;
  auditLogs: AuditLogEntry[];
  currentUserRole: string;
}

type TabKey = "settings" | "audit" | "sessions" | "login-history";

const TABS: { key: TabKey; label: string; icon: typeof Shield }[] = [
  { key: "settings", label: "Settings", icon: Shield },
  { key: "audit", label: "Audit Log", icon: ScrollText },
  { key: "sessions", label: "Sessions", icon: Monitor },
  { key: "login-history", label: "Login History", icon: Clock },
];

/* ------------------------------------------------------------------ */
/*  Default settings                                                   */
/* ------------------------------------------------------------------ */

const DEFAULTS: Omit<SecuritySettingsRow, "id" | "company_id" | "created_at" | "updated_at"> = {
  min_password_length: 8,
  require_uppercase: true,
  require_lowercase: true,
  require_numbers: true,
  require_special_chars: true,
  password_expiry_days: 0,
  require_2fa: false,
  require_2fa_for_roles: [],
  session_timeout_minutes: 1440,
  max_concurrent_sessions: 5,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function parseUA(ua: string | null): string {
  if (!ua) return "Unknown";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Edge")) return "Edge";
  return "Other";
}

/* ================================================================== */
/*  SecurityClient                                                     */
/* ================================================================== */

export default function SecurityClient({
  settings,
  auditLogs,
  currentUserRole,
}: SecurityClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("settings");
  const isAdmin = currentUserRole === "owner" || currentUserRole === "admin";

  return (
    <div className="page-container">
      {/* Header */}
      <div className="security-header">
        <div>
          <h2>Security &amp; Audit</h2>
          <div className="security-header-sub">
            Manage security policies, sessions, and review activity logs
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="security-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`security-tab ${activeTab === t.key ? "active" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      <div className="security-panel">
        {activeTab === "settings" && (
          <SettingsPanel initialSettings={settings} isAdmin={isAdmin} />
        )}
        {activeTab === "audit" && <AuditPanel logs={auditLogs} />}
        {activeTab === "sessions" && <SessionsPanel isAdmin={isAdmin} />}
        {activeTab === "login-history" && <LoginHistoryPanel />}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Settings Panel                                                     */
/* ================================================================== */

function SettingsPanel({
  initialSettings,
  isAdmin,
}: {
  initialSettings: SecuritySettingsRow | null;
  isAdmin: boolean;
}) {
  const s = initialSettings ?? DEFAULTS;

  const [form, setForm] = useState({
    min_password_length: s.min_password_length,
    require_uppercase: s.require_uppercase,
    require_lowercase: s.require_lowercase,
    require_numbers: s.require_numbers,
    require_special_chars: s.require_special_chars,
    password_expiry_days: s.password_expiry_days,
    require_2fa: s.require_2fa,
    session_timeout_minutes: s.session_timeout_minutes,
    max_concurrent_sessions: s.max_concurrent_sessions,
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/security/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Security settings saved." });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error." });
    } finally {
      setSaving(false);
    }
  }

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <>
      {message && (
        <div className={`security-message ${message.type}`}>
          {message.type === "success" ? <Check size={14} /> : <AlertTriangle size={14} />}{" "}
          {message.text}
        </div>
      )}

      {/* Password Policy */}
      <div className="security-form-section">
        <div className="security-form-section-title">
          <Key size={16} style={{ marginRight: "8px", verticalAlign: "middle" }} />
          Password Policy
        </div>

        <div className="security-form-row">
          <div className="security-form-group">
            <label className="security-form-label">Minimum Password Length</label>
            <input
              type="number"
              className="security-form-input"
              min={6}
              max={128}
              value={form.min_password_length}
              onChange={(e) => setField("min_password_length", Number(e.target.value))}
              disabled={!isAdmin}
            />
            <span className="security-form-hint">
              Between 6 and 128 characters
            </span>
          </div>
          <div className="security-form-group">
            <label className="security-form-label">Password Expiry (days)</label>
            <input
              type="number"
              className="security-form-input"
              min={0}
              max={365}
              value={form.password_expiry_days}
              onChange={(e) => setField("password_expiry_days", Number(e.target.value))}
              disabled={!isAdmin}
            />
            <span className="security-form-hint">0 = never expires</span>
          </div>
        </div>

        <label className="security-form-label" style={{ marginBottom: "8px", display: "block" }}>
          Require Characters
        </label>
        <div className="security-checkbox-group">
          {(
            [
              ["require_uppercase", "Uppercase (A-Z)"],
              ["require_lowercase", "Lowercase (a-z)"],
              ["require_numbers", "Numbers (0-9)"],
              ["require_special_chars", "Special (!@#...)"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="security-checkbox-item">
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) => setField(key, e.target.checked)}
                disabled={!isAdmin}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Session & 2FA */}
      <div className="security-form-section">
        <div className="security-form-section-title">
          <Shield size={16} style={{ marginRight: "8px", verticalAlign: "middle" }} />
          Session &amp; Authentication
        </div>

        <div className="security-form-row">
          <div className="security-form-group">
            <label className="security-form-label">Session Timeout (minutes)</label>
            <input
              type="number"
              className="security-form-input"
              min={5}
              max={43200}
              value={form.session_timeout_minutes}
              onChange={(e) => setField("session_timeout_minutes", Number(e.target.value))}
              disabled={!isAdmin}
            />
            <span className="security-form-hint">
              {form.session_timeout_minutes >= 60
                ? `${Math.round(form.session_timeout_minutes / 60)} hours`
                : `${form.session_timeout_minutes} minutes`}
            </span>
          </div>
          <div className="security-form-group">
            <label className="security-form-label">Max Concurrent Sessions</label>
            <input
              type="number"
              className="security-form-input"
              min={1}
              max={50}
              value={form.max_concurrent_sessions}
              onChange={(e) => setField("max_concurrent_sessions", Number(e.target.value))}
              disabled={!isAdmin}
            />
          </div>
        </div>

        <div className="security-toggle-group">
          <div
            className="security-toggle-row"
            onClick={() => isAdmin && setField("require_2fa", !form.require_2fa)}
          >
            <span className="security-toggle-label">Require Two-Factor Authentication</span>
            <button
              type="button"
              className={`security-toggle ${form.require_2fa ? "on" : ""}`}
              disabled={!isAdmin}
            />
          </div>
        </div>
      </div>

      {/* Save */}
      {isAdmin && (
        <div className="security-form-actions">
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 size={14} className="spin-icon" />
            ) : (
              <Save size={14} />
            )}
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      )}
    </>
  );
}

/* ================================================================== */
/*  Audit Log Panel                                                    */
/* ================================================================== */

function AuditPanel({ logs }: { logs: AuditLogEntry[] }) {
  return (
    <>
      {logs.length === 0 ? (
        <div className="security-empty">
          <ScrollText size={32} />
          No audit log entries yet. Activity will appear here as users interact with the system.
        </div>
      ) : (
        <div className="security-table-wrap">
          <table className="security-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDate(log.created_at)}</td>
                  <td style={{ textTransform: "capitalize" }}>
                    {log.action?.replace(/_/g, " ")}
                  </td>
                  <td style={{ textTransform: "capitalize" }}>
                    {log.entity_type?.replace(/_/g, " ")}
                  </td>
                  <td>{log.details?.name || log.details?.ref || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ================================================================== */
/*  Sessions Panel                                                     */
/* ================================================================== */

function SessionsPanel({ isAdmin }: { isAdmin: boolean }) {
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/security/sessions");
      if (res.ok) {
        setSessions(await res.json());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  async function handleRevoke(sessionId: string) {
    setRevoking(sessionId);
    try {
      const res = await fetch(`/api/admin/security/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      }
    } catch {
      // silent
    } finally {
      setRevoking(null);
    }
  }

  if (loading) {
    return (
      <div className="security-empty">
        <Loader2 size={28} className="spin-icon" />
        Loading sessions...
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="security-empty">
        <Monitor size={32} />
        No active sessions found. Sessions will be tracked as the feature is
        fully integrated.
      </div>
    );
  }

  return (
    <>
      <div className="security-sessions-header">
        <div className="security-form-section-title" style={{ marginBottom: 0, borderBottom: "none", paddingBottom: 0 }}>
          Active Sessions ({sessions.length})
        </div>
      </div>

      <div className="security-table-wrap">
        <table className="security-table">
          <thead>
            <tr>
              <th>User</th>
              <th>IP Address</th>
              <th>Browser</th>
              <th>Last Active</th>
              <th>Started</th>
              {isAdmin && <th style={{ width: 100 }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td className="security-user-cell">
                  {s.user_profile?.full_name || s.user_profile?.email || s.user_id.slice(0, 8)}
                </td>
                <td className="security-muted">{s.ip_address || "—"}</td>
                <td className="security-muted">{parseUA(s.user_agent)}</td>
                <td style={{ whiteSpace: "nowrap" }}>{formatDate(s.last_active_at)}</td>
                <td style={{ whiteSpace: "nowrap" }}>{formatDate(s.created_at)}</td>
                {isAdmin && (
                  <td>
                    <button
                      className="security-revoke-btn btn-secondary"
                      onClick={() => handleRevoke(s.id)}
                      disabled={revoking === s.id}
                    >
                      <LogOut size={12} />
                      {revoking === s.id ? "..." : "Revoke"}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ================================================================== */
/*  Login History Panel                                                */
/* ================================================================== */

function LoginHistoryPanel() {
  const [history, setHistory] = useState<LoginEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/security/login-history?limit=50");
      if (res.ok) {
        setHistory(await res.json());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (loading) {
    return (
      <div className="security-empty">
        <Loader2 size={28} className="spin-icon" />
        Loading login history...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="security-empty">
        <Clock size={32} />
        No login history recorded yet. Login attempts will be logged here as
        the feature is fully integrated.
      </div>
    );
  }

  return (
    <div className="security-table-wrap">
      <table className="security-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Email</th>
            <th>Status</th>
            <th>IP Address</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.id}>
              <td style={{ whiteSpace: "nowrap" }}>{formatDate(h.created_at)}</td>
              <td className="security-user-cell">{h.email}</td>
              <td>
                <span className={`security-status-badge ${h.status}`}>
                  {h.status === "success" ? (
                    <>
                      <Check size={10} /> Success
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={10} /> Failed
                    </>
                  )}
                </span>
              </td>
              <td className="security-muted">{h.ip_address || "—"}</td>
              <td className="security-muted">{h.failure_reason || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
