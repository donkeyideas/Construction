"use client";

import { useState, useRef, useCallback } from "react";
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
  Upload,
  Pencil,
  X,
  Phone,
  DollarSign,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Image,
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

const PAGE_SIZE = 3;

function PaginationControls({ page, setPage, totalItems }: { page: number; setPage: (p: number) => void; totalItems: number }) {
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  if (totalPages <= 1) return null;
  return (
    <div className="vendor-pagination">
      <button disabled={page === 0} onClick={() => setPage(page - 1)}>
        <ChevronLeft size={14} /> Prev
      </button>
      <span className="vendor-pagination-info">{page + 1} of {totalPages}</span>
      <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
        Next <ChevronRight size={14} />
      </button>
    </div>
  );
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeLabel(fileType: string | null): string {
  if (!fileType) return "Document";
  if (fileType.includes("pdf")) return "PDF";
  if (fileType.includes("png")) return "PNG Image";
  if (fileType.includes("jpeg") || fileType.includes("jpg")) return "JPEG Image";
  if (fileType.includes("word") || fileType.includes("docx")) return "Word Document";
  if (fileType.includes("excel") || fileType.includes("xlsx") || fileType.includes("spreadsheet")) return "Spreadsheet";
  return fileType.split("/").pop()?.toUpperCase() || "Document";
}

function isPreviewableImage(fileType: string | null): boolean {
  if (!fileType) return false;
  return fileType.startsWith("image/");
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

  // Upload state
  const invoiceFileRef = useRef<HTMLInputElement>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const complianceFileRef = useRef<HTMLInputElement>(null);
  const documentFileRef = useRef<HTMLInputElement>(null);
  const [uploadingCompliance, setUploadingCompliance] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [docUploadMsg, setDocUploadMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Document upload modal state
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docModalFile, setDocModalFile] = useState<File | null>(null);
  const [docModalProject, setDocModalProject] = useState("");
  const [docModalName, setDocModalName] = useState("");
  const [docModalType, setDocModalType] = useState<"general" | "compliance">("general");
  const [docModalUploading, setDocModalUploading] = useState(false);
  const [docModalMsg, setDocModalMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [docModalCertType, setDocModalCertType] = useState("insurance");
  const [docModalExpiryDate, setDocModalExpiryDate] = useState("");
  const docModalFileRef = useRef<HTMLInputElement>(null);

  // Invoice detail modal state
  const [selectedInvoice, setSelectedInvoice] = useState<VendorRecentInvoice | null>(null);
  const [invoicePayments, setInvoicePayments] = useState<Array<{
    id: string;
    payment_date: string;
    amount: number;
    method: string;
    reference_number: string | null;
    notes: string | null;
  }> | null>(null);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    company_name: contact?.company_name || "",
    first_name: contact?.first_name || "",
    last_name: contact?.last_name || "",
    email: contact?.email || "",
    job_title: contact?.job_title || "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Document preview modal state + URL prefetch cache
  const [previewDoc, setPreviewDoc] = useState<VendorDocumentItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const urlCacheRef = useRef<Map<string, string>>(new Map());

  // Pagination state (3 items per page)
  const [invoicePage, setInvoicePage] = useState(0);
  const [contractPage, setContractPage] = useState(0);
  const [complianceDocPage, setComplianceDocPage] = useState(0);
  const [docPage, setDocPage] = useState(0);

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
        // If a file is attached, upload it to the documents library
        if (invoiceFile) {
          try {
            const formData = new FormData();
            formData.append("file", invoiceFile);
            formData.append("doc_type", "general");
            // Use short name: "Invoice INV-123 (original-file.pdf)"
            const ext = invoiceFile.name.split(".").pop() || "";
            formData.append("doc_name", `Invoice ${invoiceNumber.trim()}.${ext}`);
            await fetch("/api/vendor/documents", {
              method: "POST",
              body: formData,
            });
          } catch {
            // Non-blocking — invoice was created, file upload is best-effort
          }
        }
        setSubmitMsg({ type: "success", text: `Invoice ${invoiceNumber} submitted successfully!` });
        setInvoiceNumber("");
        setInvoiceAmount("");
        setInvoiceProjectId("");
        setInvoiceFile(null);
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

  async function handleFileUpload(file: File, docType: "compliance" | "general", setUploading: (v: boolean) => void, setMsg: (v: { type: "success" | "error"; text: string } | null) => void) {
    setUploading(true);
    setMsg(null);

    if (file.size > 10 * 1024 * 1024) {
      setMsg({ type: "error", text: "File too large. Maximum size is 10MB." });
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("doc_type", docType);
    formData.append("doc_name", file.name);

    try {
      const res = await fetch("/api/vendor/documents", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setMsg({ type: "success", text: `"${file.name}" uploaded successfully!` });
        router.refresh();
      } else {
        const data = await res.json();
        setMsg({ type: "error", text: data.error || "Failed to upload file." });
      }
    } catch {
      setMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);

    try {
      const res = await fetch("/api/vendor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });

      if (res.ok) {
        setProfileMsg({ type: "success", text: "Profile updated successfully!" });
        setEditingProfile(false);
        router.refresh();
      } else {
        const data = await res.json();
        setProfileMsg({ type: "error", text: data.error || "Failed to update profile." });
      }
    } catch {
      setProfileMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSavingProfile(false);
    }
  }

  function openDocModal(type: "general" | "compliance") {
    setDocModalType(type);
    setDocModalFile(null);
    setDocModalName("");
    setDocModalProject("");
    setDocModalCertType("insurance");
    setDocModalExpiryDate("");
    setDocModalMsg(null);
    setDocModalOpen(true);
  }

  async function handleDocModalSubmit() {
    if (!docModalFile) return;
    setDocModalUploading(true);
    setDocModalMsg(null);

    if (docModalFile.size > 10 * 1024 * 1024) {
      setDocModalMsg({ type: "error", text: "File too large. Maximum size is 10MB." });
      setDocModalUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", docModalFile);
    formData.append("doc_type", docModalType);
    formData.append("doc_name", docModalName || docModalFile.name);
    if (docModalProject) formData.append("project_id", docModalProject);
    if (docModalType === "compliance") {
      formData.append("cert_type", docModalCertType);
      if (docModalExpiryDate) formData.append("expiry_date", docModalExpiryDate);
    }

    try {
      const res = await fetch("/api/vendor/documents", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setDocModalMsg({ type: "success", text: "Document uploaded successfully!" });
        setTimeout(() => {
          setDocModalOpen(false);
          router.refresh();
        }, 800);
      } else {
        const data = await res.json();
        setDocModalMsg({ type: "error", text: data.error || "Failed to upload document." });
      }
    } catch {
      setDocModalMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setDocModalUploading(false);
    }
  }

  // Prefetch signed URL on hover so it's ready by click time
  const prefetchDocUrl = useCallback((doc: VendorDocumentItem) => {
    if (!doc.document_id || urlCacheRef.current.has(doc.document_id)) return;
    // Mark as in-flight to avoid duplicate fetches
    urlCacheRef.current.set(doc.document_id, "");
    fetch(`/api/vendor/documents/${doc.document_id}/download`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.url) urlCacheRef.current.set(doc.document_id!, data.url);
      })
      .catch(() => {});
  }, []);

  async function openDocPreview(doc: VendorDocumentItem) {
    setPreviewDoc(doc);

    if (!doc.document_id) { setPreviewUrl(null); return; }

    // Check cache first (prefetched on hover)
    const cached = urlCacheRef.current.get(doc.document_id);
    if (cached) {
      setPreviewUrl(cached);
      setLoadingPreview(false);
      return;
    }

    // Not cached yet — fetch now
    setPreviewUrl(null);
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/vendor/documents/${doc.document_id}/download`);
      if (res.ok) {
        const data = await res.json();
        const url = data.url ?? null;
        setPreviewUrl(url);
        if (url) urlCacheRef.current.set(doc.document_id, url);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoadingPreview(false);
    }
  }

  async function openInvoiceDetail(inv: VendorRecentInvoice) {
    setSelectedInvoice(inv);
    setInvoicePayments(null);
    setLoadingPayments(true);

    try {
      const res = await fetch(`/api/vendor/invoices/${inv.id}/payments`);
      if (res.ok) {
        const data = await res.json();
        setInvoicePayments(data.payments ?? []);
      } else {
        setInvoicePayments([]);
      }
    } catch {
      setInvoicePayments([]);
    } finally {
      setLoadingPayments(false);
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
                <div
                  className="vendor-file-upload"
                  style={{ cursor: "pointer" }}
                  onClick={() => invoiceFileRef.current?.click()}
                >
                  <div className="vendor-file-upload-text">
                    {invoiceFile ? (
                      <>{invoiceFile.name}</>
                    ) : (
                      <>
                        <strong style={{ color: "var(--color-blue)" }}>Click to upload</strong> or drag and drop
                        <br />
                        PDF, PNG, or JPG up to 10MB
                      </>
                    )}
                  </div>
                </div>
                <input
                  ref={invoiceFileRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setInvoiceFile(file);
                    e.target.value = "";
                  }}
                />
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
                      <th>Contract Value</th>
                      <th>Remaining</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.slice(contractPage * PAGE_SIZE, (contractPage + 1) * PAGE_SIZE).map((c: VendorContractItem) => {
                      const badge = getContractBadge(c.status);
                      const remaining = c.amount - (c.amount_paid || 0);
                      return (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 600 }}>{c.project_name}</td>
                          <td>{c.title}</td>
                          <td>{formatCurrency(c.amount)}</td>
                          <td style={{ color: remaining < c.amount ? "var(--color-green)" : undefined }}>
                            {formatCurrency(remaining)}
                          </td>
                          <td>
                            <span className={badge.className}>{badge.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <PaginationControls page={contractPage} setPage={setContractPage} totalItems={contracts.length} />
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
                    {recentInvoices.slice(invoicePage * PAGE_SIZE, (invoicePage + 1) * PAGE_SIZE).map((inv: VendorRecentInvoice) => {
                      const badge = getStatusBadge(inv.status);
                      return (
                        <tr key={inv.id} className="vendor-row-clickable" onClick={() => openInvoiceDetail(inv)}>
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
                <PaginationControls page={invoicePage} setPage={setInvoicePage} totalItems={recentInvoices.length} />
              </div>
            ) : (
              <div className="vendor-empty">{t("noInvoicesFound")}</div>
            )}
          </div>

          {/* Compliance & Documents */}
          <div className="vendor-card">
            <div className="vendor-card-title" style={{ justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {t("complianceDocsTitle")}
              </span>
              <button
                className="vendor-btn-upload"
                onClick={() => openDocModal("compliance")}
              >
                <Upload size={14} />
                Upload
              </button>
            </div>

            {uploadMsg && (
              <div className={uploadMsg.type === "success" ? "vendor-msg-success" : "vendor-msg-error"}>
                {uploadMsg.text}
              </div>
            )}

            {certifications.length > 0 && (
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
                            : cert.created_at
                              ? `Submitted: ${new Date(cert.created_at).toLocaleDateString("en-US", {
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
            )}

            {certifications.length === 0 && (
              <div className="vendor-empty">{t("noCertsFound")}</div>
            )}
          </div>

          {/* Documents */}
          <div className="vendor-card">
            <div className="vendor-card-title" style={{ justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FolderOpen size={18} />
                My Documents
              </span>
              <button
                className="vendor-btn-upload"
                onClick={() => openDocModal("general")}
              >
                <Upload size={14} />
                Upload
              </button>
            </div>

            {docUploadMsg && (
              <div className={docUploadMsg.type === "success" ? "vendor-msg-success" : "vendor-msg-error"}>
                {docUploadMsg.text}
              </div>
            )}

            {documents.length > 0 ? (
              <>
                {documents.slice(docPage * PAGE_SIZE, (docPage + 1) * PAGE_SIZE).map((doc: VendorDocumentItem) => (
                  <div key={doc.id} className="vendor-doc-item vendor-doc-clickable" onClick={() => openDocPreview(doc)} onMouseEnter={() => prefetchDocUrl(doc)}>
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
                    <Eye size={14} className="vendor-doc-view-icon" />
                  </div>
                ))}
                <PaginationControls page={docPage} setPage={setDocPage} totalItems={documents.length} />
              </>
            ) : (
              <div className="vendor-empty">No documents shared yet</div>
            )}
          </div>

          {/* Profile Card */}
          <div className="vendor-card">
            <div className="vendor-card-title" style={{ justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <User size={18} />
                My Profile
              </span>
              {contact && !editingProfile && (
                <button
                  className="vendor-btn-upload"
                  onClick={() => {
                    setProfileForm({
                      company_name: contact.company_name || "",
                      first_name: contact.first_name || "",
                      last_name: contact.last_name || "",
                      email: contact.email || "",
                      job_title: contact.job_title || "",
                    });
                    setEditingProfile(true);
                    setProfileMsg(null);
                  }}
                >
                  <Pencil size={14} />
                  Edit
                </button>
              )}
              {editingProfile && (
                <button
                  className="vendor-btn-upload"
                  onClick={() => { setEditingProfile(false); setProfileMsg(null); }}
                >
                  <X size={14} />
                  Cancel
                </button>
              )}
            </div>

            {profileMsg && (
              <div className={profileMsg.type === "success" ? "vendor-msg-success" : "vendor-msg-error"}>
                {profileMsg.text}
              </div>
            )}

            {contact ? (
              editingProfile ? (
                <form onSubmit={handleSaveProfile}>
                  <div className="vendor-form-group">
                    <label className="vendor-form-label">Company Name</label>
                    <input
                      type="text"
                      className="vendor-form-input"
                      value={profileForm.company_name}
                      onChange={(e) => setProfileForm({ ...profileForm, company_name: e.target.value })}
                    />
                  </div>
                  <div className="vendor-form-group">
                    <label className="vendor-form-label">First Name</label>
                    <input
                      type="text"
                      className="vendor-form-input"
                      value={profileForm.first_name}
                      onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="vendor-form-group">
                    <label className="vendor-form-label">Last Name</label>
                    <input
                      type="text"
                      className="vendor-form-input"
                      value={profileForm.last_name}
                      onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="vendor-form-group">
                    <label className="vendor-form-label">Email</label>
                    <input
                      type="email"
                      className="vendor-form-input"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    />
                  </div>
                  <div className="vendor-form-group">
                    <label className="vendor-form-label">Specialty / Job Title</label>
                    <input
                      type="text"
                      className="vendor-form-input"
                      value={profileForm.job_title}
                      onChange={(e) => setProfileForm({ ...profileForm, job_title: e.target.value })}
                    />
                  </div>
                  <button
                    type="submit"
                    className="vendor-btn-primary"
                    disabled={savingProfile}
                  >
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              ) : (
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
              )
            ) : (
              <div className="vendor-empty">No profile information</div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Document Upload Modal ===== */}
      {docModalOpen && (
        <div className="vendor-modal-overlay" onClick={() => setDocModalOpen(false)}>
          <div className="vendor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vendor-modal-header">
              <h3>{docModalType === "compliance" ? "Upload Compliance Document" : "Upload Document"}</h3>
              <button className="vendor-modal-close" onClick={() => setDocModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="vendor-modal-body">
              {docModalMsg && (
                <div className={docModalMsg.type === "success" ? "vendor-msg-success" : "vendor-msg-error"}>
                  {docModalMsg.text}
                </div>
              )}

              {/* File drop zone */}
              <div className="vendor-modal-field">
                <label>File</label>
                <div
                  className="vendor-file-upload"
                  onClick={() => docModalFileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) {
                      setDocModalFile(file);
                      setDocModalName(file.name.replace(/\.[^.]+$/, ""));
                    }
                  }}
                >
                  {docModalFile ? (
                    <span style={{ fontSize: "0.85rem" }}>{docModalFile.name}</span>
                  ) : (
                    <span className="vendor-file-upload-text">
                      <strong style={{ color: "var(--amber, #b45309)" }}>Click to upload</strong> or drag and drop
                      <br />PDF, PNG, or JPG up to 10MB
                    </span>
                  )}
                </div>
                <input
                  ref={docModalFileRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setDocModalFile(file);
                      setDocModalName(file.name.replace(/\.[^.]+$/, ""));
                    }
                    e.target.value = "";
                  }}
                />
              </div>

              {/* Document name */}
              <div className="vendor-modal-field">
                <label>Document Name</label>
                <input
                  type="text"
                  value={docModalName}
                  onChange={(e) => setDocModalName(e.target.value)}
                  placeholder="e.g., Insurance Certificate 2026"
                />
              </div>

              {/* Project */}
              <div className="vendor-modal-field">
                <label>Project (optional)</label>
                <select value={docModalProject} onChange={(e) => setDocModalProject(e.target.value)}>
                  <option value="">— No Project —</option>
                  {activeProjects.map((p) => (
                    <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                  ))}
                </select>
              </div>

              {/* Document type */}
              <div className="vendor-modal-field">
                <label>Category</label>
                <select value={docModalType} onChange={(e) => setDocModalType(e.target.value as "general" | "compliance")}>
                  <option value="general">General</option>
                  <option value="compliance">Compliance / Certification</option>
                </select>
              </div>

              {/* Certification fields — only for compliance uploads */}
              {docModalType === "compliance" && (
                <>
                  <div className="vendor-modal-field">
                    <label>Certification Type</label>
                    <select value={docModalCertType} onChange={(e) => setDocModalCertType(e.target.value)}>
                      <option value="insurance">Insurance Certificate</option>
                      <option value="license">License</option>
                      <option value="w9">W-9</option>
                      <option value="bond">Bond</option>
                      <option value="safety">Safety Certification</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="vendor-modal-field">
                    <label>Expiry Date (optional)</label>
                    <input
                      type="date"
                      value={docModalExpiryDate}
                      onChange={(e) => setDocModalExpiryDate(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="vendor-modal-footer">
              <button className="vendor-modal-btn-cancel" onClick={() => setDocModalOpen(false)}>Cancel</button>
              <button
                className="vendor-modal-btn-submit"
                disabled={!docModalFile || docModalUploading}
                onClick={handleDocModalSubmit}
              >
                {docModalUploading ? "Uploading..." : "Upload Document"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Invoice Detail Modal ===== */}
      {selectedInvoice && (
        <div className="vendor-modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="vendor-modal vendor-modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="vendor-modal-header">
              <h3>Invoice {selectedInvoice.invoice_number}</h3>
              <button className="vendor-modal-close" onClick={() => setSelectedInvoice(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="vendor-modal-body">
              {/* Status badge */}
              <div style={{ marginBottom: 4 }}>
                <span className={getStatusBadge(selectedInvoice.status).className}>
                  {getStatusBadge(selectedInvoice.status).label}
                </span>
              </div>

              {/* Amount summary */}
              <div className="vendor-invoice-summary">
                <div className="vendor-invoice-stat">
                  <div className="vendor-invoice-stat-label">Total</div>
                  <div className="vendor-invoice-stat-value">{formatCurrency(selectedInvoice.total_amount)}</div>
                </div>
                <div className="vendor-invoice-stat">
                  <div className="vendor-invoice-stat-label">Paid</div>
                  <div className="vendor-invoice-stat-value" style={{ color: "var(--green, #16a34a)" }}>
                    {formatCurrency(selectedInvoice.total_amount - selectedInvoice.balance_due)}
                  </div>
                </div>
                <div className="vendor-invoice-stat">
                  <div className="vendor-invoice-stat-label">Balance Due</div>
                  <div className="vendor-invoice-stat-value" style={{ color: selectedInvoice.balance_due > 0 ? "var(--amber, #b45309)" : "inherit" }}>
                    {formatCurrency(selectedInvoice.balance_due)}
                  </div>
                </div>
              </div>

              {/* Invoice details */}
              <div>
                <div className="vendor-invoice-detail-row">
                  <span className="vendor-invoice-detail-label">Project</span>
                  <span>{selectedInvoice.project_name || "—"}</span>
                </div>
                <div className="vendor-invoice-detail-row">
                  <span className="vendor-invoice-detail-label">Submitted</span>
                  <span>
                    {selectedInvoice.invoice_date
                      ? new Date(selectedInvoice.invoice_date).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Payment history */}
              <div>
                <h4 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <DollarSign size={16} /> Payment History
                </h4>

                {loadingPayments ? (
                  <div className="vendor-empty">Loading payments...</div>
                ) : invoicePayments && invoicePayments.length > 0 ? (
                  <table className="vendor-payments-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Reference #</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoicePayments.map((pmt) => (
                        <tr key={pmt.id}>
                          <td>
                            {new Date(pmt.payment_date).toLocaleDateString("en-US", {
                              month: "short", day: "numeric", year: "numeric",
                            })}
                          </td>
                          <td style={{ fontWeight: 600 }}>{formatCurrency(pmt.amount)}</td>
                          <td style={{ textTransform: "capitalize" }}>{pmt.method}</td>
                          <td>{pmt.reference_number || "—"}</td>
                          <td>{pmt.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="vendor-empty">No payments recorded yet</div>
                )}
              </div>
            </div>
            <div className="vendor-modal-footer">
              <button className="vendor-modal-btn-cancel" onClick={() => setSelectedInvoice(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Document Preview Modal ===== */}
      {previewDoc && (
        <div className="vendor-modal-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="vendor-modal vendor-modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="vendor-modal-header">
              <h3>Document Details</h3>
              <button className="vendor-modal-close" onClick={() => setPreviewDoc(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="vendor-modal-body">
              {/* Document info */}
              <div className="vendor-doc-preview-header">
                <div className="vendor-doc-preview-icon">
                  {isPreviewableImage(previewDoc.file_type) ? <Image size={28} /> : <FileText size={28} />}
                </div>
                <div>
                  <div className="vendor-doc-preview-name">{previewDoc.doc_name}</div>
                  <div className="vendor-doc-preview-meta">
                    {getFileTypeLabel(previewDoc.file_type)}
                    {previewDoc.file_size ? ` · ${formatFileSize(previewDoc.file_size)}` : ""}
                  </div>
                </div>
              </div>

              {/* Detail rows */}
              <div>
                <div className="vendor-invoice-detail-row">
                  <span className="vendor-invoice-detail-label">Category</span>
                  <span style={{ textTransform: "capitalize" }}>{previewDoc.doc_category || "General"}</span>
                </div>
                <div className="vendor-invoice-detail-row">
                  <span className="vendor-invoice-detail-label">Uploaded</span>
                  <span>
                    {previewDoc.shared_at
                      ? new Date(previewDoc.shared_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })
                      : "—"}
                  </span>
                </div>
                <div className="vendor-invoice-detail-row">
                  <span className="vendor-invoice-detail-label">File Type</span>
                  <span>{getFileTypeLabel(previewDoc.file_type)}</span>
                </div>
                {previewDoc.file_size && (
                  <div className="vendor-invoice-detail-row">
                    <span className="vendor-invoice-detail-label">File Size</span>
                    <span>{formatFileSize(previewDoc.file_size)}</span>
                  </div>
                )}
              </div>

              {/* Image preview or loading skeleton */}
              {isPreviewableImage(previewDoc.file_type) && (
                loadingPreview ? (
                  <div className="vendor-doc-preview-image vendor-doc-preview-skeleton">
                    <div className="vendor-shimmer" />
                  </div>
                ) : previewUrl ? (
                  <div className="vendor-doc-preview-image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt={previewDoc.doc_name} />
                  </div>
                ) : null
              )}

              {/* Non-image loading state */}
              {!isPreviewableImage(previewDoc.file_type) && loadingPreview && (
                <div className="vendor-empty">Loading file...</div>
              )}
            </div>
            <div className="vendor-modal-footer">
              <button className="vendor-modal-btn-cancel" onClick={() => setPreviewDoc(null)}>Close</button>
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="vendor-modal-btn-submit"
                  style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Download size={14} /> Download
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
