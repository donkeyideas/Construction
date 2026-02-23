"use client";

import { useState } from "react";

const SUBJECT_OPTIONS = [
  "General Inquiry",
  "Sales",
  "Support",
  "Partnership",
  "Other",
];

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [subject, setSubject] = useState("General Inquiry");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setSaving(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "contact",
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          company_name: company.trim() || null,
          subject,
          message: message.trim(),
          website, // honeypot
        }),
      });

      if (res.ok) {
        setResult({
          type: "success",
          text: "Thank you! Your message has been sent. We'll get back to you soon.",
        });
        setName("");
        setEmail("");
        setPhone("");
        setCompany("");
        setSubject("General Inquiry");
        setMessage("");
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
    <section className="contact-form-section">
      <h2 className="contact-form-title">Send Us a Message</h2>
      <p className="contact-form-subtitle">
        Fill out the form below and we&apos;ll get back to you within 24 hours.
      </p>

      {result && (
        <div className={`contact-form-alert contact-form-alert-${result.type}`}>
          {result.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="contact-form">
        {/* Honeypot — hidden from real users */}
        <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        <div className="contact-form-row">
          <div className="contact-form-field">
            <label htmlFor="cf-name">Name *</label>
            <input
              id="cf-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
          </div>
          <div className="contact-form-field">
            <label htmlFor="cf-email">Email *</label>
            <input
              id="cf-email"
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
            <label htmlFor="cf-phone">Phone</label>
            <input
              id="cf-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="contact-form-field">
            <label htmlFor="cf-company">Company</label>
            <input
              id="cf-company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Your company name"
            />
          </div>
        </div>

        <div className="contact-form-field">
          <label htmlFor="cf-subject">Subject</label>
          <select
            id="cf-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            {SUBJECT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="contact-form-field">
          <label htmlFor="cf-message">Message *</label>
          <textarea
            id="cf-message"
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="How can we help you?"
          />
        </div>

        <button
          type="submit"
          className="contact-form-submit"
          disabled={saving}
        >
          {saving ? "Sending..." : "Send Message"}
        </button>
      </form>
    </section>
  );
}
