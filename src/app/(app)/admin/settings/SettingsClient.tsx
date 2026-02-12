"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  CreditCard,
  Plug,
  ScrollText,
  Save,
} from "lucide-react";
import type { CompanyDetails, AuditLogEntry } from "@/lib/queries/admin";

type TabKey = "general" | "subscription" | "integrations" | "audit";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "general", label: "General", icon: <Settings size={15} /> },
  { key: "subscription", label: "Subscription", icon: <CreditCard size={15} /> },
  { key: "integrations", label: "Integrations", icon: <Plug size={15} /> },
  { key: "audit", label: "Audit Log", icon: <ScrollText size={15} /> },
];

const INDUSTRIES = [
  "General Contracting",
  "Residential Construction",
  "Commercial Construction",
  "Heavy Civil",
  "Specialty Trade",
  "Real Estate Development",
  "Engineering",
  "Architecture",
  "Other",
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
];

const FISCAL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const INTEGRATIONS = [
  {
    name: "QuickBooks Online",
    desc: "Sync invoices, payments, and chart of accounts",
  },
  {
    name: "Procore",
    desc: "Connect project management and field data",
  },
  {
    name: "Planview",
    desc: "Import schedules and resource plans",
  },
  {
    name: "DocuSign",
    desc: "E-signatures for contracts and change orders",
  },
  {
    name: "Dropbox Business",
    desc: "Cloud document storage and plan room sync",
  },
];

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatAction(action: string): string {
  return action
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface SettingsClientProps {
  company: CompanyDetails;
  auditLog: AuditLogEntry[];
  memberCount: number;
  currentUserRole: string;
}

export default function SettingsClient({
  company,
  auditLog,
  memberCount,
  currentUserRole,
}: SettingsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("general");

  // General form state
  const [name, setName] = useState(company.name || "");
  const [industry, setIndustry] = useState(company.industry || "");
  const [address, setAddress] = useState(company.address || "");
  const [city, setCity] = useState(company.city || "");
  const [state, setState] = useState(company.state || "");
  const [zip, setZip] = useState(company.zip || "");
  const [phone, setPhone] = useState(company.phone || "");
  const [website, setWebsite] = useState(company.website || "");
  const [logoUrl, setLogoUrl] = useState(company.logo_url || "");

  const companySettings = company.settings || {};
  const [fiscalYearStart, setFiscalYearStart] = useState(
    (companySettings.fiscal_year_start as string) || "January"
  );
  const [timezone, setTimezone] = useState(
    (companySettings.timezone as string) || "America/New_York"
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const canEdit = currentUserRole === "owner" || currentUserRole === "admin";

  async function handleSaveGeneral(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          industry: industry || null,
          address: address || null,
          city: city || null,
          state: state || null,
          zip: zip || null,
          phone: phone || null,
          website: website || null,
          logo_url: logoUrl || null,
          settings: {
            ...companySettings,
            fiscal_year_start: fiscalYearStart,
            timezone,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to save settings." });
      } else {
        setMessage({ type: "success", text: "Company settings updated successfully." });
        router.refresh();
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="admin-header">
        <div>
          <h2>Company Settings</h2>
          <p className="admin-header-sub">
            Configure your company profile, subscription, and integrations
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="settings-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`settings-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="settings-tab-panel">
        {/* ===== General Tab ===== */}
        {activeTab === "general" && (
          <form className="settings-form" onSubmit={handleSaveGeneral}>
            {message && (
              <div className={`settings-form-message ${message.type}`}>
                {message.text}
              </div>
            )}

            <div className="settings-form-section">
              <div className="settings-form-section-title">Company Information</div>
              <div className="settings-row">
                <div className="settings-field">
                  <label className="settings-field-label">Company Name</label>
                  <input
                    type="text"
                    className="settings-field-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={!canEdit}
                  />
                </div>
                <div className="settings-field">
                  <label className="settings-field-label">Industry</label>
                  <select
                    className="settings-field-select"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    disabled={!canEdit}
                  >
                    <option value="">Select industry...</option>
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="settings-form-section">
              <div className="settings-form-section-title">Address</div>
              <div className="settings-row">
                <div className="settings-field full-width">
                  <label className="settings-field-label">Street Address</label>
                  <input
                    type="text"
                    className="settings-field-input"
                    placeholder="123 Main Street"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                <div className="settings-field">
                  <label className="settings-field-label">City</label>
                  <input
                    type="text"
                    className="settings-field-input"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                <div className="settings-field">
                  <label className="settings-field-label">State</label>
                  <input
                    type="text"
                    className="settings-field-input"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                <div className="settings-field">
                  <label className="settings-field-label">ZIP Code</label>
                  <input
                    type="text"
                    className="settings-field-input"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </div>

            <div className="settings-form-section">
              <div className="settings-form-section-title">Contact & Branding</div>
              <div className="settings-row">
                <div className="settings-field">
                  <label className="settings-field-label">Phone</label>
                  <input
                    type="tel"
                    className="settings-field-input"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                <div className="settings-field">
                  <label className="settings-field-label">Website</label>
                  <input
                    type="url"
                    className="settings-field-input"
                    placeholder="https://example.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                <div className="settings-field full-width">
                  <label className="settings-field-label">Logo URL</label>
                  <input
                    type="url"
                    className="settings-field-input"
                    placeholder="https://example.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </div>

            <div className="settings-form-section">
              <div className="settings-form-section-title">Preferences</div>
              <div className="settings-row">
                <div className="settings-field">
                  <label className="settings-field-label">Fiscal Year Start</label>
                  <select
                    className="settings-field-select"
                    value={fiscalYearStart}
                    onChange={(e) => setFiscalYearStart(e.target.value)}
                    disabled={!canEdit}
                  >
                    {FISCAL_MONTHS.map((month) => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="settings-field">
                  <label className="settings-field-label">Timezone</label>
                  <select
                    className="settings-field-select"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    disabled={!canEdit}
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="settings-form-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                >
                  <Save size={16} />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </form>
        )}

        {/* ===== Subscription Tab ===== */}
        {activeTab === "subscription" && (
          <div>
            <div className="subscription-card">
              <div className="subscription-plan-name">
                {company.subscription_tier} Plan
              </div>
              <div
                className={`subscription-status ${
                  company.subscription_status === "active" ? "active" : "inactive"
                }`}
              >
                {company.subscription_status === "active" ? "Active" : "Inactive"}
              </div>

              <div className="subscription-info-row">
                <span className="subscription-info-label">Plan Tier</span>
                <span className="subscription-info-value" style={{ textTransform: "capitalize" }}>
                  {company.subscription_tier}
                </span>
              </div>
              <div className="subscription-info-row">
                <span className="subscription-info-label">Status</span>
                <span className="subscription-info-value" style={{ textTransform: "capitalize" }}>
                  {company.subscription_status}
                </span>
              </div>
              <div className="subscription-info-row">
                <span className="subscription-info-label">Active Members</span>
                <span className="subscription-info-value">{memberCount}</span>
              </div>
              <div className="subscription-info-row">
                <span className="subscription-info-label">Member Since</span>
                <span className="subscription-info-value">
                  {formatDateTime(company.created_at)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ===== Integrations Tab ===== */}
        {activeTab === "integrations" && (
          <div className="integrations-list">
            {INTEGRATIONS.map((integration) => (
              <div key={integration.name} className="integration-item">
                <div className="integration-info">
                  <div className="integration-name">{integration.name}</div>
                  <div className="integration-desc">{integration.desc}</div>
                </div>
                <button
                  className="integration-toggle"
                  title={`Toggle ${integration.name}`}
                  onClick={() => {
                    // Placeholder - integrations are not yet implemented
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* ===== Audit Log Tab ===== */}
        {activeTab === "audit" && (
          <div>
            {auditLog.length === 0 ? (
              <div className="admin-empty">
                <div className="admin-empty-icon">
                  <ScrollText size={32} />
                </div>
                <div className="admin-empty-title">No audit entries yet</div>
                <div className="admin-empty-desc">
                  Activity will appear here as team members make changes.
                </div>
              </div>
            ) : (
              <div className="audit-table-wrap">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>User</th>
                      <th>Entity</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLog.map((entry) => (
                      <tr key={entry.id}>
                        <td>
                          <span className="audit-action">
                            {formatAction(entry.action)}
                          </span>
                        </td>
                        <td>
                          <span className="audit-user">
                            {entry.user_profile?.full_name ||
                              entry.user_profile?.email ||
                              "System"}
                          </span>
                        </td>
                        <td>
                          <span className="audit-entity">
                            {entry.entity_type
                              ? `${entry.entity_type}${
                                  entry.entity_id
                                    ? ` (${entry.entity_id.slice(0, 8)}...)`
                                    : ""
                                }`
                              : "--"}
                          </span>
                        </td>
                        <td>
                          <span className="audit-timestamp">
                            {formatDateTime(entry.created_at)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
