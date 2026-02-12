"use client";

import { useState } from "react";
import { Building2, Search } from "lucide-react";
import type { PlatformCompany } from "@/lib/queries/super-admin";

interface Props {
  companies: (PlatformCompany & { member_count: number })[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPlanBadgeClass(plan: string): string {
  switch (plan) {
    case "enterprise":
      return "sa-plan-enterprise";
    case "professional":
      return "sa-plan-professional";
    default:
      return "sa-plan-starter";
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "active":
      return "sa-status-active";
    case "trial":
      return "sa-status-trial";
    case "canceled":
      return "sa-status-canceled";
    case "past_due":
      return "sa-status-past_due";
    default:
      return "";
  }
}

export default function CompaniesClient({ companies }: Props) {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = companies.filter((c) => {
    const matchesSearch =
      search === "" ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === "all" || c.subscription_plan === planFilter;
    const matchesStatus = statusFilter === "all" || c.subscription_status === statusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const totalActive = companies.filter((c) => c.subscription_status === "active").length;
  const totalTrial = companies.filter((c) => c.subscription_status === "trial").length;
  const totalUsers = companies.reduce((sum, c) => sum + c.member_count, 0);

  return (
    <>
      <div className="admin-header">
        <div>
          <h2>Companies</h2>
          <p className="admin-header-sub">
            All registered companies on the platform
          </p>
        </div>
      </div>

      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <Building2 size={18} />
          </div>
          <div className="admin-stat-label">Total Companies</div>
          <div className="admin-stat-value">{companies.length}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon green">
            <Building2 size={18} />
          </div>
          <div className="admin-stat-label">Active</div>
          <div className="admin-stat-value">{totalActive}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon amber">
            <Building2 size={18} />
          </div>
          <div className="admin-stat-label">Trial</div>
          <div className="admin-stat-value">{totalTrial}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <Building2 size={18} />
          </div>
          <div className="admin-stat-label">Total Users</div>
          <div className="admin-stat-value">{totalUsers}</div>
        </div>
      </div>

      <div style={{
        display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap",
        alignItems: "center",
      }}>
        <div style={{ position: "relative", flex: "1 1 200px", maxWidth: "320px" }}>
          <Search
            size={14}
            style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}
          />
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="invite-form-input"
            style={{ paddingLeft: "32px", width: "100%" }}
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="invite-form-select"
        >
          <option value="all">All Plans</option>
          <option value="starter">Starter</option>
          <option value="professional">Professional</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="invite-form-select"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="past_due">Past Due</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Slug</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Users</th>
              <th>Industry</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                  No companies found
                </td>
              </tr>
            ) : (
              filtered.map((company) => (
                <tr key={company.id}>
                  <td style={{ fontWeight: 500 }}>{company.name}</td>
                  <td style={{ color: "var(--muted)", fontFamily: "monospace", fontSize: "0.8rem" }}>
                    {company.slug}
                  </td>
                  <td>
                    <span className={`sa-plan-badge ${getPlanBadgeClass(company.subscription_plan)}`}>
                      {company.subscription_plan}
                    </span>
                  </td>
                  <td>
                    <span className={`sa-status-badge ${getStatusBadgeClass(company.subscription_status)}`}>
                      <span className="sa-status-dot" />
                      {company.subscription_status}
                    </span>
                  </td>
                  <td>{company.member_count}</td>
                  <td style={{ color: "var(--muted)" }}>{company.industry_type || "-"}</td>
                  <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                    {formatDate(company.created_at)}
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
