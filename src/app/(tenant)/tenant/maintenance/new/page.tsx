"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

export default function SubmitMaintenanceRequestPage() {
  const t = useTranslations("tenant");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const CATEGORIES = [
    { value: "plumbing", label: t("catPlumbing") },
    { value: "electrical", label: t("catElectrical") },
    { value: "hvac", label: t("catHvac") },
    { value: "appliance", label: t("catAppliance") },
    { value: "structural", label: t("catStructural") },
    { value: "general", label: t("catGeneral") },
  ];

  const PRIORITIES = [
    { value: "low", label: t("priLowDesc") },
    { value: "medium", label: t("priMediumDesc") },
    { value: "high", label: t("priHighDesc") },
    { value: "emergency", label: t("priEmergencyDesc") },
  ];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError(t("titleRequiredError"));
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/tenant/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category, priority }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("failedSubmitRequest"));
      }

      router.push("/tenant/maintenance");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("somethingWentWrong"));
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", fontWeight: 700, margin: 0 }}>
          {t("submitMaintenanceTitle")}
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 2 }}>
          {t("submitMaintenanceSubtitle")}
        </p>
      </div>

      <div className="card" style={{ maxWidth: 640, padding: 24 }}>
        <Link
          href="/tenant/maintenance"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: "0.82rem",
            color: "var(--color-blue)",
            textDecoration: "none",
            marginBottom: 20,
          }}
        >
          <ArrowLeft size={14} />
          {t("backToRequests")}
        </Link>

        {error && (
          <div className="tenant-alert tenant-alert-error">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="tenant-field">
            <label htmlFor="title" className="tenant-label">
              {t("issueTitle")}
            </label>
            <input
              id="title"
              type="text"
              className="tenant-form-input"
              placeholder={t("issuePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            <div className="tenant-field">
              <label htmlFor="category" className="tenant-label">
                {t("category")}
              </label>
              <select
                id="category"
                className="tenant-form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={submitting}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="tenant-field">
              <label htmlFor="priority" className="tenant-label">
                {t("priority")}
              </label>
              <select
                id="priority"
                className="tenant-form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={submitting}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="tenant-field">
            <label htmlFor="description" className="tenant-label">
              {t("description")}
            </label>
            <textarea
              id="description"
              className="tenant-form-input"
              placeholder={t("descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              style={{ resize: "vertical" }}
              disabled={submitting}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "flex-end",
              marginTop: 8,
            }}
          >
            <Link
              href="/tenant/maintenance"
              className="ui-btn ui-btn-md ui-btn-outline"
              style={{ textDecoration: "none" }}
            >
              {t("cancel")}
            </Link>
            <button
              type="submit"
              className="ui-btn ui-btn-md ui-btn-primary"
              disabled={submitting}
            >
              {submitting ? t("submitting") : t("submitRequestBtn")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
