"use client";

import { useState } from "react";
import { Users, Shield, Search, X, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import type { PlatformUser } from "@/lib/queries/super-admin";

type UserWithCompanies = PlatformUser & { companies: string[] };

interface Props {
  users: UserWithCompanies[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.substring(0, 2).toUpperCase();
}

export default function UsersClient({ users }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithCompanies | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    const matchesSearch =
      search === "" ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch;
  });

  const totalUsers = users.length;
  const platformAdmins = users.filter((u) => u.is_platform_admin).length;

  function closeModal() {
    setSelectedUser(null);
    setSaveError(null);
  }

  async function handleToggleAdmin() {
    if (!selectedUser) return;
    setSaving(true);
    setSaveError(null);
    try {
      const newStatus = !selectedUser.is_platform_admin;
      const res = await fetch(`/api/super-admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_platform_admin: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");
      setSelectedUser({ ...selectedUser, is_platform_admin: newStatus });
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="admin-header">
        <div>
          <h2>Platform Users</h2>
          <p className="admin-header-sub">
            All users across all companies on the platform
          </p>
        </div>
      </div>

      <div className="admin-stats" style={{ gridTemplateColumns: "repeat(2, 1fr)", maxWidth: "400px" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <Users size={18} />
          </div>
          <div className="admin-stat-label">Total Users</div>
          <div className="admin-stat-value">{totalUsers}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon amber">
            <Shield size={18} />
          </div>
          <div className="admin-stat-label">Platform Admins</div>
          <div className="admin-stat-value">{platformAdmins}</div>
        </div>
      </div>

      <div style={{ marginBottom: "20px", maxWidth: "320px", position: "relative" }}>
        <Search
          size={14}
          style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}
        />
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="invite-form-input"
          style={{ paddingLeft: "32px", width: "100%" }}
        />
      </div>

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Companies</th>
              <th>Platform Admin</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                  No users found
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id} onClick={() => setSelectedUser(user)} style={{ cursor: "pointer" }}>
                  <td>
                    <div className="member-info">
                      <div className="member-avatar">
                        {getInitials(user.full_name, user.email)}
                      </div>
                      <div>
                        <div className="member-name">
                          {user.full_name || "No name"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: "var(--muted)" }}>{user.email}</td>
                  <td>
                    {user.companies.length === 0 ? (
                      <span style={{ color: "var(--muted)" }}>None</span>
                    ) : (
                      user.companies.map((name, i) => (
                        <span key={i}>
                          {i > 0 && ", "}
                          {name}
                        </span>
                      ))
                    )}
                  </td>
                  <td>
                    {user.is_platform_admin ? (
                      <span className="sa-badge sa-badge-amber">Admin</span>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>-</span>
                    )}
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                    {formatDate(user.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="ticket-modal-overlay" onClick={closeModal}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="ticket-modal-header">
              <h3>{selectedUser.full_name || selectedUser.email}</h3>
              <button className="ticket-modal-close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            {saveError && (
              <div className="ticket-form-error">{saveError}</div>
            )}

            <div style={{ padding: "1.2rem" }}>
              <div className="detail-group" style={{ marginBottom: 4 }}>
                <label className="detail-label">Full Name</label>
                <div className="detail-value">{selectedUser.full_name || "No name"}</div>
              </div>

              <div className="detail-group" style={{ marginBottom: 4 }}>
                <label className="detail-label">Email</label>
                <div className="detail-value">{selectedUser.email}</div>
              </div>

              <div className="detail-row">
                <div className="detail-group">
                  <label className="detail-label">Platform Admin</label>
                  <div className="detail-value">
                    {selectedUser.is_platform_admin ? (
                      <span className="sa-badge sa-badge-amber">Yes</span>
                    ) : (
                      <span className="sa-badge" style={{ background: "var(--surface)", color: "var(--muted)" }}>No</span>
                    )}
                  </div>
                </div>
                <div className="detail-group">
                  <label className="detail-label">Joined</label>
                  <div className="detail-value">{formatDate(selectedUser.created_at)}</div>
                </div>
              </div>

              <div className="detail-group">
                <label className="detail-label">Companies</label>
                <div className="detail-value" style={{ borderBottom: "none" }}>
                  {selectedUser.companies.length === 0
                    ? "None"
                    : selectedUser.companies.join(", ")}
                </div>
              </div>

              <div className="ticket-form-actions">
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={saving}>
                  Close
                </button>
                {selectedUser.is_platform_admin ? (
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ backgroundColor: "var(--color-red)" }}
                    onClick={handleToggleAdmin}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Revoke Admin"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleToggleAdmin}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Grant Admin"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
