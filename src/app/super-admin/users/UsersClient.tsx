"use client";

import { useState } from "react";
import { Users, Shield, Search } from "lucide-react";
import type { PlatformUser } from "@/lib/queries/super-admin";

interface Props {
  users: Array<PlatformUser & { companies: string[] }>;
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
  const [search, setSearch] = useState("");

  const filtered = users.filter((u) => {
    const matchesSearch =
      search === "" ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch;
  });

  const totalUsers = users.length;
  const platformAdmins = users.filter((u) => u.is_platform_admin).length;

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
                <tr key={user.id}>
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
    </>
  );
}
