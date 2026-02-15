"use client";

import { useState } from "react";
import {
  Save,
  Loader2,
  X,
  Check,
  Zap,
  Plus,
  Trash2,
  GripVertical,
  Star,
  DollarSign,
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

interface PricingClientProps {
  initialTiers: PricingTier[];
}

export default function PricingClient({ initialTiers }: PricingClientProps) {
  const [tiers, setTiers] = useState<PricingTier[]>(
    initialTiers.length > 0
      ? initialTiers.map((t) => ({
          ...t,
          features: Array.isArray(t.features) ? t.features : [],
        }))
      : [
          { name: "Starter", monthly_price: 99, annual_price: 79, features: ["Up to 10 users", "Up to 5 projects", "Up to 10 properties", "10 GB storage", "Email support"], is_popular: false, max_users: 10, max_projects: 5, max_properties: 10, max_storage_gb: 10, stripe_price_id_monthly: null, stripe_price_id_annual: null },
          { name: "Professional", monthly_price: 299, annual_price: 249, features: ["Up to 50 users", "Up to 25 projects", "Up to 50 properties", "50 GB storage", "Priority support", "API access", "Automation rules"], is_popular: true, max_users: 50, max_projects: 25, max_properties: 50, max_storage_gb: 50, stripe_price_id_monthly: null, stripe_price_id_annual: null },
          { name: "Enterprise", monthly_price: 599, annual_price: 499, features: ["Unlimited users", "Unlimited projects", "Unlimited properties", "250 GB storage", "Dedicated support", "SSO & SAML", "Custom integrations", "All 4 portals"], is_popular: false, max_users: null, max_projects: null, max_properties: null, max_storage_gb: 250, stripe_price_id_monthly: null, stripe_price_id_annual: null },
        ]
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [newFeatureInputs, setNewFeatureInputs] = useState<Record<number, string>>({});

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
        setTiers(
          data.tiers.map((t: PricingTier & { features: string[] | string }) => ({
            ...t,
            features: Array.isArray(t.features) ? t.features : [],
          }))
        );
        setMessage({ type: "success", text: "Pricing tiers saved successfully." });
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

  function updateTier(index: number, field: string, value: string | number | boolean | null) {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  }

  function addTier() {
    setTiers((prev) => [
      ...prev,
      {
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
      },
    ]);
  }

  function removeTier(index: number) {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  }

  function addFeature(tierIndex: number) {
    const feat = (newFeatureInputs[tierIndex] || "").trim();
    if (!feat) return;
    setTiers((prev) =>
      prev.map((t, i) => (i === tierIndex ? { ...t, features: [...t.features, feat] } : t))
    );
    setNewFeatureInputs((prev) => ({ ...prev, [tierIndex]: "" }));
  }

  function removeFeature(tierIndex: number, featIndex: number) {
    setTiers((prev) =>
      prev.map((t, i) =>
        i === tierIndex ? { ...t, features: t.features.filter((_, fi) => fi !== featIndex) } : t
      )
    );
  }

  function moveTier(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= tiers.length) return;
    setTiers((prev) => {
      const copy = [...prev];
      [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
      return copy;
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="sa-page-header">
        <div>
          <h2 style={{ margin: 0 }}>Pricing Tiers</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "4px 0 0" }}>
            Manage platform subscription plans visible to all companies.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn-secondary" onClick={addTier} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem" }}>
            <Plus size={14} /> Add Tier
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem" }}>
            <Save size={14} /> {saving ? "Saving..." : "Save All Tiers"}
          </button>
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "0.85rem",
            background: message.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            color: message.type === "success" ? "var(--color-green)" : "var(--color-red)",
            border: `1px solid ${message.type === "success" ? "var(--color-green)" : "var(--color-red)"}`,
          }}
        >
          {message.text}
        </div>
      )}

      {/* KPI Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        <div className="sa-stat-card">
          <div className="sa-stat-label">Total Tiers</div>
          <div className="sa-stat-value">{tiers.length}</div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-label">Price Range</div>
          <div className="sa-stat-value">
            ${Math.min(...tiers.map((t) => t.monthly_price || 0))} - ${Math.max(...tiers.map((t) => t.monthly_price || 0))}/mo
          </div>
        </div>
        <div className="sa-stat-card">
          <div className="sa-stat-label">Popular Tier</div>
          <div className="sa-stat-value">{tiers.find((t) => t.is_popular)?.name || "None"}</div>
        </div>
      </div>

      {/* Tier Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {tiers.map((tier, idx) => (
          <div
            key={idx}
            style={{
              border: tier.is_popular ? "2px solid var(--color-blue)" : "1px solid var(--border)",
              borderRadius: "12px",
              padding: "20px",
              background: "var(--surface)",
            }}
          >
            {/* Tier header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <GripVertical size={16} style={{ color: "var(--muted)" }} />
                <DollarSign size={18} style={{ color: "var(--color-green)" }} />
                <span style={{ fontWeight: 600, fontSize: "1rem" }}>Tier {idx + 1}</span>
                {tier.is_popular && (
                  <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "999px", background: "var(--color-blue)", color: "#fff", fontWeight: 600 }}>
                    POPULAR
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <button type="button" onClick={() => moveTier(idx, -1)} disabled={idx === 0} title="Move up" style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: "6px", background: "transparent", cursor: idx === 0 ? "not-allowed" : "pointer", opacity: idx === 0 ? 0.4 : 1, color: "var(--foreground)", fontSize: "0.75rem" }}>
                  &#9650;
                </button>
                <button type="button" onClick={() => moveTier(idx, 1)} disabled={idx === tiers.length - 1} title="Move down" style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: "6px", background: "transparent", cursor: idx === tiers.length - 1 ? "not-allowed" : "pointer", opacity: idx === tiers.length - 1 ? 0.4 : 1, color: "var(--foreground)", fontSize: "0.75rem" }}>
                  &#9660;
                </button>
                <button type="button" onClick={() => updateTier(idx, "is_popular", !tier.is_popular)} title={tier.is_popular ? "Remove popular badge" : "Mark as popular"} style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: "6px", background: tier.is_popular ? "var(--color-amber)" : "transparent", cursor: "pointer", color: tier.is_popular ? "#fff" : "var(--foreground)", fontSize: "0" }}>
                  <Star size={14} />
                </button>
                <button type="button" onClick={() => removeTier(idx)} title="Delete tier" style={{ padding: "4px 8px", border: "1px solid var(--color-red)", borderRadius: "6px", background: "transparent", cursor: "pointer", color: "var(--color-red)", fontSize: "0" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Name + Prices */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "14px" }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 500, marginBottom: "4px", display: "block", color: "var(--muted)" }}>Tier Name</label>
                <input type="text" className="settings-field-input" value={tier.name} onChange={(e) => updateTier(idx, "name", e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 500, marginBottom: "4px", display: "block", color: "var(--muted)" }}>Monthly Price ($)</label>
                <input type="number" className="settings-field-input" min={0} step={1} value={tier.monthly_price} onChange={(e) => updateTier(idx, "monthly_price", Number(e.target.value))} />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 500, marginBottom: "4px", display: "block", color: "var(--muted)" }}>Annual Price ($/mo)</label>
                <input type="number" className="settings-field-input" min={0} step={1} value={tier.annual_price} onChange={(e) => updateTier(idx, "annual_price", Number(e.target.value))} />
              </div>
            </div>

            {/* Limits */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", marginBottom: "14px" }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 500, marginBottom: "4px", display: "block", color: "var(--muted)" }}>Max Users</label>
                <input type="number" className="settings-field-input" min={0} placeholder="Unlimited" value={tier.max_users ?? ""} onChange={(e) => updateTier(idx, "max_users", e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 500, marginBottom: "4px", display: "block", color: "var(--muted)" }}>Max Projects</label>
                <input type="number" className="settings-field-input" min={0} placeholder="Unlimited" value={tier.max_projects ?? ""} onChange={(e) => updateTier(idx, "max_projects", e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 500, marginBottom: "4px", display: "block", color: "var(--muted)" }}>Max Properties</label>
                <input type="number" className="settings-field-input" min={0} placeholder="Unlimited" value={tier.max_properties ?? ""} onChange={(e) => updateTier(idx, "max_properties", e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 500, marginBottom: "4px", display: "block", color: "var(--muted)" }}>Storage (GB)</label>
                <input type="number" className="settings-field-input" min={0} placeholder="Unlimited" value={tier.max_storage_gb ?? ""} onChange={(e) => updateTier(idx, "max_storage_gb", e.target.value ? Number(e.target.value) : null)} />
              </div>
            </div>

            {/* Stripe Price IDs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 500, marginBottom: "4px", display: "block", color: "var(--muted)" }}>Stripe Monthly Price ID</label>
                <input type="text" className="settings-field-input" placeholder="price_xxxxx" value={tier.stripe_price_id_monthly ?? ""} onChange={(e) => updateTier(idx, "stripe_price_id_monthly", e.target.value || null)} />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 500, marginBottom: "4px", display: "block", color: "var(--muted)" }}>Stripe Annual Price ID</label>
                <input type="text" className="settings-field-input" placeholder="price_xxxxx" value={tier.stripe_price_id_annual ?? ""} onChange={(e) => updateTier(idx, "stripe_price_id_annual", e.target.value || null)} />
              </div>
            </div>

            {/* Features */}
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 500, marginBottom: "8px", display: "block", color: "var(--muted)" }}>Features</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {tier.features.map((feat, fi) => (
                  <div key={fi} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Check size={14} style={{ color: "var(--color-green)", flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: "0.85rem" }}>{feat}</span>
                    <button type="button" onClick={() => removeFeature(idx, fi)} style={{ padding: "2px 6px", border: "none", background: "transparent", cursor: "pointer", color: "var(--color-red)", fontSize: "0" }} title="Remove feature">
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
                  <button type="button" onClick={() => addFeature(idx)} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", padding: "6px 12px", whiteSpace: "nowrap" }}>
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tiers.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
          <Zap size={32} style={{ marginBottom: "12px", opacity: 0.4 }} />
          <div style={{ fontSize: "0.95rem", fontWeight: 500 }}>No pricing tiers yet</div>
          <div style={{ fontSize: "0.82rem", marginTop: "4px" }}>
            Click &quot;Add Tier&quot; to create your first subscription plan.
          </div>
        </div>
      )}
    </div>
  );
}
