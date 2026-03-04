"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, X } from "lucide-react";
import { useTranslations } from "next-intl";

const UNIT_TYPES = [
  { value: "studio", label: "Studio" },
  { value: "1br", label: "1 Bedroom" },
  { value: "2br", label: "2 Bedroom" },
  { value: "3br", label: "3 Bedroom" },
  { value: "office", label: "Office" },
  { value: "retail", label: "Retail" },
  { value: "warehouse", label: "Warehouse" },
];

const DEFAULT_UNIT_TYPE_BY_PROPERTY: Record<string, string> = {
  residential: "1br",
  commercial: "office",
  industrial: "warehouse",
  mixed_use: "1br",
};

export default function NewPropertyPage() {
  const router = useRouter();
  const t = useTranslations("properties");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    property_type: "residential",
    address_line1: "",
    city: "",
    state: "",
    zip: "",
    year_built: "",
    total_sqft: "",
    total_units: "",
    purchase_price: "",
    land_value: "",
    current_value: "",
    financing_method: "mortgage" as "cash" | "mortgage",
    // Unit template fields
    default_unit_type: "",
    default_sqft_per_unit: "",
    default_market_rent: "",
    floors: "",
  });

  const unitCount = parseInt(form.total_units, 10) || 0;

  const hasPurchasePrice = parseFloat(form.purchase_price) > 0;

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError(t("nameRequired"));
      return;
    }
    if (!form.address_line1.trim()) {
      setError(t("addressRequired"));
      return;
    }
    if (!form.city.trim() || !form.state.trim() || !form.zip.trim()) {
      setError(t("cityStateZipRequired"));
      return;
    }

    setSaving(true);

    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        property_type: form.property_type,
        address_line1: form.address_line1.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zip: form.zip.trim(),
        year_built: form.year_built ? parseInt(form.year_built, 10) : null,
        total_sqft: form.total_sqft ? parseInt(form.total_sqft, 10) : null,
        total_units: form.total_units ? parseInt(form.total_units, 10) : 0,
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
        land_value: form.land_value ? parseFloat(form.land_value) : null,
        current_value: form.current_value ? parseFloat(form.current_value) : null,
        financing_method: form.financing_method,
        // Unit template
        default_unit_type: form.default_unit_type || DEFAULT_UNIT_TYPE_BY_PROPERTY[form.property_type] || "1br",
        default_sqft_per_unit: form.default_sqft_per_unit ? parseFloat(form.default_sqft_per_unit) : null,
        default_market_rent: form.default_market_rent ? parseFloat(form.default_market_rent) : null,
        floors: form.floors ? parseInt(form.floors, 10) : null,
      };

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create property.");
      }

      const data = await res.json();
      router.push(`/properties/${data.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="projects-header">
        <div>
          <div style={{ marginBottom: 8 }}>
            <Link
              href="/properties"
              style={{
                fontSize: "0.82rem",
                color: "var(--muted)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <ArrowLeft size={14} /> {t("backToProperties")}
            </Link>
          </div>
          <h2>{t("addProperty")}</h2>
          <p className="projects-header-sub">
            {t("createNewProperty")}
          </p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <form onSubmit={handleSubmit} className="project-form">
        {/* Basic Information */}
        <div className="project-form-section">
          <div className="card-title">{t("basicInformation")}</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="name">
                {t("propertyName")} *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className="form-input"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Riverside Apartments"
                required
              />
            </div>
            <div className="form-group full-width">
              <label className="form-label" htmlFor="description">
                {t("descriptionLabel")}
              </label>
              <textarea
                id="description"
                name="description"
                className="form-textarea"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder={t("descriptionPlaceholder")}
                rows={3}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="property_type">
                {t("propertyType")}
              </label>
              <select
                id="property_type"
                name="property_type"
                className="form-select"
                value={form.property_type}
                onChange={handleChange}
              >
                <option value="residential">{t("residential")}</option>
                <option value="commercial">{t("commercial")}</option>
                <option value="industrial">{t("industrial")}</option>
                <option value="mixed_use">{t("mixedUse")}</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="year_built">
                {t("yearBuilt")}
              </label>
              <input
                id="year_built"
                name="year_built"
                type="number"
                className="form-input"
                value={form.year_built}
                onChange={handleChange}
                placeholder="e.g. 2005"
                min="1800"
                max="2100"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="total_sqft">
                {t("totalSqFt")}
              </label>
              <input
                id="total_sqft"
                name="total_sqft"
                type="number"
                className="form-input"
                value={form.total_sqft}
                onChange={handleChange}
                placeholder="e.g. 50000"
                min="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="total_units">
                {t("totalUnits")}
              </label>
              <input
                id="total_units"
                name="total_units"
                type="number"
                className="form-input"
                value={form.total_units}
                onChange={handleChange}
                placeholder="e.g. 24"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="project-form-section">
          <div className="card-title">{t("propertyLocation")}</div>
          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label" htmlFor="address_line1">
                {t("address")} *
              </label>
              <input
                id="address_line1"
                name="address_line1"
                type="text"
                className="form-input"
                value={form.address_line1}
                onChange={handleChange}
                placeholder={t("streetAddress")}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="city">
                {t("city")} *
              </label>
              <input
                id="city"
                name="city"
                type="text"
                className="form-input"
                value={form.city}
                onChange={handleChange}
                placeholder="City"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="state">
                {t("state")} *
              </label>
              <input
                id="state"
                name="state"
                type="text"
                className="form-input"
                value={form.state}
                onChange={handleChange}
                placeholder="e.g. CA"
                maxLength={2}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="zip">
                {t("zipCode")} *
              </label>
              <input
                id="zip"
                name="zip"
                type="text"
                className="form-input"
                value={form.zip}
                onChange={handleChange}
                placeholder="e.g. 90210"
                required
              />
            </div>
          </div>
        </div>

        {/* Financial Details */}
        <div className="project-form-section">
          <div className="card-title">{t("financialDetails")}</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="purchase_price">
                {t("purchasePrice")}
              </label>
              <input
                id="purchase_price"
                name="purchase_price"
                type="number"
                className="form-input"
                value={form.purchase_price}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="current_value">
                {t("currentValue")}
              </label>
              <input
                id="current_value"
                name="current_value"
                type="number"
                className="form-input"
                value={form.current_value}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            {hasPurchasePrice && (
              <div className="form-group">
                <label className="form-label" htmlFor="land_value">
                  Land Value
                </label>
                <input
                  id="land_value"
                  name="land_value"
                  type="number"
                  className="form-input"
                  value={form.land_value}
                  onChange={handleChange}
                  placeholder={`e.g. ${form.purchase_price ? Math.round(parseFloat(form.purchase_price) * 0.2).toLocaleString() : "500000"}`}
                  min="0"
                  step="0.01"
                />
                <span className="form-hint">
                  Non-depreciable land portion. If blank, 20% of purchase price is assumed.
                </span>
              </div>
            )}
          </div>

          {/* Financing Method */}
          {hasPurchasePrice && (
            <div style={{ marginTop: 20 }}>
              <label className="form-label" style={{ marginBottom: 10, display: "block" }}>
                Financing Method
              </label>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {[
                  { value: "mortgage", label: "Mortgage / Financed", desc: "CR Mortgage Payable" },
                  { value: "cash", label: "Cash Purchase", desc: "CR Cash" },
                ].map((opt) => {
                  const selected = form.financing_method === opt.value;
                  return (
                    <label
                      key={opt.value}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        cursor: "pointer",
                        padding: "10px 16px",
                        borderRadius: 8,
                        border: `2px solid ${selected ? "var(--color-blue)" : "var(--border)"}`,
                        background: selected ? "rgba(59,130,246,0.08)" : "var(--bg)",
                        transition: "border-color 0.15s, background 0.15s",
                        minWidth: 180,
                      }}
                    >
                      <input
                        type="radio"
                        name="financing_method"
                        value={opt.value}
                        checked={selected}
                        onChange={handleChange}
                        style={{ accentColor: "var(--color-blue)", flexShrink: 0 }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.87rem", color: "var(--text)" }}>{opt.label}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontFamily: "monospace", marginTop: 2 }}>{opt.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Unit Defaults — shown when total_units > 0 */}
        {unitCount > 0 && (
          <div className="project-form-section" style={{ borderColor: "var(--color-blue)", background: "rgba(59,130,246,0.04)" }}>
            <div className="card-title">
              Unit Defaults
              <span style={{ fontWeight: 400, fontSize: "0.8rem", color: "var(--muted)", marginLeft: 8 }}>
                {unitCount} units will be created automatically
              </span>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="default_unit_type">
                  Unit Type
                </label>
                <select
                  id="default_unit_type"
                  name="default_unit_type"
                  className="form-select"
                  value={form.default_unit_type || DEFAULT_UNIT_TYPE_BY_PROPERTY[form.property_type] || "1br"}
                  onChange={handleChange}
                >
                  {UNIT_TYPES.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="floors">
                  Number of Floors
                </label>
                <input
                  id="floors"
                  name="floors"
                  type="number"
                  className="form-input"
                  value={form.floors}
                  onChange={handleChange}
                  placeholder="e.g. 3 (for 101, 201, 301...)"
                  min="1"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="default_sqft_per_unit">
                  Sq Ft Per Unit
                </label>
                <input
                  id="default_sqft_per_unit"
                  name="default_sqft_per_unit"
                  type="number"
                  className="form-input"
                  value={form.default_sqft_per_unit}
                  onChange={handleChange}
                  placeholder="e.g. 850"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="default_market_rent">
                  Market Rent Per Unit ($)
                </label>
                <input
                  id="default_market_rent"
                  name="default_market_rent"
                  type="number"
                  className="form-input"
                  value={form.default_market_rent}
                  onChange={handleChange}
                  placeholder="e.g. 1800"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Preview of unit numbers */}
            <div style={{ marginTop: 12, fontSize: "0.78rem", color: "var(--muted)" }}>
              Unit numbering preview:{" "}
              <span style={{ fontFamily: "monospace", color: "var(--text)" }}>
                {(() => {
                  const floors = parseInt(form.floors, 10) || 0;
                  if (floors > 1) {
                    const perFloor = Math.ceil(unitCount / floors);
                    const examples: string[] = [];
                    outer: for (let f = 1; f <= floors; f++) {
                      for (let u = 1; u <= perFloor; u++) {
                        examples.push(`${f}${String(u).padStart(2, "0")}`);
                        if (examples.length >= 5) break outer;
                      }
                    }
                    return examples.join(", ") + (unitCount > 5 ? ` ... (${unitCount} total)` : "");
                  } else {
                    const examples = Array.from({ length: Math.min(unitCount, 5) }, (_, i) => String(101 + i));
                    return examples.join(", ") + (unitCount > 5 ? ` ... (${unitCount} total)` : "");
                  }
                })()}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="form-actions">
          <Link href="/properties" className="btn-secondary">
            <X size={14} />
            {t("cancel")}
          </Link>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={14} />
            {saving
              ? (unitCount > 0 ? `Creating property + ${unitCount} units...` : t("saving"))
              : t("createProperty")}
          </button>
        </div>
      </form>
    </div>
  );
}
