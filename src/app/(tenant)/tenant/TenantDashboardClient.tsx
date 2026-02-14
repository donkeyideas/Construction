"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Home,
  Calendar,
  Wrench,
  FileText,
  Download,
} from "lucide-react";
import type { TenantDashboard } from "@/lib/queries/tenant-portal";
import { formatCurrency } from "@/lib/utils/format";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
  const [paymentAlert, setPaymentAlert] = useState("");
  const [nextDueDate, setNextDueDate] = useState("--");

  useEffect(() => {
    const now = new Date();
    const day = 15;
    let next = new Date(now.getFullYear(), now.getMonth(), day);
    if (next <= now) {
      next = new Date(now.getFullYear(), now.getMonth() + 1, day);
    }
    setNextDueDate(
      next.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    );
  }, []);

  function handlePayNow() {
    setPaymentAlert("Online payment processing coming soon. Please contact your property manager.");
    setTimeout(() => setPaymentAlert(""), 5000);
  }

  async function handleDocDownload(documentId: string) {
    try {
      const res = await fetch(`/api/tenant/documents/${documentId}/download`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to get download link");
        return;
      }
      window.open(data.url, "_blank");
    } catch {
      alert("Something went wrong. Please try again.");
    }
  }

  const { lease } = dashboard;

  return (
    <div>
      {/* Welcome Banner */}
      <div className="tenant-welcome">
        <h2>Welcome, {dashboard.fullName ?? "Tenant"}</h2>
        {lease ? (
          <>
            <p>
              Unit {lease.unit_name} at {lease.property_name}
            </p>
            <div className="tenant-welcome-details">
              <div className="tenant-welcome-detail">
                <Home size={16} />
                {lease.property_name}
              </div>
              <div className="tenant-welcome-detail">
                <Calendar size={16} />
                Lease Active
              </div>
              <span className="tenant-welcome-badge">
                {statusLabel(lease.status)}
              </span>
            </div>
          </>
        ) : (
          <p>No active lease on file.</p>
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
            No Active Lease
          </h3>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--muted)",
              margin: 0,
            }}
          >
            You do not have an active lease on file. Please contact your
            property manager for assistance.
          </p>
        </div>
      ) : (
        <div className="tenant-two-col">
          {/* ===== LEFT COLUMN ===== */}
          <div>
            {/* Lease Details */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-title">Lease Details</div>
              <div className="tenant-detail-grid">
                <div>
                  <div className="tenant-detail-item-label">Move-in Date</div>
                  <div className="tenant-detail-item-value">
                    {formatDate(lease.lease_start)}
                  </div>
                </div>
                <div>
                  <div className="tenant-detail-item-label">Lease End</div>
                  <div className="tenant-detail-item-value">
                    {formatDate(lease.lease_end)}
                  </div>
                </div>
                <div>
                  <div className="tenant-detail-item-label">Monthly Rent</div>
                  <div className="tenant-detail-item-value highlight">
                    {formatCurrency(lease.monthly_rent)}
                  </div>
                </div>
                <div>
                  <div className="tenant-detail-item-label">
                    Security Deposit
                  </div>
                  <div className="tenant-detail-item-value">
                    {lease.security_deposit != null
                      ? formatCurrency(lease.security_deposit)
                      : "--"}
                  </div>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <div className="tenant-detail-item-label">
                    Next Payment Due
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
              <div className="card-title">Payment History</div>
              {dashboard.recentPayments.length > 0 ? (
                <table className="tenant-data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
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
                  No payments recorded yet.
                </p>
              )}
            </div>

            {/* Make a Payment */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-title">Make a Payment</div>
              {paymentAlert && (
                <div className="tenant-alert tenant-alert-success">
                  {paymentAlert}
                </div>
              )}
              <div className="tenant-field">
                <label className="tenant-label">Amount</label>
                <input
                  type="text"
                  className="tenant-form-input"
                  defaultValue={formatCurrency(lease.monthly_rent)}
                  readOnly
                />
              </div>
              <div className="tenant-field">
                <label className="tenant-label">Payment Method</label>
                <select className="tenant-form-select">
                  <option>Bank Transfer (ACH)</option>
                  <option>Credit Card</option>
                  <option>Check</option>
                </select>
              </div>
              <button
                className="tenant-btn-primary"
                style={{ marginTop: 8 }}
                onClick={handlePayNow}
              >
                Pay Now
              </button>
            </div>
          </div>

          {/* ===== RIGHT COLUMN ===== */}
          <div>
            {/* Maintenance Requests */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-title">
                Maintenance Requests
                {dashboard.openMaintenanceCount > 0 && (
                  <span className="badge badge-amber">
                    {dashboard.openMaintenanceCount} Active
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
                        Submitted {formatDate(req.created_at)}
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
                  No requests submitted.
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
                + New Request
              </Link>
            </div>

            {/* Documents */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-title">Documents</div>
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
                        Download
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
                      View All Documents
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
                  No documents shared yet.
                </p>
              )}
            </div>

            {/* Building Announcements */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-title">Building Announcements</div>
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
                  No announcements.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

}
