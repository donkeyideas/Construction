"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const CATEGORIES = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "HVAC / Heating & Cooling" },
  { value: "appliance", label: "Appliance" },
  { value: "structural", label: "Structural" },
  { value: "general", label: "General / Other" },
];

const PRIORITIES = [
  { value: "low", label: "Low — Cosmetic or minor issue" },
  { value: "medium", label: "Medium — Needs attention soon" },
  { value: "high", label: "High — Affects daily living" },
  { value: "emergency", label: "Emergency — Safety hazard or no water/heat" },
];

export default function SubmitMaintenanceRequestPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a title for your request.");
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
        throw new Error(data.error || "Failed to submit request");
      }

      router.push("/tenant/maintenance");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>Submit Maintenance Request</h2>
          <p className="fin-header-sub">Report a maintenance issue for your unit.</p>
        </div>
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
          Back to Requests
        </Link>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(239,68,68,0.1)",
              color: "var(--color-red)",
              fontSize: "0.85rem",
              marginBottom: 16,
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="title"
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "var(--muted)",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Issue Title *
            </label>
            <input
              id="title"
              type="text"
              className="invite-form-input"
              placeholder="e.g., Leaking faucet in bathroom"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label
                htmlFor="category"
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: "var(--muted)",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Category
              </label>
              <select
                id="category"
                className="invite-form-select"
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

            <div>
              <label
                htmlFor="priority"
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: "var(--muted)",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Priority
              </label>
              <select
                id="priority"
                className="invite-form-select"
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

          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="description"
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "var(--muted)",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Description
            </label>
            <textarea
              id="description"
              className="invite-form-input"
              placeholder="Describe the issue in detail — what happened, where exactly, when it started..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              style={{ resize: "vertical" }}
              disabled={submitting}
            />
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <Link
              href="/tenant/maintenance"
              className="ui-btn ui-btn-md ui-btn-outline"
              style={{ textDecoration: "none" }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="ui-btn ui-btn-md ui-btn-primary"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
