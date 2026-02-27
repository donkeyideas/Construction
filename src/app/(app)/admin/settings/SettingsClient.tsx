"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
  Zap,
  Ticket,
  LayoutGrid,
  Palette,
  Eye,
} from "lucide-react";
import { MODULES } from "@/lib/constants/modules";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";

import type { CompanyDetails } from "@/lib/queries/admin";
import type { PricingTier } from "@/lib/queries/pricing";

type TabKey = "general" | "subscription" | "modules" | "integrations" | "design";

const INDUSTRY_KEYS = [
  "General Contracting",
  "Residential Construction",
  "Commercial Construction",
  "Heavy Civil",
  "Specialty Trade",
  "Real Estate Development",
  "Engineering",
  "Architecture",
  "Other",
] as const;

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
];

const FISCAL_MONTH_KEYS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const THEME_PRESETS: { name: string; label: string; colors: { primary: string; accent: string; sidebar: string } }[] = [
  { name: "modern", label: "Modern", colors: { primary: "#2563eb", accent: "#8b5cf6", sidebar: "#0f172a" } },
  { name: "classic", label: "Classic", colors: { primary: "#1e40af", accent: "#059669", sidebar: "#1e293b" } },
  { name: "warm", label: "Warm", colors: { primary: "#d97706", accent: "#dc2626", sidebar: "#292524" } },
  { name: "dark-pro", label: "Dark Pro", colors: { primary: "#6366f1", accent: "#22d3ee", sidebar: "#020617" } },
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
  pricingTiers: PricingTier[];
}

