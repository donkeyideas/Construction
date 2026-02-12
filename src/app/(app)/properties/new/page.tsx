"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

export default function NewPropertyPage() {
  const router = useRouter();
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
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Property name is required.");
      return;
    }
    if (!form.address_line1.trim()) {
      setError("Address is required.");
      return;
    }
    if (!form.city.trim() || !form.state.trim() || !form.zip.trim()) {
      setError("City, state, and ZIP are required.");
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
        purchase_price: form.purchase_price
          ? parseFloat(form.purchase_price)
          : null,
        current_value: form.current_value
          ? parseFloat(form.current_value)
          : null,
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
              Back to Properties
            </Link>
          </div>
          <h2>Add Property</h2>
          <p>Create a new property in your portfolio</p>
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
              Property Name
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
              Property Type
            </label>
            <select
              id="property_type"
              name="property_type"
              className="ui-input"
              value={form.property_type}
              onChange={handleChange}
            >
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
              <option value="mixed_use">Mixed Use</option>
            </select>
          </div>

          {/* Year Built */}
          <div className="ui-field">
            <label className="ui-label" htmlFor="year_built">
              Year Built
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
              Address
            </label>
            <input
              id="address_line1"
              name="address_line1"
              className="ui-input"
              value={form.address_line1}
              onChange={handleChange}
              placeholder="Street address"
              required
            />
          </div>

          {/* City */}
          <div className="ui-field">
            <label className="ui-label" htmlFor="city">
              City
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
              State
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
              ZIP Code
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
              Total Sq Ft
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
              Total Units
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
              Purchase Price ($)
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
              Current Value ($)
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

        <div className="property-form-actions">
          <button
            type="submit"
            className="ui-btn ui-btn-md ui-btn-primary"
            disabled={saving}
          >
            {saving && <span className="ui-btn-spinner" />}
            <Save size={16} />
            {saving ? "Saving..." : "Create Property"}
          </button>
          <Link href="/properties" className="ui-btn ui-btn-md ui-btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
