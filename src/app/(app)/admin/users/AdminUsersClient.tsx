"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserCheck,
  Clock,
  Shield,
  UserPlus,
  X,
  Pencil,
  UserX,
  Check,
  Mail,
  Phone,
  Calendar,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  Loader2,
} from "lucide-react";
import type { CompanyMember, MemberRole } from "@/lib/queries/admin";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  project_manager: "Project Manager",
  superintendent: "Superintendent",
  accountant: "Accountant",
  field_worker: "Field Worker",
  viewer: "Viewer",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: "Full access to all features. Can manage billing and delete the company.",
  admin: "Full access to all features. Can manage users and company settings.",
  project_manager: "Manage projects, contracts, documents, safety, and team members.",
  superintendent: "Manage daily operations, safety, equipment, and field activities.",
  accountant: "Access to financial modules, invoices, payroll, and reporting.",
  field_worker: "Access to assigned projects, daily logs, safety, and time tracking.",
  viewer: "Read-only access to dashboards and reports.",
};

const ASSIGNABLE_ROLES: MemberRole[] = [
  "admin",
  "project_manager",
  "superintendent",
  "accountant",
  "field_worker",
  "viewer",
];

function formatDate(dateStr: string | null) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    const parts = name.split(" ");
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  }
  if (email) return email[0]?.toUpperCase() ?? "?";
  return "?";
}

function getMemberStatus(member: CompanyMember): { label: string; dotClass: string } {
  if (member.is_active && member.user_id) return { label: "Active", dotClass: "active" };
  if (member.invited_email && !member.user_id) return { label: "Pending Invite", dotClass: "pending" };
  if (!member.is_active) return { label: "Inactive", dotClass: "inactive" };
  return { label: "Active", dotClass: "active" };
}

