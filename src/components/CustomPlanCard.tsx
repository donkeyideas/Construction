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
  "$2,000 – $5,000/mo",
  "$5,000 – $10,000/mo",
  "$10,000 – $25,000/mo",
  "$25,000+/mo",
];

const FEATURES = [
  "Dedicated account manager",
  "Custom integrations",
  "Volume discounts",
  "SLA guarantees",
  "White-glove onboarding",
];

/* ── shared inline styles ── */
const S = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    zIndex: 9999,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backdropFilter: "blur(6px)",
  },
  modal: {
    background: "var(--card-bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--card-radius)",
    maxWidth: 600,
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto" as const,
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 24px",
    borderBottom: "1px solid var(--border)",
  },
  headerTitle: {
    fontSize: "1.1rem",
    fontWeight: 700,
    margin: 0,
    color: "var(--text)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: "1.5rem",
    color: "var(--muted)",
    cursor: "pointer",
    padding: "4px 8px",
    lineHeight: 1,
    borderRadius: 6,
  },
  body: {
    padding: 24,
    display: "flex",
    flexDirection: "column" as const,
    gap: 16,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  field: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
  },
  label: {
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "var(--muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    margin: 0,
  },
  input: {
    padding: "9px 12px",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: "0.875rem",
    fontFamily: "var(--font-sans)",
    background: "var(--surface)",
    color: "var(--text)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  textarea: {
    padding: "9px 12px",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: "0.875rem",
    fontFamily: "var(--font-sans)",
    background: "var(--surface)",
    color: "var(--text)",
    outline: "none",
    resize: "vertical" as const,
    minHeight: 80,
    lineHeight: 1.5,
    width: "100%",
    boxSizing: "border-box" as const,
  },
  select: {
    padding: "9px 12px",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: "0.875rem",
    fontFamily: "var(--font-sans)",
    background: "var(--surface)",
    color: "var(--text)",
    outline: "none",
    cursor: "pointer",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  modulesGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 6,
    marginTop: 4,
  },
  moduleCheck: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: "0.85rem",
    color: "var(--text)",
    cursor: "pointer",
    padding: "7px 10px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--surface)",
  },
  moduleCheckActive: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: "0.85rem",
    color: "var(--text)",
    cursor: "pointer",
    padding: "7px 10px",
    borderRadius: 8,
    border: "1px solid var(--color-blue)",
    background: "var(--color-blue-light)",
  },
  checkbox: {
    accentColor: "var(--color-blue)",
    width: 16,
    height: 16,
  },
  submitBtn: {
    display: "block",
    width: "100%",
    padding: "12px 24px",
    background: "var(--color-blue)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: "0.92rem",
    fontWeight: 600,
    fontFamily: "var(--font-sans)",
    cursor: "pointer",
    marginTop: 4,
  },
  alertSuccess: {
    padding: "12px 16px",
    borderRadius: 8,
    fontSize: "0.9rem",
    lineHeight: 1.5,
    background: "rgba(22,163,74,0.1)",
    border: "1px solid rgba(22,163,74,0.25)",
    color: "var(--color-green)",
  },
  alertError: {
    padding: "12px 16px",
    borderRadius: 8,
    fontSize: "0.9rem",
    lineHeight: 1.5,
    background: "rgba(220,38,38,0.1)",
    border: "1px solid rgba(220,38,38,0.25)",
    color: "var(--color-red)",
  },
};

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
          website,
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

      {/* Modal */}
      {open && (
        <div
          style={S.overlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div style={S.modal}>
            <div style={S.header}>
              <h3 style={S.headerTitle}>Request a Custom Plan</h3>
              <button
                style={S.closeBtn}
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {result?.type === "success" ? (
              <div style={S.body}>
                <div style={S.alertSuccess}>{result.text}</div>
                <button style={S.submitBtn} onClick={() => setOpen(false)}>
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={S.body}>
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
                  <div style={S.alertError}>{result.text}</div>
                )}

                {/* Row 1: Name + Email */}
                <div style={S.row}>
                  <div style={S.field}>
                    <label htmlFor="cp-name" style={S.label}>
                      Name *
                    </label>
                    <input
                      id="cp-name"
                      type="text"
                      required
                      style={S.input}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>
                  <div style={S.field}>
                    <label htmlFor="cp-email" style={S.label}>
                      Email *
                    </label>
                    <input
                      id="cp-email"
                      type="email"
                      required
                      style={S.input}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                    />
                  </div>
                </div>

                {/* Row 2: Phone + Company */}
                <div style={S.row}>
                  <div style={S.field}>
                    <label htmlFor="cp-phone" style={S.label}>
                      Phone
                    </label>
                    <input
                      id="cp-phone"
                      type="tel"
                      style={S.input}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div style={S.field}>
                    <label htmlFor="cp-company" style={S.label}>
                      Company Name *
                    </label>
                    <input
                      id="cp-company"
                      type="text"
                      required
                      style={S.input}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Your company"
                    />
                  </div>
                </div>

                {/* Row 3: Size + Budget */}
                <div style={S.row}>
                  <div style={S.field}>
                    <label htmlFor="cp-size" style={S.label}>
                      Company Size
                    </label>
                    <select
                      id="cp-size"
                      style={S.select}
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
                  <div style={S.field}>
                    <label htmlFor="cp-budget" style={S.label}>
                      Budget Range
                    </label>
                    <select
                      id="cp-budget"
                      style={S.select}
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

                {/* Modules */}
                <div style={S.field}>
                  <label style={S.label}>Modules of Interest</label>
                  <div style={S.modulesGrid}>
                    {MODULES.map((mod) => (
                      <label
                        key={mod}
                        style={
                          modules.includes(mod)
                            ? S.moduleCheckActive
                            : S.moduleCheck
                        }
                      >
                        <input
                          type="checkbox"
                          style={S.checkbox}
                          checked={modules.includes(mod)}
                          onChange={() => toggleModule(mod)}
                        />
                        <span>{mod}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div style={S.field}>
                  <label htmlFor="cp-message" style={S.label}>
                    Tell us about your needs *
                  </label>
                  <textarea
                    id="cp-message"
                    required
                    rows={4}
                    style={S.textarea}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your project requirements, team size, timeline, and any special needs..."
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    ...S.submitBtn,
                    opacity: saving ? 0.6 : 1,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
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
