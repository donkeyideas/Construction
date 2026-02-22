"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Settings,
  CreditCard,
  Plug,
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
  Ticket,
  LayoutGrid,
} from "lucide-react";
import { MODULES } from "@/lib/constants/modules";
import { ArrowUpRight } from "lucide-react";

import type { CompanyDetails } from "@/lib/queries/admin";

type TabKey = "general" | "subscription" | "modules" | "integrations";

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

interface SettingsClientProps {
  company: CompanyDetails;
  memberCount: number;
  currentUserRole: string;
}

export default function SettingsClient({
  company,
  memberCount,
  currentUserRole,
}: SettingsClientProps) {
  const router = useRouter();
  const t = useTranslations("adminPanel");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";
  const [activeTab, setActiveTab] = useState<TabKey>("general");

  const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "general", label: t("general"), icon: <Settings size={15} /> },
    { key: "subscription", label: t("subscription"), icon: <CreditCard size={15} /> },
    { key: "modules", label: "Modules", icon: <LayoutGrid size={15} /> },
    { key: "integrations", label: t("integrations"), icon: <Plug size={15} /> },
  ];

  const PLAN_INFO: Record<string, { label: string; icon: typeof Zap; color: string; features: string[] }> = {
    starter: {
      label: t("starter"),
      icon: Zap,
      color: "var(--color-blue)",
      features: [t("upTo5Users"), t("threeActiveProjects"), t("basicReporting"), t("emailSupport")],
    },
    professional: {
      label: t("professional"),
      icon: Rocket,
      color: "var(--color-amber)",
      features: [t("upTo25Users"), t("unlimitedProjects"), t("advancedReporting"), t("prioritySupport"), t("apiAccess")],
    },
    enterprise: {
      label: t("enterprise"),
      icon: Crown,
      color: "var(--color-green)",
      features: [t("unlimitedUsers"), t("unlimitedProjects"), t("customReporting"), t("dedicatedSupport"), t("ssoSaml"), t("customIntegrations")],
    },
  };

  function formatDateTime(dateStr: string | null) {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleString(dateLocale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

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

  // Promo code redemption state
  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMessage, setPromoMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Billing state
  const [billingMessage, setBillingMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Module state
  const [enabledModules, setEnabledModules] = useState<string[]>(
    (company.selected_modules as string[]) || []
  );
  const [savingModules, setSavingModules] = useState(false);
  const [moduleMessage, setModuleMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Handle ?success=true redirect from Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setActiveTab("subscription");
      setBillingMessage({ type: "success", text: "Subscription activated! Your plan has been upgraded." });
      router.replace("/admin/settings?tab=subscription", { scroll: false });
    }
    if (params.get("tab") === "subscription") {
      setActiveTab("subscription");
    }
  }, [router]);

  const canEdit = currentUserRole === "owner" || currentUserRole === "admin";

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: t("pleaseSelectImageFile") });
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
        setMessage({ type: "success", text: t("logoUploadedSuccessfully") });
        router.refresh();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || t("logoUploadFailed") });
      }
    } catch {
      setMessage({ type: "error", text: t("networkErrorUploadingLogo") });
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
        setMessage({ type: "error", text: data.error || t("failedToSaveSettings") });
      } else {
        setMessage({ type: "success", text: t("companySettingsUpdatedSuccessfully") });
        router.refresh();
      }
    } catch {
      setMessage({ type: "error", text: t("networkErrorPleaseTryAgain") });
    } finally {
      setSaving(false);
    }
  }

  const plan = company.subscription_plan || "starter";
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.starter;
  const PlanIcon = planInfo.icon;

  // Plan-based module limits
  const PLAN_MAX_MODULES: Record<string, number | null> = {
    starter: 3,
    professional: 6,
    enterprise: null,
  };
  const PLAN_UPGRADE_TARGET: Record<string, string> = {
    starter: "Professional",
    professional: "Enterprise",
  };
  const maxModules = PLAN_MAX_MODULES[plan] ?? null;
  const atModuleLimit = maxModules !== null && enabledModules.length >= maxModules;
  const nextPlan = PLAN_UPGRADE_TARGET[plan];

  return (
    <div>
      {/* Header */}
      <div className="admin-header">
        <div>
          <h2>{t("companySettings")}</h2>
          <p className="admin-header-sub">
            {t("configureCompanyProfileSubscriptionIntegrations")}
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
              <div className="settings-form-section-title">{t("companyInformation")}</div>
              <div className="settings-row">
                <div className="settings-field">
                  <label className="settings-field-label">{t("companyName")}</label>
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
                  <label className="settings-field-label">{t("industry")}</label>
                  <select
                    className="settings-field-select"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    disabled={!canEdit}
                  >
                    <option value="">{t("selectIndustry")}</option>
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="settings-form-section">
              <div className="settings-form-section-title">{t("address")}</div>
              <div className="settings-row">
                <div className="settings-field full-width">
                  <label className="settings-field-label">{t("streetAddress")}</label>
                  <input
                    type="text"
                    className="settings-field-input"
                    placeholder={t("streetAddressPlaceholder")}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                <div className="settings-field">
                  <label className="settings-field-label">{t("city")}</label>
                  <input
                    type="text"
                    className="settings-field-input"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                <div className="settings-field">
                  <label className="settings-field-label">{t("state")}</label>
                  <input
                    type="text"
                    className="settings-field-input"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                <div className="settings-field">
                  <label className="settings-field-label">{t("zipCode")}</label>
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
              <div className="settings-form-section-title">{t("contactAndBranding")}</div>
              <div className="settings-row">
                <div className="settings-field">
                  <label className="settings-field-label">{t("phone")}</label>
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
                  <label className="settings-field-label">{t("website")}</label>
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
                <label className="settings-field-label">{t("companyLogo")}</label>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "8px" }}>
                  {logoUrl ? (
                    <div style={{ position: "relative" }}>
                      <img
                        src={logoUrl}
                        alt={t("companyLogoAlt")}
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
                        {uploadingLogo ? t("uploading") : t("uploadLogo")}
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
                        {t("logoFileHint")}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="settings-form-section">
              <div className="settings-form-section-title">{t("preferences")}</div>
              <div className="settings-row">
                <div className="settings-field">
                  <label className="settings-field-label">{t("fiscalYearStart")}</label>
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
                  <label className="settings-field-label">{t("timezone")}</label>
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
                  {saving ? t("saving") : t("saveChanges")}
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
                  <div className="subscription-plan-name">{t("planName", { plan: planInfo.label })}</div>
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
                <span className="subscription-info-label">{t("plan")}</span>
                <span className="subscription-info-value" style={{ textTransform: "capitalize" }}>
                  {planInfo.label}
                </span>
              </div>
              <div className="subscription-info-row">
                <span className="subscription-info-label">{t("status")}</span>
                <span className="subscription-info-value" style={{ textTransform: "capitalize" }}>
                  {(company.subscription_status || "active").replace("_", " ")}
                </span>
              </div>
              <div className="subscription-info-row">
                <span className="subscription-info-label">{t("activeMembers")}</span>
                <span className="subscription-info-value">{memberCount}</span>
              </div>
              <div className="subscription-info-row">
                <span className="subscription-info-label">{t("memberSince")}</span>
                <span className="subscription-info-value">
                  {formatDateTime(company.created_at)}
                </span>
              </div>
              {company.trial_ends_at && (
                <div className="subscription-info-row">
                  <span className="subscription-info-label">{t("trialEnds")}</span>
                  <span className="subscription-info-value">
                    {formatDateTime(company.trial_ends_at)}
                  </span>
                </div>
              )}
            </div>

            {/* Plan Features */}
            <div className="settings-form-section" style={{ marginTop: "24px" }}>
              <div className="settings-form-section-title">{t("planFeatures")}</div>
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

            {/* Redeem Promo Code */}
            <div className="settings-form-section" style={{ marginTop: "24px" }}>
              <div className="settings-form-section-title">
                <Ticket size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
                Redeem Promo Code
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "12px" }}>
                Have a promo code? Enter it below to upgrade your subscription plan.
              </p>
              {promoMessage && (
                <div
                  className={`settings-form-message ${promoMessage.type}`}
                  style={{ marginBottom: "12px" }}
                >
                  {promoMessage.text}
                </div>
              )}
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                  type="text"
                  className="settings-field-input"
                  placeholder="PROMO-CODE"
                  value={promoInput}
                  onChange={(e) => {
                    setPromoInput(e.target.value.toUpperCase());
                    setPromoMessage(null);
                  }}
                  disabled={promoLoading}
                  style={{ maxWidth: "260px", textTransform: "uppercase", letterSpacing: "0.05em" }}
                />
                <button
                  className="btn-primary"
                  disabled={!promoInput.trim() || promoLoading}
                  onClick={async () => {
                    setPromoLoading(true);
                    setPromoMessage(null);
                    try {
                      const res = await fetch("/api/promo-codes/redeem", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ code: promoInput.trim() }),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        setPromoMessage({ type: "success", text: data.message || "Promo code redeemed successfully!" });
                        setPromoInput("");
                        router.refresh();
                      } else {
                        setPromoMessage({ type: "error", text: data.error || "Invalid or expired promo code." });
                      }
                    } catch {
                      setPromoMessage({ type: "error", text: "Network error. Please try again." });
                    } finally {
                      setPromoLoading(false);
                    }
                  }}
                >
                  {promoLoading ? <Loader2 size={14} className="spin-icon" /> : <Ticket size={14} />}
                  Redeem
                </button>
              </div>
            </div>

            {/* Trial Banner */}
            {company.trial_ends_at && (company.subscription_status === "trialing" || !company.stripe_subscription_id) && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "16px",
                  borderRadius: "10px",
                  border: "1px solid var(--color-amber)",
                  background: "rgba(180, 83, 9, 0.06)",
                  marginTop: "24px",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "8px",
                    background: "rgba(180, 83, 9, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-amber)",
                    flexShrink: 0,
                  }}
                >
                  <Zap size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "2px" }}>
                    Free Trial
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                    {(() => {
                      const trialEnd = new Date(company.trial_ends_at!).getTime();
                      const daysLeft = Math.max(0, Math.ceil((trialEnd - Date.now()) / (1000 * 60 * 60 * 24)));
                      if (daysLeft === 0) return "Your trial has expired. Upgrade to continue using the platform.";
                      return `You have ${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining in your free trial. No credit card required during trial.`;
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Stripe Manage */}
            <div className="settings-form-section" style={{ marginTop: "24px" }}>
              <div className="settings-form-section-title">{t("manageSubscription")}</div>
              <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "16px" }}>
                {t("manageSubscriptionDescription")}
              </p>
              {billingMessage && (
                <div
                  className={`settings-form-message ${billingMessage.type}`}
                  style={{ marginBottom: "16px" }}
                >
                  {billingMessage.text}
                </div>
              )}
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {company.stripe_customer_id && (
                  <button
                    className="btn-primary"
                    onClick={async () => {
                      setBillingMessage(null);
                      try {
                        const res = await fetch("/api/stripe/portal", { method: "POST" });
                        if (res.ok) {
                          const { url } = await res.json();
                          window.open(url, "_blank");
                        } else {
                          const data = await res.json().catch(() => ({}));
                          setBillingMessage({
                            type: "error",
                            text: data.error || t("stripeBillingPortalNotConfigured"),
                          });
                        }
                      } catch {
                        setBillingMessage({
                          type: "error",
                          text: t("stripeBillingPortalNotConfiguredShort"),
                        });
                      }
                    }}
                  >
                    <ExternalLink size={14} />
                    {t("manageBilling")}
                  </button>
                )}
                {plan !== "enterprise" && (
                  <button
                    className="btn-secondary"
                    onClick={async () => {
                      setBillingMessage(null);
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
                          const data = await res.json().catch(() => ({}));
                          setBillingMessage({
                            type: "error",
                            text: data.error || t("stripeCheckoutNotConfigured"),
                          });
                        }
                      } catch {
                        setBillingMessage({
                          type: "error",
                          text: t("stripeCheckoutNotConfiguredShort"),
                        });
                      }
                    }}
                  >
                    <Zap size={14} />
                    {t("upgradeTo", { plan: plan === "starter" ? t("professional") : t("enterprise") })}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== Modules Tab ===== */}
        {activeTab === "modules" && (
          <div className="settings-form">
            <div className="settings-form-section">
              <div className="settings-form-section-title">Active Modules</div>
              <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "16px" }}>
                Enable or disable platform modules for your company. This controls which sections appear in the sidebar for all team members.
              </p>
              {/* Module counter */}
              {maxModules !== null && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: `1px solid ${atModuleLimit ? "var(--color-amber)" : "var(--border)"}`,
                    background: atModuleLimit ? "rgba(180, 83, 9, 0.06)" : "var(--surface)",
                    marginBottom: "16px",
                    fontSize: "0.85rem",
                  }}
                >
                  <span>
                    <strong>{enabledModules.length}</strong> / {maxModules} modules selected
                    <span style={{ color: "var(--muted)", marginLeft: "8px" }}>
                      ({planInfo.label} plan)
                    </span>
                    {atModuleLimit && (
                      <span style={{ color: "var(--color-amber)", marginLeft: "8px", fontWeight: 600 }}>
                        — Limit reached
                      </span>
                    )}
                  </span>
                </div>
              )}
              {/* Upgrade CTA when at limit */}
              {atModuleLimit && nextPlan && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 16px",
                    borderRadius: "8px",
                    border: "1px solid var(--color-blue)",
                    background: "rgba(37, 99, 235, 0.04)",
                    marginBottom: "16px",
                    fontSize: "0.85rem",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: "2px" }}>
                      Need more modules?
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                      Upgrade to the {nextPlan} plan to unlock {PLAN_MAX_MODULES[nextPlan.toLowerCase()] ?? "unlimited"} modules.
                    </div>
                  </div>
                  <button
                    className="btn-primary"
                    style={{ whiteSpace: "nowrap", marginLeft: "16px" }}
                    onClick={() => setActiveTab("subscription")}
                  >
                    <ArrowUpRight size={14} />
                    Upgrade to {nextPlan}
                  </button>
                </div>
              )}
              {moduleMessage && (
                <div className={`settings-form-message ${moduleMessage.type}`} style={{ marginBottom: "16px" }}>
                  {moduleMessage.text}
                </div>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  marginBottom: "24px",
                }}
              >
                {MODULES.map((mod) => {
                  const isSelected = enabledModules.includes(mod.key);
                  const isDisabled = !canEdit || (!isSelected && atModuleLimit);
                  return (
                    <label
                      key={mod.key}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        padding: "14px 12px",
                        borderRadius: "10px",
                        border: `1.5px solid ${isSelected ? "var(--color-blue)" : "var(--border)"}`,
                        background: isSelected ? "rgba(37, 99, 235, 0.04)" : "transparent",
                        cursor: isDisabled ? "not-allowed" : "pointer",
                        transition: "border-color 0.15s, background 0.15s",
                        opacity: isDisabled ? 0.5 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isDisabled}
                        onChange={() => {
                          setEnabledModules((prev) =>
                            prev.includes(mod.key)
                              ? prev.filter((k) => k !== mod.key)
                              : [...prev, mod.key]
                          );
                          setModuleMessage(null);
                        }}
                        style={{
                          position: "absolute",
                          opacity: 0,
                          width: 0,
                          height: 0,
                          pointerEvents: "none",
                        }}
                      />
                      <div
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "8px",
                          background: `${mod.color}18`,
                          color: mod.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          letterSpacing: "0.02em",
                          flexShrink: 0,
                        }}
                      >
                        {mod.icon}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            color: "var(--text)",
                            lineHeight: 1.3,
                          }}
                        >
                          {mod.name}
                        </div>
                        <div
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--muted)",
                            lineHeight: 1.4,
                            marginTop: "2px",
                          }}
                        >
                          {mod.description}
                        </div>
                      </div>
                      <div
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "4px",
                          border: `1.5px solid ${isSelected ? "var(--color-blue)" : "var(--border)"}`,
                          background: isSelected ? "var(--color-blue)" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginLeft: "auto",
                          marginTop: "2px",
                          transition: "all 0.15s",
                        }}
                      >
                        {isSelected && (
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#fff"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
              {canEdit && (
                <div className="settings-form-actions">
                  <button
                    className="btn-primary"
                    disabled={savingModules}
                    onClick={async () => {
                      setSavingModules(true);
                      setModuleMessage(null);
                      try {
                        const res = await fetch("/api/admin/settings", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ selected_modules: enabledModules }),
                        });
                        if (res.ok) {
                          setModuleMessage({ type: "success", text: "Modules updated. Sidebar will reflect changes on next page load." });
                          router.refresh();
                        } else {
                          const data = await res.json();
                          setModuleMessage({ type: "error", text: data.error || "Failed to save modules." });
                        }
                      } catch {
                        setModuleMessage({ type: "error", text: "Network error. Please try again." });
                      } finally {
                        setSavingModules(false);
                      }
                    }}
                  >
                    <Save size={16} />
                    {savingModules ? "Saving..." : "Save Modules"}
                  </button>
                </div>
              )}
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
                  title={t("toggleIntegration", { name: integration.name })}
                  onClick={() => {
                    // Placeholder - integrations are not yet implemented
                  }}
                />
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
