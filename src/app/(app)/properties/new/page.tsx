"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
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
    property_type: "residential",
    address_line1: "",
    city: "",
    state: "",
    zip: "",
    year_built: "",
    total_sqft: "",
    total_units: "",
    purchase_price: "",
    current_value: "",
    // Unit template fields
    default_unit_type: "",
    default_sqft_per_unit: "",
    default_market_rent: "",
    floors: "",
  });

  const unitCount = parseInt(form.total_units, 10) || 0;

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
        property_type: form.property_type,
        address_line1: form.address_line1.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        zip: form.zip.trim(),
        year_built: form.year_built ? parseInt(form.year_built, 10) : null,
        total_sqft: form.total_sqft ? parseInt(form.total_sqft, 10) : null,
        total_units: form.total_units ? parseInt(form.total_units, 10) : 0,
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
        current_value: form.current_value ? parseFloat(form.current_value) : null,
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
      <div className="properties-header">
        <div>
          <div style={{ marginBottom: "8px" }}>
            <Link
              href="/properties"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.82rem",
                color: "var(--muted)",
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={14} />
              {t("backToProperties")}
            </Link>
          </div>
          <h2>{t("addProperty")}</h2>
          <p>{t("createNewProperty")}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="property-form">
        {error && (
          <div
            style={{
              padding: "12px 16px",
              background: "var(--color-red-light)",
              color: "var(--color-red)",
              borderRadius: "8px",
              fontSize: "0.85rem",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        <div className="property-form-grid">
          {/* Name */}
          <div className="ui-field full-width">
            <label className="ui-label" htmlFor="name">
              {t("propertyName")}
            </label>
            <input
              id="name"
              name="name"
              className="ui-input"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Riverside Apartments"
              required
            />
          </div>

          {/* Property Type */}
          <div className="ui-field">
            <label className="ui-label" htmlFor="property_type">
              {t("propertyType")}
            </label>
            <select
              id="property_type"
              name="property_type"
              className="ui-input"
              value={form.property_type}
              onChange={handleChange}
            >
              <option value="residential">{t("residential")}</option>
              <option value="commercial">{t("commercial")}</option>
              <option value="industrial">{t("industrial")}</option>
              <option value="mixed_use">{t("mixedUse")}</option>
            </select>
          </div>

          {/* Year Built */}
          <div className="ui-field">
            <label className="ui-label" htmlFor="year_built">
              {t("yearBuilt")}
            </label>
            <input
              id="year_built"
              name="year_built"
              type="number"
              className="ui-input"
              value={form.year_built}
              onChange={handleChange}
              placeholder="e.g. 2005"
              min="1800"
              max="2100"
            />
          </div>

          {/* Address */}
          <div className="ui-field full-width">
            <label className="ui-label" htmlFor="address_line1">
              {t("address")}
            </label>
            <input
              id="address_line1"
              name="address_line1"
              className="ui-input"
              value={form.address_line1}
              onChange={handleChange}
              placeholder={t("streetAddress")}
              required
            />
          </div>

          {/* City */}
          <div className="ui-field">
            <label className="ui-label" htmlFor="city">
              {t("city")}
            </label>
            <input
              id="city"
              name="city"
              className="ui-input"
              value={form.city}
              onChange={handleChange}
              placeholder="City"
              required
            />
          </div>

          {/* State */}
          <div className="ui-field">
            <label className="ui-label" htmlFor="state">
              {t("state")}
            </label>
            <input
              id="state"
              name="state"
              className="ui-input"
              value={form.state}
              onChange={handleChange}
              placeholder="e.g. CA"
              maxLength={2}
              required
            />
          </div>

          {/* ZIP */}
          <div className="ui-field">
            <label className="ui-label" htmlFor="zip">
              {t("zipCode")}
            </label>
            <input
              id="zip"
              name="zip"
              className="ui-input"
              value={form.zip}
              onChange={handleChange}
              placeholder="e.g. 90210"
              required
            />
          </div>

          {/* Total Sq Ft */}
          <div className="ui-field">
            <label className="ui-label" htmlFor="total_sqft">
              {t("totalSqFt")}
            </label>
            <input
              id="total_sqft"
              name="total_sqft"
              type="number"
              className="ui-input"
              value={form.total_sqft}
              onChange={handleChange}
              placeholder="e.g. 50000"
              min="0"
            />
          </div>

          {/* Total Units */}
          <div className="ui-field">
            <label className="ui-label" htmlFor="total_units">
              {t("totalUnits")}
            </label>
            <input
              id="total_units"
              name="total_units"
              type="number"
              className="ui-input"
              value={form.total_units}
              onChange={handleChange}
              placeholder="e.g. 24"
              min="0"
            />
          </div>

          {/* Purchase Price */}
          <div className="ui-field">
            <label className="ui-label" htmlFor="purchase_price">
              {t("purchasePrice")}
            </label>
            <input
              id="purchase_price"
              name="purchase_price"
              type="number"
              className="ui-input"
              value={form.purchase_price}
              onChange={handleChange}
              placeholder="e.g. 2500000"
              min="0"
              step="0.01"
            />
          </div>

          {/* Current Value */}
          <div className="ui-field">
            <label className="ui-label" htmlFor="current_value">
              {t("currentValue")}
            </label>
            <input
              id="current_value"
              name="current_value"
              type="number"
              className="ui-input"
              value={form.current_value}
              onChange={handleChange}
              placeholder="e.g. 3000000"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {/* Unit Defaults — shown when total_units > 0 */}
        {unitCount > 0 && (
          <div
            style={{
              marginTop: "28px",
              padding: "20px 24px",
              background: "var(--color-blue-light, rgba(59,130,246,0.06))",
              border: "1px solid var(--color-blue, #3b82f6)",
              borderRadius: "10px",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontWeight: 700, fontSize: "0.92rem", marginBottom: "4px" }}>
                Unit Defaults
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                {unitCount} units will be created automatically. Set defaults here — you can edit each unit individually after creation.
              </div>
            </div>

            <div className="property-form-grid">
              {/* Default Unit Type */}
              <div className="ui-field">
                <label className="ui-label" htmlFor="default_unit_type">
                  Unit Type
                </label>
                <select
                  id="default_unit_type"
                  name="default_unit_type"
                  className="ui-input"
                  value={form.default_unit_type || DEFAULT_UNIT_TYPE_BY_PROPERTY[form.property_type] || "1br"}
                  onChange={handleChange}
                >
                  {UNIT_TYPES.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>

              {/* Floors */}
              <div className="ui-field">
                <label className="ui-label" htmlFor="floors">
                  Number of Floors
                </label>
                <input
                  id="floors"
                  name="floors"
                  type="number"
                  className="ui-input"
                  value={form.floors}
                  onChange={handleChange}
                  placeholder="e.g. 3 (for 101, 201, 301...)"
                  min="1"
                />
              </div>

              {/* Default Sq Ft per Unit */}
              <div className="ui-field">
                <label className="ui-label" htmlFor="default_sqft_per_unit">
                  Sq Ft Per Unit
                </label>
                <input
                  id="default_sqft_per_unit"
                  name="default_sqft_per_unit"
                  type="number"
                  className="ui-input"
                  value={form.default_sqft_per_unit}
                  onChange={handleChange}
                  placeholder="e.g. 850"
                  min="0"
                />
              </div>

              {/* Default Market Rent */}
              <div className="ui-field">
                <label className="ui-label" htmlFor="default_market_rent">
                  Market Rent Per Unit ($)
                </label>
                <input
                  id="default_market_rent"
                  name="default_market_rent"
                  type="number"
                  className="ui-input"
                  value={form.default_market_rent}
                  onChange={handleChange}
                  placeholder="e.g. 1800"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Preview of unit numbers */}
            <div style={{ marginTop: "12px", fontSize: "0.78rem", color: "var(--muted)" }}>
              Unit numbering preview:{" "}
              <span style={{ fontFamily: "monospace", color: "var(--text)" }}>
                {(() => {
                  const floors = parseInt(form.floors, 10) || 0;
                  if (floors > 1) {
                    const perFloor = Math.ceil(unitCount / floors);
                    const examples = [];
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

        <div className="property-form-actions">
          <button
            type="submit"
            className="ui-btn ui-btn-md ui-btn-primary"
            disabled={saving}
          >
            {saving && <span className="ui-btn-spinner" />}
            <Save size={16} />
            {saving
              ? (unitCount > 0 ? `Creating property + ${unitCount} units...` : t("saving"))
              : t("createProperty")}
          </button>
          <Link href="/properties" className="ui-btn ui-btn-md ui-btn-secondary">
            {t("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}
