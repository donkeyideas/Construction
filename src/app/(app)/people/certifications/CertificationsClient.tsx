"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  Plus,
  X,
  Award,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Edit3,
  Trash2,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";
import { formatDateSafe } from "@/lib/utils/format";

const IMPORT_SAMPLE: Record<string, string>[] = [
  { cert_name: "OSHA 30-Hour", cert_type: "safety", issuing_authority: "OSHA", cert_number: "OSH-2026-001", issued_date: "2025-06-15", expiry_date: "2028-06-15" },
  { cert_name: "CDL Class A", cert_type: "license", issuing_authority: "State DMV", cert_number: "DL-9876543", issued_date: "2024-03-01", expiry_date: "2028-03-01" },
  { cert_name: "Crane Operator NCCCO", cert_type: "certification", issuing_authority: "NCCCO", cert_number: "NCC-2025-4421", issued_date: "2025-01-10", expiry_date: "2030-01-10" },
];

type CertStatus = "valid" | "expiring_soon" | "expired";

interface CertWithStatus {
  id: string;
  cert_name: string | null;
  cert_type: string;
  issuing_authority: string | null;
  cert_number: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  status: string;
  computedStatus: CertStatus;
  contact_id: string | null;
  contacts: {
    first_name: string;
    last_name: string;
    company_name: string;
  } | null;
}

interface CertificationsClientProps {
  certs: CertWithStatus[];
  totalCerts: number;
  validCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  activeStatus: string;
}

interface ContactOption {
  id: string;
  first_name: string;
  last_name: string;
}

