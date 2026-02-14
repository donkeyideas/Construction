"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  CreditCard,
  Plug,
  ScrollText,
  Save,
  Upload,
  Loader2,
  ImageIcon,
  X,
  ExternalLink,
  Check,
  Crown,
  Zap,
  Rocket,
  Plus,
  Trash2,
  GripVertical,
  Star,
} from "lucide-react";

interface PricingTier {
  id?: string;
  name: string;
  monthly_price: number;
  annual_price: number;
  features: string[];
  is_popular: boolean;
  max_users: number | null;
  max_projects: number | null;
  max_properties: number | null;
  max_storage_gb: number | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_annual: string | null;
}
import type { CompanyDetails, AuditLogEntry } from "@/lib/queries/admin";

type TabKey = "general" | "subscription" | "pricing" | "integrations" | "audit";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "general", label: "General", icon: <Settings size={15} /> },
  { key: "subscription", label: "Subscription", icon: <CreditCard size={15} /> },
  { key: "pricing", label: "Pricing Manager", icon: <Zap size={15} /> },
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
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const INTEGRATIONS = [
  { name: "QuickBooks Online", desc: "Sync invoices, payments, and chart of accounts" },
  { name: "Procore", desc: "Connect project management and field data" },
  { name: "Planview", desc: "Import schedules and resource plans" },
  { name: "DocuSign", desc: "E-signatures for contracts and change orders" },
  { name: "Dropbox Business", desc: "Cloud document storage and plan room sync" },
];

const PLAN_INFO: Record<string, { label: string; icon: typeof Zap; color: string; features: string[] }> = {
  starter: {
    label: "Starter",
    icon: Zap,
    color: "var(--color-blue)",
    features: ["Up to 5 users", "3 active projects", "Basic reporting", "Email support"],
  },
  professional: {
    label: "Professional",
    icon: Rocket,
    color: "var(--color-amber)",
    features: ["Up to 25 users", "Unlimited projects", "Advanced reporting", "Priority support", "API access"],
  },
  enterprise: {
    label: "Enterprise",
    icon: Crown,
    color: "var(--color-green)",
    features: ["Unlimited users", "Unlimited projects", "Custom reporting", "Dedicated support", "SSO & SAML", "Custom integrations"],
  },
};

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