function formatPermission(perm: string): string {
  return perm
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface AdminUsersClientProps {
  members: CompanyMember[];
  totalMembers: number;
  activeMembers: number;
  pendingInvites: number;
  roleDistribution: Record<string, number>;
  permissionsByRole: Record<string, Record<string, boolean>>;
  allPermissions: string[];
  currentUserRole: string;
  companyId: string;
}

export default function AdminUsersClient({
  members: initialMembers,
  totalMembers,
  activeMembers,
  pendingInvites,
  roleDistribution,
  permissionsByRole,
  allPermissions,
  currentUserRole,
}: AdminUsersClientProps) {
  const router = useRouter();

  // Invite modal state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("viewer");
  const [inviteCreateAccount, setInviteCreateAccount] = useState(true);
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteShowPw, setInviteShowPw] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  // Member detail modal state
  const [selectedMember, setSelectedMember] = useState<CompanyMember | null>(null);
  const [editingRole, setEditingRole] = useState(false);
  const [editRoleValue, setEditRoleValue] = useState<MemberRole>("viewer");

  // Create account modal state (for existing pending invites)
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [createAccMember, setCreateAccMember] = useState<CompanyMember | null>(null);
  const [createAccName, setCreateAccName] = useState("");
  const [createAccPassword, setCreateAccPassword] = useState("");
  const [createAccShowPw, setCreateAccShowPw] = useState(false);
  const [createAccLoading, setCreateAccLoading] = useState(false);
  const [createAccError, setCreateAccError] = useState("");

  // Table-level actions
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const canManageMembers = currentUserRole === "owner" || currentUserRole === "admin";

  const topRoleEntry = Object.entries(roleDistribution).sort(
    (a, b) => b[1] - a[1]
  )[0];
  const topRole = topRoleEntry ? ROLE_LABELS[topRoleEntry[0]] ?? topRoleEntry[0] : "--";

  // ----- Invite + Create Account Flow -----
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");

    if (!inviteEmail.trim()) {
      setInviteError("Email is required.");
      return;
    }

    if (inviteCreateAccount && (!invitePassword || invitePassword.length < 8)) {
      setInviteError("Password must be at least 8 characters.");
      return;
    }

    setInviteLoading(true);
    try {
      // Step 1: Create the invite record
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || "Failed to send invite.");
        setInviteLoading(false);
        return;
      }

      // Step 2: If create account is checked, create the auth account
      if (inviteCreateAccount && data.id) {
        const accRes = await fetch(`/api/admin/members/${data.id}/create-account`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: inviteName.trim(),
            password: invitePassword,
          }),
        });
        const accData = await accRes.json();
        if (!accRes.ok) {
          setInviteError(
            `Invite created but account creation failed: ${accData.error}. You can create the account later from the user detail.`
          );
          setInviteLoading(false);
          router.refresh();
          return;
        }
        setInviteSuccess(
          `Account created for ${inviteEmail.trim()}. They can now log in with their email and the password you set.`
        );
      } else {
        setInviteSuccess(`Invitation sent to ${inviteEmail.trim()}.`);
      }

      setInviteEmail("");
      setInviteName("");
      setInviteRole("viewer");
      setInvitePassword("");
      setInviteCreateAccount(true);
      router.refresh();
    } catch {
      setInviteError("Network error. Please try again.");
    } finally {
      setInviteLoading(false);
    }
  }

  // ----- Create Account for Existing Pending Member -----
  function openCreateAccountModal(member: CompanyMember) {
    setCreateAccMember(member);
    setCreateAccName(member.user_profile?.full_name || "");
    setCreateAccPassword("");
    setCreateAccError("");
    setCreateAccShowPw(false);
    setShowCreateAccount(true);
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!createAccMember) return;
    setCreateAccError("");

    if (!createAccPassword || createAccPassword.length < 8) {
      setCreateAccError("Password must be at least 8 characters.");
      return;
    }

    setCreateAccLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${createAccMember.id}/create-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: createAccName.trim(),
          password: createAccPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateAccError(data.error || "Failed to create account.");
        setCreateAccLoading(false);
        return;
      }

      setShowCreateAccount(false);
      setSelectedMember(null);
      router.refresh();
    } catch {
      setCreateAccError("Network error. Please try again.");
    } finally {
      setCreateAccLoading(false);
    }
  }

  // ----- Role Change -----
  async function handleRoleChange(memberId: string) {
    setActionLoading(memberId);
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editRoleValue }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error("Role update failed:", data.error);
      }
      setEditingRole(false);
      setSelectedMember(null);
      router.refresh();
    } catch {
      console.error("Network error updating role.");
    } finally {
      setActionLoading(null);
    }
  }

  // ----- Deactivate -----
  async function handleDeactivate(memberId: string) {
    if (!confirm("Are you sure you want to deactivate this member? They will lose access to the platform.")) return;
    setActionLoading(memberId);
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        console.error("Deactivation failed:", data.error);
      }
      setSelectedMember(null);
      router.refresh();
    } catch {
      console.error("Network error deactivating member.");
    } finally {
      setActionLoading(null);
    }
  }

  // ----- Reactivate -----
  async function handleReactivate(memberId: string) {
    setActionLoading(memberId);
    try {
      const res = await fetch(`/api/admin/members/${memberId}/reactivate`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        console.error("Reactivation failed:", data.error);
      }
      setSelectedMember(null);
      router.refresh();
    } catch {
      console.error("Network error reactivating member.");
    } finally {
      setActionLoading(null);
    }
  }

  // ----- Open detail -----
  function openMemberDetail(member: CompanyMember) {
    setSelectedMember(member);
    setEditingRole(false);
    setEditRoleValue(member.role);
  }

  const rolesInMatrix = Object.keys(permissionsByRole).sort();
  const memberPermissions = selectedMember
    ? permissionsByRole[selectedMember.role] || {}
    : {};

  return (
    <div>
      {/* Header */}
      <div className="admin-header">
        <div>
          <h2>Users & Roles</h2>
          <p className="admin-header-sub">
            Manage team members, roles, and permissions
          </p>
        </div>
        {canManageMembers && (
          <div className="admin-header-actions">
            <button
              className="btn-primary"
              onClick={() => {
                setShowInvite(true);
                setInviteError("");
                setInviteSuccess("");
              }}
            >
              <UserPlus size={16} />
              Add User
            </button>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <Users size={18} />
          </div>
          <div className="admin-stat-label">Total Members</div>
          <div className="admin-stat-value">{totalMembers}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon green">
            <UserCheck size={18} />
          </div>
          <div className="admin-stat-label">Active</div>
          <div className="admin-stat-value">{activeMembers}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon amber">
            <Clock size={18} />
          </div>
          <div className="admin-stat-label">Pending Invites</div>
          <div className="admin-stat-value">{pendingInvites}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon red">
            <Shield size={18} />
          </div>
          <div className="admin-stat-label">Top Role</div>
          <div className="admin-stat-value" style={{ fontSize: "1.1rem" }}>
            {topRole}
          </div>
        </div>
      </div>

      {/* Members Table */}
      {initialMembers.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">
            <Users size={32} />
          </div>
          <div className="admin-empty-title">No team members yet</div>
          <div className="admin-empty-desc">
            Add your first team member to get started with collaboration.
          </div>
          {canManageMembers && (
            <button className="btn-primary" onClick={() => setShowInvite(true)}>
              <UserPlus size={16} />
              Add User
            </button>
          )}
        </div>
      ) : (
        <div className="members-table-wrap">
          <table className="members-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                {canManageMembers && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {initialMembers.map((member) => {
                const profile = member.user_profile;
                const displayName =
                  profile?.full_name || member.invited_email || "Unknown";
                const displayEmail =
                  profile?.email || member.invited_email || "--";
                const status = getMemberStatus(member);
                const isLoading = actionLoading === member.id;
                const isOwner = member.role === "owner";

                return (
                  <tr
                    key={member.id}
                    style={isLoading ? { opacity: 0.5 } : { cursor: "pointer" }}
                    onClick={() => openMemberDetail(member)}
                  >
                    <td>
                      <div className="member-info">
                        <div className="member-avatar">
                          {getInitials(profile?.full_name, displayEmail)}
                        </div>
                        <div className="member-name">{displayName}</div>
                      </div>
                    </td>
                    <td>
                      <span className="member-email">{displayEmail}</span>
                    </td>
                    <td>
                      <span className={`role-badge role-badge-${member.role}`}>
                        {ROLE_LABELS[member.role] ?? member.role}
                      </span>
                    </td>
                    <td>
                      <span className="member-status">
                        <span
                          className={`member-status-dot ${status.dotClass}`}
                        />
                        {status.label}
                      </span>
                    </td>
                    <td>{formatDate(member.joined_at || member.created_at)}</td>
                    {canManageMembers && (
                      <td>
                        <div
                          className="member-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {!isOwner && (
                            <button
                              className="member-action-btn"
                              title="View details"
                              onClick={() => openMemberDetail(member)}
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {!isOwner && member.is_active && (
                            <button
                              className="member-action-btn danger"
                              title="Deactivate member"
                              onClick={() => handleDeactivate(member.id)}
                            >
                              <UserX size={14} />
                            </button>
                          )}
                          {!isOwner && !member.is_active && !member.user_id && (
                            <button
                              className="member-action-btn"
                              title="Create account"
                              onClick={() => openCreateAccountModal(member)}
                            >
                              <Key size={14} />
                            </button>
                          )}
                          {!isOwner && !member.is_active && member.user_id && (
                            <button
                              className="member-action-btn"
                              title="Reactivate"
                              onClick={() => handleReactivate(member.id)}
                            >
                              <RefreshCw size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Permissions Matrix */}
      {allPermissions.length > 0 && rolesInMatrix.length > 0 && (
        <div className="permissions-section">
          <h3 className="permissions-section-title">Role Permission Matrix</h3>
          <div className="permissions-table-wrap">
            <table className="permissions-table">
              <thead>
                <tr>
                  <th>Permission</th>
                  {rolesInMatrix.map((role) => (
                    <th key={role}>{ROLE_LABELS[role] ?? role}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allPermissions.map((perm) => (
                  <tr key={perm}>
                    <td>{formatPermission(perm)}</td>
                    {rolesInMatrix.map((role) => {
                      const allowed = permissionsByRole[role]?.[perm] ?? false;
                      return (
                        <td key={role}>
                          {allowed ? (
                            <span className="perm-check">
                              <Check size={14} />
                            </span>
                          ) : (
                            <span className="perm-deny">--</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== MEMBER DETAIL MODAL ==================== */}
      {selectedMember && (
        <>
          <div
            className="invite-modal-overlay"
            onClick={() => setSelectedMember(null)}
          />
          <div className="invite-modal" style={{ maxWidth: 560 }}>
            <button
              className="invite-modal-close"
              onClick={() => setSelectedMember(null)}
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="user-detail-header">
              <div
                className="user-detail-avatar"
                style={{
                  background: selectedMember.is_active
                    ? "var(--color-blue-light)"
                    : "var(--surface)",
                  color: selectedMember.is_active
                    ? "var(--color-blue)"
                    : "var(--muted)",
                }}
              >
                {getInitials(
                  selectedMember.user_profile?.full_name,
                  selectedMember.user_profile?.email || selectedMember.invited_email
                )}
              </div>
              <div className="user-detail-header-info">
                <h3 className="user-detail-name">
                  {selectedMember.user_profile?.full_name ||
                    selectedMember.invited_email ||
                    "Unknown User"}
                </h3>
                <span
                  className={`role-badge role-badge-${selectedMember.role}`}
                  style={{ fontSize: "0.7rem" }}
                >
                  {ROLE_LABELS[selectedMember.role] ?? selectedMember.role}
                </span>
                <span className="member-status" style={{ marginLeft: 8 }}>
                  <span
                    className={`member-status-dot ${getMemberStatus(selectedMember).dotClass}`}
                  />
                  {getMemberStatus(selectedMember).label}
                </span>
              </div>
            </div>

            {/* Info Rows */}
            <div className="user-detail-info">
              <div className="detail-row">
                <Mail size={14} />
                <span className="detail-label">Email</span>
                <span className="detail-value">
                  {selectedMember.user_profile?.email ||
                    selectedMember.invited_email ||
                    "--"}
                </span>
              </div>

              {selectedMember.user_profile?.phone && (
                <div className="detail-row">
                  <Phone size={14} />
                  <span className="detail-label">Phone</span>
                  <span className="detail-value">
                    {selectedMember.user_profile.phone}
                  </span>
                </div>
              )}

              <div className="detail-row">
                <Calendar size={14} />
                <span className="detail-label">Invited</span>
                <span className="detail-value">
                  {formatDateTime(selectedMember.invited_at || selectedMember.created_at)}
                </span>
              </div>

              {selectedMember.joined_at && (
                <div className="detail-row">
                  <UserCheck size={14} />
                  <span className="detail-label">Joined</span>
                  <span className="detail-value">
                    {formatDateTime(selectedMember.joined_at)}
                  </span>
                </div>
              )}

              <div className="detail-row">
                <Key size={14} />
                <span className="detail-label">Account</span>
                <span className="detail-value">
                  {selectedMember.user_id ? "Active login" : "No account yet"}
                </span>
              </div>
            </div>

            {/* Role Management */}
            {canManageMembers && selectedMember.role !== "owner" && (
              <div className="user-detail-section">
                <div className="user-detail-section-title">Role</div>
                {editingRole ? (
                  <div className="user-detail-role-edit">
                    <select
                      className="invite-form-select"
                      value={editRoleValue}
                      onChange={(e) => setEditRoleValue(e.target.value as MemberRole)}
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                    <p className="user-detail-role-desc">
                      {ROLE_DESCRIPTIONS[editRoleValue] || ""}
                    </p>
                    <div className="user-detail-role-actions">
                      <button
                        className="btn-primary btn-sm"
                        disabled={actionLoading === selectedMember.id}
                        onClick={() => handleRoleChange(selectedMember.id)}
                      >
                        {actionLoading === selectedMember.id ? (
                          <Loader2 size={14} className="spin-icon" />
                        ) : (
                          <Check size={14} />
                        )}
                        Save Role
                      </button>
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => setEditingRole(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="user-detail-role-display">
                    <div>
                      <span className={`role-badge role-badge-${selectedMember.role}`}>
                        {ROLE_LABELS[selectedMember.role]}
                      </span>
                      <p className="user-detail-role-desc">
                        {ROLE_DESCRIPTIONS[selectedMember.role] || ""}
                      </p>
                    </div>
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => {
                        setEditRoleValue(selectedMember.role);
                        setEditingRole(true);
                      }}
                    >
                      <Pencil size={14} />
                      Change
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Permissions for this role */}
            {Object.keys(memberPermissions).length > 0 && (
              <div className="user-detail-section">
                <div className="user-detail-section-title">Permissions</div>
                <div className="user-detail-permissions">
                  {Object.entries(memberPermissions)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([perm, allowed]) => (
                      <div
                        key={perm}
                        className={`user-detail-perm ${allowed ? "allowed" : "denied"}`}
                      >
                        {allowed ? <Check size={12} /> : <X size={12} />}
                        {formatPermission(perm)}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {canManageMembers && selectedMember.role !== "owner" && (
              <div className="user-detail-actions">
                {!selectedMember.user_id && (
                  <button
                    className="btn-primary btn-sm"
                    onClick={() => {
                      setSelectedMember(null);
                      openCreateAccountModal(selectedMember);
                    }}
                  >
                    <Key size={14} />
                    Create Login Account
                  </button>
                )}
                {!selectedMember.is_active && selectedMember.user_id && (
                  <button
                    className="btn-primary btn-sm"
                    disabled={actionLoading === selectedMember.id}
                    onClick={() => handleReactivate(selectedMember.id)}
                  >
                    <RefreshCw size={14} />
                    Reactivate
                  </button>
                )}
                {selectedMember.is_active && (
                  <button
                    className="btn-danger btn-sm"
                    disabled={actionLoading === selectedMember.id}
                    onClick={() => handleDeactivate(selectedMember.id)}
                  >
                    <UserX size={14} />
                    Deactivate
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ==================== INVITE / ADD USER MODAL ==================== */}
      {showInvite && (
        <>
          <div
            className="invite-modal-overlay"
            onClick={() => setShowInvite(false)}
          />
          <div className="invite-modal">
            <button
              className="invite-modal-close"
              onClick={() => setShowInvite(false)}
            >
              <X size={18} />
            </button>
            <div className="invite-modal-title">Add Team Member</div>
            <div className="invite-modal-desc">
              Create a new user account for a team member. They will be able to
              log in immediately with the credentials you set.
            </div>

            {inviteError && (
              <div className="invite-error">{inviteError}</div>
            )}
            {inviteSuccess && (
              <div className="invite-success">{inviteSuccess}</div>
            )}

            <form onSubmit={handleInvite}>
              <div className="invite-form-group">
                <label className="invite-form-label">Email Address *</label>
                <input
                  type="email"
                  className="invite-form-input"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>

              <div className="invite-form-group">
                <label className="invite-form-label">Full Name</label>
                <input
                  type="text"
                  className="invite-form-input"
                  placeholder="John Smith"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>

              <div className="invite-form-group">
                <label className="invite-form-label">Role</label>
                <select
                  className="invite-form-select"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as MemberRole)}
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <span className="invite-form-hint">
                  {ROLE_DESCRIPTIONS[inviteRole] || ""}
                </span>
              </div>

              <div className="invite-form-group">
                <label className="invite-form-label-row">
                  <input
                    type="checkbox"
                    checked={inviteCreateAccount}
                    onChange={(e) => setInviteCreateAccount(e.target.checked)}
                  />
                  Create login account now
                </label>
              </div>

              {inviteCreateAccount && (
                <div className="invite-form-group">
                  <label className="invite-form-label">
                    Temporary Password *
                  </label>
                  <div className="invite-pw-field">
                    <input
                      type={inviteShowPw ? "text" : "password"}
                      className="invite-form-input"
                      placeholder="Min 8 characters"
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="invite-pw-toggle"
                      onClick={() => setInviteShowPw(!inviteShowPw)}
                      tabIndex={-1}
                    >
                      {inviteShowPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span className="invite-form-hint">
                    Share this password with the user. They should change it after first login.
                  </span>
                </div>
              )}

              <div className="invite-modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowInvite(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={inviteLoading}
                >
                  {inviteLoading ? (
                    <>
                      <Loader2 size={14} className="spin-icon" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} />
                      {inviteCreateAccount ? "Create Account" : "Send Invite"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ==================== CREATE ACCOUNT MODAL ==================== */}
      {showCreateAccount && createAccMember && (
        <>
          <div
            className="invite-modal-overlay"
            onClick={() => setShowCreateAccount(false)}
          />
          <div className="invite-modal" style={{ maxWidth: 440 }}>
            <button
              className="invite-modal-close"
              onClick={() => setShowCreateAccount(false)}
            >
              <X size={18} />
            </button>
            <div className="invite-modal-title">Create Login Account</div>
            <div className="invite-modal-desc">
              Create a login account for{" "}
              <strong>{createAccMember.invited_email}</strong> so they can access
              the platform.
            </div>

            {createAccError && (
              <div className="invite-error">{createAccError}</div>
            )}

            <form onSubmit={handleCreateAccount}>
              <div className="invite-form-group">
                <label className="invite-form-label">Full Name</label>
                <input
                  type="text"
                  className="invite-form-input"
                  placeholder="John Smith"
                  value={createAccName}
                  onChange={(e) => setCreateAccName(e.target.value)}
                />
              </div>

              <div className="invite-form-group">
                <label className="invite-form-label">Password *</label>
                <div className="invite-pw-field">
                  <input
                    type={createAccShowPw ? "text" : "password"}
                    className="invite-form-input"
                    placeholder="Min 8 characters"
                    value={createAccPassword}
                    onChange={(e) => setCreateAccPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="invite-pw-toggle"
                    onClick={() => setCreateAccShowPw(!createAccShowPw)}
                    tabIndex={-1}
                  >
                    {createAccShowPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="invite-modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateAccount(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={createAccLoading}
                >
                  {createAccLoading ? (
                    <>
                      <Loader2 size={14} className="spin-icon" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Key size={14} />
                      Create Account
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
