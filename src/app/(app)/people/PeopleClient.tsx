"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  Users,
  Plus,
  Mail,
  Phone,
  Building2,
  X,
  Edit3,
  Trash2,
  AlertCircle,
  Upload,
  Search,
} from "lucide-react";
import ImportModal from "@/components/ImportModal";
import type { ImportColumn } from "@/lib/utils/csv-parser";

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  job_title: string | null;
  contact_type: ContactType;
  city: string | null;
  state: string | null;
  notes: string | null;
  is_active: boolean;
  expiring_certs_count?: number;
}

export type ContactType = "employee" | "subcontractor" | "vendor" | "client" | "tenant";

const TYPE_BADGE_CLASS: Record<ContactType, string> = {
  employee: "contact-type-employee",
  subcontractor: "contact-type-subcontractor",
  vendor: "contact-type-vendor",
  client: "contact-type-client",
  tenant: "contact-type-tenant",
};

interface PeopleClientProps {
  contacts: Contact[];
  typeFilter?: string;
  searchFilter?: string;
  typeLabels: Record<string, string>;
}

const contactSampleData = [
  { first_name: "Carlos", last_name: "Ramirez", contact_type: "subcontractor", email: "carlos@ramirezelectric.com", phone: "(512) 555-0101", company_name: "Ramirez Electric", job_title: "Owner" },
  { first_name: "Sarah", last_name: "Chen", contact_type: "vendor", email: "sarah@supplydepot.com", phone: "(512) 555-0202", company_name: "Supply Depot", job_title: "Sales Rep" },
];

