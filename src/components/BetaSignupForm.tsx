"use client";

import { useState, type FormEvent } from "react";

const COMPANY_TYPES = [
  "General Contractor",
  "Developer",
  "Property Manager",
  "Owner-Builder",
  "Subcontractor",
  "Specialty Trade",
  "Architect / Engineering",
];

const COMPANY_SIZES = [
  "1-5 employees",
  "6-25 employees",
  "26-50 employees",
  "51-100 employees",
  "101-250 employees",
  "250+ employees",
];

export default function BetaSignupForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    const form = e.currentTarget;
    const fd = new FormData(form);

    // Honeypot check (client-side, server also checks)
    if (fd.get("website")) {
      setLoading(false);
      setSuccess(true);
      return;
    }

    const body = {
      name: fd.get("name") as string,
      email: fd.get("email") as string,
      company_name: fd.get("company_name") as string,
      company_type: fd.get("company_type") as string,
      company_size: fd.get("company_size") as string,
      role: fd.get("role") as string,
      biggest_pain: fd.get("biggest_pain") as string,
      phone: fd.get("phone") as string,
    };

    try {
      const res = await fetch("/api/beta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 409) {
        setError("Looks like you've already applied! We'll be in touch soon.");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }

      setSuccess(true);
      form.reset();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="beta-form" onSubmit={handleSubmit}>
      {success && (
        <div className="beta-alert beta-alert-success">
          Application submitted! We&apos;ll reach out within 48 hours to get you set up.
        </div>
      )}
      {error && <div className="beta-alert beta-alert-error">{error}</div>}

      {/* Honeypot */}
      <div className="beta-honeypot" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="beta-form-row">
        <div className="beta-field">
          <label htmlFor="beta-name">Full Name *</label>
          <input id="beta-name" name="name" type="text" required placeholder="Jane Smith" />
        </div>
        <div className="beta-field">
          <label htmlFor="beta-email">Work Email *</label>
          <input id="beta-email" name="email" type="email" required placeholder="jane@company.com" />
        </div>
      </div>

      <div className="beta-form-row">
        <div className="beta-field">
          <label htmlFor="beta-company">Company Name *</label>
          <input id="beta-company" name="company_name" type="text" required placeholder="Acme Construction" />
        </div>
        <div className="beta-field">
          <label htmlFor="beta-type">Company Type *</label>
          <select id="beta-type" name="company_type" required defaultValue="">
            <option value="" disabled>Select type...</option>
            {COMPANY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="beta-form-row">
        <div className="beta-field">
          <label htmlFor="beta-size">Company Size</label>
          <select id="beta-size" name="company_size" defaultValue="">
            <option value="">Select size...</option>
            {COMPANY_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="beta-field">
          <label htmlFor="beta-role">Your Role</label>
          <input id="beta-role" name="role" type="text" placeholder="e.g. Project Manager" />
        </div>
      </div>

      <div className="beta-field">
        <label htmlFor="beta-pain">Biggest Software Pain Point</label>
        <textarea
          id="beta-pain"
          name="biggest_pain"
          placeholder="What's the most frustrating thing about the software you use today?"
        />
      </div>

      <div className="beta-field">
        <label htmlFor="beta-phone">Phone</label>
        <input id="beta-phone" name="phone" type="tel" placeholder="(555) 123-4567" />
      </div>

      <button type="submit" className="beta-submit" disabled={loading}>
        {loading && <span className="beta-spinner" />}
        {loading ? "Submitting..." : "Apply for Founding Membership"}
      </button>
    </form>
  );
}
