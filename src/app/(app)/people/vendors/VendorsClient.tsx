"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Mail,
  Phone,
  Building2,
  X,
  Edit3,
  Trash2,
  Truck,
  Plus,
  Shield,
} from "lucide-react";
import ImportModal from "@/components/ImportModal";
import PrequalificationChecklist from "@/components/PrequalificationChecklist";
import type { ImportColumn } from "@/lib/utils/csv-parser";

const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "company_name", label: "Company Name", required: true },
  { key: "first_name", label: "Contact First Name", required: false },
  { key: "last_name", label: "Contact Last Name", required: false },
  { key: "email", label: "Email", required: false, type: "email" },
  { key: "phone", label: "Phone", required: false },
  { key: "job_title", label: "Job Title", required: false },
];

const IMPORT_SAMPLE: Record<string, string>[] = [
  { company_name: "ABC Supply Co", first_name: "Mike", last_name: "Johnson", email: "mike@abcsupply.com", phone: "555-0200", job_title: "Sales Manager" },
  { company_name: "ProBuild Materials", first_name: "Sarah", last_name: "Williams", email: "sarah@probuild.com", phone: "555-0300", job_title: "Account Rep" },
  { company_name: "TrueValue Equipment Rental", first_name: "David", last_name: "Chen", email: "dchen@truevalue.com", phone: "555-0400", job_title: "Branch Manager" },
];

interface Contact {
  id: string;
  contact_type: string;
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  phone: string;
  job_title: string;
  city?: string | null;
  state?: string | null;
  notes?: string | null;
  emr_rate?: number | null;
  bonding_capacity?: number | null;
  prequalification_score?: number | null;
  prequalification_notes?: string | null;
}

interface VendorContract {
  id: string;
  contract_number: string;
  title: string;
  contract_type: string;
  amount: number;
  status: string;
  start_date: string;
  end_date: string;
  contacts?: { first_name: string; last_name: string; company_name: string };
}

const TYPE_BADGE_CLASS: Record<string, string> = {
  vendor: "contact-type-vendor",
  subcontractor: "contact-type-subcontractor",
};

