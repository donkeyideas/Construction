"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Shield,
  Pencil,
  Check,
  X,
} from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

interface ContactInfo {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
}

interface ProfileClientProps {
  profile: UserProfile;
  contact: ContactInfo | null;
  companyName: string;
  role: string;
}

export default function ProfileClient({
  profile,
  contact,
  companyName,
  role,
}: ProfileClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? contact?.phone ?? "");
  const [jobTitle, setJobTitle] = useState(contact?.job_title ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function startEdit() {
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? contact?.phone ?? "");
    setJobTitle(contact?.job_title ?? "");
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
      const res = await fetch("/api/employee/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          job_title: jobTitle,
        }),
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

  function getRoleLabel(r: string): string {
    switch (r) {
      case "owner":
        return "Owner";
      case "admin":
        return "Administrator";
      case "project_manager":
        return "Project Manager";
      case "foreman":
        return "Foreman";
      case "worker":
        return "Worker";
      case "accountant":
        return "Accountant";
      case "viewer":
        return "Viewer";
      default:
        return r.charAt(0).toUpperCase() + r.slice(1);
    }
  }

  // Generate initials for avatar placeholder
  const initials = (profile.full_name ?? profile.email)
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>My Profile</h2>
          <p className="fin-header-sub">View and update your personal information</p>
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
        <div className="emp-alert emp-alert-success">{success}</div>
      )}
      {error && (
        <div className="emp-alert emp-alert-error">{error}</div>
      )}

      <div className="emp-profile-layout">
        {/* Profile Card */}
        <div className="fin-chart-card emp-profile-card">
          {/* Avatar */}
          <div className="emp-profile-avatar">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name ?? "Profile"}
                className="emp-avatar-img"
              />
            ) : (
              <div className="emp-avatar-placeholder">{initials}</div>
            )}
          </div>

          <div className="emp-profile-name">
            {profile.full_name || profile.email}
          </div>
          {contact?.job_title && (
            <div className="emp-profile-title">{contact.job_title}</div>
          )}
          <div className="emp-profile-company">
            <Building2 size={14} />
            {companyName}
          </div>
          <div className="emp-profile-role">
            <Shield size={13} />
            {getRoleLabel(role)}
          </div>
        </div>

        {/* Personal Information */}
        <div className="fin-chart-card" style={{ padding: 24 }}>
          <h3 className="emp-section-title" style={{ marginBottom: 20 }}>
            <User size={18} style={{ color: "var(--color-amber)" }} />
            Personal Information
          </h3>

          {editing ? (
            <form onSubmit={handleSave}>
              <div className="emp-form-field">
                <label className="emp-form-label">Full Name</label>
                <input
                  type="text"
                  className="invite-form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  disabled={saving}
                />
              </div>

              <div className="emp-form-field">
                <label className="emp-form-label">Email</label>
                <input
                  type="email"
                  className="invite-form-input"
                  value={profile.email}
                  disabled
                  style={{ opacity: 0.6 }}
                />
                <div className="emp-form-hint">
                  Email is managed through your account settings
                </div>
              </div>

              <div className="emp-form-field">
                <label className="emp-form-label">Phone</label>
                <input
                  type="tel"
                  className="invite-form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  disabled={saving}
                />
              </div>

              <div className="emp-form-field">
                <label className="emp-form-label">Job Title</label>
                <input
                  type="text"
                  className="invite-form-input"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Project Engineer"
                  disabled={saving}
                />
              </div>

              <div className="emp-form-actions">
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
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="emp-profile-row">
                <User size={15} style={{ color: "var(--muted)" }} />
                <div>
                  <div className="emp-profile-row-label">Full Name</div>
                  <div className="emp-profile-row-value">
                    {profile.full_name || (
                      <span style={{ color: "var(--muted)", fontStyle: "italic" }}>
                        Not set
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="emp-profile-row">
                <Mail size={15} style={{ color: "var(--muted)" }} />
                <div>
                  <div className="emp-profile-row-label">Email</div>
                  <div className="emp-profile-row-value">{profile.email}</div>
                </div>
              </div>

              <div className="emp-profile-row">
                <Phone size={15} style={{ color: "var(--muted)" }} />
                <div>
                  <div className="emp-profile-row-label">Phone</div>
                  <div className="emp-profile-row-value">
                    {profile.phone ?? contact?.phone ?? (
                      <span style={{ color: "var(--muted)", fontStyle: "italic" }}>
                        Not set
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="emp-profile-row" style={{ borderBottom: "none" }}>
                <Briefcase size={15} style={{ color: "var(--muted)" }} />
                <div>
                  <div className="emp-profile-row-label">Job Title</div>
                  <div className="emp-profile-row-value">
                    {contact?.job_title || (
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
      </div>
    </div>
  );
}
