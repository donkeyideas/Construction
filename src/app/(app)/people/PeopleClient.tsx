"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

const TYPE_LABELS: Record<ContactType, string> = {
  employee: "Employee",
  subcontractor: "Subcontractor",
  vendor: "Vendor",
  client: "Client",
  tenant: "Tenant",
};

const TYPE_BADGE_CLASS: Record<ContactType, string> = {
  employee: "contact-type-employee",
  subcontractor: "contact-type-subcontractor",
  vendor: "contact-type-vendor",
  client: "contact-type-client",
  tenant: "contact-type-tenant",
};

interface PeopleClientProps {
  contacts: Contact[];
}

const contactImportColumns: ImportColumn[] = [
  { key: "first_name", label: "First Name", required: true },
  { key: "last_name", label: "Last Name", required: true },
  { key: "contact_type", label: "Type", required: false },
  { key: "email", label: "Email", required: false, type: "email" },
  { key: "phone", label: "Phone", required: false },
  { key: "company_name", label: "Company", required: false },
  { key: "job_title", label: "Job Title", required: false },
];

const contactSampleData = [
  { first_name: "Carlos", last_name: "Ramirez", contact_type: "subcontractor", email: "carlos@ramirezelectric.com", phone: "(512) 555-0101", company_name: "Ramirez Electric", job_title: "Owner" },
  { first_name: "Sarah", last_name: "Chen", contact_type: "vendor", email: "sarah@supplydepot.com", phone: "(512) 555-0202", company_name: "Supply Depot", job_title: "Sales Rep" },
];

