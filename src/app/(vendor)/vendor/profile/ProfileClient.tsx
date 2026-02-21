"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Save, ShieldCheck, AlertTriangle, XCircle } from "lucide-react";
import "@/styles/vendor-detail.css";

interface ContactData {
  id: string;
  company_name: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
}

interface Cert {
  id: string;
  cert_name: string;
  cert_type: string | null;
  expiry_date: string | null;
}

export default function ProfileClient({
  contact,
  certifications,
}: {
  contact: ContactData;
  certifications: Cert[];
}) {
  const router = useRouter();
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";
  const now = new Date();

  const [form, setForm] = useState({
    company_name: contact.company_name || "",
    first_name: contact.first_name || "",
    last_name: contact.last_name || "",
    email: contact.email || "",
    phone: contact.phone || "",
    job_title: contact.job_title || "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/vendor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile");
      }

      setMessage({ type: "success", text: "Profile updated successfully." });
      router.refresh();
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to update profile" });
    } finally {
      setSaving(false);
    }
  }

  function getCertStatus(cert: Cert) {
    if (!cert.expiry_date) return { label: "No Expiry", color: "var(--muted)", Icon: ShieldCheck };
    const exp = new Date(cert.expiry_date);
    if (exp < now) return { label: "Expired", color: "var(--color-red)", Icon: XCircle };
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    if (exp <= thirtyDays) return { label: "Expiring Soon", color: "var(--color-amber)", Icon: AlertTriangle };
    return { label: "Current", color: "var(--color-green)", Icon: ShieldCheck };
  }

  return (
    <div>
      <div className="vd-header">
        <div className="vd-header-left">
          <h2>My Profile</h2>
          <span className="vd-header-sub">Manage your contact information</span>
        </div>
      </div>

      {message && (
        <div className={`vd-msg ${message.type === "success" ? "vd-msg-success" : "vd-msg-error"}`}>
          {message.text}
        </div>
      )}

      <div className="vd-section">
        <div className="vd-section-title">Contact Information</div>
        <form onSubmit={handleSave}>
          <div className="vd-profile-form">
            <div className="vd-form-group">
              <label className="vd-form-label">Company Name</label>
              <input
                type="text"
                className="vd-form-input"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              />
            </div>
            <div className="vd-form-group">
              <label className="vd-form-label">Job Title</label>
              <input
                type="text"
                className="vd-form-input"
                value={form.job_title}
                onChange={(e) => setForm({ ...form, job_title: e.target.value })}
              />
            </div>
            <div className="vd-form-group">
              <label className="vd-form-label">First Name</label>
              <input
                type="text"
                className="vd-form-input"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                required
              />
            </div>
            <div className="vd-form-group">
              <label className="vd-form-label">Last Name</label>
              <input
                type="text"
                className="vd-form-input"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                required
              />
            </div>
            <div className="vd-form-group">
              <label className="vd-form-label">Email</label>
              <input
                type="email"
                className="vd-form-input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="vd-form-group">
              <label className="vd-form-label">Phone</label>
              <input
                type="text"
                className="vd-form-input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="vd-form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={16} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Certifications */}
      <div className="vd-section">
        <div className="vd-section-title">Certifications</div>
        {certifications.length === 0 ? (
          <div className="vd-table-empty">No certifications on file</div>
        ) : (
          <table className="vd-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Expiry</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {certifications.map((cert) => {
                const st = getCertStatus(cert);
                return (
                  <tr key={cert.id}>
                    <td style={{ fontWeight: 500 }}>{cert.cert_name}</td>
                    <td style={{ textTransform: "capitalize" }}>{cert.cert_type || "\u2014"}</td>
                    <td>{cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString(dateLocale) : "\u2014"}</td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: st.color, fontWeight: 600, fontSize: "0.8rem" }}>
                        <st.Icon size={14} />
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
