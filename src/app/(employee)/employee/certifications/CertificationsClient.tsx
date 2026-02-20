"use client";

import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle,
  ExternalLink,
  Award,
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
      </div>

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
