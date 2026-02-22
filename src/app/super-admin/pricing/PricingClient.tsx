"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Save,
  Loader2,
  X,
  Check,
  Zap,
  Plus,
  Trash2,
  Star,
  DollarSign,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  Users,
  FolderKanban,
  Building2,
  HardDrive,
  RefreshCw,
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
  stripe_product_id: string | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_annual: string | null;
}

interface PricingClientProps {
  initialTiers: PricingTier[];
}

const DEFAULT_TIERS: PricingTier[] = [
  { name: "Starter", monthly_price: 99, annual_price: 79, features: ["Up to 10 users", "Up to 5 projects", "Up to 10 properties", "10 GB storage", "Email support"], is_popular: false, max_users: 10, max_projects: 5, max_properties: 10, max_storage_gb: 10, stripe_product_id: null, stripe_price_id_monthly: null, stripe_price_id_annual: null },
  { name: "Professional", monthly_price: 299, annual_price: 249, features: ["Up to 50 users", "Up to 25 projects", "Up to 50 properties", "50 GB storage", "Priority support", "API access", "Automation rules"], is_popular: true, max_users: 50, max_projects: 25, max_properties: 50, max_storage_gb: 50, stripe_product_id: null, stripe_price_id_monthly: null, stripe_price_id_annual: null },
  { name: "Enterprise", monthly_price: 599, annual_price: 499, features: ["Unlimited users", "Unlimited projects", "Unlimited properties", "250 GB storage", "Dedicated support", "SSO & SAML", "Custom integrations", "All 4 portals"], is_popular: false, max_users: null, max_projects: null, max_properties: null, max_storage_gb: 250, stripe_product_id: null, stripe_price_id_monthly: null, stripe_price_id_annual: null },
];