export default function PeopleClient({ contacts }: PeopleClientProps) {
  const router = useRouter();

  // Import modal state
  const [showImport, setShowImport] = useState(false);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Detail/Edit/Delete modal state
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

  // Handle create contact
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
        throw new Error(data.error || "Failed to add contact");
      }

      // Reset form and close modal
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
      setCreateError(err instanceof Error ? err.message : "Failed to add contact");
    } finally {
      setCreating(false);
    }
  }

  // Handle card click - open detail modal
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

  // Handle edit button - switch to edit mode
  function handleEditClick() {
    setIsEditing(true);
    setEditError("");
  }

  // Handle update contact
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
        throw new Error(data.error || "Failed to update contact");
      }

      setSelectedContact(null);
      setIsEditing(false);
      router.refresh();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to update contact");
    } finally {
      setUpdating(false);
    }
  }

  // Handle delete contact
  async function handleDelete() {
    if (!selectedContact) return;

    setDeleting(true);

    try {
      const res = await fetch(`/api/people/contacts/${selectedContact.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete contact");
      }

      setSelectedContact(null);
      setShowDeleteConfirm(false);
      router.refresh();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to delete contact");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  // Close modal
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
    if (!res.ok) throw new Error(data.error || "Import failed");
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  return (
    <>
      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          className="btn-secondary"
          onClick={() => setShowImport(true)}
        >
          <Upload size={16} />
          Import CSV
        </button>
        <button
          className="btn-primary"
          onClick={() => setShowCreate(true)}
        >
          <Plus size={16} />
          Add Contact
        </button>
      </div>

      {/* Contact Cards Grid */}
      {contacts.length === 0 ? (
        <div className="people-empty">
          <div className="people-empty-icon">
            <Users size={48} />
          </div>
          <div className="people-empty-title">No contacts found</div>
          <p className="people-empty-desc">
            Start building your directory by adding team members, subcontractors, and vendors.
          </p>
        </div>
      ) : (
        <div className="people-grid">
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onClick={() => handleCardClick(contact)}
            />
          ))}
        </div>
      )}

      {/* Create Contact Modal */}
      {showCreate && (
        <div className="ticket-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>Add New Contact</h3>
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
                <label className="ticket-form-label">Type *</label>
                <select
                  className="ticket-form-select"
                  value={createFormData.contact_type}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, contact_type: e.target.value })
                  }
                >
                  <option value="employee">Employee</option>
                  <option value="subcontractor">Subcontractor</option>
                  <option value="vendor">Vendor</option>
                  <option value="client">Client</option>
                  <option value="tenant">Tenant</option>
                </select>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">First Name *</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={createFormData.first_name}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, first_name: e.target.value })
                    }
                    placeholder="First name"
                    required
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Last Name *</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={createFormData.last_name}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, last_name: e.target.value })
                    }
                    placeholder="Last name"
                    required
                  />
                </div>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Email</label>
                  <input
                    type="email"
                    className="ticket-form-input"
                    value={createFormData.email}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, email: e.target.value })
                    }
                    placeholder="email@example.com"
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Phone</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={createFormData.phone}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, phone: e.target.value })
                    }
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Company Name</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={createFormData.company_name}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, company_name: e.target.value })
                    }
                    placeholder="Company or organization"
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Title / Position</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={createFormData.job_title}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, job_title: e.target.value })
                    }
                    placeholder="Job title or role"
                  />
                </div>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Notes</label>
                <textarea
                  className="ticket-form-textarea"
                  value={createFormData.notes}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, notes: e.target.value })
                  }
                  placeholder="Optional notes about this contact..."
                  rows={3}
                />
              </div>

              <div className="ticket-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating || !createFormData.first_name.trim() || !createFormData.last_name.trim()}
                >
                  {creating ? "Adding..." : "Add Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImport && (
        <ImportModal
          entityName="Contacts"
          columns={contactImportColumns}
          sampleData={contactSampleData}
          onImport={handleContactsImport}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Detail/Edit Modal */}
      {selectedContact && (
        <div className="ticket-modal-overlay" onClick={closeModal}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>
                {isEditing
                  ? "Edit Contact"
                  : `${selectedContact.first_name} ${selectedContact.last_name}`}
              </h3>
              <button
                className="ticket-modal-close"
                onClick={closeModal}
              >
                <X size={18} />
              </button>
            </div>

            {editError && (
              <div className="ticket-form-error">{editError}</div>
            )}

            {showDeleteConfirm ? (
              // Delete Confirmation
              <div className="ticket-delete-confirm">
                <p>
                  Are you sure you want to delete{" "}
                  <strong>
                    {selectedContact.first_name} {selectedContact.last_name}
                  </strong>
                  ? This action cannot be undone.
                </p>
                <div className="ticket-delete-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-danger"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting..." : "Delete Contact"}
                  </button>
                </div>
              </div>
            ) : isEditing ? (
              // Edit Form
              <form onSubmit={handleUpdate} className="ticket-form">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Type *</label>
                  <select
                    className="ticket-form-select"
                    value={editFormData.contact_type}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, contact_type: e.target.value })
                    }
                  >
                    <option value="employee">Employee</option>
                    <option value="subcontractor">Subcontractor</option>
                    <option value="vendor">Vendor</option>
                    <option value="client">Client</option>
                    <option value="tenant">Tenant</option>
                  </select>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">First Name *</label>
                    <input
                      type="text"
                      className="ticket-form-input"
                      value={editFormData.first_name}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, first_name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Last Name *</label>
                    <input
                      type="text"
                      className="ticket-form-input"
                      value={editFormData.last_name}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, last_name: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Email</label>
                    <input
                      type="email"
                      className="ticket-form-input"
                      value={editFormData.email}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, email: e.target.value })
                      }
                    />
                  </div>

                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Phone</label>
                    <input
                      type="text"
                      className="ticket-form-input"
                      value={editFormData.phone}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, phone: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Company Name</label>
                    <input
                      type="text"
                      className="ticket-form-input"
                      value={editFormData.company_name}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, company_name: e.target.value })
                      }
                    />
                  </div>

                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Title / Position</label>
                    <input
                      type="text"
                      className="ticket-form-input"
                      value={editFormData.job_title}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, job_title: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Notes</label>
                  <textarea
                    className="ticket-form-textarea"
                    value={editFormData.notes}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, notes: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="ticket-form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={updating || !editFormData.first_name.trim() || !editFormData.last_name.trim()}
                  >
                    {updating ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              // Detail View
              <>
                <div className="ticket-detail-body">
                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">Type</span>
                    <span
                      className={`badge ${TYPE_BADGE_CLASS[selectedContact.contact_type]}`}
                    >
                      {TYPE_LABELS[selectedContact.contact_type]}
                    </span>
                  </div>

                  <div className="ticket-detail-row">
                    <span className="ticket-detail-label">Name</span>
                    <span>
                      {selectedContact.first_name} {selectedContact.last_name}
                    </span>
                  </div>

                  {selectedContact.email && (
                    <div className="ticket-detail-row">
                      <span className="ticket-detail-label">Email</span>
                      <a href={`mailto:${selectedContact.email}`}>
                        {selectedContact.email}
                      </a>
                    </div>
                  )}

                  {selectedContact.phone && (
                    <div className="ticket-detail-row">
                      <span className="ticket-detail-label">Phone</span>
                      <a href={`tel:${selectedContact.phone}`}>
                        {selectedContact.phone}
                      </a>
                    </div>
                  )}

                  {selectedContact.company_name && (
                    <div className="ticket-detail-row">
                      <span className="ticket-detail-label">Company</span>
                      <span>{selectedContact.company_name}</span>
                    </div>
                  )}

                  {selectedContact.job_title && (
                    <div className="ticket-detail-row">
                      <span className="ticket-detail-label">Job Title</span>
                      <span>{selectedContact.job_title}</span>
                    </div>
                  )}

                  {(selectedContact.city || selectedContact.state) && (
                    <div className="ticket-detail-row">
                      <span className="ticket-detail-label">Location</span>
                      <span>
                        {[selectedContact.city, selectedContact.state]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}

                  {selectedContact.notes && (
                    <div className="ticket-detail-row">
                      <span className="ticket-detail-label">Notes</span>
                      <span>{selectedContact.notes}</span>
                    </div>
                  )}

                  {(selectedContact.expiring_certs_count ?? 0) > 0 && (
                    <div className="ticket-detail-row">
                      <span className="ticket-detail-label">Certifications</span>
                      <span className="cert-warning-text">
                        <AlertCircle size={14} />
                        {selectedContact.expiring_certs_count} certification
                        {selectedContact.expiring_certs_count !== 1 ? "s" : ""} expiring
                        soon
                      </span>
                    </div>
                  )}
                </div>

                <div className="ticket-form-actions">
                  <button
                    className="btn-danger-outline"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleEditClick}
                  >
                    <Edit3 size={16} />
                    Edit
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Contact Card Component
function ContactCard({
  contact,
  onClick,
}: {
  contact: Contact;
  onClick: () => void;
}) {
  const initials =
    (contact.first_name?.[0] || "") + (contact.last_name?.[0] || "");
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
            {fullName || "Unnamed Contact"}
            {hasCertWarning && <span className="cert-warning" />}
          </div>
          {contact.job_title && (
            <div className="contact-card-title">{contact.job_title}</div>
          )}
          {contact.company_name && (
            <div className="contact-card-company">{contact.company_name}</div>
          )}
        </div>
        <div className="contact-card-type">
          <span
            className={`badge ${TYPE_BADGE_CLASS[contact.contact_type] || ""}`}
          >
            {TYPE_LABELS[contact.contact_type] || contact.contact_type}
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
        {(contact.city || contact.state) && (
          <div className="contact-card-detail">
            <Building2 size={14} />
            <span>
              {[contact.city, contact.state].filter(Boolean).join(", ")}
            </span>
          </div>
        )}
      </div>

      {hasCertWarning && (
        <div className="cert-warning-text">
          <AlertCircle size={12} />
          {contact.expiring_certs_count} certification
          {(contact.expiring_certs_count ?? 0) !== 1 ? "s" : ""} expiring soon
        </div>
      )}
    </div>
  );
}