export default function PeopleClient({ contacts, typeFilter, searchFilter, typeLabels }: PeopleClientProps) {
  const router = useRouter();
  const t = useTranslations("people");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const TYPE_LABELS_LOCAL: Record<ContactType, string> = {
    employee: t("typeEmployee"),
    subcontractor: t("typeSubcontractor"),
    vendor: t("typeVendor"),
    client: t("typeClient"),
    tenant: t("typeTenant"),
  };

  const contactImportColumns: ImportColumn[] = [
    { key: "first_name", label: t("firstName"), required: true },
    { key: "last_name", label: t("lastName"), required: true },
    { key: "contact_type", label: t("type"), required: false },
    { key: "email", label: t("email"), required: false, type: "email" },
    { key: "phone", label: t("phone"), required: false },
    { key: "company_name", label: t("companyName"), required: false },
    { key: "job_title", label: t("jobTitle"), required: false },
  ];

  const FILTER_TABS: { key: string | undefined; label: string; href: string }[] = [
    { key: undefined, label: t("filterAll"), href: "/people" },
    { key: "employee", label: t("filterEmployees"), href: "/people?type=employee" },
    { key: "subcontractor", label: t("filterSubcontractors"), href: "/people?type=subcontractor" },
    { key: "vendor", label: t("filterVendors"), href: "/people?type=vendor" },
    { key: "client", label: t("filterClients"), href: "/people?type=client" },
  ];

  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editError, setEditError] = useState("");

  const [createFormData, setCreateFormData] = useState({
    contact_type: "employee",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company_name: "",
    job_title: "",
    notes: "",
  });

  const [editFormData, setEditFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company_name: "",
    job_title: "",
    contact_type: "employee",
    notes: "",
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_type: createFormData.contact_type,
          first_name: createFormData.first_name,
          last_name: createFormData.last_name,
          email: createFormData.email || undefined,
          phone: createFormData.phone || undefined,
          company_name: createFormData.company_name || undefined,
          job_title: createFormData.job_title || undefined,
          notes: createFormData.notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToAddContact"));
      }

      setCreateFormData({
        contact_type: "employee",
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        company_name: "",
        job_title: "",
        notes: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : t("failedToAddContact"));
    } finally {
      setCreating(false);
    }
  }

  function handleCardClick(contact: Contact) {
    setSelectedContact(contact);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setEditError("");
    setEditFormData({
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email || "",
      phone: contact.phone || "",
      company_name: contact.company_name || "",
      job_title: contact.job_title || "",
      contact_type: contact.contact_type,
      notes: contact.notes || "",
    });
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedContact) return;

    setUpdating(true);
    setEditError("");

    try {
      const res = await fetch(`/api/people/contacts/${selectedContact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: editFormData.first_name,
          last_name: editFormData.last_name,
          email: editFormData.email || undefined,
          phone: editFormData.phone || undefined,
          company_name: editFormData.company_name || undefined,
          job_title: editFormData.job_title || undefined,
          contact_type: editFormData.contact_type,
          notes: editFormData.notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToUpdateContact"));
      }

      setSelectedContact(null);
      setIsEditing(false);
      router.refresh();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : t("failedToUpdateContact"));
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!selectedContact) return;

    setDeleting(true);

    try {
      const res = await fetch(`/api/people/contacts/${selectedContact.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("failedToDeleteContact"));
      }

      setSelectedContact(null);
      setShowDeleteConfirm(false);
      router.refresh();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : t("failedToDeleteContact"));
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  function closeModal() {
    setSelectedContact(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setEditError("");
  }

  async function handleContactsImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "contacts", rows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("importFailed"));
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  return (
    <div>
      {/* Header */}
      <div className="people-header">
        <div>
          <h2>{t("peopleDirectory")}</h2>
          <p className="people-header-sub">
            {t("peopleDirectoryDescription")}
          </p>
        </div>
        <div className="people-header-actions">
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            {t("importCsv")}
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            {t("addContact")}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="people-search-bar">
        <div className="people-search-wrap">
          <div className="people-search-icon">
            <Search size={16} />
          </div>
          <form method="GET">
            {typeFilter && (
              <input type="hidden" name="type" value={typeFilter} />
            )}
            <input
              type="text"
              name="search"
              className="people-search-input"
              placeholder={t("searchPlaceholder")}
              defaultValue={searchFilter || ""}
            />
          </form>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="people-tab-bar">
        {FILTER_TABS.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={`people-tab ${typeFilter === tab.key ? "active" : !typeFilter && !tab.key ? "active" : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Contact Cards Grid */}
      {contacts.length === 0 ? (
        <div className="people-empty">
          <div className="people-empty-icon">
            <Users size={48} />
          </div>
          <div className="people-empty-title">{t("noContactsFound")}</div>
          <p className="people-empty-desc">
            {searchFilter
              ? t("noSearchResults", { search: searchFilter })
              : typeFilter
                ? t("noTypeResults", { type: typeLabels[typeFilter]?.toLowerCase() || typeFilter })
                : t("emptyDirectoryMessage")}
          </p>
        </div>
      ) : (
        <div className="people-grid">
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onClick={() => handleCardClick(contact)}
              typeLabels={TYPE_LABELS_LOCAL}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Create Contact Modal */}
      {showCreate && (
        <div className="ticket-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{t("addNewContact")}</h3>
              <button className="ticket-modal-close" onClick={() => setShowCreate(false)}>
                <X size={18} />
              </button>
            </div>

            {createError && <div className="ticket-form-error">{createError}</div>}

            <form onSubmit={handleCreate} className="ticket-form">
              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("typeRequired")}</label>
                <select
                  className="ticket-form-select"
                  value={createFormData.contact_type}
                  onChange={(e) => setCreateFormData({ ...createFormData, contact_type: e.target.value })}
                >
                  <option value="employee">{t("typeEmployee")}</option>
                  <option value="subcontractor">{t("typeSubcontractor")}</option>
                  <option value="vendor">{t("typeVendor")}</option>
                  <option value="client">{t("typeClient")}</option>
                  <option value="tenant">{t("typeTenant")}</option>
                </select>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("firstNameRequired")}</label>
                  <input type="text" className="ticket-form-input" value={createFormData.first_name} onChange={(e) => setCreateFormData({ ...createFormData, first_name: e.target.value })} placeholder={t("firstNamePlaceholder")} required />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("lastNameRequired")}</label>
                  <input type="text" className="ticket-form-input" value={createFormData.last_name} onChange={(e) => setCreateFormData({ ...createFormData, last_name: e.target.value })} placeholder={t("lastNamePlaceholder")} required />
                </div>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("email")}</label>
                  <input type="email" className="ticket-form-input" value={createFormData.email} onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })} placeholder={t("emailPlaceholder")} />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("phone")}</label>
                  <input type="text" className="ticket-form-input" value={createFormData.phone} onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })} placeholder={t("phonePlaceholder")} />
                </div>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("companyName")}</label>
                  <input type="text" className="ticket-form-input" value={createFormData.company_name} onChange={(e) => setCreateFormData({ ...createFormData, company_name: e.target.value })} placeholder={t("companyNamePlaceholder")} />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("titlePosition")}</label>
                  <input type="text" className="ticket-form-input" value={createFormData.job_title} onChange={(e) => setCreateFormData({ ...createFormData, job_title: e.target.value })} placeholder={t("titlePositionPlaceholder")} />
                </div>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">{t("notes")}</label>
                <textarea className="ticket-form-textarea" value={createFormData.notes} onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })} placeholder={t("notesPlaceholder")} rows={3} />
              </div>

              <div className="ticket-form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>{t("cancel")}</button>
                <button type="submit" className="btn-primary" disabled={creating || !createFormData.first_name.trim() || !createFormData.last_name.trim()}>
                  {creating ? t("adding") : t("addContact")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImport && (
        <ImportModal
          entityName={t("contactsEntity")}
          columns={contactImportColumns}
          sampleData={contactSampleData}
          onImport={handleContactsImport}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Detail/Edit/Delete Modal */}
      {selectedContact && (
        <div className="ticket-modal-overlay" onClick={closeModal}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>
                {isEditing
                  ? t("editContact")
                  : `${selectedContact.first_name} ${selectedContact.last_name}`}
              </h3>
              <button className="ticket-modal-close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            {editError && <div className="ticket-form-error">{editError}</div>}

            {showDeleteConfirm ? (
              <div className="ticket-delete-confirm">
                <p>
                  {t("deleteContactConfirm", { name: `${selectedContact.first_name} ${selectedContact.last_name}` })}
                </p>
                <div className="ticket-delete-actions">
                  <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>{t("cancel")}</button>
                  <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
                    {deleting ? t("deleting") : t("deleteContact")}
                  </button>
                </div>
              </div>
            ) : isEditing ? (
              <form onSubmit={handleUpdate} className="ticket-form">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("typeRequired")}</label>
                  <select className="ticket-form-select" value={editFormData.contact_type} onChange={(e) => setEditFormData({ ...editFormData, contact_type: e.target.value })}>
                    <option value="employee">{t("typeEmployee")}</option>
                    <option value="subcontractor">{t("typeSubcontractor")}</option>
                    <option value="vendor">{t("typeVendor")}</option>
                    <option value="client">{t("typeClient")}</option>
                    <option value="tenant">{t("typeTenant")}</option>
                  </select>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("firstNameRequired")}</label>
                    <input type="text" className="ticket-form-input" value={editFormData.first_name} onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })} required />
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("lastNameRequired")}</label>
                    <input type="text" className="ticket-form-input" value={editFormData.last_name} onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })} required />
                  </div>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("email")}</label>
                    <input type="email" className="ticket-form-input" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} />
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("phone")}</label>
                    <input type="text" className="ticket-form-input" value={editFormData.phone} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} />
                  </div>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("companyName")}</label>
                    <input type="text" className="ticket-form-input" value={editFormData.company_name} onChange={(e) => setEditFormData({ ...editFormData, company_name: e.target.value })} />
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">{t("titlePosition")}</label>
                    <input type="text" className="ticket-form-input" value={editFormData.job_title} onChange={(e) => setEditFormData({ ...editFormData, job_title: e.target.value })} />
                  </div>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">{t("notes")}</label>
                  <textarea className="ticket-form-textarea" value={editFormData.notes} onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })} rows={3} />
                </div>

                <div className="ticket-form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>{t("cancel")}</button>
                  <button type="submit" className="btn-primary" disabled={updating || !editFormData.first_name.trim() || !editFormData.last_name.trim()}>
                    {updating ? t("saving") : t("saveChanges")}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="ticket-detail-body">
                  <div className="people-detail-header">
                    <div className="people-detail-avatar">
                      {(selectedContact.first_name?.[0] || "").toUpperCase()}
                      {(selectedContact.last_name?.[0] || "").toUpperCase()}
                    </div>
                    <div>
                      <div className="people-detail-name">
                        {selectedContact.first_name} {selectedContact.last_name}
                      </div>
                      {selectedContact.job_title && (
                        <div className="people-detail-title">{selectedContact.job_title}</div>
                      )}
                      {selectedContact.company_name && (
                        <div className="people-detail-company">{selectedContact.company_name}</div>
                      )}
                    </div>
                    <span className={`badge ${TYPE_BADGE_CLASS[selectedContact.contact_type]}`}>
                      {TYPE_LABELS_LOCAL[selectedContact.contact_type]}
                    </span>
                  </div>

                  <div className="people-detail-section">
                    {selectedContact.email && (
                      <div className="people-detail-row">
                        <Mail size={16} />
                        <a href={`mailto:${selectedContact.email}`}>{selectedContact.email}</a>
                      </div>
                    )}
                    {selectedContact.phone && (
                      <div className="people-detail-row">
                        <Phone size={16} />
                        <a href={`tel:${selectedContact.phone}`}>{selectedContact.phone}</a>
                      </div>
                    )}
                    {selectedContact.company_name && (
                      <div className="people-detail-row">
                        <Building2 size={16} />
                        <span>{selectedContact.company_name}</span>
                      </div>
                    )}
                    {(selectedContact.city || selectedContact.state) && (
                      <div className="people-detail-row">
                        <Building2 size={16} />
                        <span>{[selectedContact.city, selectedContact.state].filter(Boolean).join(", ")}</span>
                      </div>
                    )}
                  </div>

                  {selectedContact.notes && (
                    <div className="people-detail-notes">
                      <label>{t("notes")}</label>
                      <p>{selectedContact.notes}</p>
                    </div>
                  )}

                  {(selectedContact.expiring_certs_count ?? 0) > 0 && (
                    <div className="cert-warning-text" style={{ marginTop: 16 }}>
                      <AlertCircle size={14} />
                      {t("certsExpiringSoon", { count: selectedContact.expiring_certs_count! })}
                    </div>
                  )}
                </div>

                <div className="ticket-form-actions">
                  <button className="btn-danger-outline" onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 size={16} />
                    {t("delete")}
                  </button>
                  <button className="btn-primary" onClick={() => { setIsEditing(true); setEditError(""); }}>
                    <Edit3 size={16} />
                    {t("edit")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Contact Card Component
function ContactCard({ contact, onClick, typeLabels, t }: { contact: Contact; onClick: () => void; typeLabels: Record<ContactType, string>; t: ReturnType<typeof useTranslations> }) {
  const initials = (contact.first_name?.[0] || "") + (contact.last_name?.[0] || "");
  const fullName = `${contact.first_name} ${contact.last_name}`.trim();
  const hasCertWarning = (contact.expiring_certs_count ?? 0) > 0;

  return (
    <div className="contact-card" onClick={onClick}>
      <div className="contact-card-top">
        <div className="contact-card-avatar">
          {initials.toUpperCase() || "?"}
        </div>
        <div className="contact-card-info">
          <div className="contact-card-name">
            {fullName || t("unnamedContact")}
            {hasCertWarning && <span className="cert-warning" />}
          </div>
          {contact.job_title && <div className="contact-card-title">{contact.job_title}</div>}
          {contact.company_name && <div className="contact-card-company">{contact.company_name}</div>}
        </div>
        <div className="contact-card-type">
          <span className={`badge ${TYPE_BADGE_CLASS[contact.contact_type] || ""}`}>
            {typeLabels[contact.contact_type] || contact.contact_type}
          </span>
        </div>
      </div>

      <div className="contact-card-details">
        {contact.email && (
          <div className="contact-card-detail">
            <Mail size={14} />
            <a href={`mailto:${contact.email}`} onClick={(e) => e.stopPropagation()}>
              {contact.email}
            </a>
          </div>
        )}
        {contact.phone && (
          <div className="contact-card-detail">
            <Phone size={14} />
            <a href={`tel:${contact.phone}`} onClick={(e) => e.stopPropagation()}>
              {contact.phone}
            </a>
          </div>
        )}
      </div>

      {hasCertWarning && (
        <div className="cert-warning-text">
          <AlertCircle size={12} />
          {t("certsExpiringShort", { count: contact.expiring_certs_count! })}
        </div>
      )}
    </div>
  );
}
