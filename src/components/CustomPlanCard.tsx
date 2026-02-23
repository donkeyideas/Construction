"use client";

import { useState } from "react";

const MODULES = [
  "Project Management",
  "Property Management",
  "Financial Management",
  "Document Management",
  "Scheduling",
  "Safety & Compliance",
  "CRM & Bids",
  "Workforce & Time Tracking",
];

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "200+"];

const BUDGET_RANGES = [
  "",
  "Under $500/mo",
  "$500 – $1,000/mo",
  "$1,000 – $2,000/mo",
  "$2,000+/mo",
];

const FEATURES = [
  "Dedicated account manager",
  "Custom integrations",
  "Volume discounts",
  "SLA guarantees",
  "White-glove onboarding",
];

export default function CustomPlanCard() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [modules, setModules] = useState<string[]>([]);
  const [budgetRange, setBudgetRange] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function toggleModule(mod: string) {
    setModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  }

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setCompanyName("");
    setCompanySize("");
    setModules([]);
    setBudgetRange("");
    setMessage("");
    setResult(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setSaving(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "custom_plan",
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          company_name: companyName.trim(),
          company_size: companySize || null,
          modules_interested: modules,
          budget_range: budgetRange || null,
          message: message.trim(),
          website, // honeypot
        }),
      });

      if (res.ok) {
        setResult({
          type: "success",
          text: "Thank you! We'll review your request and get back to you within 1 business day.",
        });
      } else {
        const data = await res.json();
        setResult({
          type: "error",
          text: data.error || "Something went wrong. Please try again.",
        });
      }
    } catch {
      setResult({
        type: "error",
        text: "Network error. Please check your connection and try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Custom plan card in the pricing grid */}
      <div className="hp-pricing-card hp-custom-card">
        <div className="hp-pricing-name">Custom</div>
        <div className="hp-pricing-desc">Tailored for your business</div>
        <div className="hp-pricing-price">
          <span className="hp-pricing-amount hp-custom-price-text">
            Let&apos;s Talk
          </span>
        </div>
        <ul className="hp-pricing-features">
          {FEATURES.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
        <button
          className="hp-pricing-btn hp-pricing-btn-custom"
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
        >
          Get Custom Quote
        </button>
      </div>

      {/* Modal overlay */}
      {open && (
        <div
          className="custom-plan-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="custom-plan-modal">
            <div className="custom-plan-modal-header">
              <h3>Request a Custom Plan</h3>
              <button
                className="custom-plan-close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {result?.type === "success" ? (
              <div className="custom-plan-modal-body">
                <div className="contact-form-alert contact-form-alert-success">
                  {result.text}
                </div>
                <button
                  className="contact-form-submit"
                  onClick={() => setOpen(false)}
                  style={{ marginTop: "1rem" }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="custom-plan-modal-body">
                {/* Honeypot */}
                <div
                  style={{ position: "absolute", left: "-9999px" }}
                  aria-hidden="true"
                >
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                {result?.type === "error" && (
                  <div className="contact-form-alert contact-form-alert-error">
                    {result.text}
                  </div>
                )}

                <div className="contact-form-row">
                  <div className="contact-form-field">
                    <label htmlFor="cp-name">Name *</label>
                    <input
                      id="cp-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="contact-form-field">
                    <label htmlFor="cp-email">Email *</label>
                    <input
                      id="cp-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                    />
                  </div>
                </div>

                <div className="contact-form-row">
                  <div className="contact-form-field">
                    <label htmlFor="cp-phone">Phone</label>
                    <input
                      id="cp-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="contact-form-field">
                    <label htmlFor="cp-company">Company Name *</label>
                    <input
                      id="cp-company"
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Your company"
                    />
                  </div>
                </div>

                <div className="contact-form-row">
                  <div className="contact-form-field">
                    <label htmlFor="cp-size">Company Size</label>
                    <select
                      id="cp-size"
                      value={companySize}
                      onChange={(e) => setCompanySize(e.target.value)}
                    >
                      <option value="">Select...</option>
                      {COMPANY_SIZES.map((s) => (
                        <option key={s} value={s}>
                          {s} employees
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="contact-form-field">
                    <label htmlFor="cp-budget">Budget Range</label>
                    <select
                      id="cp-budget"
                      value={budgetRange}
                      onChange={(e) => setBudgetRange(e.target.value)}
                    >
                      {BUDGET_RANGES.map((b) => (
                        <option key={b} value={b}>
                          {b || "Select..."}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="contact-form-field">
                  <label>Modules of Interest</label>
                  <div className="custom-plan-modules-grid">
                    {MODULES.map((mod) => (
                      <label key={mod} className="custom-plan-module-check">
                        <input
                          type="checkbox"
                          checked={modules.includes(mod)}
                          onChange={() => toggleModule(mod)}
                        />
                        <span>{mod}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="contact-form-field">
                  <label htmlFor="cp-message">
                    Tell us about your needs *
                  </label>
                  <textarea
                    id="cp-message"
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your project requirements, team size, timeline, and any special needs..."
                  />
                </div>

                <button
                  type="submit"
                  className="contact-form-submit"
                  disabled={saving}
                >
                  {saving ? "Submitting..." : "Submit Request"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