export default function PricingClient({ initialTiers }: PricingClientProps) {
  const t = useTranslations("superAdmin");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const [tiers, setTiers] = useState<PricingTier[]>(
    initialTiers.length > 0
      ? initialTiers.map((tier) => ({ ...tier, features: Array.isArray(tier.features) ? tier.features : [] }))
      : DEFAULT_TIERS
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [newFeatureInputs, setNewFeatureInputs] = useState<Record<number, string>>({});
  const [expandedTier, setExpandedTier] = useState<number | null>(0);
  const [syncing, setSyncing] = useState(false);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/super-admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiers }),
      });
      if (res.ok) {
        const data = await res.json();
        setTiers(data.tiers.map((tier: PricingTier & { features: string[] | string }) => ({
          ...tier, features: Array.isArray(tier.features) ? tier.features : [],
        })));
        setMessage({ type: "success", text: t("tiersSaved") });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || t("failedSaveTiers") });
      }
    } catch {
      setMessage({ type: "error", text: t("networkError") });
    } finally {
      setSaving(false);
    }
  }

  async function handleStripeSync() {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/super-admin/stripe-sync", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.tiers) {
        setTiers(data.tiers.map((tier: PricingTier & { features: string[] | string }) => ({
          ...tier, features: Array.isArray(tier.features) ? tier.features : [],
        })));
        setMessage({ type: "success", text: "Pricing tiers synced to Stripe. Price IDs have been auto-filled." });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to sync with Stripe." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error while syncing with Stripe." });
    } finally {
      setSyncing(false);
    }
  }

  function updateTier(index: number, field: string, value: string | number | boolean | null) {
    setTiers((prev) => prev.map((tier, i) => (i === index ? { ...tier, [field]: value } : tier)));
  }

  function addTier() {
    const idx = tiers.length;
    setTiers((prev) => [...prev, {
      name: "New Tier", monthly_price: 0, annual_price: 0, features: [],
      is_popular: false, max_users: null, max_projects: null, max_properties: null,
      max_storage_gb: null, stripe_price_id_monthly: null, stripe_price_id_annual: null,
      stripe_product_id: null,
    }]);
    setExpandedTier(idx);
  }

  function removeTier(index: number) {
    setTiers((prev) => prev.filter((_, i) => i !== index));
    setExpandedTier(null);
  }

  function addFeature(tierIndex: number) {
    const feat = (newFeatureInputs[tierIndex] || "").trim();
    if (!feat) return;
    setTiers((prev) => prev.map((tier, i) => (i === tierIndex ? { ...tier, features: [...tier.features, feat] } : tier)));
    setNewFeatureInputs((prev) => ({ ...prev, [tierIndex]: "" }));
  }

  function removeFeature(tierIndex: number, featIndex: number) {
    setTiers((prev) => prev.map((tier, i) => i === tierIndex ? { ...tier, features: tier.features.filter((_, fi) => fi !== featIndex) } : tier));
  }

  function moveTier(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= tiers.length) return;
    setTiers((prev) => {
      const copy = [...prev];
      [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
      return copy;
    });
    setExpandedTier(newIndex);
  }

  const popularTier = tiers.find((tier) => tier.is_popular);
  const minPrice = tiers.length > 0 ? Math.min(...tiers.map((tier) => tier.monthly_price || 0)) : 0;
  const maxPrice = tiers.length > 0 ? Math.max(...tiers.map((tier) => tier.monthly_price || 0)) : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>
            {t("pricingTitle")}
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "4px 0 0" }}>
            {t("pricingDesc")}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="sa-action-btn" onClick={addTier}>
            <Plus size={15} /> {t("addTier")}
          </button>
          <button className="sa-action-btn" onClick={handleStripeSync} disabled={syncing} title="Create Stripe Products & Prices for all tiers">
            {syncing ? <Loader2 size={15} className="spin-icon" /> : <RefreshCw size={15} />}
            {syncing ? "Syncing..." : "Sync to Stripe"}
          </button>
          <button className="sa-action-btn primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={15} className="spin-icon" /> : <Save size={15} />}
            {saving ? t("saving") : t("saveAllTiers")}
          </button>
        </div>
      </div>

      {/* Success / Error Message */}
      {message && (
        <div className={`sa-card ${message.type === "success" ? "" : ""}`} style={{
          marginBottom: "16px",
          padding: "12px 16px",
          borderColor: message.type === "success" ? "var(--color-green)" : "var(--color-red)",
          background: message.type === "success" ? "rgba(22,163,74,0.06)" : "rgba(220,38,38,0.06)",
        }}>
          <span style={{ fontSize: "0.85rem", color: message.type === "success" ? "var(--color-green)" : "var(--color-red)", fontWeight: 500 }}>
            {message.text}
          </span>
        </div>
      )}

      {/* KPI Row */}
      <div className="sa-kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="sa-kpi-card">
          <div className="sa-kpi-info">
            <span className="sa-kpi-label">{t("totalTiers")}</span>
            <span className="sa-kpi-value">{tiers.length}</span>
          </div>
          <div className="sa-kpi-icon"><DollarSign size={22} /></div>
        </div>
        <div className="sa-kpi-card">
          <div className="sa-kpi-info">
            <span className="sa-kpi-label">{t("priceRange")}</span>
            <span className="sa-kpi-value">${minPrice} – ${maxPrice}</span>
            <span className="sa-kpi-trend up">{t("perMonth")}</span>
          </div>
          <div className="sa-kpi-icon" style={{ color: "var(--color-green)" }}><TrendingUp size={22} /></div>
        </div>
        <div className="sa-kpi-card">
          <div className="sa-kpi-info">
            <span className="sa-kpi-label">{t("popularTier")}</span>
            <span className="sa-kpi-value">{popularTier?.name || t("none")}</span>
          </div>
          <div className="sa-kpi-icon" style={{ color: "var(--color-blue)" }}><Star size={22} /></div>
        </div>
      </div>

      {/* Tier Summary Table */}
      <div className="sa-card" style={{ marginBottom: "24px" }}>
        <div className="sa-card-title">{t("planOverview")}</div>
        <div className="sa-table-wrap" style={{ border: "none", marginBottom: 0 }}>
          <table className="sa-table">
            <thead>
              <tr>
                <th>{t("plan")}</th>
                <th>{t("monthly")}</th>
                <th>{t("annual")}</th>
                <th>{t("users")}</th>
                <th>{t("projects")}</th>
                <th>{t("properties")}</th>
                <th>{t("storage")}</th>
                <th>{t("features")}</th>
                <th style={{ textAlign: "center" }}>{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier, idx) => (
                <tr key={idx} style={{ cursor: "pointer" }} onClick={() => setExpandedTier(expandedTier === idx ? null : idx)}>
                  <td>
                    <span style={{ fontWeight: 600 }}>{tier.name}</span>
                    {tier.is_popular && <span className="sa-plan-badge sa-plan-professional" style={{ marginLeft: "8px" }}>{t("popular")}</span>}
                  </td>
                  <td>${tier.monthly_price}/mo</td>
                  <td>${tier.annual_price}/mo</td>
                  <td>{tier.max_users ?? "∞"}</td>
                  <td>{tier.max_projects ?? "∞"}</td>
                  <td>{tier.max_properties ?? "∞"}</td>
                  <td>{tier.max_storage_gb ? `${tier.max_storage_gb} GB` : "∞"}</td>
                  <td>{tier.features.length}</td>
                  <td style={{ textAlign: "center" }}>
                    {expandedTier === idx
                      ? <ChevronUp size={16} style={{ color: "var(--muted)" }} />
                      : <ChevronDown size={16} style={{ color: "var(--muted)" }} />
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded Tier Editor */}
      {expandedTier !== null && tiers[expandedTier] && (() => {
        const tier = tiers[expandedTier];
        const idx = expandedTier;
        return (
          <div className="sa-card" style={{ marginBottom: "24px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div className="sa-card-title" style={{ marginBottom: 0 }}>
                {t("editing", { name: tier.name })}
                {tier.is_popular && <span className="sa-badge sa-badge-blue">{t("popular")}</span>}
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button className="sa-action-btn" onClick={() => moveTier(idx, -1)} disabled={idx === 0} title={t("moveUp")}>
                  <ChevronUp size={15} />
                </button>
                <button className="sa-action-btn" onClick={() => moveTier(idx, 1)} disabled={idx === tiers.length - 1} title={t("moveDown")}>
                  <ChevronDown size={15} />
                </button>
                <button
                  className="sa-action-btn"
                  onClick={() => updateTier(idx, "is_popular", !tier.is_popular)}
                  title={tier.is_popular ? t("removePopular") : t("markPopular")}
                  style={tier.is_popular ? { background: "var(--color-amber)", color: "#fff", borderColor: "var(--color-amber)" } : {}}
                >
                  <Star size={15} />
                </button>
                <button className="sa-action-btn danger" onClick={() => removeTier(idx)} title={t("deleteTier")}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* Plan Name + Pricing */}
            <div className="sa-three-col" style={{ marginBottom: "16px" }}>
              <div>
                <label className="sa-kpi-label" style={{ display: "block", marginBottom: "6px" }}>{t("planName")}</label>
                <input type="text" className="settings-field-input" value={tier.name} onChange={(e) => updateTier(idx, "name", e.target.value)} />
              </div>
              <div>
                <label className="sa-kpi-label" style={{ display: "block", marginBottom: "6px" }}>{t("monthlyPrice")}</label>
                <input type="number" className="settings-field-input" min={0} step={1} value={tier.monthly_price} onChange={(e) => updateTier(idx, "monthly_price", Number(e.target.value))} />
              </div>
              <div>
                <label className="sa-kpi-label" style={{ display: "block", marginBottom: "6px" }}>{t("annualPrice")}</label>
                <input type="number" className="settings-field-input" min={0} step={1} value={tier.annual_price} onChange={(e) => updateTier(idx, "annual_price", Number(e.target.value))} />
              </div>
            </div>

            {/* Limits */}
            <div className="sa-kpi-grid" style={{ marginBottom: "16px" }}>
              <div className="sa-kpi-card" style={{ padding: "14px" }}>
                <div className="sa-kpi-info">
                  <span className="sa-kpi-label">{t("maxUsers")}</span>
                  <input type="number" className="settings-field-input" min={0} placeholder={t("unlimited")} value={tier.max_users ?? ""} onChange={(e) => updateTier(idx, "max_users", e.target.value ? Number(e.target.value) : null)} style={{ marginTop: "6px" }} />
                </div>
                <Users size={18} style={{ color: "var(--muted)" }} />
              </div>
              <div className="sa-kpi-card" style={{ padding: "14px" }}>
                <div className="sa-kpi-info">
                  <span className="sa-kpi-label">{t("maxProjects")}</span>
                  <input type="number" className="settings-field-input" min={0} placeholder={t("unlimited")} value={tier.max_projects ?? ""} onChange={(e) => updateTier(idx, "max_projects", e.target.value ? Number(e.target.value) : null)} style={{ marginTop: "6px" }} />
                </div>
                <FolderKanban size={18} style={{ color: "var(--muted)" }} />
              </div>
              <div className="sa-kpi-card" style={{ padding: "14px" }}>
                <div className="sa-kpi-info">
                  <span className="sa-kpi-label">{t("maxProperties")}</span>
                  <input type="number" className="settings-field-input" min={0} placeholder={t("unlimited")} value={tier.max_properties ?? ""} onChange={(e) => updateTier(idx, "max_properties", e.target.value ? Number(e.target.value) : null)} style={{ marginTop: "6px" }} />
                </div>
                <Building2 size={18} style={{ color: "var(--muted)" }} />
              </div>
              <div className="sa-kpi-card" style={{ padding: "14px" }}>
                <div className="sa-kpi-info">
                  <span className="sa-kpi-label">{t("storageGb")}</span>
                  <input type="number" className="settings-field-input" min={0} placeholder={t("unlimited")} value={tier.max_storage_gb ?? ""} onChange={(e) => updateTier(idx, "max_storage_gb", e.target.value ? Number(e.target.value) : null)} style={{ marginTop: "6px" }} />
                </div>
                <HardDrive size={18} style={{ color: "var(--muted)" }} />
              </div>
            </div>

            {/* Stripe IDs */}
            <div className="sa-two-col" style={{ marginBottom: "16px" }}>
              <div>
                <label className="sa-kpi-label" style={{ display: "block", marginBottom: "6px" }}>{t("stripeMonthly")}</label>
                <input type="text" className="settings-field-input" placeholder={t("stripePlaceholder")} value={tier.stripe_price_id_monthly ?? ""} onChange={(e) => updateTier(idx, "stripe_price_id_monthly", e.target.value || null)} />
              </div>
              <div>
                <label className="sa-kpi-label" style={{ display: "block", marginBottom: "6px" }}>{t("stripeAnnual")}</label>
                <input type="text" className="settings-field-input" placeholder={t("stripePlaceholder")} value={tier.stripe_price_id_annual ?? ""} onChange={(e) => updateTier(idx, "stripe_price_id_annual", e.target.value || null)} />
              </div>
            </div>

            {/* Features */}
            <div>
              <div className="sa-card-title" style={{ fontSize: "0.9rem" }}>
                {t("featuresCount", { count: tier.features.length })}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {tier.features.map((feat, fi) => (
                  <div key={fi} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <Check size={14} style={{ color: "var(--color-green)", flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: "0.85rem" }}>{feat}</span>
                    <button type="button" onClick={() => removeFeature(idx, fi)} className="sa-action-btn danger" style={{ padding: "4px 6px", border: "none" }} title={t("remove")}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                  <input
                    type="text"
                    className="settings-field-input"
                    placeholder={t("addFeature")}
                    value={newFeatureInputs[idx] || ""}
                    onChange={(e) => setNewFeatureInputs((prev) => ({ ...prev, [idx]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(idx); } }}
                    style={{ flex: 1 }}
                  />
                  <button type="button" onClick={() => addFeature(idx)} className="sa-action-btn">
                    <Plus size={14} /> {t("add")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Empty State */}
      {tiers.length === 0 && (
        <div className="sa-empty">
          <Zap size={40} style={{ marginBottom: "12px", opacity: 0.4 }} />
          <div className="sa-empty-title">{t("noTiersYet")}</div>
          <div className="sa-empty-desc">{t("noTiersDesc")}</div>
          <button className="sa-action-btn primary" onClick={addTier} style={{ marginTop: "16px" }}>
            <Plus size={15} /> {t("createFirstTier")}
          </button>
        </div>
      )}
    </div>
  );
}
