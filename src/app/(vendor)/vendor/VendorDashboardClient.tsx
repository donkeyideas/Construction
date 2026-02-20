"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  FolderOpen,
  User,
  Mail,
  Briefcase,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import type {
  VendorDashboardFull,
  VendorActiveProject,
  VendorRecentInvoice,
  VendorCertification,
  VendorContractItem,
  VendorDocumentItem,
} from "@/lib/queries/vendor-portal";

interface Props {
  dashboard: VendorDashboardFull;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getProjectInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "paid":
      return { label: "Paid", className: "vendor-badge vendor-badge-green" };
    case "approved":
      return { label: "Approved", className: "vendor-badge vendor-badge-blue" };
    case "submitted":
    case "pending":
      return { label: status === "submitted" ? "Submitted" : "Pending", className: "vendor-badge vendor-badge-amber" };
    case "overdue":
      return { label: "Overdue", className: "vendor-badge vendor-badge-red" };
    case "draft":
      return { label: "Draft", className: "vendor-badge vendor-badge-amber" };
    default:
      return { label: status, className: "vendor-badge vendor-badge-amber" };
  }
}

function getProjectStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "active":
    case "in_progress":
      return { label: "In Progress", className: "vendor-badge vendor-badge-amber" };
    case "scheduled":
    case "planning":
      return { label: "Scheduled", className: "vendor-badge vendor-badge-blue" };
    case "completed":
      return { label: "Completed", className: "vendor-badge vendor-badge-green" };
    default:
      return { label: status, className: "vendor-badge vendor-badge-blue" };
  }
}

function getCertStatus(expiryDate: string | null): {
  dotColor: string;
  label: string;
  labelColor: string;
  isExpiring: boolean;
} {
  if (!expiryDate) {
    return { dotColor: "var(--green)", label: "On File", labelColor: "var(--green)", isExpiring: false };
  }
  const expiry = new Date(expiryDate);
  const now = new Date();
  const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  if (expiry < now) {
    return { dotColor: "var(--red)", label: "Expired", labelColor: "var(--red)", isExpiring: true };
  }
  if (expiry <= thirtyDays) {
    return { dotColor: "var(--amber)", label: "Expiring Soon", labelColor: "var(--amber)", isExpiring: true };
  }
  return { dotColor: "var(--green)", label: "Current", labelColor: "var(--green)", isExpiring: false };
}

function getContractBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "active":
      return { label: "Active", className: "vendor-badge vendor-badge-green" };
    case "completed":
      return { label: "Completed", className: "vendor-badge vendor-badge-blue" };
    case "draft":
      return { label: "Draft", className: "vendor-badge vendor-badge-amber" };
    case "terminated":
      return { label: "Terminated", className: "vendor-badge vendor-badge-red" };
    default:
      return { label: status, className: "vendor-badge vendor-badge-amber" };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VendorDashboardClient({ dashboard }: Props) {
  const t = useTranslations("vendor");
  const router = useRouter();
  const { contact, activeProjects, recentInvoices, certifications, contracts, documents, stats } = dashboard;

  // Invoice submission form state
  const [invoiceProjectId, setInvoiceProjectId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const contactName =
    contact?.company_name ||
    `${contact?.first_name || ""} ${contact?.last_name || ""}`.trim() ||
    "Vendor";

  const specialty = contact?.job_title || contact?.contact_type || "";

  async function handleSubmitInvoice(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMsg(null);

    const amount = parseFloat(invoiceAmount.replace(/[^0-9.]/g, ""));
    if (!invoiceNumber.trim() || isNaN(amount) || amount <= 0) {
      setSubmitMsg({ type: "error", text: "Please enter a valid invoice number and amount." });
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/vendor/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: invoiceProjectId || null,
          invoice_number: invoiceNumber.trim(),
          amount,
        }),
      });

      if (res.ok) {
        setSubmitMsg({ type: "success", text: `Invoice ${invoiceNumber} submitted successfully!` });
        setInvoiceNumber("");
        setInvoiceAmount("");
        setInvoiceProjectId("");
        router.refresh();
      } else {
        const data = await res.json();
        setSubmitMsg({ type: "error", text: data.error || "Failed to submit invoice." });
      }
    } catch {
      setSubmitMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* ===== Welcome Card ===== */}
      <div className="vendor-welcome-card">
        <h2>Welcome, {contactName}</h2>
        <p>Approved Vendor {specialty ? `— ${specialty}` : ""}</p>
        <div className="vendor-welcome-details">
          <div className="vendor-welcome-detail">
            <Building2 size={16} />
            {stats.activeProjectCount} Active Project{stats.activeProjectCount !== 1 ? "s" : ""}
          </div>
          <div className="vendor-welcome-detail">
            {stats.complianceCurrent ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertTriangle size={16} />
            )}
            Compliance {stats.complianceCurrent ? "Current" : "Needs Attention"}
          </div>
          <span className="vendor-welcome-badge">Approved</span>
        </div>
      </div>

      {/* ===== Two-Column Layout ===== */}
      <div className="vendor-two-col">
        {/* --- Left Column --- */}
        <div>
          {/* Active Projects */}
          <div className="vendor-card">
            <div className="vendor-card-title">
              {t("activeProjectsTitle")}
            </div>
            {activeProjects.length > 0 ? (
              activeProjects.map((proj: VendorActiveProject) => {
                const badge = getProjectStatusBadge(proj.project_status);
                return (
                  <div key={proj.contract_id} className="vendor-project-item">
                    <div className="vendor-project-badge">
                      {getProjectInitials(proj.project_name)}
                    </div>
                    <div className="vendor-project-info">
                      <div className="vendor-project-name">{proj.project_name}</div>
                      <div className="vendor-project-role">{proj.contract_title}</div>
                    </div>
                    <span className={badge.className}>{badge.label}</span>
                  </div>
                );
              })
            ) : (
              <div className="vendor-empty">{t("noProjectsFound")}</div>
            )}
          </div>

          {/* Submit Invoice Form */}
          <div className="vendor-card">
            <div className="vendor-card-title">{t("submitInvoiceTitle")}</div>

            {submitMsg && (
              <div className={submitMsg.type === "success" ? "vendor-msg-success" : "vendor-msg-error"}>
                {submitMsg.text}
              </div>
            )}

            <form onSubmit={handleSubmitInvoice}>
              <div className="vendor-form-group">
                <label className="vendor-form-label">{t("labelProject")}</label>
                <select
                  className="vendor-form-select"
                  value={invoiceProjectId}
                  onChange={(e) => setInvoiceProjectId(e.target.value)}
                >
                  <option value="">— Select Project —</option>
                  {activeProjects.map((proj) => (
                    <option key={proj.project_id} value={proj.project_id}>
                      {proj.project_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="vendor-form-group">
                <label className="vendor-form-label">{t("labelInvoiceNumber")}</label>
                <input
                  type="text"
                  className="vendor-form-input"
                  placeholder="e.g., INV-2026-0045"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  required
                />
              </div>

              <div className="vendor-form-group">
                <label className="vendor-form-label">{t("labelAmount")}</label>
                <input
                  type="text"
                  className="vendor-form-input"
                  placeholder="$0.00"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  required
                />
              </div>

              <div className="vendor-form-group">
                <label className="vendor-form-label">{t("labelAttachFile")}</label>
                <div className="vendor-file-upload">
                  <div className="vendor-file-upload-text">
                    <strong>Click to upload</strong> or drag and drop
                    <br />
                    PDF, PNG, or JPG up to 10MB
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="vendor-btn-primary"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : t("submitInvoiceBtn")}
              </button>
            </form>
          </div>

          {/* My Contracts */}
          <div className="vendor-card">
            <div className="vendor-card-title">
              <FileText size={18} />
              My Contracts
            </div>
            {contracts.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table className="vendor-data-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Contract</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((c: VendorContractItem) => {
                      const badge = getContractBadge(c.status);
                      return (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 600 }}>{c.project_name}</td>
                          <td>{c.title}</td>
                          <td>{formatCurrency(c.amount)}</td>
                          <td>
                            <span className={badge.className}>{badge.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="vendor-empty">No contracts found</div>
            )}
          </div>
        </div>

        {/* --- Right Column --- */}
        <div>
          {/* Invoice & Payment Status Table */}
          <div className="vendor-card">
            <div className="vendor-card-title">
              {t("invoicePaymentStatusTitle")}
            </div>
            {recentInvoices.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table className="vendor-data-table">
                  <thead>
                    <tr>
                      <th>{t("thInvoice")}</th>
                      <th>{t("thProject")}</th>
                      <th>{t("thAmount")}</th>
                      <th>{t("thSubmitted")}</th>
                      <th>{t("thStatus")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInvoices.map((inv: VendorRecentInvoice) => {
                      const badge = getStatusBadge(inv.status);
                      return (
                        <tr key={inv.id}>
                          <td style={{ fontWeight: 600 }}>{inv.invoice_number}</td>
                          <td>{inv.project_name || "—"}</td>
                          <td>{formatCurrency(inv.total_amount)}</td>
                          <td>
                            {inv.invoice_date
                              ? new Date(inv.invoice_date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>
                          <td>
                            <span className={badge.className}>{badge.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="vendor-empty">{t("noInvoicesFound")}</div>
            )}
          </div>

          {/* Compliance & Documents */}
          <div className="vendor-card">
            <div className="vendor-card-title">
              {t("complianceDocsTitle")}
            </div>
            {certifications.length > 0 ? (
              <>
                {certifications.map((cert: VendorCertification) => {
                  const status = getCertStatus(cert.expiry_date);
                  return (
                    <div key={cert.id} className="vendor-compliance-item">
                      <div>
                        <div className="vendor-compliance-name">{cert.cert_name}</div>
                        <div className="vendor-compliance-date">
                          {cert.expiry_date
                            ? `Expires: ${new Date(cert.expiry_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}`
                            : "On File"}
                        </div>
                      </div>
                      <div className="vendor-compliance-status">
                        <span
                          className="vendor-status-dot"
                          style={{ background: status.dotColor }}
                        />
                        <span
                          className="vendor-status-label"
                          style={{ color: status.labelColor }}
                        >
                          {status.label}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Required Documents Checklist */}
                <div className="vendor-docs-checklist">
                  <div className="vendor-docs-checklist-title">{t("requiredDocsTitle")}</div>
                  {certifications.map((cert: VendorCertification) => {
                    const status = getCertStatus(cert.expiry_date);
                    return (
                      <label
                        key={`check-${cert.id}`}
                        className={status.isExpiring ? "needs-attention" : ""}
                      >
                        <input
                          type="checkbox"
                          checked={!status.isExpiring}
                          disabled
                        />
                        {cert.cert_name}
                        {status.isExpiring ? " (renewal needed)" : ""}
                      </label>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="vendor-empty">{t("noCertsFound")}</div>
            )}
          </div>

          {/* Documents */}
          <div className="vendor-card">
            <div className="vendor-card-title">
              <FolderOpen size={18} />
              My Documents
            </div>
            {documents.length > 0 ? (
              documents.map((doc: VendorDocumentItem) => (
                <div key={doc.id} className="vendor-doc-item">
                  <div className="vendor-doc-info">
                    <div className="vendor-doc-icon">
                      <FileText size={16} />
                    </div>
                    <div>
                      <div className="vendor-doc-name">{doc.doc_name}</div>
                      <div className="vendor-doc-meta">
                        {doc.file_type || "Document"}
                        {doc.shared_at &&
                          ` · Shared ${new Date(doc.shared_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}`}
                      </div>
                    </div>
                  </div>
                  {doc.file_path && (
                    <a
                      href={doc.file_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="vendor-doc-download"
                    >
                      Download
                    </a>
                  )}
                </div>
              ))
            ) : (
              <div className="vendor-empty">No documents shared yet</div>
            )}
          </div>

          {/* Profile Card */}
          <div className="vendor-card">
            <div className="vendor-card-title">
              <User size={18} />
              My Profile
            </div>
            {contact ? (
              <div className="vendor-profile-grid">
                <div className="vendor-profile-row">
                  <User size={14} className="vendor-profile-icon" />
                  <div>
                    <div className="vendor-profile-label">Company</div>
                    <div className="vendor-profile-value">{contact.company_name || "—"}</div>
                  </div>
                </div>
                <div className="vendor-profile-row">
                  <Briefcase size={14} className="vendor-profile-icon" />
                  <div>
                    <div className="vendor-profile-label">Contact</div>
                    <div className="vendor-profile-value">
                      {contact.first_name} {contact.last_name}
                    </div>
                  </div>
                </div>
                <div className="vendor-profile-row">
                  <Mail size={14} className="vendor-profile-icon" />
                  <div>
                    <div className="vendor-profile-label">Email</div>
                    <div className="vendor-profile-value">{contact.email || "—"}</div>
                  </div>
                </div>
                {contact.job_title && (
                  <div className="vendor-profile-row">
                    <Briefcase size={14} className="vendor-profile-icon" />
                    <div>
                      <div className="vendor-profile-label">Specialty</div>
                      <div className="vendor-profile-value">{contact.job_title}</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="vendor-empty">No profile information</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
