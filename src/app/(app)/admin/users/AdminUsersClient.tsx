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
  if (member.is_active) return { label: "Active", dotClass: "active" };
  if (member.invited_email && !member.joined_at) return { label: "Pending Invite", dotClass: "pending" };
  return { label: "Inactive", dotClass: "inactive" };
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
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("viewer");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleValue, setEditingRoleValue] = useState<MemberRole>("viewer");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const canManageMembers = currentUserRole === "owner" || currentUserRole === "admin";

  const topRoleEntry = Object.entries(roleDistribution).sort(
    (a, b) => b[1] - a[1]
  )[0];
  const topRole = topRoleEntry ? ROLE_LABELS[topRoleEntry[0]] ?? topRoleEntry[0] : "--";

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");

    if (!inviteEmail.trim()) {
      setInviteError("Email is required.");
      return;
    }

    setInviteLoading(true);
    try {
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || "Failed to send invite.");
      } else {
        setInviteSuccess(`Invitation sent to ${inviteEmail.trim()}.`);
        setInviteEmail("");
        setInviteRole("viewer");
        router.refresh();
      }
    } catch {
      setInviteError("Network error. Please try again.");
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRoleChange(memberId: string) {
    setActionLoading(memberId);
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editingRoleValue }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error("Role update failed:", data.error);
      }
      setEditingRoleId(null);
      router.refresh();
    } catch {
      console.error("Network error updating role.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeactivate(memberId: string) {
    if (!confirm("Are you sure you want to deactivate this member?")) return;
    setActionLoading(memberId);
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        console.error("Deactivation failed:", data.error);
      }
      router.refresh();
    } catch {
      console.error("Network error deactivating member.");
    } finally {
      setActionLoading(null);
    }
  }

  const rolesInMatrix = Object.keys(permissionsByRole).sort();

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
              Invite User
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
            Invite your first team member to get started with collaboration.
          </div>
          {canManageMembers && (
            <button className="btn-primary" onClick={() => setShowInvite(true)}>
              <UserPlus size={16} />
              Invite User
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
                const isEditing = editingRoleId === member.id;
                const isLoading = actionLoading === member.id;
                const isOwner = member.role === "owner";

                return (
                  <tr
                    key={member.id}
                    style={isLoading ? { opacity: 0.5 } : undefined}
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
                      {isEditing ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <select
                            className="role-select-inline"
                            value={editingRoleValue}
                            onChange={(e) =>
                              setEditingRoleValue(e.target.value as MemberRole)
                            }
                          >
                            {ASSIGNABLE_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                          <button
                            className="member-action-btn"
                            title="Save role"
                            onClick={() => handleRoleChange(member.id)}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            className="member-action-btn"
                            title="Cancel"
                            onClick={() => setEditingRoleId(null)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className={`role-badge role-badge-${member.role}`}>
                          {ROLE_LABELS[member.role] ?? member.role}
                        </span>
                      )}
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
                        <div className="member-actions">
                          {!isOwner && !isEditing && (
                            <button
                              className="member-action-btn"
                              title="Change role"
                              onClick={() => {
                                setEditingRoleId(member.id);
                                setEditingRoleValue(member.role);
                              }}
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

      {/* Invite Modal */}
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
            <div className="invite-modal-title">Invite Team Member</div>
            <div className="invite-modal-desc">
              Send an invitation email to add a new member to your company.
            </div>

            {inviteError && (
              <div className="invite-error">{inviteError}</div>
            )}
            {inviteSuccess && (
              <div className="invite-success">{inviteSuccess}</div>
            )}

            <form onSubmit={handleInvite}>
              <div className="invite-form-group">
                <label className="invite-form-label">Email Address</label>
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
              </div>

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
                  {inviteLoading ? "Sending..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
