"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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

function getStatusInfo(status: "valid" | "expiring_soon" | "expired", t: (key: string) => string) {
  switch (status) {
    case "expired":
      return {
        label: t("certifications.expired"),
        className: "inv-status inv-status-overdue",
        icon: XCircle,
        color: "var(--color-red)",
      };
    case "expiring_soon":
      return {
        label: t("certifications.expiringSoon"),
        className: "inv-status inv-status-pending",
        icon: AlertTriangle,
        color: "var(--color-amber)",
      };
    default:
      return {
        label: t("certifications.valid"),
        className: "inv-status inv-status-paid",
        icon: CheckCircle,
        color: "var(--color-green)",
      };
  }
}

export default function CertificationsClient({
  certifications,
}: CertificationsClientProps) {
  const t = useTranslations("employeeDashboard");
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
          <h2>{t("certifications.title")}</h2>
          <p className="fin-header-sub">
            {t("certifications.subtitle")}
          </p>
        </div>
        <button
          className="ui-btn ui-btn-md ui-btn-primary"
          onClick={() => { setShowAdd(true); setAddError(""); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Plus size={15} />
          {t("certifications.addCertification")}
        </button>
      </div>

      {/* Add Certification Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>{t("certifications.addCertification")}</h3>
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
                  <label className="emp-form-label">{t("certifications.certName")} *</label>
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
                  <label className="emp-form-label">{t("certifications.certType")}</label>
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
                  <label className="emp-form-label">{t("certifications.issuingAuthority")}</label>
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
                  <label className="emp-form-label">{t("certifications.certNumber")}</label>
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
                    <label className="emp-form-label">{t("certifications.issueDate")}</label>
                    <input
                      type="date"
                      className="invite-form-input"
                      value={certForm.issued_date}
                      onChange={(e) => setCertForm({ ...certForm, issued_date: e.target.value })}
                      disabled={saving}
                    />
                  </div>
                  <div className="emp-form-field">
                    <label className="emp-form-label">{t("certifications.expiryDate")}</label>
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
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="ui-btn ui-btn-sm ui-btn-primary"
                  disabled={saving}
                >
                  {saving ? t("certifications.saving") : t("certifications.addCertification")}
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
              {t("certifications.valid")}
            </div>
            <div className="emp-summary-value" style={{ color: "var(--color-green)" }}>
              {validCount}
            </div>
          </div>
          <div className="fin-chart-card emp-summary-card">
            <div className="emp-summary-label">
              <AlertTriangle size={14} style={{ color: "var(--color-amber)" }} />
              {t("certifications.expiringSoon")}
            </div>
            <div className="emp-summary-value" style={{ color: "var(--color-amber)" }}>
              {expiringCount}
            </div>
          </div>
          <div className="fin-chart-card emp-summary-card">
            <div className="emp-summary-label">
              <XCircle size={14} style={{ color: "var(--color-red)" }} />
              {t("certifications.expired")}
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
            const statusInfo = getStatusInfo(cert.status, t);
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
                      <span className="emp-cert-detail-label">{t("certifications.issuer")}</span>
                      <span className="emp-cert-detail-value">
                        {cert.issuing_authority}
                      </span>
                    </div>
                  )}
                  {cert.cert_number && (
                    <div className="emp-cert-detail">
                      <span className="emp-cert-detail-label">{t("certifications.number")}</span>
                      <span className="emp-cert-detail-value">
                        {cert.cert_number}
                      </span>
                    </div>
                  )}
                  <div className="emp-cert-detail">
                    <span className="emp-cert-detail-label">{t("certifications.issued")}</span>
                    <span className="emp-cert-detail-value">
                      {formatDate(cert.issued_date)}
                    </span>
                  </div>
                  <div className="emp-cert-detail">
                    <span className="emp-cert-detail-label">{t("certifications.expires")}</span>
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
                      {t("certifications.viewDocument")}
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
            <div className="fin-empty-title">{t("certifications.noCertifications")}</div>
            <div className="fin-empty-desc">
              {t("certifications.noCertificationsDesc")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
