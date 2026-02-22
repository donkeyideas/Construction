"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Settings,
  Globe,
  Mail,
  Link2,
  Clock,
  Shield,
  Key,
  Check,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface Props {
  settings: Record<string, { value: string; is_encrypted: boolean }>;
}

const US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "America/Phoenix", label: "Arizona (no DST)" },
  { value: "UTC", label: "UTC" },
];

export default function PlatformSettingsClient({ settings }: Props) {
  const router = useRouter();
  const t = useTranslations("superAdmin");

  // --- General Settings state ---
  const [siteName, setSiteName] = useState(
    settings.site_name?.value ?? "Buildwrk"
  );
  const [supportEmail, setSupportEmail] = useState(
    settings.support_email?.value ?? "info@donkeyideas.com"
  );
  const [platformUrl, setPlatformUrl] = useState(
    settings.platform_url?.value ??
      "https://construction-gamma-six.vercel.app"
  );
  const [defaultTimezone, setDefaultTimezone] = useState(
    settings.default_timezone?.value ?? "America/New_York"
  );
  const [companyRegistrationEnabled, setCompanyRegistrationEnabled] = useState(
    settings.company_registration_enabled?.value === "true"
  );
  const [maintenanceMode, setMaintenanceMode] = useState(
    settings.maintenance_mode?.value === "true"
  );

  // --- Google API state ---
  const [googleJson, setGoogleJson] = useState("");
  const [showGoogleJson, setShowGoogleJson] = useState(false);
  const hasGoogleJson = !!settings.google_service_account_json;

  // --- UI state ---
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Track initial values to detect changes
  const initial = {
    site_name: settings.site_name?.value ?? "Buildwrk",
    support_email: settings.support_email?.value ?? "info@donkeyideas.com",
    platform_url:
      settings.platform_url?.value ??
      "https://construction-gamma-six.vercel.app",
    default_timezone: settings.default_timezone?.value ?? "America/New_York",
    company_registration_enabled:
      settings.company_registration_enabled?.value ?? "false",
    maintenance_mode: settings.maintenance_mode?.value ?? "false",
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const body: Record<string, string> = {};

      // Only include fields that have changed
      if (siteName !== initial.site_name) body.site_name = siteName;
      if (supportEmail !== initial.support_email)
        body.support_email = supportEmail;
      if (platformUrl !== initial.platform_url) body.platform_url = platformUrl;
      if (defaultTimezone !== initial.default_timezone)
        body.default_timezone = defaultTimezone;

      const regVal = companyRegistrationEnabled ? "true" : "false";
      if (regVal !== initial.company_registration_enabled)
        body.company_registration_enabled = regVal;

      const maintVal = maintenanceMode ? "true" : "false";
      if (maintVal !== initial.maintenance_mode)
        body.maintenance_mode = maintVal;

      // Google JSON: only send if user typed something
      if (googleJson.trim()) {
        body.google_service_account_json = googleJson.trim();
      }

      if (Object.keys(body).length === 0) {
        setError("No changes to save.");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/super-admin/platform-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save settings.");
        return;
      }

      setGoogleJson("");
      setSuccess("Platform settings saved successfully.");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="admin-header">
        <div>
          <h2>
            <Settings
              size={28}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: 10,
              }}
            />
            Platform Settings
          </h2>
          <p className="admin-header-sub">
            Configure general platform settings, integrations, and preferences
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && <div className="invite-error">{error}</div>}
      {success && <div className="invite-success">{success}</div>}

      <form onSubmit={handleSave}>
        {/* Section 1: General Settings */}
        <div className="sa-card" style={{ marginBottom: 24 }}>
          <div className="sa-card-title">
            <Globe size={18} /> General Settings
          </div>
          <p
            style={{
              color: "var(--muted)",
              fontSize: "0.85rem",
              marginBottom: 20,
            }}
          >
            Core platform configuration values
          </p>

          {/* Site Name */}
          <div className="ticket-form-group">
            <label className="ticket-form-label">
              <Globe
                size={14}
                style={{
                  display: "inline",
                  verticalAlign: "middle",
                  marginRight: 6,
                }}
              />
              Site Name
            </label>
            <input
              type="text"
              className="ticket-form-input"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="Buildwrk"
            />
          </div>

          {/* Support Email */}
          <div className="ticket-form-group">
            <label className="ticket-form-label">
              <Mail
                size={14}
                style={{
                  display: "inline",
                  verticalAlign: "middle",
                  marginRight: 6,
                }}
              />
              Support Email
            </label>
            <input
              type="email"
              className="ticket-form-input"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="info@donkeyideas.com"
            />
          </div>

          {/* Platform URL */}
          <div className="ticket-form-group">
            <label className="ticket-form-label">
              <Link2
                size={14}
                style={{
                  display: "inline",
                  verticalAlign: "middle",
                  marginRight: 6,
                }}
              />
              Platform URL
            </label>
            <input
              type="text"
              className="ticket-form-input"
              value={platformUrl}
              onChange={(e) => setPlatformUrl(e.target.value)}
              placeholder="https://construction-gamma-six.vercel.app"
            />
          </div>

          {/* Default Timezone */}
          <div className="ticket-form-group">
            <label className="ticket-form-label">
              <Clock
                size={14}
                style={{
                  display: "inline",
                  verticalAlign: "middle",
                  marginRight: 6,
                }}
              />
              Default Timezone
            </label>
            <select
              className="ticket-form-input"
              value={defaultTimezone}
              onChange={(e) => setDefaultTimezone(e.target.value)}
            >
              {US_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          {/* Allow Company Registration */}
          <div className="ticket-form-group">
            <label
              className="ticket-form-label"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
              }}
            >
              <Shield
                size={14}
                style={{ display: "inline", verticalAlign: "middle" }}
              />
              Allow Company Registration
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 4,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setCompanyRegistrationEnabled(!companyRegistrationEnabled)
                }
                style={{
                  width: 48,
                  height: 26,
                  borderRadius: 13,
                  border: "none",
                  cursor: "pointer",
                  background: companyRegistrationEnabled
                    ? "var(--color-green)"
                    : "var(--border)",
                  position: "relative",
                  transition: "background 0.2s",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    left: companyRegistrationEnabled ? 24 : 3,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#fff",
                    transition: "left 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }}
                />
              </button>
              <span
                style={{
                  fontSize: "0.85rem",
                  color: companyRegistrationEnabled
                    ? "var(--color-green)"
                    : "var(--muted)",
                }}
              >
                {companyRegistrationEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>

          {/* Maintenance Mode */}
          <div className="ticket-form-group">
            <label
              className="ticket-form-label"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
              }}
            >
              <Shield
                size={14}
                style={{ display: "inline", verticalAlign: "middle" }}
              />
              Maintenance Mode
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 4,
              }}
            >
              <button
                type="button"
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                style={{
                  width: 48,
                  height: 26,
                  borderRadius: 13,
                  border: "none",
                  cursor: "pointer",
                  background: maintenanceMode
                    ? "var(--color-amber)"
                    : "var(--border)",
                  position: "relative",
                  transition: "background 0.2s",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    left: maintenanceMode ? 24 : 3,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#fff",
                    transition: "left 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }}
                />
              </button>
              <span
                style={{
                  fontSize: "0.85rem",
                  color: maintenanceMode
                    ? "var(--color-amber)"
                    : "var(--muted)",
                }}
              >
                {maintenanceMode ? "Enabled" : "Disabled"}
              </span>
            </div>
            {maintenanceMode && (
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 14px",
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid var(--color-amber)",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: "0.85rem",
                  color: "var(--color-amber)",
                }}
              >
                <AlertTriangle size={16} />
                Maintenance mode is active. Users will see a maintenance page
                instead of the application.
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Google API Integration */}
        <div className="sa-card" style={{ marginBottom: 24 }}>
          <div className="sa-card-title">
            <Key size={18} /> Google API Integration
          </div>
          <p
            style={{
              color: "var(--muted)",
              fontSize: "0.85rem",
              marginBottom: 20,
            }}
          >
            Configure Google Cloud service account for GA4 and Search Console
            integration
          </p>

          <div className="ticket-form-group">
            <label className="ticket-form-label">
              <Key
                size={14}
                style={{
                  display: "inline",
                  verticalAlign: "middle",
                  marginRight: 6,
                }}
              />
              Google Service Account JSON
            </label>
            <div style={{ position: "relative" }}>
              <textarea
                className="ticket-form-input"
                rows={6}
                value={googleJson}
                onChange={(e) => setGoogleJson(e.target.value)}
                placeholder={
                  hasGoogleJson
                    ? `${settings.google_service_account_json.value} (leave blank to keep current)`
                    : '{"type": "service_account", ...}'
                }
                style={{
                  resize: "vertical",
                  fontFamily: "monospace",
                  fontSize: "0.8rem",
                  paddingRight: 40,
                  ...(showGoogleJson ? {} : { color: "transparent", textShadow: "0 0 8px var(--muted)" }),
                } as React.CSSProperties}
              />
              <button
                type="button"
                onClick={() => setShowGoogleJson(!showGoogleJson)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: 10,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                  padding: 4,
                }}
              >
                {showGoogleJson ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {hasGoogleJson && (
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--color-green)",
                  marginTop: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Check size={12} /> Currently configured (encrypted)
              </span>
            )}
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--muted)",
                marginTop: 4,
                display: "block",
              }}
            >
              Paste your Google Cloud service account JSON for GA4 and Search
              Console integration
            </span>
          </div>
        </div>

        {/* Save Button */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <button
            type="submit"
            className="sa-action-btn primary"
            disabled={saving}
          >
            {saving ? (
              <Loader2 size={14} className="spin-animation" />
            ) : (
              <Check size={14} />
            )}
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>

      {/* Section 3: Quick Links */}
      <div className="sa-card" style={{ marginBottom: 24 }}>
        <div className="sa-card-title">
          <Link2 size={18} /> Quick Links
        </div>
        <p
          style={{
            color: "var(--muted)",
            fontSize: "0.85rem",
            marginBottom: 16,
          }}
        >
          Navigate to other settings pages
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link
            href="/super-admin/stripe-settings"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--foreground)",
              textDecoration: "none",
              fontSize: "0.9rem",
              transition: "border-color 0.2s",
            }}
          >
            <Shield size={18} style={{ color: "var(--primary)" }} />
            <span style={{ flex: 1 }}>Stripe Settings</span>
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--muted)",
              }}
            >
              Payment gateway configuration
            </span>
            <ExternalLink size={14} style={{ color: "var(--muted)" }} />
          </Link>

          <Link
            href="/super-admin/seo"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--foreground)",
              textDecoration: "none",
              fontSize: "0.9rem",
              transition: "border-color 0.2s",
            }}
          >
            <Globe size={18} style={{ color: "var(--primary)" }} />
            <span style={{ flex: 1 }}>Search & AI</span>
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--muted)",
              }}
            >
              Search engine optimization & geographic presence
            </span>
            <ExternalLink size={14} style={{ color: "var(--muted)" }} />
          </Link>
        </div>
      </div>

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
