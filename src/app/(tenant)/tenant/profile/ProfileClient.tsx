"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Home,
  Calendar,
  DollarSign,
  Pencil,
  Check,
  X,
} from "lucide-react";
import type { TenantProfile } from "@/lib/queries/tenant-portal";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function ProfileClient({
  profile,
}: {
  profile: TenantProfile;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function startEdit() {
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
    setEditing(true);
    setError("");
    setSuccess("");
  }

  function cancelEdit() {
    setEditing(false);
    setError("");
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/tenant/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, phone }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setEditing(false);
      setSuccess("Profile updated successfully.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="fin-header">
        <div>
          <h2>My Profile</h2>
          <p className="fin-header-sub">
            Manage your personal information and preferences.
          </p>
        </div>
        {!editing && (
          <button
            className="ui-btn ui-btn-md ui-btn-outline"
            onClick={startEdit}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Pencil size={15} />
            Edit Profile
          </button>
        )}
      </div>

      {success && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: "rgba(34,197,94,0.1)",
            color: "var(--color-green)",
            fontSize: "0.85rem",
            marginBottom: 16,
            border: "1px solid rgba(34,197,94,0.2)",
          }}
        >
          {success}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: "rgba(239,68,68,0.1)",
            color: "var(--color-red)",
            fontSize: "0.85rem",
            marginBottom: 16,
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
        }}
      >
        {/* Personal Information */}
        <div className="card" style={{ padding: 24 }}>
          <h3
            style={{
              margin: "0 0 20px 0",
              fontSize: "0.95rem",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <User size={18} style={{ color: "var(--color-amber)" }} />
            Personal Information
          </h3>

          {editing ? (
            <form onSubmit={handleSave}>
              <div className="maint-field">
                <label className="maint-label">Full Name</label>
                <input
                  type="text"
                  className="invite-form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  disabled={saving}
                />
              </div>

              <div className="maint-field">
                <label className="maint-label">Email</label>
                <input
                  type="email"
                  className="invite-form-input"
                  value={profile.email}
                  disabled
                  style={{ opacity: 0.6 }}
                />
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                    marginTop: 4,
                  }}
                >
                  Contact your property manager to change your email.
                </div>
              </div>

              <div className="maint-field">
                <label className="maint-label">Phone</label>
                <input
                  type="tel"
                  className="invite-form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  disabled={saving}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                  marginTop: 8,
                }}
              >
                <button
                  type="button"
                  className="ui-btn ui-btn-sm ui-btn-outline"
                  onClick={cancelEdit}
                  disabled={saving}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <X size={14} />
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ui-btn ui-btn-sm ui-btn-primary"
                  disabled={saving}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Check size={14} />
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="profile-row">
                <User size={15} style={{ color: "var(--muted)" }} />
                <div>
                  <div className="profile-row-label">Full Name</div>
                  <div className="profile-row-value">
                    {profile.full_name || (
                      <span style={{ color: "var(--muted)", fontStyle: "italic" }}>
                        Not set
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="profile-row">
                <Mail size={15} style={{ color: "var(--muted)" }} />
                <div>
                  <div className="profile-row-label">Email</div>
                  <div className="profile-row-value">{profile.email}</div>
                </div>
              </div>

              <div className="profile-row" style={{ borderBottom: "none" }}>
                <Phone size={15} style={{ color: "var(--muted)" }} />
                <div>
                  <div className="profile-row-label">Phone</div>
                  <div className="profile-row-value">
                    {profile.phone || (
                      <span style={{ color: "var(--muted)", fontStyle: "italic" }}>
                        Not set
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lease Information */}
        <div className="card" style={{ padding: 24 }}>
          <h3
            style={{
              margin: "0 0 20px 0",
              fontSize: "0.95rem",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Home size={18} style={{ color: "var(--color-amber)" }} />
            Lease Information
          </h3>

          {profile.lease ? (
            <div>
              <div className="profile-row">
                <Home size={15} style={{ color: "var(--muted)" }} />
                <div>
                  <div className="profile-row-label">Property</div>
                  <div className="profile-row-value">
                    {profile.lease.property_name}
                  </div>
                </div>
              </div>

              <div className="profile-row">
                <Home size={15} style={{ color: "var(--muted)" }} />
                <div>
                  <div className="profile-row-label">Unit</div>
                  <div className="profile-row-value">
                    {profile.lease.unit_name}
                  </div>
                </div>
              </div>

              <div className="profile-row">
                <Calendar size={15} style={{ color: "var(--muted)" }} />
                <div>
                  <div className="profile-row-label">Lease Period</div>
                  <div className="profile-row-value">
                    {formatDate(profile.lease.lease_start)} &mdash;{" "}
                    {formatDate(profile.lease.lease_end)}
                  </div>
                </div>
              </div>

              <div className="profile-row">
                <DollarSign size={15} style={{ color: "var(--muted)" }} />
                <div>
                  <div className="profile-row-label">Monthly Rent</div>
                  <div className="profile-row-value">
                    {formatCurrency(profile.lease.monthly_rent)}
                  </div>
                </div>
              </div>

              <div className="profile-row" style={{ borderBottom: "none" }}>
                <Check size={15} style={{ color: "var(--color-green)" }} />
                <div>
                  <div className="profile-row-label">Status</div>
                  <div className="profile-row-value">
                    <span className="badge badge-green">
                      {profile.lease.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "20px 0",
                color: "var(--muted)",
                fontSize: "0.85rem",
              }}
            >
              No active lease found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