export default function CertificationsClient({
  certs,
  totalCerts,
  validCount,
  expiringSoonCount,
  expiredCount,
  activeStatus,
}: CertificationsClientProps) {
  const router = useRouter();
  const t = useTranslations("people");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const IMPORT_COLUMNS: ImportColumn[] = [
    { key: "cert_name", label: t("certificationName"), required: true },
    { key: "cert_type", label: t("type"), required: false },
    { key: "issuing_authority", label: t("issuingAuthority"), required: false },
    { key: "cert_number", label: t("certNumber"), required: false },
    { key: "issued_date", label: t("issuedDate"), required: false, type: "date" },
    { key: "expiry_date", label: t("expiryDate"), required: false, type: "date" },
    { key: "contact_name", label: t("contactName"), required: false },
  ];

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Detail/Edit/Delete modal state
  const [selectedCert, setSelectedCert] = useState<CertWithStatus | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [modalError, setModalError] = useState("");

  const [createFormData, setCreateFormData] = useState({
    contact_id: "",
    cert_name: "",
    cert_type: "license",
    issuing_authority: "",
    cert_number: "",
    issued_date: "",
    expiry_date: "",
    status: "active",
  });

  const [editFormData, setEditFormData] = useState({
    cert_name: "",
    cert_type: "license",
    issuing_authority: "",
    cert_number: "",
    issued_date: "",
    expiry_date: "",
    status: "active",
  });

  // Fetch contacts when create modal opens
  useEffect(() => {
    if (!showCreate) return;
    setLoadingContacts(true);
    const supabase = createClient();
    supabase
      .from("contacts")
      .select("id, first_name, last_name")
      .eq("is_active", true)
      .order("last_name", { ascending: true })
      .then(({ data }) => {
        setContacts(
          (data ?? []).map((c: Record<string, unknown>) => ({
            id: c.id as string,
            first_name: c.first_name as string,
            last_name: c.last_name as string,
          }))
        );
        setLoadingContacts(false);
      });
  }, [showCreate]);

  // Populate edit form when entering edit mode
  useEffect(() => {
    if (isEditing && selectedCert) {
      setEditFormData({
        cert_name: selectedCert.cert_name || "",
        cert_type: selectedCert.cert_type,
        issuing_authority: selectedCert.issuing_authority || "",
        cert_number: selectedCert.cert_number || "",
        issued_date: selectedCert.issued_date || "",
        expiry_date: selectedCert.expiry_date || "",
        status: selectedCert.status,
      });
    }
  }, [isEditing, selectedCert]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/people/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: createFormData.contact_id,
          cert_name: createFormData.cert_name,
          cert_type: createFormData.cert_type,
          issuing_authority: createFormData.issuing_authority,
          cert_number: createFormData.cert_number || undefined,
          issued_date: createFormData.issued_date,
          expiry_date: createFormData.expiry_date,
          status: createFormData.status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToAddCertification"));
      }

      // Reset form and close modal
      setCreateFormData({
        contact_id: "",
        cert_name: "",
        cert_type: "license",
        issuing_authority: "",
        cert_number: "",
        issued_date: "",
        expiry_date: "",
        status: "active",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : t("failedToAddCertification"));
    } finally {
      setCreating(false);
    }
  }

  function handleRowClick(cert: CertWithStatus) {
    setSelectedCert(cert);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setModalError("");
  }

  function closeModal() {
    setSelectedCert(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setModalError("");
  }

  async function handleSave() {
    if (!selectedCert) return;
    setIsSaving(true);
    setModalError("");

    try {
      const res = await fetch(`/api/people/certifications/${selectedCert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cert_name: editFormData.cert_name,
          cert_type: editFormData.cert_type,
          issuing_authority: editFormData.issuing_authority,
          cert_number: editFormData.cert_number || undefined,
          issued_date: editFormData.issued_date,
          expiry_date: editFormData.expiry_date,
          status: editFormData.status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToUpdateCertification"));
      }

      closeModal();
      router.refresh();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : t("failedToUpdateCertification"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedCert) return;
    setIsDeleting(true);
    setModalError("");

    try {
      const res = await fetch(`/api/people/certifications/${selectedCert.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToDeleteCertification"));
      }

      closeModal();
      router.refresh();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : t("failedToDeleteCertification"));
    } finally {
      setIsDeleting(false);
    }
  }

  function getStatusBadge(status: CertStatus): string {
    switch (status) {
      case "valid":
        return "badge badge-green";
      case "expiring_soon":
        return "badge badge-amber";
      case "expired":
        return "badge badge-red";
      default:
        return "badge badge-green";
    }
  }

  function getStatusLabel(status: CertStatus): string {
    switch (status) {
      case "valid":
        return t("certStatusValid");
      case "expiring_soon":
        return t("certStatusExpiringSoon");
      case "expired":
        return t("certStatusExpired");
      default:
        return status;
    }
  }

  function getTypeBadge(certType: string): string {
    switch (certType) {
      case "osha_10":
      case "osha_30":
        return "badge badge-red";
      case "first_aid":
      case "cpr":
        return "badge badge-green";
      case "license":
        return "badge badge-blue";
      case "insurance":
        return "badge badge-amber";
      default:
        return "badge badge-blue";
    }
  }

  function formatCertType(certType: string): string {
    switch (certType) {
      case "osha_10":
        return t("certTypeOsha10");
      case "osha_30":
        return t("certTypeOsha30");
      case "first_aid":
        return t("certTypeFirstAid");
      case "cpr":
        return t("certTypeCpr");
      case "license":
        return t("certTypeLicense");
      case "insurance":
        return t("certTypeInsurance");
      default:
        return certType;
    }
  }

  function buildUrl(status: string): string {
    if (status === "all") return "/people/certifications";
    return `/people/certifications?status=${status}`;
  }

  const statusFilters = [
    { label: t("filterAll"), value: "all" },
    { label: t("certStatusValid"), value: "valid" },
    { label: t("certStatusExpiringSoon"), value: "expiring_soon" },
    { label: t("certStatusExpired"), value: "expired" },
  ];

  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "certifications", rows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("importFailed"));
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  const personName = selectedCert?.contacts
    ? `${selectedCert.contacts.first_name ?? ""} ${selectedCert.contacts.last_name ?? ""}`.trim()
    : "--";

  return (
    <>
      {/* Header with create button */}
      <div className="fin-header">
        <div>
          <h2>{t("certificationsAndLicenses")}</h2>
          <p className="fin-header-sub">
            {t("certificationsDescription")}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            {t("importCsv")}
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            {t("addCertification")}
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="financial-kpi-row">
        <div className="fin-kpi">
          <div className="fin-kpi-icon blue">
            <Award size={18} />
          </div>
          <span className="fin-kpi-label">{t("totalCertifications")}</span>
          <span className="fin-kpi-value">{totalCerts}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon green">
            <ShieldCheck size={18} />
          </div>
          <span className="fin-kpi-label">{t("certStatusValid")}</span>
          <span className="fin-kpi-value">{validCount}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon amber">
            <AlertTriangle size={18} />
          </div>
          <span className="fin-kpi-label">{t("expiringSoon30d")}</span>
          <span className="fin-kpi-value">{expiringSoonCount}</span>
        </div>

        <div className="fin-kpi">
          <div className="fin-kpi-icon red">
            <XCircle size={18} />
          </div>
          <span className="fin-kpi-label">{t("certStatusExpired")}</span>
          <span className="fin-kpi-value">{expiredCount}</span>
        </div>
      </div>

      {/* Status Filters */}
      <div className="fin-filters">
        <label style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 500 }}>
          {t("statusFilterLabel")}
        </label>
        {statusFilters.map((s) => (
          <Link
            key={s.value}
            href={buildUrl(s.value)}
            className={`ui-btn ui-btn-sm ${
              activeStatus === s.value ? "ui-btn-primary" : "ui-btn-outline"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Certifications Table */}
      {certs.length > 0 ? (
        <div className="fin-chart-card" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>{t("person")}</th>
                  <th>{t("certName")}</th>
                  <th>{t("type")}</th>
                  <th>{t("issuingAuthority")}</th>
                  <th>{t("certNumber")}</th>
                  <th>{t("issuedDate")}</th>
                  <th>{t("expiryDate")}</th>
                  <th>{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {certs.map((cert) => {
                  const contact = cert.contacts;
                  const personNameDisplay = contact
                    ? `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim()
                    : "--";
                  const isExpired = cert.computedStatus === "expired";
                  const isExpiringSoon = cert.computedStatus === "expiring_soon";

                  return (
                    <tr
                      key={cert.id}
                      className={isExpired ? "invoice-row-overdue" : ""}
                      onClick={() => handleRowClick(cert)}
                      style={{ cursor: "pointer" }}
                    >
                      <td style={{ fontWeight: 600 }}>
                        {personNameDisplay}
                        {contact?.company_name && (
                          <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 400 }}>
                            {contact.company_name}
                          </div>
                        )}
                      </td>
                      <td>{cert.cert_name ?? "--"}</td>
                      <td>
                        <span className={getTypeBadge(cert.cert_type)}>
                          {formatCertType(cert.cert_type)}
                        </span>
                      </td>
                      <td>{cert.issuing_authority ?? "--"}</td>
                      <td>
                        {cert.cert_number ?? "--"}
                      </td>
                      <td>
                        {cert.issued_date
                          ? formatDateSafe(cert.issued_date)
                          : "--"}
                      </td>
                      <td>
                        <span
                          style={{
                            color: isExpired
                              ? "var(--color-red)"
                              : isExpiringSoon
                                ? "var(--color-amber)"
                                : "var(--text)",
                            fontWeight: isExpired || isExpiringSoon ? 600 : 400,
                          }}
                        >
                          {cert.expiry_date
                            ? formatDateSafe(cert.expiry_date)
                            : t("noExpiry")}
                          {isExpiringSoon && (
                            <AlertTriangle
                              size={12}
                              style={{ marginLeft: "4px", verticalAlign: "middle" }}
                            />
                          )}
                        </span>
                      </td>
                      <td>
                        <span className={getStatusBadge(cert.computedStatus)}>
                          {getStatusLabel(cert.computedStatus)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="fin-chart-card">
          <div className="fin-empty">
            <div className="fin-empty-icon">
              <Award size={48} />
            </div>
            <div className="fin-empty-title">{t("noCertificationsFound")}</div>
            <div className="fin-empty-desc">
              {activeStatus !== "all"
                ? t("noCertificationsFilterMessage")
                : t("noCertificationsEmptyMessage")}
            </div>
          </div>
        </div>
      )}

      {/* Create Certification Modal */}
      {showCreate && (
        <div className="ticket-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{t("addNewCertification")}</h3>
              <button
                className="ticket-modal-close"
                onClick={() => setShowCreate(false)}
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="ticket-form-error">{createError}</div>
            )}

            <form onSubmit={handleCreate} className="ticket-form">
              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("contactRequired")}</label>
                <select
                  className="ticket-form-select"
                  value={createFormData.contact_id}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, contact_id: e.target.value })
                  }
                  required
                >
                  <option value="">
                    {loadingContacts ? t("loadingContacts") : t("selectContact")}
                  </option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("certificationNameRequired")}</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={createFormData.cert_name}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, cert_name: e.target.value })
                  }
                  placeholder={t("certificationNamePlaceholder")}
                  required
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("certificationTypeRequired")}</label>
                <select
                  className="ticket-form-select"
                  value={createFormData.cert_type}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, cert_type: e.target.value })
                  }
                  required
                >
                  <option value="osha_10">{t("certTypeOsha10")}</option>
                  <option value="osha_30">{t("certTypeOsha30")}</option>
                  <option value="first_aid">{t("certTypeFirstAid")}</option>
                  <option value="cpr">{t("certTypeCpr")}</option>
                  <option value="license">{t("certTypeLicense")}</option>
                  <option value="insurance">{t("certTypeInsurance")}</option>
                </select>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("issuingAuthorityRequired")}</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={createFormData.issuing_authority}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, issuing_authority: e.target.value })
                    }
                    placeholder={t("issuingAuthorityPlaceholder")}
                    required
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("certificationNumber")}</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={createFormData.cert_number}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, cert_number: e.target.value })
                    }
                    placeholder={t("certificationNumberPlaceholder")}
                  />
                </div>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("issuedDateRequired")}</label>
                  <input
                    type="date"
                    className="ticket-form-input"
                    value={createFormData.issued_date}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, issued_date: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("expiryDateRequired")}</label>
                  <input
                    type="date"
                    className="ticket-form-input"
                    value={createFormData.expiry_date}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, expiry_date: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("status")}</label>
                <select
                  className="ticket-form-select"
                  value={createFormData.status}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, status: e.target.value })
                  }
                >
                  <option value="active">{t("statusActive")}</option>
                  <option value="expired">{t("certStatusExpired")}</option>
                  <option value="pending_renewal">{t("statusPendingRenewal")}</option>
                </select>
              </div>

              <div className="ticket-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    creating ||
                    !createFormData.contact_id ||
                    !createFormData.cert_name.trim() ||
                    !createFormData.issuing_authority.trim() ||
                    !createFormData.issued_date ||
                    !createFormData.expiry_date
                  }
                >
                  {creating ? t("adding") : t("addCertification")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail/Edit/Delete Modal */}
      {showImport && (
        <ImportModal
          entityName={t("certificationsEntity")}
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => { setShowImport(false); router.refresh(); }}
        />
      )}

      {selectedCert && (
        <div className="ticket-modal-overlay" onClick={closeModal}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{isEditing ? t("editCertification") : t("certificationDetails")}</h3>
              <button className="ticket-modal-close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="ticket-form-error">{modalError}</div>
            )}

            {!isEditing && !showDeleteConfirm && (
              <>
                <div style={{ padding: "20px" }}>
                  {/* Person header */}
                  <div className="people-detail-header">
                    <div className="people-detail-avatar">
                      {personName
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="people-detail-name">{personName}</div>
                      {selectedCert.contacts?.company_name && (
                        <div className="people-detail-company">
                          {selectedCert.contacts.company_name}
                        </div>
                      )}
                    </div>
                    <span className={getStatusBadge(selectedCert.computedStatus)}>
                      {getStatusLabel(selectedCert.computedStatus)}
                    </span>
                  </div>

                  {/* Certification details */}
                  <div className="people-detail-section">
                    <div className="people-detail-row">
                      <Award size={16} />
                      <span>{selectedCert.cert_name || "--"}</span>
                    </div>
                    <div className="people-detail-row">
                      <ShieldCheck size={16} />
                      <span className={getTypeBadge(selectedCert.cert_type)}>
                        {formatCertType(selectedCert.cert_type)}
                      </span>
                    </div>
                    {selectedCert.issuing_authority && (
                      <div className="people-detail-row">
                        <Award size={16} />
                        <span>{selectedCert.issuing_authority}</span>
                      </div>
                    )}
                    {selectedCert.cert_number && (
                      <div className="people-detail-row">
                        <ShieldCheck size={16} />
                        <span>{selectedCert.cert_number}</span>
                      </div>
                    )}
                  </div>

                  {/* Dates section */}
                  <div className="people-detail-notes">
                    <label>{t("dates")}</label>
                  </div>
                  <div className="people-detail-section" style={{ marginTop: 8 }}>
                    <div className="people-detail-row">
                      <Award size={16} />
                      <span>
                        <strong>{t("issued")}:</strong>{" "}
                        {selectedCert.issued_date
                          ? formatDateSafe(selectedCert.issued_date)
                          : "--"}
                      </span>
                    </div>
                    <div className="people-detail-row">
                      <AlertTriangle size={16} />
                      <span>
                        <strong>{t("expires")}:</strong>{" "}
                        {selectedCert.expiry_date
                          ? formatDateSafe(selectedCert.expiry_date)
                          : t("noExpiry")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ticket-form-actions">
                  <button
                    className="btn-danger-outline"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 size={16} />
                    {t("delete")}
                  </button>
                  <button className="btn-primary" onClick={() => setIsEditing(true)}>
                    <Edit3 size={16} />
                    {t("edit")}
                  </button>
                </div>
              </>
            )}

            {isEditing && !showDeleteConfirm && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
                className="ticket-form"
              >
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("certificationNameRequired")}</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={editFormData.cert_name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, cert_name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("certificationTypeRequired")}</label>
                  <select
                    className="ticket-form-select"
                    value={editFormData.cert_type}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, cert_type: e.target.value })
                    }
                    required
                  >
                    <option value="osha_10">{t("certTypeOsha10")}</option>
                    <option value="osha_30">{t("certTypeOsha30")}</option>
                    <option value="first_aid">{t("certTypeFirstAid")}</option>
                    <option value="cpr">{t("certTypeCpr")}</option>
                    <option value="license">{t("certTypeLicense")}</option>
                    <option value="insurance">{t("certTypeInsurance")}</option>
                  </select>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("issuingAuthorityRequired")}</label>
                    <input
                      type="text"
                      className="ticket-form-input"
                      value={editFormData.issuing_authority}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, issuing_authority: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("certificationNumber")}</label>
                    <input
                      type="text"
                      className="ticket-form-input"
                      value={editFormData.cert_number}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, cert_number: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("issuedDateRequired")}</label>
                    <input
                      type="date"
                      className="ticket-form-input"
                      value={editFormData.issued_date}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, issued_date: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("expiryDateRequired")}</label>
                    <input
                      type="date"
                      className="ticket-form-input"
                      value={editFormData.expiry_date}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, expiry_date: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("status")}</label>
                  <select
                    className="ticket-form-select"
                    value={editFormData.status}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, status: e.target.value })
                    }
                  >
                    <option value="active">{t("statusActive")}</option>
                    <option value="expired">{t("certStatusExpired")}</option>
                    <option value="pending_renewal">{t("statusPendingRenewal")}</option>
                  </select>
                </div>

                <div className="ticket-form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsEditing(false)}
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={
                      isSaving ||
                      !editFormData.cert_name.trim() ||
                      !editFormData.issuing_authority.trim() ||
                      !editFormData.issued_date ||
                      !editFormData.expiry_date
                    }
                  >
                    {isSaving ? t("saving") : t("saveChanges")}
                  </button>
                </div>
              </form>
            )}

            {showDeleteConfirm && (
              <div className="ticket-delete-confirm">
                <p>{t("deleteCertificationConfirm")}</p>
                <p style={{ fontSize: "0.875rem", color: "var(--muted)", marginTop: "0.5rem" }}>
                  <strong>{selectedCert.cert_name}</strong> {t("for")} <strong>{personName}</strong>
                </p>
                <div className="ticket-delete-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    {t("cancel")}
                  </button>
                  <button
                    className="btn-danger"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? t("deleting") : t("deleteCertification")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
