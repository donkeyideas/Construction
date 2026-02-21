"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Home,
  Calendar,
  Wrench,
  FileText,
  Download,
  Smartphone,
  Landmark,
  CreditCard,
  Mail,
  Wallet,
  Copy,
  Check,
} from "lucide-react";
import type { TenantDashboard } from "@/lib/queries/tenant-portal";
import { formatCurrency } from "@/lib/utils/format";
import { useTranslations, useLocale } from "next-intl";

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "paid":
    case "completed":
    case "resolved":
      return "badge badge-green";
    case "submitted":
    case "pending":
      return "badge badge-blue";
    case "in_progress":
    case "assigned":
      return "badge badge-amber";
    case "overdue":
    case "rejected":
      return "badge badge-red";
    default:
      return "badge badge-blue";
  }
}

function statusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function TenantDashboardClient({
  dashboard,
}: {
  dashboard: TenantDashboard;
}) {
  const t = useTranslations("tenant");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [nextDueDate, setNextDueDate] = useState("--");

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(dateLocale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  useEffect(() => {
    const now = new Date();
    const day = 15;
    let next = new Date(now.getFullYear(), now.getMonth(), day);
    if (next <= now) {
      next = new Date(now.getFullYear(), now.getMonth() + 1, day);
    }
    setNextDueDate(
      next.toLocaleDateString(dateLocale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    );
  }, [dateLocale]);

  function getMethodIcon(type: string) {
    switch (type) {
      case "zelle":
      case "cashapp":
      case "venmo":
        return <Smartphone size={18} />;
      case "wire":
        return <Landmark size={18} />;
      case "paypal":
        return <CreditCard size={18} />;
      case "check":
        return <Mail size={18} />;
      default:
        return <Wallet size={18} />;
    }
  }

  function handleCopy(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleDocDownload(documentId: string) {
    try {
      const res = await fetch(`/api/tenant/documents/${documentId}/download`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || t("failedDownload"));
        return;
      }
      window.open(data.url, "_blank");
    } catch {
      alert(t("downloadError"));
    }
  }

  const { lease } = dashboard;

  return (
    <div>
      {/* Welcome Banner */}
      <div className="tenant-welcome">
        <h2>{t("welcomeName", { name: dashboard.fullName ?? t("defaultTenant") })}</h2>
        {lease ? (
          <>
            <p>
              {t("unitAt", { unit: lease.unit_name, property: lease.property_name })}
            </p>
            <div className="tenant-welcome-details">
              <div className="tenant-welcome-detail">
                <Home size={16} />
                {lease.property_name}
              </div>
              <div className="tenant-welcome-detail">
                <Calendar size={16} />
                {t("leaseActive")}
              </div>
              <span className="tenant-welcome-badge">
                {statusLabel(lease.status)}
              </span>
            </div>
          </>
        ) : (
          <p>{t("noActiveLeaseMsg")}</p>
        )}
      </div>

      {/* No lease — show empty state */}
      {!lease ? (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <Home
            size={48}
            style={{ color: "var(--muted)", marginBottom: 12 }}
          />
          <h3 style={{ margin: "0 0 8px 0", fontSize: "1rem" }}>
            {t("noActiveLeaseTitle")}
          </h3>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--muted)",
              margin: 0,
            }}
          >
            {t("noActiveLeaseDesc")}
          </p>
        </div>
      ) : (
        <div className="tenant-two-col">
          {/* ===== LEFT COLUMN ===== */}
          <div>
            {/* Lease Details */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-title">{t("leaseDetails")}</div>
              <div className="tenant-detail-grid">
                <div>
                  <div className="tenant-detail-item-label">{t("moveInDate")}</div>
                  <div className="tenant-detail-item-value">
                    {formatDate(lease.lease_start)}
                  </div>
                </div>
                <div>
                  <div className="tenant-detail-item-label">{t("leaseEnd")}</div>
                  <div className="tenant-detail-item-value">
                    {formatDate(lease.lease_end)}
                  </div>
                </div>
                <div>
                  <div className="tenant-detail-item-label">{t("monthlyRent")}</div>
                  <div className="tenant-detail-item-value highlight">
                    {formatCurrency(lease.monthly_rent)}
                  </div>
                </div>
                <div>
                  <div className="tenant-detail-item-label">
                    {t("securityDeposit")}
                  </div>
                  <div className="tenant-detail-item-value">
                    {lease.security_deposit != null
                      ? formatCurrency(lease.security_deposit)
                      : "--"}
                  </div>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <div className="tenant-detail-item-label">
                    {t("nextPaymentDue")}
                  </div>
                  <div
                    className="tenant-detail-item-value"
                    style={{
                      color: "var(--color-amber)",
                      fontWeight: 600,
                    }}
                  >
                    {nextDueDate}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment History */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-title">{t("paymentHistory")}</div>
              {dashboard.recentPayments.length > 0 ? (
                <table className="tenant-data-table">
                  <thead>
                    <tr>
                      <th>{t("thDate")}</th>
                      <th>{t("thAmount")}</th>
                      <th>{t("thStatus")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.recentPayments.map((p) => (
                      <tr key={p.id}>
                        <td>{formatDate(p.payment_date)}</td>
                        <td>{formatCurrency(p.amount)}</td>
                        <td>
                          <span className={statusBadgeClass(p.status)}>
                            {statusLabel(p.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--muted)",
                    textAlign: "center",
                    padding: "16px 0",
                  }}
                >
                  {t("noPaymentsYet")}
                </p>
              )}
            </div>

            {/* How to Pay */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-title">{t("howToPay")}</div>
              {dashboard.paymentMethods.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {dashboard.paymentMethods.map((pm) => (
                    <div
                      key={pm.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "12px",
                        borderRadius: 8,
                        background: "var(--bg-secondary)",
                      }}
                    >
                      <div
                        style={{
                          flexShrink: 0,
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: "var(--bg-tertiary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--color-primary)",
                        }}
                      >
                        {getMethodIcon(pm.method_type)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                          {pm.label}
                        </div>
                        <div
                          style={{
                            fontSize: "0.82rem",
                            color: "var(--muted)",
                            marginTop: 2,
                          }}
                        >
                          {pm.instructions}
                        </div>
                        {pm.recipient_info && (
                          <button
                            onClick={() => handleCopy(pm.id, pm.recipient_info!)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              marginTop: 6,
                              padding: "4px 10px",
                              borderRadius: 6,
                              border: "1px solid var(--border)",
                              background: "var(--bg-tertiary)",
                              color: copiedId === pm.id ? "var(--color-green)" : "var(--text)",
                              cursor: "pointer",
                              fontSize: "0.8rem",
                            }}
                          >
                            {copiedId === pm.id ? (
                              <>
                                <Check size={12} />
                                {t("copied")}
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                {pm.recipient_info}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--muted)",
                    textAlign: "center",
                    padding: "16px 0",
                  }}
                >
                  {t("contactManagerForPayment")}
                </p>
              )}
            </div>
          </div>

          {/* ===== RIGHT COLUMN ===== */}
          <div>
            {/* Maintenance Requests */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-title">
                {t("maintenanceRequests")}
                {dashboard.openMaintenanceCount > 0 && (
                  <span className="badge badge-amber">
                    {t("activeCount", { count: dashboard.openMaintenanceCount })}
                  </span>
                )}
              </div>
              {dashboard.maintenanceRequests.length > 0 ? (
                dashboard.maintenanceRequests.map((req) => (
                  <div key={req.id} className="tenant-request-item">
                    <div className="tenant-request-icon">
                      <Wrench size={18} />
                    </div>
                    <div className="tenant-request-info">
                      <div className="tenant-request-title">{req.title}</div>
                      <div className="tenant-request-meta">
                        {t("submittedDate", { date: formatDate(req.created_at) })}
                      </div>
                    </div>
                    <span className={statusBadgeClass(req.status)}>
                      {statusLabel(req.status)}
                    </span>
                  </div>
                ))
              ) : (
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--muted)",
                    textAlign: "center",
                    padding: "16px 0",
                  }}
                >
                  {t("noRequestsSubmitted")}
                </p>
              )}
              <Link
                href="/tenant/maintenance/new"
                className="ui-btn ui-btn-md ui-btn-outline"
                style={{
                  width: "100%",
                  marginTop: 14,
                  display: "block",
                  textAlign: "center",
                  textDecoration: "none",
                }}
              >
                {t("newRequest")}
              </Link>
            </div>

            {/* Documents */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-title">{t("documents")}</div>
              {dashboard.documents.length > 0 ? (
                <>
                  {dashboard.documents.map((doc) => (
                    <div key={doc.id} className="tenant-doc-item">
                      <div className="tenant-doc-info">
                        <div className="tenant-doc-icon">
                          <FileText size={16} />
                        </div>
                        <div>
                          <div className="tenant-doc-name">
                            {doc.doc_name}
                          </div>
                          <div className="tenant-doc-size">
                            {doc.file_type?.toUpperCase() || "DOC"} &mdash;{" "}
                            {formatFileSize(doc.file_size)}
                          </div>
                        </div>
                      </div>
                      <button
                        className="tenant-doc-download"
                        onClick={() => handleDocDownload(doc.document_id)}
                      >
                        <Download size={14} style={{ marginRight: 4 }} />
                        {t("download")}
                      </button>
                    </div>
                  ))}
                  {dashboard.documents.length >= 3 && (
                    <Link
                      href="/tenant/documents"
                      className="view-all"
                      style={{
                        display: "block",
                        textAlign: "center",
                        marginTop: 12,
                      }}
                    >
                      {t("viewAllDocuments")}
                    </Link>
                  )}
                </>
              ) : (
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--muted)",
                    textAlign: "center",
                    padding: "16px 0",
                  }}
                >
                  {t("noDocumentsShared")}
                </p>
              )}
            </div>

            {/* Building Announcements */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-title">{t("buildingAnnouncements")}</div>
              {dashboard.announcements.length > 0 ? (
                dashboard.announcements.map((ann) => (
                  <div key={ann.id} className="tenant-announce-item">
                    <div className="tenant-announce-date">
                      {formatDate(ann.published_at)}
                    </div>
                    <div className="tenant-announce-text">
                      {ann.content || ann.title}
                    </div>
                  </div>
                ))
              ) : (
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--muted)",
                    textAlign: "center",
                    padding: "16px 0",
                  }}
                >
                  {t("noAnnouncements")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

}
