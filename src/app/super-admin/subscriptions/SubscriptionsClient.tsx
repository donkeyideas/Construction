"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { formatDateSafe, formatDateTimeSafe } from "@/lib/utils/format";
import { 
  CreditCard,
  Building2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
} from "lucide-react";

interface CompanySub {
  id: string;
  name: string;
  plan: string;
  status: string;
  created_at: string;
}

interface SubEvent {
  id: string;
  company_id: string;
  event_type: string;
  plan_from: string | null;
  plan_to: string | null;
  amount: number | null;
  created_at: string;
  company_name?: string;
}

interface Props {
  companies: CompanySub[];
  events: SubEvent[];
}

function formatDate(dateStr: string, locale: string): string {
  return formatDateSafe(dateStr);
}

function formatDateTime(dateStr: string, locale: string): string {
  return formatDateTimeSafe(dateStr);
}

const PLAN_COLORS: Record<string, string> = {
  free: "var(--muted)",
  starter: "var(--color-green)",
  professional: "var(--color-blue)",
  enterprise: "var(--color-amber)",
};

const STATUS_COLORS: Record<string, string> = {
  active: "var(--color-green)",
  trialing: "var(--color-blue)",
  past_due: "var(--color-amber)",
  canceled: "var(--color-red)",
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  upgraded: <TrendingUp size={14} />,
  downgraded: <TrendingDown size={14} />,
  canceled: <AlertCircle size={14} />,
  payment_failed: <AlertCircle size={14} />,
  activated: <CheckCircle2 size={14} />,
  trial_started: <Clock size={14} />,
};

export default function SubscriptionsClient({ companies, events }: Props) {
  const t = useTranslations("superAdmin");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");

  const filteredCompanies = companies.filter((c) => {
    const matchesSearch =
      !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === "all" || c.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  // Stats
  const planCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  for (const c of companies) {
    planCounts[c.plan] = (planCounts[c.plan] || 0) + 1;
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  }

  const uniquePlans = [...new Set(companies.map((c) => c.plan))].sort();

  return (
    <div>
      {/* Header */}
      <div className="admin-header">
        <div>
          <h2>{t("subscriptionsTitle")}</h2>
          <p className="admin-header-sub">
            {t("subscriptionsDesc")}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <Building2 size={18} />
          </div>
          <div className="admin-stat-label">{t("totalCompanies")}</div>
          <div className="admin-stat-value">{companies.length}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon green">
            <CheckCircle2 size={18} />
          </div>
          <div className="admin-stat-label">{t("active")}</div>
          <div className="admin-stat-value">{statusCounts["active"] || 0}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon amber">
            <Clock size={18} />
          </div>
          <div className="admin-stat-label">{t("trialing")}</div>
          <div className="admin-stat-value">
            {statusCounts["trialing"] || 0}
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon red">
            <CreditCard size={18} />
          </div>
          <div className="admin-stat-label">{t("pastDue")}</div>
          <div className="admin-stat-value">
            {statusCounts["past_due"] || 0}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 300 }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted)",
            }}
          />
          <input
            type="text"
            placeholder={t("searchCompanies")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="invite-form-input"
            style={{ paddingLeft: 32, width: "100%" }}
          />
        </div>
        <select
          className="invite-form-select"
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
        >
          <option value="all">{t("allPlans")}</option>
          {uniquePlans.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)} ({planCounts[p] || 0})
            </option>
          ))}
        </select>
      </div>

      {/* Companies Table */}
      <div className="members-table-wrap">
        <table className="members-table">
          <thead>
            <tr>
              <th>{t("company")}</th>
              <th>{t("plan")}</th>
              <th>{t("status")}</th>
              <th>{t("joined")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredCompanies.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
                  {t("noCompaniesMatch")}
                </td>
              </tr>
            ) : (
              filteredCompanies.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="member-name">{c.name}</span>
                  </td>
                  <td>
                    <span
                      className="role-badge"
                      style={{
                        background: `color-mix(in srgb, ${PLAN_COLORS[c.plan] || "var(--muted)"} 12%, transparent)`,
                        color: PLAN_COLORS[c.plan] || "var(--muted)",
                      }}
                    >
                      {c.plan.charAt(0).toUpperCase() + c.plan.slice(1)}
                    </span>
                  </td>
                  <td>
                    <span className="member-status">
                      <span
                        className="member-status-dot"
                        style={{
                          background: STATUS_COLORS[c.status] || "var(--muted)",
                        }}
                      />
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1).replace("_", " ")}
                    </span>
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                    {formatDate(c.created_at, dateLocale)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Recent Events */}
      <div className="permissions-section">
        <h3 className="permissions-section-title">{t("recentSubEventsTitle")}</h3>
        {events.length === 0 ? (
          <div className="admin-empty" style={{ padding: "32px 16px" }}>
            <div className="admin-empty-title">{t("noSubEvents")}</div>
            <div className="admin-empty-desc">
              {t("eventsWillAppear")}
            </div>
          </div>
        ) : (
          <div className="members-table-wrap">
            <table className="members-table">
              <thead>
                <tr>
                  <th>{t("event")}</th>
                  <th>{t("company")}</th>
                  <th>{t("details")}</th>
                  <th>{t("date")}</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => (
                  <tr key={evt.id}>
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontWeight: 500,
                        }}
                      >
                        {EVENT_ICONS[evt.event_type] || <CreditCard size={14} />}
                        {evt.event_type
                          .split("_")
                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(" ")}
                      </span>
                    </td>
                    <td>{evt.company_name || t("unknown")}</td>
                    <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                      {evt.plan_from && evt.plan_to
                        ? `${evt.plan_from} → ${evt.plan_to}`
                        : evt.plan_to
                          ? `→ ${evt.plan_to}`
                          : evt.plan_from
                            ? `${evt.plan_from} →`
                            : "--"}
                      {evt.amount != null && ` ($${evt.amount.toFixed(2)})`}
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                      {formatDateTime(evt.created_at, dateLocale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
