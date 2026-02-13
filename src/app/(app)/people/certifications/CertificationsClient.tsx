"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface CertificationsClientProps {
  children: React.ReactNode;
}

interface ContactOption {
  id: string;
  first_name: string;
  last_name: string;
}

export default function CertificationsClient({ children }: CertificationsClientProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const [formData, setFormData] = useState({
    contact_id: "",
    cert_name: "",
    issuing_authority: "",
    cert_number: "",
    issued_date: "",
    expiry_date: "",
    status: "active",
  });

  // Fetch contacts when modal opens
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/people/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: formData.contact_id,
          cert_name: formData.cert_name,
          issuing_authority: formData.issuing_authority,
          cert_number: formData.cert_number || undefined,
          issued_date: formData.issued_date,
          expiry_date: formData.expiry_date,
          status: formData.status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add certification");
      }

      // Reset form and close modal
      setFormData({
        contact_id: "",
        cert_name: "",
        issuing_authority: "",
        cert_number: "",
        issued_date: "",
        expiry_date: "",
        status: "active",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to add certification");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      {/* Header with create button */}
      <div className="fin-header">
        <div>
          <h2>Certifications & Licenses</h2>
          <p className="fin-header-sub">
            Track worker certifications, licenses, and expiration dates
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          Add Certification
        </button>
      </div>

      {children}

      {/* Create Certification Modal */}
      {showCreate && (
        <div className="ticket-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>Add New Certification</h3>
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
                <label className="ticket-form-label">Contact *</label>
                <select
                  className="ticket-form-select"
                  value={formData.contact_id}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_id: e.target.value })
                  }
                  required
                >
                  <option value="">
                    {loadingContacts ? "Loading contacts..." : "Select a contact..."}
                  </option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Certification Name *</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={formData.cert_name}
                  onChange={(e) =>
                    setFormData({ ...formData, cert_name: e.target.value })
                  }
                  placeholder="e.g., OSHA 30, First Aid, Electrician License"
                  required
                />
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Issuing Authority *</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={formData.issuing_authority}
                    onChange={(e) =>
                      setFormData({ ...formData, issuing_authority: e.target.value })
                    }
                    placeholder="e.g., OSHA, Red Cross, State Board"
                    required
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Certification Number</label>
                  <input
                    type="text"
                    className="ticket-form-input"
                    value={formData.cert_number}
                    onChange={(e) =>
                      setFormData({ ...formData, cert_number: e.target.value })
                    }
                    placeholder="Certificate or license number"
                  />
                </div>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Issued Date *</label>
                  <input
                    type="date"
                    className="ticket-form-input"
                    value={formData.issued_date}
                    onChange={(e) =>
                      setFormData({ ...formData, issued_date: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Expiry Date *</label>
                  <input
                    type="date"
                    className="ticket-form-input"
                    value={formData.expiry_date}
                    onChange={(e) =>
                      setFormData({ ...formData, expiry_date: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Status</label>
                <select
                  className="ticket-form-select"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="pending_renewal">Pending Renewal</option>
                </select>
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
                  disabled={
                    creating ||
                    !formData.contact_id ||
                    !formData.cert_name.trim() ||
                    !formData.issuing_authority.trim() ||
                    !formData.issued_date ||
                    !formData.expiry_date
                  }
                >
                  {creating ? "Adding..." : "Add Certification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
