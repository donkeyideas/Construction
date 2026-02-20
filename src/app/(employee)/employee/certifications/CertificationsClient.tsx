"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle,
  ExternalLink,
  Award,
  Plus,
  X,
} from "lucide-react";
import type { EmployeeCertification } from "@/lib/queries/employee-portal";

interface CertificationsClientProps {
  certifications: EmployeeCertification[];
}

function getStatusInfo(status: "valid" | "expiring_soon" | "expired") {
  switch (status) {
    case "expired":
      return {
        label: "Expired",
        className: "inv-status inv-status-overdue",
        icon: XCircle,
        color: "var(--color-red)",
      };
    case "expiring_soon":
      return {
        label: "Expiring Soon",
        className: "inv-status inv-status-pending",
        icon: AlertTriangle,
        color: "var(--color-amber)",
      };
    default:
      return {
        label: "Valid",
        className: "inv-status inv-status-paid",
        icon: CheckCircle,
        color: "var(--color-green)",
      };
  }
}

export default function CertificationsClient({
  certifications,
}: CertificationsClientProps) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [certForm, setCertForm] = useState({
    cert_name: "",
    cert_type: "",
    issuing_authority: "",
    cert_number: "",
    issued_date: "",
    expiry_date: "",
  });

  async function handleAddCert(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAddError("");
    try {
      const res = await fetch("/api/employee/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(certForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add certification");
      }
      setShowAdd(false);
      setCertForm({ cert_name: "", cert_type: "", issuing_authority: "", cert_number: "", issued_date: "", expiry_date: "" });
      router.refresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "--";
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  // Summary counts
  const validCount = certifications.filter((c) => c.status === "valid").length;
  const expiringCount = certifications.filter(
    (c) => c.status === "expiring_soon"
  ).length;
  const expiredCount = certifications.filter(
    (c) => c.status === "expired"
  ).length;

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>My Certifications</h2>
          <p className="fin-header-sub">
            Track your licenses, certifications, and training
          </p>
        </div>
        <button
          className="ui-btn ui-btn-md ui-btn-primary"
          onClick={() => { setShowAdd(true); setAddError(""); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Plus size={15} />
          Add Certification
        </button>
      </div>

      {/* Add Certification Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>Add Certification</h3>
              <button className="modal-close" onClick={() => setShowAdd(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddCert}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {addError && (
                  <div className="emp-alert emp-alert-error">{addError}</div>
                )}
                <div className="emp-form-field">
                  <label className="emp-form-label">Certification Name *</label>
                  <input
                    type="text"
                    className="invite-form-input"
                    value={certForm.cert_name}
                    onChange={(e) => setCertForm({ ...certForm, cert_name: e.target.value })}
                    placeholder="e.g. OSHA 30-Hour Construction"
                    required
                    disabled={saving}
                  />
                </div>
                <div className="emp-form-field">
                  <label className="emp-form-label">Certification Type</label>
                  <input
                    type="text"
                    className="invite-form-input"
                    value={certForm.cert_type}
                    onChange={(e) => setCertForm({ ...certForm, cert_type: e.target.value })}
                    placeholder="e.g. Safety, License, Training"
                    disabled={saving}
                  />
                </div>
                <div className="emp-form-field">
                  <label className="emp-form-label">Issuing Authority</label>
                  <input
                    type="text"
                    className="invite-form-input"
                    value={certForm.issuing_authority}
                    onChange={(e) => setCertForm({ ...certForm, issuing_authority: e.target.value })}
                    placeholder="e.g. OSHA, State Board"
                    disabled={saving}
                  />
                </div>
                <div className="emp-form-field">
                  <label className="emp-form-label">Certificate Number</label>
                  <input
                    type="text"
                    className="invite-form-input"
                    value={certForm.cert_number}
                    onChange={(e) => setCertForm({ ...certForm, cert_number: e.target.value })}
                    placeholder="e.g. CERT-12345"
                    disabled={saving}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div className="emp-form-field">
                    <label className="emp-form-label">Issue Date</label>
                    <input
                      type="date"
                      className="invite-form-input"
                      value={certForm.issued_date}
                      onChange={(e) => setCertForm({ ...certForm, issued_date: e.target.value })}
                      disabled={saving}
                    />
                  </div>
                  <div className="emp-form-field">
                    <label className="emp-form-label">Expiry Date</label>
                    <input
                      type="date"
                      className="invite-form-input"
                      value={certForm.expiry_date}
                      onChange={(e) => setCertForm({ ...certForm, expiry_date: e.target.value })}
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="ui-btn ui-btn-sm ui-btn-outline"
                  onClick={() => setShowAdd(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ui-btn ui-btn-sm ui-btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Add Certification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {certifications.length > 0 && (
        <div className="emp-cert-summary">
          <div className="fin-chart-card emp-summary-card">
            <div className="emp-summary-label">
              <CheckCircle size={14} style={{ color: "var(--color-green)" }} />
              Valid
            </div>
            <div className="emp-summary-value" style={{ color: "var(--color-green)" }}>
              {validCount}
            </div>
          </div>
          <div className="fin-chart-card emp-summary-card">
            <div className="emp-summary-label">
              <AlertTriangle size={14} style={{ color: "var(--color-amber)" }} />
              Expiring Soon
            </div>
            <div className="emp-summary-value" style={{ color: "var(--color-amber)" }}>
              {expiringCount}
            </div>
          </div>
          <div className="fin-chart-card emp-summary-card">
            <div className="emp-summary-label">
              <XCircle size={14} style={{ color: "var(--color-red)" }} />
              Expired
            </div>
            <div className="emp-summary-value" style={{ color: "var(--color-red)" }}>
              {expiredCount}
            </div>
          </div>
        </div>
      )}

      {certifications.length > 0 ? (
        <div className="emp-cert-grid">
          {certifications.map((cert) => {
            const statusInfo = getStatusInfo(cert.status);
            const StatusIcon = statusInfo.icon;

            return (
              <div key={cert.id} className="fin-chart-card emp-cert-card">
                <div className="emp-cert-card-header">
                  <div className="emp-cert-card-icon">
                    <Award size={20} style={{ color: statusInfo.color }} />
                  </div>
                  <div className="emp-cert-card-info">
                    <div className="emp-cert-card-name">{cert.cert_name}</div>
                    {cert.cert_type && (
                      <div className="emp-cert-card-type">{cert.cert_type}</div>
                    )}
                  </div>
                  <span className={statusInfo.className}>
                    <StatusIcon size={12} />
                    {statusInfo.label}
                  </span>
                </div>

                <div className="emp-cert-card-details">
                  {cert.issuing_authority && (
                    <div className="emp-cert-detail">
                      <span className="emp-cert-detail-label">Issuer</span>
                      <span className="emp-cert-detail-value">
                        {cert.issuing_authority}
                      </span>
                    </div>
                  )}
                  {cert.cert_number && (
                    <div className="emp-cert-detail">
                      <span className="emp-cert-detail-label">Number</span>
                      <span className="emp-cert-detail-value">
                        {cert.cert_number}
                      </span>
                    </div>
                  )}
                  <div className="emp-cert-detail">
                    <span className="emp-cert-detail-label">Issued</span>
                    <span className="emp-cert-detail-value">
                      {formatDate(cert.issued_date)}
                    </span>
                  </div>
                  <div className="emp-cert-detail">
                    <span className="emp-cert-detail-label">Expires</span>
                    <span
                      className="emp-cert-detail-value"
                      style={{
                        color:
                          cert.status === "expired"
                            ? "var(--color-red)"
                            : cert.status === "expiring_soon"
                              ? "var(--color-amber)"
                              : undefined,
                        fontWeight: cert.status !== "valid" ? 600 : undefined,
                      }}
                    >
                      {formatDate(cert.expiry_date)}
                    </span>
                  </div>
                </div>

                {cert.document_url && (
                  <div className="emp-cert-card-footer">
                    <a
                      href={cert.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ui-btn ui-btn-sm ui-btn-ghost"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: "0.78rem",
                      }}
                    >
                      <ExternalLink size={13} />
                      View Document
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <ShieldCheck size={48} />
            </div>
            <div className="fin-empty-title">No Certifications Found</div>
            <div className="fin-empty-desc">
              Your certifications and licenses will appear here once they are
              added to your profile.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
