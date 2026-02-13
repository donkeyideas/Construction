"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface LeasesClientProps {
  children: React.ReactNode;
}

interface UnitOption {
  id: string;
  unit_number: string;
  property_name: string;
}

export default function LeasesClient({ children }: LeasesClientProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const [formData, setFormData] = useState({
    unit_id: "",
    tenant_name: "",
    lease_type: "standard",
    monthly_rent: "",
    security_deposit: "",
    lease_start: "",
    lease_end: "",
    payment_day: "1",
    terms: "",
  });

  // Fetch units when modal opens
  useEffect(() => {
    if (!showCreate) return;
    setLoadingUnits(true);
    const supabase = createClient();
    supabase
      .from("units")
      .select("id, unit_number, properties(name)")
      .order("unit_number", { ascending: true })
      .then(({ data }) => {
        const mapped = (data ?? []).map((u: Record<string, unknown>) => ({
          id: u.id as string,
          unit_number: u.unit_number as string,
          property_name: (u.properties as { name: string } | null)?.name ?? "Unknown",
        }));
        setUnits(mapped);
        setLoadingUnits(false);
      });
  }, [showCreate]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/properties/leases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_id: formData.unit_id,
          tenant_name: formData.tenant_name,
          monthly_rent: formData.monthly_rent,
          security_deposit: formData.security_deposit || undefined,
          lease_start: formData.lease_start,
          lease_end: formData.lease_end,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create lease");
      }

      // Reset form and close modal
      setFormData({
        unit_id: "",
        tenant_name: "",
        lease_type: "standard",
        monthly_rent: "",
        security_deposit: "",
        lease_start: "",
        lease_end: "",
        payment_day: "1",
        terms: "",
      });
      setShowCreate(false);
      router.refresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create lease");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      {/* Inject create button into header area */}
      <div className="fin-header">
        <div>
          <h2>Lease Management</h2>
          <p className="fin-header-sub">
            Track leases, renewals, rent schedules, and tenant information
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          New Lease
        </button>
      </div>

      {children}

      {/* Create Lease Modal */}
      {showCreate && (
        <div className="ticket-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>Create New Lease</h3>
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
                <label className="ticket-form-label">Unit *</label>
                <select
                  className="ticket-form-select"
                  value={formData.unit_id}
                  onChange={(e) =>
                    setFormData({ ...formData, unit_id: e.target.value })
                  }
                  required
                >
                  <option value="">
                    {loadingUnits ? "Loading units..." : "Select a unit..."}
                  </option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.property_name} - Unit {u.unit_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Tenant Name *</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={formData.tenant_name}
                  onChange={(e) =>
                    setFormData({ ...formData, tenant_name: e.target.value })
                  }
                  placeholder="Full name of tenant"
                  required
                />
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Lease Type</label>
                  <select
                    className="ticket-form-select"
                    value={formData.lease_type}
                    onChange={(e) =>
                      setFormData({ ...formData, lease_type: e.target.value })
                    }
                  >
                    <option value="standard">Standard</option>
                    <option value="month_to_month">Month to Month</option>
                    <option value="commercial">Commercial</option>
                    <option value="sublease">Sublease</option>
                  </select>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Payment Day</label>
                  <input
                    type="number"
                    className="ticket-form-input"
                    value={formData.payment_day}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_day: e.target.value })
                    }
                    min={1}
                    max={28}
                  />
                </div>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Monthly Rent *</label>
                  <input
                    type="number"
                    className="ticket-form-input"
                    value={formData.monthly_rent}
                    onChange={(e) =>
                      setFormData({ ...formData, monthly_rent: e.target.value })
                    }
                    placeholder="0.00"
                    min={0}
                    step="0.01"
                    required
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Security Deposit</label>
                  <input
                    type="number"
                    className="ticket-form-input"
                    value={formData.security_deposit}
                    onChange={(e) =>
                      setFormData({ ...formData, security_deposit: e.target.value })
                    }
                    placeholder="0.00"
                    min={0}
                    step="0.01"
                  />
                </div>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Lease Start *</label>
                  <input
                    type="date"
                    className="ticket-form-input"
                    value={formData.lease_start}
                    onChange={(e) =>
                      setFormData({ ...formData, lease_start: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Lease End *</label>
                  <input
                    type="date"
                    className="ticket-form-input"
                    value={formData.lease_end}
                    onChange={(e) =>
                      setFormData({ ...formData, lease_end: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Terms</label>
                <textarea
                  className="ticket-form-textarea"
                  value={formData.terms}
                  onChange={(e) =>
                    setFormData({ ...formData, terms: e.target.value })
                  }
                  placeholder="Optional lease terms or notes..."
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
                  disabled={creating || !formData.tenant_name.trim() || !formData.unit_id || !formData.monthly_rent}
                >
                  {creating ? "Creating..." : "Create Lease"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