function formatEntity(entityType: string | null): string {
  if (!entityType) return "--";
  return entityType
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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);

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

  // Pricing manager state
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [pricingLoaded, setPricingLoaded] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  const [pricingMessage, setPricingMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [newFeatureInputs, setNewFeatureInputs] = useState<Record<number, string>>({});

  async function loadPricing() {
    if (pricingLoaded) return;
    try {
      const res = await fetch("/api/admin/pricing");
      if (res.ok) {
        const data = await res.json();
        if (data.tiers && data.tiers.length > 0) {
          setPricingTiers(data.tiers.map((t: PricingTier & { features: string[] | string }) => ({
            ...t,
            features: Array.isArray(t.features) ? t.features : [],
          })));
        } else {
          // Seed with defaults
          setPricingTiers([
            { name: "Starter", monthly_price: 99, annual_price: 79, features: ["Up to 10 users", "Up to 5 projects", "Up to 10 properties", "10 GB storage", "Email support"], is_popular: false, max_users: 10, max_projects: 5, max_properties: 10, max_storage_gb: 10, stripe_price_id_monthly: null, stripe_price_id_annual: null },
            { name: "Professional", monthly_price: 299, annual_price: 249, features: ["Up to 50 users", "Up to 25 projects", "Up to 50 properties", "50 GB storage", "Priority support", "API access", "Automation rules"], is_popular: true, max_users: 50, max_projects: 25, max_properties: 50, max_storage_gb: 50, stripe_price_id_monthly: null, stripe_price_id_annual: null },
            { name: "Enterprise", monthly_price: 599, annual_price: 499, features: ["Unlimited users", "Unlimited projects", "Unlimited properties", "250 GB storage", "Dedicated support", "SSO & SAML", "Custom integrations", "All 4 portals"], is_popular: false, max_users: null, max_projects: null, max_properties: null, max_storage_gb: 250, stripe_price_id_monthly: null, stripe_price_id_annual: null },
          ]);
        }
      }
    } catch {
      setPricingMessage({ type: "error", text: "Failed to load pricing tiers." });
    }
    setPricingLoaded(true);
  }

  async function handleSavePricing() {
    setSavingPricing(true);
    setPricingMessage(null);
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiers: pricingTiers }),
      });
      if (res.ok) {
        const data = await res.json();
        setPricingTiers(data.tiers.map((t: PricingTier & { features: string[] | string }) => ({
          ...t,
          features: Array.isArray(t.features) ? t.features : [],
        })));
        setPricingMessage({ type: "success", text: "Pricing tiers saved successfully." });
      } else {
        const data = await res.json();
        setPricingMessage({ type: "error", text: data.error || "Failed to save." });
      }
    } catch {
      setPricingMessage({ type: "error", text: "Network error." });
    } finally {
      setSavingPricing(false);
    }
  }

  function updateTier(index: number, field: string, value: string | number | boolean | null) {
    setPricingTiers((prev) => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  }

  function addTier() {
    setPricingTiers((prev) => [...prev, {
      name: "New Tier",
      monthly_price: 0,
      annual_price: 0,
      features: [],
      is_popular: false,
      max_users: null,
      max_projects: null,
      max_properties: null,
      max_storage_gb: null,
      stripe_price_id_monthly: null,
      stripe_price_id_annual: null,
    }]);
  }

  function removeTier(index: number) {
    setPricingTiers((prev) => prev.filter((_, i) => i !== index));
  }

  function addFeature(tierIndex: number) {
    const feat = (newFeatureInputs[tierIndex] || "").trim();
    if (!feat) return;
    setPricingTiers((prev) => prev.map((t, i) => i === tierIndex ? { ...t, features: [...t.features, feat] } : t));
    setNewFeatureInputs((prev) => ({ ...prev, [tierIndex]: "" }));
  }

  function removeFeature(tierIndex: number, featIndex: number) {
    setPricingTiers((prev) => prev.map((t, i) => i === tierIndex ? { ...t, features: t.features.filter((_, fi) => fi !== featIndex) } : t));
  }

  function moveTier(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= pricingTiers.length) return;
    setPricingTiers((prev) => {
      const copy = [...prev];
      [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
      return copy;
    });
  }

  useEffect(() => {
    if (activeTab === "pricing" && !pricingLoaded) {
      loadPricing();
    }
  }, [activeTab]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select an image file." });
      return;
    }

    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`/api/admin/settings/logo`, {
        method: "POST",
        body: fd,
      });

      if (res.ok) {
        const data = await res.json();
        setLogoUrl(data.logo_url);
        setMessage({ type: "success", text: "Logo uploaded successfully." });
        router.refresh();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Logo upload failed." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error uploading logo." });
    } finally {
      setUploadingLogo(false);
      if (logoFileRef.current) logoFileRef.current.value = "";
    }
  }

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

  const plan = company.subscription_plan || "starter";
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.starter;
  const PlanIcon = planInfo.icon;

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
                      <option key={ind} value={ind}>{ind}</option>
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
              <div className="settings-form-section-title">Contact &amp; Branding</div>
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
              </div>

              {/* Logo Upload */}
              <div style={{ marginTop: "16px" }}>
                <label className="settings-field-label">Company Logo</label>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "8px" }}>
                  {logoUrl ? (
                    <div style={{ position: "relative" }}>
                      <img
                        src={logoUrl}
                        alt="Company logo"
                        style={{
                          width: "80px",
                          height: "80px",
                          objectFit: "contain",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                          background: "var(--surface)",
                          padding: "4px",
                        }}
                      />
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setLogoUrl("")}
                          style={{
                            position: "absolute",
                            top: "-6px",
                            right: "-6px",
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            background: "var(--color-red)",
                            border: "none",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            fontSize: "0",
                          }}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "8px",
                        border: "2px dashed var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--muted)",
                      }}
                    >
                      <ImageIcon size={24} />
                    </div>
                  )}

                  {canEdit && (
                    <div>
                      <label
                        className="btn-secondary"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          cursor: uploadingLogo ? "wait" : "pointer",
                          fontSize: "0.82rem",
                          padding: "6px 14px",
                        }}
                      >
                        {uploadingLogo ? (
                          <Loader2 size={14} className="spin-icon" />
                        ) : (
                          <Upload size={14} />
                        )}
                        {uploadingLogo ? "Uploading..." : "Upload Logo"}
                        <input
                          ref={logoFileRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                          style={{ display: "none" }}
                        />
                      </label>
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "4px" }}>
                        PNG, JPG, or SVG. Max 2MB.
                      </div>
                    </div>
                  )}
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
                      <option key={month} value={month}>{month}</option>
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
                      <option key={tz} value={tz}>{tz.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="settings-form-actions">
                <button type="submit" className="btn-primary" disabled={saving}>
                  <Save size={16} />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </form>
        )}

        {/* ===== Subscription Tab ===== */}
        {activeTab === "subscription" && (
          <div className="settings-form">
            <div className="subscription-card">
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    background: `${planInfo.color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: planInfo.color,
                  }}
                >
                  <PlanIcon size={22} />
                </div>
                <div>
                  <div className="subscription-plan-name">{planInfo.label} Plan</div>
                  <div
                    className={`subscription-status ${
                      company.subscription_status === "active" ? "active" : "inactive"
                    }`}
                  >
                    {(company.subscription_status || "active").charAt(0).toUpperCase() +
                      (company.subscription_status || "active").slice(1).replace("_", " ")}
                  </div>
                </div>
              </div>

              <div className="subscription-info-row">
                <span className="subscription-info-label">Plan</span>
                <span className="subscription-info-value" style={{ textTransform: "capitalize" }}>
                  {planInfo.label}
                </span>
              </div>
              <div className="subscription-info-row">
                <span className="subscription-info-label">Status</span>
                <span className="subscription-info-value" style={{ textTransform: "capitalize" }}>
                  {(company.subscription_status || "active").replace("_", " ")}
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
              {company.trial_ends_at && (
                <div className="subscription-info-row">
                  <span className="subscription-info-label">Trial Ends</span>
                  <span className="subscription-info-value">
                    {formatDateTime(company.trial_ends_at)}
                  </span>
                </div>
              )}
            </div>

            {/* Plan Features */}
            <div className="settings-form-section" style={{ marginTop: "24px" }}>
              <div className="settings-form-section-title">Plan Features</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {planInfo.features.map((feat) => (
                  <div
                    key={feat}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: "0.875rem",
                    }}
                  >
                    <Check size={16} style={{ color: "var(--color-green)", flexShrink: 0 }} />
                    {feat}
                  </div>
                ))}
              </div>
            </div>

            {/* Stripe Manage */}
            <div className="settings-form-section" style={{ marginTop: "24px" }}>
              <div className="settings-form-section-title">Manage Subscription</div>
              <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "16px" }}>
                Upgrade your plan, update payment method, or view invoices through the billing portal.
              </p>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button
                  className="btn-primary"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/stripe/portal", { method: "POST" });
                      if (res.ok) {
                        const { url } = await res.json();
                        window.open(url, "_blank");
                      } else {
                        alert("Stripe billing portal is not configured yet. Contact your platform administrator.");
                      }
                    } catch {
                      alert("Stripe billing portal is not configured yet.");
                    }
                  }}
                >
                  <ExternalLink size={14} />
                  Manage Billing
                </button>
                {plan !== "enterprise" && (
                  <button
                    className="btn-secondary"
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/stripe/checkout", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            plan: plan === "starter" ? "professional" : "enterprise",
                          }),
                        });
                        if (res.ok) {
                          const { url } = await res.json();
                          window.open(url, "_blank");
                        } else {
                          alert("Stripe checkout is not configured yet. Contact your platform administrator.");
                        }
                      } catch {
                        alert("Stripe checkout is not configured yet.");
                      }
                    }}
                  >
                    <Zap size={14} />
                    Upgrade to {plan === "starter" ? "Professional" : "Enterprise"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== Pricing Manager Tab ===== */}
        {activeTab === "pricing" && (
          <div className="settings-form">
            {pricingMessage && (
              <div className={`settings-form-message ${pricingMessage.type}`}>
                {pricingMessage.text}
              </div>
            )}

            {!pricingLoaded ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0", gap: "10px", color: "var(--muted)" }}>
                <Loader2 size={20} className="spin-icon" /> Loading pricing tiers...
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                  <div>
                    <div className="settings-form-section-title" style={{ marginBottom: "4px" }}>Pricing Tiers</div>
                    <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: 0 }}>
                      Manage your subscription plans. Changes are saved when you click &quot;Save All Tiers&quot;.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button type="button" className="btn-secondary" onClick={addTier} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem" }}>
                      <Plus size={14} /> Add Tier
                    </button>
                    <button type="button" className="btn-primary" onClick={handleSavePricing} disabled={savingPricing} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem" }}>
                      <Save size={14} /> {savingPricing ? "Saving..." : "Save All Tiers"}
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {pricingTiers.map((tier, idx) => (
                    <div
                      key={idx}
                      style={{
                        border: tier.is_popular ? "2px solid var(--color-blue)" : "1px solid var(--border)",
                        borderRadius: "12px",
                        padding: "20px",
                        background: "var(--surface)",
                        position: "relative",
                      }}
                    >
                      {/* Tier header with reorder/delete */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <GripVertical size={16} style={{ color: "var(--muted)" }} />
                          <span style={{ fontWeight: 600, fontSize: "1rem" }}>
                            Tier {idx + 1}
                          </span>
                          {tier.is_popular && (
                            <span style={{
                              fontSize: "0.7rem",
                              padding: "2px 8px",
                              borderRadius: "999px",
                              background: "var(--color-blue)",
                              color: "#fff",
                              fontWeight: 600,
                            }}>
                              POPULAR
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <button
                            type="button"
                            onClick={() => moveTier(idx, -1)}
                            disabled={idx === 0}
                            title="Move up"
                            style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: "6px", background: "transparent", cursor: idx === 0 ? "not-allowed" : "pointer", opacity: idx === 0 ? 0.4 : 1, color: "var(--foreground)", fontSize: "0.75rem" }}
                          >
                            &#9650;
                          </button>
                          <button
                            type="button"
                            onClick={() => moveTier(idx, 1)}
                            disabled={idx === pricingTiers.length - 1}
                            title="Move down"
                            style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: "6px", background: "transparent", cursor: idx === pricingTiers.length - 1 ? "not-allowed" : "pointer", opacity: idx === pricingTiers.length - 1 ? 0.4 : 1, color: "var(--foreground)", fontSize: "0.75rem" }}
                          >
                            &#9660;
                          </button>
                          <button
                            type="button"
                            onClick={() => updateTier(idx, "is_popular", !tier.is_popular)}
                            title={tier.is_popular ? "Remove popular badge" : "Mark as popular"}
                            style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: "6px", background: tier.is_popular ? "var(--color-amber)" : "transparent", cursor: "pointer", color: tier.is_popular ? "#fff" : "var(--foreground)", fontSize: "0" }}
                          >
                            <Star size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeTier(idx)}
                            title="Delete tier"
                            style={{ padding: "4px 8px", border: "1px solid var(--color-red)", borderRadius: "6px", background: "transparent", cursor: "pointer", color: "var(--color-red)", fontSize: "0" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Name + Prices */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                        <div>
                          <label className="settings-field-label">Tier Name</label>
                          <input
                            type="text"
                            className="settings-field-input"
                            value={tier.name}
                            onChange={(e) => updateTier(idx, "name", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="settings-field-label">Monthly Price ($)</label>
                          <input
                            type="number"
                            className="settings-field-input"
                            min={0}
                            step={1}
                            value={tier.monthly_price}
                            onChange={(e) => updateTier(idx, "monthly_price", Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="settings-field-label">Annual Price ($/mo)</label>
                          <input
                            type="number"
                            className="settings-field-input"
                            min={0}
                            step={1}
                            value={tier.annual_price}
                            onChange={(e) => updateTier(idx, "annual_price", Number(e.target.value))}
                          />
                        </div>
                      </div>

                      {/* Limits */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                        <div>
                          <label className="settings-field-label">Max Users</label>
                          <input
                            type="number"
                            className="settings-field-input"
                            min={0}
                            placeholder="Unlimited"
                            value={tier.max_users ?? ""}
                            onChange={(e) => updateTier(idx, "max_users", e.target.value ? Number(e.target.value) : null)}
                          />
                        </div>
                        <div>
                          <label className="settings-field-label">Max Projects</label>
                          <input
                            type="number"
                            className="settings-field-input"
                            min={0}
                            placeholder="Unlimited"
                            value={tier.max_projects ?? ""}
                            onChange={(e) => updateTier(idx, "max_projects", e.target.value ? Number(e.target.value) : null)}
                          />
                        </div>
                        <div>
                          <label className="settings-field-label">Max Properties</label>
                          <input
                            type="number"
                            className="settings-field-input"
                            min={0}
                            placeholder="Unlimited"
                            value={tier.max_properties ?? ""}
                            onChange={(e) => updateTier(idx, "max_properties", e.target.value ? Number(e.target.value) : null)}
                          />
                        </div>
                        <div>
                          <label className="settings-field-label">Storage (GB)</label>
                          <input
                            type="number"
                            className="settings-field-input"
                            min={0}
                            placeholder="Unlimited"
                            value={tier.max_storage_gb ?? ""}
                            onChange={(e) => updateTier(idx, "max_storage_gb", e.target.value ? Number(e.target.value) : null)}
                          />
                        </div>
                      </div>

                      {/* Stripe Price IDs */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                        <div>
                          <label className="settings-field-label">Stripe Monthly Price ID</label>
                          <input
                            type="text"
                            className="settings-field-input"
                            placeholder="price_xxxxx"
                            value={tier.stripe_price_id_monthly ?? ""}
                            onChange={(e) => updateTier(idx, "stripe_price_id_monthly", e.target.value || null)}
                          />
                        </div>
                        <div>
                          <label className="settings-field-label">Stripe Annual Price ID</label>
                          <input
                            type="text"
                            className="settings-field-input"
                            placeholder="price_xxxxx"
                            value={tier.stripe_price_id_annual ?? ""}
                            onChange={(e) => updateTier(idx, "stripe_price_id_annual", e.target.value || null)}
                          />
                        </div>
                      </div>

                      {/* Features List */}
                      <div>
                        <label className="settings-field-label" style={{ marginBottom: "8px", display: "block" }}>Features</label>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {tier.features.map((feat, fi) => (
                            <div key={fi} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <Check size={14} style={{ color: "var(--color-green)", flexShrink: 0 }} />
                              <span style={{ flex: 1, fontSize: "0.85rem" }}>{feat}</span>
                              <button
                                type="button"
                                onClick={() => removeFeature(idx, fi)}
                                style={{ padding: "2px 6px", border: "none", background: "transparent", cursor: "pointer", color: "var(--color-red)", fontSize: "0" }}
                                title="Remove feature"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                            <input
                              type="text"
                              className="settings-field-input"
                              placeholder="Add a feature..."
                              value={newFeatureInputs[idx] || ""}
                              onChange={(e) => setNewFeatureInputs((prev) => ({ ...prev, [idx]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(idx); } }}
                              style={{ flex: 1 }}
                            />
                            <button
                              type="button"
                              onClick={() => addFeature(idx)}
                              className="btn-secondary"
                              style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", padding: "6px 12px", whiteSpace: "nowrap" }}
                            >
                              <Plus size={14} /> Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {pricingTiers.length === 0 && (
                  <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
                    <Zap size={32} style={{ marginBottom: "12px", opacity: 0.4 }} />
                    <div style={{ fontSize: "0.95rem", fontWeight: 500 }}>No pricing tiers yet</div>
                    <div style={{ fontSize: "0.82rem", marginTop: "4px" }}>Click &quot;Add Tier&quot; to create your first pricing plan.</div>
                  </div>
                )}
              </>
            )}
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
                            {formatEntity(entry.entity_type)}
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