export default function VendorsClient({
  contacts,
  contracts,
}: {
  contacts: Contact[];
  contracts: VendorContract[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"directory" | "contracts">("directory");
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createFormData, setCreateFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company_name: "",
    job_title: "",
    contact_type: "vendor",
    notes: "",
  });
  const [selectedVendor, setSelectedVendor] = useState<Contact | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editError, setEditError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editFormData, setEditFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company_name: "",
    job_title: "",
    contact_type: "vendor",
    notes: "",
  });

  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "vendors", rows }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Import failed");
    router.refresh();
    return { success: data.success, errors: data.errors };
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/people/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: createFormData.first_name.trim(),
          last_name: createFormData.last_name.trim(),
          email: createFormData.email || undefined,
          phone: createFormData.phone || undefined,
          company_name: createFormData.company_name || undefined,
          job_title: createFormData.job_title || undefined,
          contact_type: createFormData.contact_type,
          notes: createFormData.notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create vendor");
      }

      setCreateFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        company_name: "",
        job_title: "",
        contact_type: "vendor",
        notes: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create vendor");
    } finally {
      setCreating(false);
    }
  }

  function handleCardClick(vendor: Contact) {
    setSelectedVendor(vendor);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setEditError("");
    setEditFormData({
      first_name: vendor.first_name,
      last_name: vendor.last_name,
      email: vendor.email || "",
      phone: vendor.phone || "",
      company_name: vendor.company_name || "",
      job_title: vendor.job_title || "",
      contact_type: vendor.contact_type,
      notes: vendor.notes || "",
    });
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVendor) return;
    setUpdating(true);
    setEditError("");

    try {
      const res = await fetch(`/api/people/contacts/${selectedVendor.id}`, {
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
        throw new Error(data.error || "Failed to update");
      }
      setSelectedVendor(null);
      setIsEditing(false);
      router.refresh();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!selectedVendor) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/people/contacts/${selectedVendor.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      setSelectedVendor(null);
      setShowDeleteConfirm(false);
      router.refresh();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to delete");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  function closeModal() {
    setSelectedVendor(null);
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setEditError("");
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div>
      {/* Header */}
      <div className="people-header">
        <div>
          <h2>Vendors &amp; Subcontractors</h2>
          <p className="people-header-sub">
            {contacts.length} vendor{contacts.length !== 1 ? "s" : ""} &middot;{" "}
            {contracts.length} contract{contracts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="people-header-actions">
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={16} />
            Import CSV
          </button>
          <button className="btn-primary" onClick={() => { setShowCreate(true); setCreateError(""); }}>
            <Plus size={16} />
            Add Vendor
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="people-tab-bar">
        <button
          className={`people-tab ${tab === "directory" ? "active" : ""}`}
          onClick={() => setTab("directory")}
        >
          Directory ({contacts.length})
        </button>
        <button
          className={`people-tab ${tab === "contracts" ? "active" : ""}`}
          onClick={() => setTab("contracts")}
        >
          Contracts ({contracts.length})
        </button>
      </div>

      {/* Directory Tab */}
      {tab === "directory" && (
        contacts.length === 0 ? (
          <div className="people-empty">
            <div className="people-empty-icon"><Truck size={48} /></div>
            <div className="people-empty-title">No vendors found</div>
            <p className="people-empty-desc">
              Add vendors and subcontractors to your directory to manage them here.
            </p>
          </div>
        ) : (
          <div className="people-grid">
            {contacts.map((v) => (
              <div
                key={v.id}
                className="contact-card"
                onClick={() => handleCardClick(v)}
              >
                <div className="contact-card-top">
                  <div className="contact-card-avatar">
                    {(v.company_name?.[0] || v.first_name?.[0] || "?").toUpperCase()}
                  </div>
                  <div className="contact-card-info">
                    <div className="contact-card-name">
                      {v.company_name || `${v.first_name} ${v.last_name}`}
                    </div>
                    <div className="contact-card-title">
                      {v.first_name} {v.last_name}
                      {v.job_title ? ` \u00b7 ${v.job_title}` : ""}
                    </div>
                  </div>
                  <div className="contact-card-type">
                    <span className={`badge ${TYPE_BADGE_CLASS[v.contact_type] || ""}`}>
                      {v.contact_type === "subcontractor" ? "Subcontractor" : "Vendor"}
                    </span>
                  </div>
                </div>

                <div className="contact-card-details">
                  {v.email && (
                    <div className="contact-card-detail">
                      <Mail size={14} />
                      <a href={`mailto:${v.email}`} onClick={(e) => e.stopPropagation()}>
                        {v.email}
                      </a>
                    </div>
                  )}
                  {v.phone && (
                    <div className="contact-card-detail">
                      <Phone size={14} />
                      <a href={`tel:${v.phone}`} onClick={(e) => e.stopPropagation()}>
                        {v.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Contracts Tab */}
      {tab === "contracts" && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Title</th>
                <th>Vendor</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Start</th>
                <th>End</th>
              </tr>
            </thead>
            <tbody>
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-empty-cell">
                    No contracts found
                  </td>
                </tr>
              ) : (
                contracts.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.contract_number}</td>
                    <td>{c.title}</td>
                    <td>{c.contacts?.company_name ?? "\u2014"}</td>
                    <td style={{ textTransform: "capitalize" }}>
                      {c.contract_type?.replace(/_/g, " ")}
                    </td>
                    <td>{fmt(c.amount)}</td>
                    <td>
                      <span className={`status-badge status-${c.status}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>{c.start_date ? new Date(c.start_date).toLocaleDateString() : "\u2014"}</td>
                    <td>{c.end_date ? new Date(c.end_date).toLocaleDateString() : "\u2014"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Vendor Modal */}
      {showCreate && (
        <div className="ticket-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>Add Vendor</h3>
              <button className="ticket-modal-close" onClick={() => setShowCreate(false)}>
                <X size={18} />
              </button>
            </div>

            {createError && <div className="ticket-form-error">{createError}</div>}

            <form onSubmit={handleCreate} className="ticket-form">
              <div className="ticket-form-group">
                <label className="ticket-form-label">Type</label>
                <select
                  className="ticket-form-select"
                  value={createFormData.contact_type}
                  onChange={(e) => setCreateFormData({ ...createFormData, contact_type: e.target.value })}
                >
                  <option value="vendor">Vendor</option>
                  <option value="subcontractor">Subcontractor</option>
                </select>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Company Name</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={createFormData.company_name}
                  onChange={(e) => setCreateFormData({ ...createFormData, company_name: e.target.value })}
                  placeholder="e.g., ABC Supply Co"
                />
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Contact First Name *</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={createFormData.first_name}
                    onChange={(e) => setCreateFormData({ ...createFormData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Contact Last Name *</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={createFormData.last_name}
                    onChange={(e) => setCreateFormData({ ...createFormData, last_name: e.target.value })}
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
                    onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                    placeholder="contact@company.com"
                  />
                </div>
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Phone</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={createFormData.phone}
                    onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
                    placeholder="(555) 555-0000"
                  />
                </div>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Job Title</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={createFormData.job_title}
                  onChange={(e) => setCreateFormData({ ...createFormData, job_title: e.target.value })}
                  placeholder="e.g., Sales Manager"
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Notes</label>
                <textarea
                  className="ticket-form-textarea"
                  value={createFormData.notes}
                  onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })}
                  rows={3}
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="ticket-form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating || !createFormData.first_name.trim() || !createFormData.last_name.trim()}
                >
                  {creating ? "Creating..." : "Add Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          entityName="Vendors"
          columns={IMPORT_COLUMNS}
          sampleData={IMPORT_SAMPLE}
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Vendor Detail Modal */}
      {selectedVendor && (
        <div className="ticket-modal-overlay" onClick={closeModal}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>
                {isEditing
                  ? "Edit Vendor"
                  : selectedVendor.company_name || `${selectedVendor.first_name} ${selectedVendor.last_name}`}
              </h3>
              <button className="ticket-modal-close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            {editError && <div className="ticket-form-error">{editError}</div>}

            {showDeleteConfirm ? (
              <div className="ticket-delete-confirm">
                <p>
                  Are you sure you want to delete{" "}
                  <strong>{selectedVendor.company_name || `${selectedVendor.first_name} ${selectedVendor.last_name}`}</strong>?
                  This action cannot be undone.
                </p>
                <div className="ticket-delete-actions">
                  <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>Cancel</button>
                  <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ) : isEditing ? (
              <form onSubmit={handleUpdate} className="ticket-form">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Type</label>
                  <select className="ticket-form-select" value={editFormData.contact_type} onChange={(e) => setEditFormData({ ...editFormData, contact_type: e.target.value })}>
                    <option value="vendor">Vendor</option>
                    <option value="subcontractor">Subcontractor</option>
                  </select>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Company Name</label>
                  <input type="text" className="ticket-form-input" value={editFormData.company_name} onChange={(e) => setEditFormData({ ...editFormData, company_name: e.target.value })} />
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Contact First Name</label>
                    <input type="text" className="ticket-form-input" value={editFormData.first_name} onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })} />
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Contact Last Name</label>
                    <input type="text" className="ticket-form-input" value={editFormData.last_name} onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })} />
                  </div>
                </div>

                <div className="ticket-form-row">
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Email</label>
                    <input type="email" className="ticket-form-input" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} />
                  </div>
                  <div className="ticket-form-group">
                    <label className="ticket-form-label">Phone</label>
                    <input type="text" className="ticket-form-input" value={editFormData.phone} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} />
                  </div>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Job Title</label>
                  <input type="text" className="ticket-form-input" value={editFormData.job_title} onChange={(e) => setEditFormData({ ...editFormData, job_title: e.target.value })} />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Notes</label>
                  <textarea className="ticket-form-textarea" value={editFormData.notes} onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })} rows={3} />
                </div>

                <div className="ticket-form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={updating}>
                    {updating ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="ticket-detail-body">
                  <div className="people-detail-header">
                    <div className="people-detail-avatar">
                      {(selectedVendor.company_name?.[0] || selectedVendor.first_name?.[0] || "?").toUpperCase()}
                    </div>
                    <div>
                      <div className="people-detail-name">
                        {selectedVendor.company_name || `${selectedVendor.first_name} ${selectedVendor.last_name}`}
                      </div>
                      <div className="people-detail-title">
                        {selectedVendor.first_name} {selectedVendor.last_name}
                        {selectedVendor.job_title ? ` \u00b7 ${selectedVendor.job_title}` : ""}
                      </div>
                    </div>
                    <span className={`badge ${TYPE_BADGE_CLASS[selectedVendor.contact_type] || ""}`}>
                      {selectedVendor.contact_type === "subcontractor" ? "Subcontractor" : "Vendor"}
                    </span>
                  </div>

                  <div className="people-detail-section">
                    {selectedVendor.email && (
                      <div className="people-detail-row">
                        <Mail size={16} />
                        <a href={`mailto:${selectedVendor.email}`}>{selectedVendor.email}</a>
                      </div>
                    )}
                    {selectedVendor.phone && (
                      <div className="people-detail-row">
                        <Phone size={16} />
                        <a href={`tel:${selectedVendor.phone}`}>{selectedVendor.phone}</a>
                      </div>
                    )}
                    {selectedVendor.company_name && (
                      <div className="people-detail-row">
                        <Building2 size={16} />
                        <span>{selectedVendor.company_name}</span>
                      </div>
                    )}
                    {(selectedVendor.city || selectedVendor.state) && (
                      <div className="people-detail-row">
                        <Building2 size={16} />
                        <span>{[selectedVendor.city, selectedVendor.state].filter(Boolean).join(", ")}</span>
                      </div>
                    )}
                  </div>

                  {selectedVendor.notes && (
                    <div className="people-detail-notes">
                      <label>Notes</label>
                      <p>{selectedVendor.notes}</p>
                    </div>
                  )}

                  {/* Prequalification Checklist */}
                  {(selectedVendor.contact_type === "vendor" || selectedVendor.contact_type === "subcontractor") && (
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", marginTop: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                        <Shield size={16} style={{ color: "var(--color-blue)" }} />
                        <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Prequalification</span>
                      </div>
                      <PrequalificationChecklist
                        contactId={selectedVendor.id}
                        data={{
                          emr_rate: selectedVendor.emr_rate ?? null,
                          bonding_capacity: selectedVendor.bonding_capacity ?? null,
                          prequalification_score: selectedVendor.prequalification_score ?? null,
                          prequalification_notes: selectedVendor.prequalification_notes ?? null,
                        }}
                        onSave={async (data) => {
                          try {
                            await fetch(`/api/contacts/${selectedVendor.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(data),
                            });
                            router.refresh();
                          } catch { /* ignore */ }
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="ticket-form-actions">
                  <button className="btn-danger-outline" onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 size={16} />
                    Delete
                  </button>
                  <button className="btn-primary" onClick={() => { setIsEditing(true); setEditError(""); }}>
                    <Edit3 size={16} />
                    Edit
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