export default function SettingsClient({
  company,
  memberCount,
  currentUserRole,
  pricingTiers,
}: SettingsClientProps) {
  const router = useRouter();
  const t = useTranslations("adminPanel");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";
  const [activeTab, setActiveTab] = useState<TabKey>("general");

  const INDUSTRIES = useMemo(() => INDUSTRY_KEYS.map((key) => ({
    value: key,
    label: t(`industry_${key.replace(/[\s/]+/g, "_").toLowerCase()}`),
  })), [t]);

  const FISCAL_MONTHS = useMemo(() => FISCAL_MONTH_KEYS.map((key) => ({
    value: key,
    label: t(`month_${key.toLowerCase()}`),
  })), [t]);

  const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "general", label: t("general"), icon: <Settings size={15} /> },
    { key: "subscription", label: t("subscription"), icon: <CreditCard size={15} /> },
    { key: "modules", label: t("modules"), icon: <LayoutGrid size={15} /> },
    { key: "integrations", label: t("integrations"), icon: <Plug size={15} /> },
    { key: "design", label: t("design"), icon: <Palette size={15} /> },
  ];

  // Build tier lookup by lowercase name
  const tiersByName: Record<string, PricingTier> = {};
  for (const tier of pricingTiers) {
    tiersByName[tier.name.toLowerCase()] = tier;
  }

  const PLAN_COLORS: Record<string, string> = {
    starter: "var(--color-blue)",
    professional: "var(--color-amber)",
    enterprise: "var(--color-green)",
  };

  const PLAN_INFO: Record<string, { label: string; color: string; features: string[] }> = {
    starter: {
      label: tiersByName.starter?.name || t("starter"),
      color: PLAN_COLORS.starter,
      features: tiersByName.starter?.features?.length
        ? tiersByName.starter.features
        : [t("upTo5Users"), t("threeActiveProjects"), t("basicReporting"), t("emailSupport")],
    },
    professional: {
      label: tiersByName.professional?.name || t("professional"),
      color: PLAN_COLORS.professional,
      features: tiersByName.professional?.features?.length
        ? tiersByName.professional.features
        : [t("upTo25Users"), t("unlimitedProjects"), t("advancedReporting"), t("prioritySupport"), t("apiAccess")],
    },
    enterprise: {
      label: tiersByName.enterprise?.name || t("enterprise"),
      color: PLAN_COLORS.enterprise,
      features: tiersByName.enterprise?.features?.length
        ? tiersByName.enterprise.features
        : [t("unlimitedUsers"), t("unlimitedProjects"), t("customReporting"), t("dedicatedSupport"), t("ssoSaml"), t("customIntegrations")],
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

  // Design tab state
  const savedTheme = (companySettings.theme as { primary?: string; accent?: string; sidebar?: string }) || {};
  const [themePrimary, setThemePrimary] = useState(savedTheme.primary || "#2563eb");
  const [themeAccent, setThemeAccent] = useState(savedTheme.accent || "#8b5cf6");
  const [themeSidebar, setThemeSidebar] = useState(savedTheme.sidebar || "#0f172a");
  const [previewActive, setPreviewActive] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [themeMessage, setThemeMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function applyPreviewColors(primary: string, accent: string, sidebar: string) {
    document.documentElement.style.setProperty("--color-blue", primary);
    document.documentElement.style.setProperty("--color-accent", accent);
    document.documentElement.style.setProperty("--sidebar-bg", sidebar);
  }

  function clearPreviewColors() {
    document.documentElement.style.removeProperty("--color-blue");
    document.documentElement.style.removeProperty("--color-accent");
    document.documentElement.style.removeProperty("--sidebar-bg");
  }

  function selectPreset(preset: typeof THEME_PRESETS[number]) {
    setThemePrimary(preset.colors.primary);
    setThemeAccent(preset.colors.accent);
    setThemeSidebar(preset.colors.sidebar);
    if (previewActive) {
      applyPreviewColors(preset.colors.primary, preset.colors.accent, preset.colors.sidebar);
    }
  }

  function togglePreview() {
    if (previewActive) {
      clearPreviewColors();
      setPreviewActive(false);
    } else {
      applyPreviewColors(themePrimary, themeAccent, themeSidebar);
      setPreviewActive(true);
    }
  }

  async function handleSaveTheme() {
    setSavingTheme(true);
    setThemeMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            ...companySettings,
            theme: { primary: themePrimary, accent: themeAccent, sidebar: themeSidebar },
          },
        }),
      });
      if (res.ok) {
        setThemeMessage({ type: "success", text: "Theme saved successfully." });
        clearPreviewColors();
        setPreviewActive(false);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setThemeMessage({ type: "error", text: data.error || "Failed to save theme." });
      }
    } catch {
      setThemeMessage({ type: "error", text: "Network error." });
    } finally {
      setSavingTheme(false);
    }
  }

  // Embedded checkout state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [confirmDowngrade, setConfirmDowngrade] = useState(false);
  const [downgradeLoading, setDowngradeLoading] = useState(false);

  // Subscription details from Stripe
  const [subDetails, setSubDetails] = useState<{
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    cancelAt: string | null;
    canceledAt: string | null;
    interval: string;
    amount: number | null;
  } | null>(null);

  // Load Stripe publishable key on mount
  useEffect(() => {
    fetch("/api/stripe/publishable-key")
      .then((res) => res.json())
      .then((data) => {
        if (data.publishableKey) {
          setStripePromise(loadStripe(data.publishableKey));
        }
      })
      .catch(() => {});
  }, []);

  // Fetch subscription details from Stripe (renewal/cancel dates)
  useEffect(() => {
    if (company.stripe_subscription_id) {
      fetch("/api/stripe/subscription-details")
        .then((res) => res.json())
        .then((data) => {
          if (data.subscription) setSubDetails(data.subscription);
        })
        .catch(() => {});
    }
  }, [company.stripe_subscription_id]);

  const openCheckout = useCallback(async (targetPlan: string, billing: "monthly" | "annual" = "monthly") => {
    setBillingMessage(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan, billing, embedded: true }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.clientSecret) {
          setCheckoutClientSecret(data.clientSecret);
          setCheckoutPlan(targetPlan);
          setCheckoutOpen(true);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setBillingMessage({
          type: "error",
          text: data.error || "Failed to start checkout.",
        });
      }
    } catch {
      setBillingMessage({ type: "error", text: "Network error. Please try again." });
    }
  }, []);

  const handleCheckoutComplete = useCallback(async () => {
    setCheckoutOpen(false);
    setCheckoutClientSecret(null);
    setBillingMessage({ type: "success", text: "Syncing your subscription..." });
    try {
      const res = await fetch("/api/stripe/sync-subscription", { method: "POST" });
      const data = await res.json();
      if (data.synced) {
        setBillingMessage({
          type: "success",
          text: `Subscription activated! You are now on the ${data.plan.charAt(0).toUpperCase() + data.plan.slice(1)} plan.`,
        });
        setTimeout(() => {
          window.location.href = "/admin/settings?tab=subscription";
        }, 1500);
      } else {
        setBillingMessage({ type: "success", text: "Payment received! Refresh the page to see your updated plan." });
      }
    } catch {
      setBillingMessage({ type: "success", text: "Payment received! Refresh the page to see your updated plan." });
    }
  }, []);

  // Handle ?success=true redirect from Stripe Checkout (embedded return_url)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setActiveTab("subscription");
      setBillingMessage({ type: "success", text: "Syncing your subscription..." });
      // Sync subscription with Stripe to update plan in DB, then reload
      fetch("/api/stripe/sync-subscription", { method: "POST" })
        .then((res) => res.json())
        .then((data) => {
          if (data.synced) {
            setBillingMessage({ type: "success", text: `Subscription activated! You are now on the ${data.plan.charAt(0).toUpperCase() + data.plan.slice(1)} plan.` });
            // Full reload to refresh all server-fetched data (plan, modules, trial)
            setTimeout(() => {
              window.location.href = "/admin/settings?tab=subscription";
            }, 1500);
          } else {
            setBillingMessage({ type: "success", text: "Subscription activated! Refresh the page to see your updated plan." });
            router.replace("/admin/settings?tab=subscription", { scroll: false });
          }
        })
        .catch(() => {
          setBillingMessage({ type: "success", text: "Subscription activated! Refresh the page to see your updated plan." });
          router.replace("/admin/settings?tab=subscription", { scroll: false });
        });
    }
    if (params.get("tab") === "subscription") {
      setActiveTab("subscription");
    }
    if (params.get("suspended") === "true") {
      setActiveTab("subscription");
      setBillingMessage({
        type: "error",
        text: "Your 30-day grace period has ended. Please resubscribe to restore access to your data.",
      });
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

  // Plan-based module limits — from pricing tiers if available
  const PLAN_MAX_MODULES: Record<string, number | null> = {
    starter: tiersByName.starter?.max_modules ?? 3,
    professional: tiersByName.professional?.max_modules ?? 6,
    enterprise: tiersByName.enterprise?.max_modules ?? null,
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
                      <option key={ind.value} value={ind.value}>{ind.label}</option>
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
                      <option key={month.value} value={month.value}>{month.label}</option>
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
                <span className="subscription-info-value" suppressHydrationWarning>
                  {formatDateTime(company.created_at)}
                </span>
              </div>
              {company.trial_ends_at && (
                <div className="subscription-info-row">
                  <span className="subscription-info-label">{t("trialEnds")}</span>
                  <span className="subscription-info-value" suppressHydrationWarning>
                    {formatDateTime(company.trial_ends_at)}
                  </span>
                </div>
              )}
              {subDetails?.currentPeriodEnd && !subDetails.cancelAtPeriodEnd &&
                company.subscription_status !== "canceling" && (
                <div className="subscription-info-row">
                  <span className="subscription-info-label">Renewal Date</span>
                  <span className="subscription-info-value" suppressHydrationWarning>
                    {new Date(subDetails.currentPeriodEnd).toLocaleDateString(undefined, {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                    {subDetails.interval && (
                      <span style={{ color: "var(--muted)", marginLeft: 6, fontSize: "0.8rem" }}>
                        ({subDetails.interval === "year" ? "Annual" : "Monthly"})
                      </span>
                    )}
                  </span>
                </div>
              )}
              {(subDetails?.cancelAtPeriodEnd || company.subscription_status === "canceling") &&
                (subDetails?.currentPeriodEnd || company.subscription_ends_at) && (
                <div className="subscription-info-row">
                  <span className="subscription-info-label" style={{ color: "var(--color-red)" }}>
                    Cancels On
                  </span>
                  <span className="subscription-info-value" style={{ color: "var(--color-red)" }} suppressHydrationWarning>
                    {new Date(
                      subDetails?.currentPeriodEnd || company.subscription_ends_at!
                    ).toLocaleDateString(undefined, {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                  </span>
                </div>
              )}
              {subDetails?.amount !== null && subDetails?.amount !== undefined && (
                <div className="subscription-info-row">
                  <span className="subscription-info-label">Billing Amount</span>
                  <span className="subscription-info-value">
                    ${subDetails.amount.toFixed(2)}/{subDetails.interval === "year" ? "yr" : "mo"}
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

            {/* Manage / Upgrade */}
            <div className="settings-form-section" style={{ marginTop: "24px" }}>
              <div className="settings-form-section-title">{t("manageSubscription")}</div>
              {billingMessage && (
                <div
                  className={`settings-form-message ${billingMessage.type}`}
                  style={{ marginBottom: "16px" }}
                >
                  {billingMessage.text}
                </div>
              )}

              {/* Billing interval toggle */}
              {(
                <div style={{ marginBottom: "16px" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      overflow: "hidden",
                    }}
                  >
                    {(["monthly", "annual"] as const).map((interval) => (
                      <button
                        key={interval}
                        onClick={() => setBillingInterval(interval)}
                        style={{
                          padding: "6px 16px",
                          fontSize: "0.82rem",
                          fontWeight: billingInterval === interval ? 600 : 400,
                          background: billingInterval === interval ? "var(--color-blue)" : "transparent",
                          color: billingInterval === interval ? "#fff" : "var(--text)",
                          border: "none",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {interval === "monthly" ? "Monthly" : "Annual"}
                        {interval === "annual" && (
                          <span style={{ marginLeft: "6px", fontSize: "0.72rem", opacity: 0.85 }}>Save ~17%</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Plan cards — always show all three tiers */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                {(["starter", "professional", "enterprise"] as const).map((tierKey) => {
                  const tier = tiersByName[tierKey];
                  const tierColor = PLAN_COLORS[tierKey] || "var(--color-blue)";
                  const tierLabel = tier?.name || tierKey.charAt(0).toUpperCase() + tierKey.slice(1);
                  const monthlyPrice = tier?.monthly_price ?? 0;
                  const annualPrice = tier?.annual_price ?? 0;
                  const displayPrice = billingInterval === "annual" ? annualPrice : monthlyPrice;
                  const annualTotal = annualPrice * 12;
                  const annualSavings = (monthlyPrice * 12) - annualTotal;
                  const isCurrent = plan === tierKey;
                  const isLowerTier =
                    (tierKey === "starter" && plan !== "starter") ||
                    (tierKey === "professional" && plan === "enterprise");
                  const isUpgrade =
                    (tierKey === "professional" && plan === "starter") ||
                    (tierKey === "enterprise" && plan !== "enterprise");

                  // Build description from tier limits
                  const descParts: string[] = [];
                  if (tier) {
                    descParts.push(tier.max_users ? `Up to ${tier.max_users} users` : "Unlimited users");
                    descParts.push(tier.max_projects ? `${tier.max_projects} projects` : "Unlimited projects");
                    if (tier.max_modules) descParts.push(`${tier.max_modules} modules`);
                    else descParts.push("All modules");
                  }
                  const description = descParts.length > 0
                    ? descParts.join(", ")
                    : tierKey === "starter"
                      ? "Up to 5 users, 3 projects, basic reporting"
                      : tierKey === "professional"
                        ? "Up to 25 users, 50 projects, 6 modules"
                        : "Unlimited users, projects, all modules";

                  return (
                    <div
                      key={tierKey}
                      style={{
                        border: `1.5px solid ${isCurrent ? tierColor : "var(--border)"}`,
                        borderRadius: "10px",
                        padding: "16px",
                        background: isCurrent ? `${tierColor}08` : "transparent",
                        opacity: isLowerTier ? 0.7 : 1,
                      }}
                    >
                      <div style={{ marginBottom: "8px" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{tierLabel}</span>
                      </div>
                      <div style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "4px" }}>
                        ${Math.round(displayPrice).toLocaleString()}
                        <span style={{ fontSize: "0.8rem", fontWeight: 400, color: "var(--muted)" }}>/mo</span>
                      </div>
                      {billingInterval === "annual" && annualSavings > 0 && (
                        <div style={{ fontSize: "0.75rem", color: "var(--color-green)", marginBottom: "8px" }}>
                          ${annualTotal.toLocaleString()}/yr (save ${annualSavings.toLocaleString()})
                        </div>
                      )}
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "12px" }}>
                        {description}
                      </div>
                      {isCurrent ? (
                        <div style={{ textAlign: "center", padding: "8px 0", fontSize: "0.85rem", fontWeight: 600, color: tierColor }}>
                          Current Plan
                        </div>
                      ) : isUpgrade ? (
                        <button
                          className="btn-primary"
                          style={{ width: "100%", justifyContent: "center" }}
                          onClick={() => openCheckout(tierKey, billingInterval)}
                        >
                          Upgrade to {tierLabel}
                        </button>
                      ) : (
                        <button
                          className="btn-secondary"
                          style={{ width: "100%", justifyContent: "center" }}
                          disabled
                        >
                          {tierLabel}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Manage Billing (for existing Stripe customers) */}
              {company.stripe_customer_id && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    className="btn-secondary"
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
                  {company.stripe_subscription_id && company.subscription_status !== "canceling" && (
                    <button
                      className="btn-secondary"
                      style={{ color: "var(--color-red)", borderColor: "rgba(220,38,38,0.3)" }}
                      onClick={() => setConfirmCancel(true)}
                    >
                      Cancel Subscription
                    </button>
                  )}
                  {/* Downgrade button (enterprise→professional, professional→starter) */}
                  {company.stripe_subscription_id &&
                    company.subscription_status !== "canceling" &&
                    plan !== "starter" && (
                    <button
                      className="btn-secondary"
                      style={{ color: "var(--color-amber)", borderColor: "rgba(180,83,9,0.3)" }}
                      onClick={() => setConfirmDowngrade(true)}
                    >
                      <ArrowDownRight size={14} />
                      Downgrade to {plan === "enterprise" ? "Professional" : "Starter"}
                    </button>
                  )}
                  {company.subscription_status === "canceling" && (
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "6px 12px", borderRadius: 8, fontSize: "0.82rem",
                      background: "rgba(220, 38, 38, 0.06)", color: "var(--color-red)",
                      border: "1px solid rgba(220, 38, 38, 0.15)",
                    }}>
                      Subscription will end at the current billing period
                    </div>
                  )}
                </div>
              )}

              {/* Downgrade confirmation */}
              {confirmDowngrade && (
                <div style={{
                  marginTop: "12px",
                  background: "rgba(180, 83, 9, 0.04)",
                  border: "1px solid rgba(180, 83, 9, 0.2)",
                  borderRadius: 10,
                  padding: "16px",
                }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-amber)", marginBottom: 6 }}>
                    Downgrade to {plan === "enterprise" ? "Professional" : "Starter"}?
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: 12, lineHeight: 1.6 }}>
                    {plan === "enterprise" ? (
                      <>
                        Your plan will be changed to Professional. The new pricing takes effect
                        at your next billing cycle — you keep Enterprise features until then.
                        Some Enterprise-only features (unlimited users, SSO, custom integrations) will no longer be available.
                      </>
                    ) : (
                      <>
                        Your plan will be changed to Starter at the end of the current billing period.
                        Some features available on your current plan will no longer be accessible.
                      </>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn-primary"
                      style={{ backgroundColor: "var(--color-amber)", fontSize: "0.82rem" }}
                      disabled={downgradeLoading}
                      onClick={async () => {
                        setDowngradeLoading(true);
                        setBillingMessage(null);
                        const targetPlan = plan === "enterprise" ? "professional" : "starter";
                        try {
                          const res = await fetch("/api/stripe/downgrade", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ plan: targetPlan }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || "Failed to downgrade");
                          setBillingMessage({
                            type: "success",
                            text: data.effective_at
                              ? `Plan changed to ${targetPlan}. Effective ${new Date(data.effective_at).toLocaleDateString()}.`
                              : data.message || "Plan downgraded successfully.",
                          });
                          setConfirmDowngrade(false);
                          setTimeout(() => window.location.reload(), 2000);
                        } catch (err) {
                          setBillingMessage({
                            type: "error",
                            text: err instanceof Error ? err.message : "Failed to downgrade",
                          });
                        } finally {
                          setDowngradeLoading(false);
                        }
                      }}
                    >
                      {downgradeLoading
                        ? "Processing..."
                        : `Yes, downgrade to ${plan === "enterprise" ? "Professional" : "Starter"}`}
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: "0.82rem" }}
                      onClick={() => setConfirmDowngrade(false)}
                      disabled={downgradeLoading}
                    >
                      Keep Current Plan
                    </button>
                  </div>
                </div>
              )}

              {/* Cancel subscription confirmation */}
              {confirmCancel && (
                <div style={{
                  marginTop: "12px",
                  background: "rgba(220, 38, 38, 0.04)",
                  border: "1px solid rgba(220, 38, 38, 0.2)",
                  borderRadius: 10,
                  padding: "16px",
                }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-red)", marginBottom: 6 }}>
                    Cancel your subscription?
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: 12, lineHeight: 1.6 }}>
                    Your subscription will remain active until the end of your current billing period.
                    After that, your account access will be suspended.
                    You can resubscribe at any time to restore access.
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn-primary"
                      style={{ backgroundColor: "var(--color-red)", fontSize: "0.82rem" }}
                      disabled={cancelLoading}
                      onClick={async () => {
                        setCancelLoading(true);
                        setBillingMessage(null);
                        try {
                          const res = await fetch("/api/stripe/cancel-subscription", { method: "POST" });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || "Failed to cancel");
                          setBillingMessage({
                            type: "success",
                            text: data.current_period_end
                              ? `Subscription canceled. You have access until ${new Date(data.current_period_end).toLocaleDateString()}.`
                              : "Subscription canceled. You have access until the end of your billing period.",
                          });
                          setConfirmCancel(false);
                          setTimeout(() => window.location.reload(), 2000);
                        } catch (err) {
                          setBillingMessage({
                            type: "error",
                            text: err instanceof Error ? err.message : "Failed to cancel subscription",
                          });
                        } finally {
                          setCancelLoading(false);
                        }
                      }}
                    >
                      {cancelLoading ? "Canceling..." : "Yes, cancel at end of billing period"}
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: "0.82rem" }}
                      onClick={() => setConfirmCancel(false)}
                      disabled={cancelLoading}
                    >
                      Keep Subscription
                    </button>
                  </div>
                </div>
              )}
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

        {/* ===== Design Tab ===== */}
        {activeTab === "design" && (
          <div className="settings-form">
            {themeMessage && (
              <div className={`settings-form-message ${themeMessage.type}`}>
                {themeMessage.text}
              </div>
            )}

            <div className="settings-form-section">
              <div className="settings-form-section-title">Theme Presets</div>
              <div className="theme-presets-grid">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    className={`theme-preset-card ${themePrimary === preset.colors.primary && themeAccent === preset.colors.accent ? "active" : ""}`}
                    onClick={() => selectPreset(preset)}
                  >
                    <div className="theme-preset-swatches">
                      <span className="theme-swatch" style={{ background: preset.colors.primary }} />
                      <span className="theme-swatch" style={{ background: preset.colors.accent }} />
                      <span className="theme-swatch" style={{ background: preset.colors.sidebar }} />
                    </div>
                    <span className="theme-preset-label">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-form-section">
              <div className="settings-form-section-title">Custom Colors</div>
              <div className="settings-row">
                <div className="settings-field">
                  <label className="settings-field-label">Primary Color</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="color"
                      value={themePrimary}
                      onChange={(e) => {
                        setThemePrimary(e.target.value);
                        if (previewActive) applyPreviewColors(e.target.value, themeAccent, themeSidebar);
                      }}
                      style={{ width: 40, height: 32, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", padding: 2 }}
                    />
                    <input
                      type="text"
                      className="settings-field-input"
                      value={themePrimary}
                      onChange={(e) => {
                        setThemePrimary(e.target.value);
                        if (previewActive) applyPreviewColors(e.target.value, themeAccent, themeSidebar);
                      }}
                      style={{ width: 100 }}
                    />
                  </div>
                </div>
                <div className="settings-field">
                  <label className="settings-field-label">Accent Color</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="color"
                      value={themeAccent}
                      onChange={(e) => {
                        setThemeAccent(e.target.value);
                        if (previewActive) applyPreviewColors(themePrimary, e.target.value, themeSidebar);
                      }}
                      style={{ width: 40, height: 32, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", padding: 2 }}
                    />
                    <input
                      type="text"
                      className="settings-field-input"
                      value={themeAccent}
                      onChange={(e) => {
                        setThemeAccent(e.target.value);
                        if (previewActive) applyPreviewColors(themePrimary, e.target.value, themeSidebar);
                      }}
                      style={{ width: 100 }}
                    />
                  </div>
                </div>
                <div className="settings-field">
                  <label className="settings-field-label">Sidebar Color</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="color"
                      value={themeSidebar}
                      onChange={(e) => {
                        setThemeSidebar(e.target.value);
                        if (previewActive) applyPreviewColors(themePrimary, themeAccent, e.target.value);
                      }}
                      style={{ width: 40, height: 32, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", padding: 2 }}
                    />
                    <input
                      type="text"
                      className="settings-field-input"
                      value={themeSidebar}
                      onChange={(e) => {
                        setThemeSidebar(e.target.value);
                        if (previewActive) applyPreviewColors(themePrimary, themeAccent, e.target.value);
                      }}
                      style={{ width: 100 }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-form-actions" style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className={previewActive ? "btn-primary" : "btn-secondary"}
                onClick={togglePreview}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <Eye size={15} />
                {previewActive ? "Preview On" : "Preview"}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveTheme}
                disabled={savingTheme}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                {savingTheme ? <Loader2 size={15} className="spin-icon" /> : <Save size={15} />}
                {savingTheme ? "Saving..." : "Save Theme"}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Embedded Checkout Modal */}
      {checkoutOpen && checkoutClientSecret && stripePromise && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setCheckoutOpen(false);
              setCheckoutClientSecret(null);
            }
          }}
        >
          <div
            style={{
              background: "var(--bg, #fff)",
              borderRadius: "12px",
              width: "min(600px, 95vw)",
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: "1rem" }}>
                Upgrade to {checkoutPlan ? checkoutPlan.charAt(0).toUpperCase() + checkoutPlan.slice(1) : ""}
              </div>
              <button
                onClick={() => {
                  setCheckoutOpen(false);
                  setCheckoutClientSecret(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                  padding: "4px",
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: "0" }}>
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{
                  clientSecret: checkoutClientSecret,
                  onComplete: handleCheckoutComplete,
                }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
