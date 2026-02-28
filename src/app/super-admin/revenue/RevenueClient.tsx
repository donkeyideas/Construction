"use client";

import { useTranslations, useLocale } from "next-intl";
import {
  DollarSign,
  TrendingUp,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  XCircle,
  CreditCard,
  RefreshCw,
  Check,
  X,
} from "lucide-react";
import type { RevenueStats, SubscriptionEvent } from "@/lib/queries/revenue";
import "@/styles/revenue.css";
import { formatDateTimeSafe } from "@/lib/utils/format";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  stats: RevenueStats;
  events: SubscriptionEvent[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDateTime(dateStr: string, locale: string): string {
  return formatDateTimeSafe(dateStr);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Map event_type to a badge CSS class and icon */
const EVENT_CONFIG: Record<
  string,
  { className: string; icon: React.ReactNode }
> = {
  upgraded: {
    className: "sa-badge sa-badge-green",
    icon: <ArrowUpRight size={14} />,
  },
  activated: {
    className: "sa-badge sa-badge-green",
    icon: <ArrowUpRight size={14} />,
  },
  renewed: {
    className: "sa-badge sa-badge-green",
    icon: <TrendingUp size={14} />,
  },
  downgraded: {
    className: "sa-badge sa-badge-amber",
    icon: <ArrowDownRight size={14} />,
  },
  canceled: {
    className: "sa-badge sa-badge-red",
    icon: <XCircle size={14} />,
  },
  payment_failed: {
    className: "sa-badge sa-badge-red",
    icon: <AlertTriangle size={14} />,
  },
};

const DEFAULT_EVENT_CONFIG = {
  className: "sa-badge sa-badge-blue",
  icon: <CreditCard size={14} />,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RevenueClient({ stats, events }: Props) {
  const t = useTranslations("superAdmin");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  // Find max revenue for the distribution bar proportions
  const maxRevenue = Math.max(
    ...stats.planDistribution.map((p) => p.count * p.monthlyPrice),
    1,
  );

  return (
    <div>
      {/* ── Header ── */}
      <div className="admin-header">
        <div>
          <h2>{t("revenueTitle")}</h2>
          <p className="admin-header-sub">{t("revenueDesc")}</p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="sa-kpi-grid rev-kpi-grid">
        {/* Estimated MRR */}
        <div className="sa-kpi-card">
          <div className="sa-kpi-info">
            <div className="sa-kpi-label">{t("estimatedMRR")}</div>
            <div className="sa-kpi-value" suppressHydrationWarning>
              {formatCurrency(stats.estimatedMRR)}
            </div>
          </div>
          <div className="sa-kpi-icon" style={{ color: "var(--color-green)" }}>
            <DollarSign size={20} />
          </div>
        </div>

        {/* Estimated ARR */}
        <div className="sa-kpi-card">
          <div className="sa-kpi-info">
            <div className="sa-kpi-label">{t("estimatedARR")}</div>
            <div className="sa-kpi-value" suppressHydrationWarning>
              {formatCurrency(stats.estimatedARR)}
            </div>
          </div>
          <div className="sa-kpi-icon" style={{ color: "var(--color-blue)" }}>
            <TrendingUp size={20} />
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="sa-kpi-card">
          <div className="sa-kpi-info">
            <div className="sa-kpi-label">{t("activeSubscriptions")}</div>
            <div className="sa-kpi-value">{stats.activeSubscriptions}</div>
          </div>
          <div className="sa-kpi-icon" style={{ color: "var(--color-green)" }}>
            <Users size={20} />
          </div>
        </div>

        {/* Trial Companies */}
        <div className="sa-kpi-card">
          <div className="sa-kpi-info">
            <div className="sa-kpi-label">{t("trialCompanies")}</div>
            <div className="sa-kpi-value">{stats.trialCompanies}</div>
          </div>
          <div className="sa-kpi-icon" style={{ color: "var(--color-amber)" }}>
            <CreditCard size={20} />
          </div>
        </div>

        {/* Past Due */}
        <div className="sa-kpi-card rev-kpi-pastdue">
          <div className="sa-kpi-info">
            <div className="sa-kpi-label">{t("pastDue")}</div>
            <div className="sa-kpi-value">{stats.pastDueCompanies}</div>
          </div>
          <div className="sa-kpi-icon" style={{ color: "var(--color-red)" }}>
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* ── Plan Distribution ── */}
      <div className="sa-card" style={{ marginBottom: 24 }}>
        <div className="sa-card-title">
          <DollarSign size={18} />
          {t("revenueByPlan")}
        </div>

        {stats.planDistribution.length === 0 ? (
          <div className="sa-empty" style={{ padding: "32px 16px" }}>
            <div className="sa-empty-title">{t("noPlanData")}</div>
            <div className="sa-empty-desc">{t("noPlanDataDesc")}</div>
          </div>
        ) : (
          <div className="rev-plan-list">
            {stats.planDistribution.map((item) => {
              const monthlyRevenue = item.count * item.monthlyPrice;
              const barWidth =
                maxRevenue > 0 ? (monthlyRevenue / maxRevenue) * 100 : 0;

              return (
                <div key={item.plan} className="rev-plan-row">
                  <div className="rev-plan-info">
                    <span className="rev-plan-name">{capitalize(item.plan)}</span>
                    <span className="rev-plan-meta" suppressHydrationWarning>
                      {item.count} {item.count === 1 ? t("company") : t("companiesLabel")}{" "}
                      &middot; {formatCurrency(item.monthlyPrice)}/{t("mo")}
                    </span>
                  </div>
                  <div className="rev-plan-bar-wrap">
                    <div
                      className="rev-plan-bar"
                      style={{ width: `${Math.max(barWidth, 2)}%` }}
                    />
                  </div>
                  <div className="rev-plan-revenue" suppressHydrationWarning>
                    {formatCurrency(monthlyRevenue)}
                    <span className="rev-plan-revenue-label">/{t("mo")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Recent Events Timeline ── */}
      <div className="sa-card">
        <div className="sa-card-title">
          <CreditCard size={18} />
          {t("recentSubEventsTitle")}
        </div>

        {events.length === 0 ? (
          <div className="sa-empty" style={{ padding: "32px 16px" }}>
            <div className="sa-empty-title">{t("noSubEvents")}</div>
            <div className="sa-empty-desc">{t("eventsWillAppear")}</div>
          </div>
        ) : (
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>{t("event")}</th>
                  <th>{t("user")}</th>
                  <th>{t("company")}</th>
                  <th>{t("planChange")}</th>
                  <th>{t("amount")}</th>
                  <th>Recurring</th>
                  <th>Status</th>
                  <th>{t("date")}</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => {
                  const config =
                    EVENT_CONFIG[evt.event_type] || DEFAULT_EVENT_CONFIG;
                  const isCanceled = evt.event_type === "canceled" || evt.subscription_status === "canceled";
                  return (
                    <tr key={evt.id}>
                      <td>
                        <span className={config.className}>
                          {config.icon}
                          {evt.event_type
                            .split("_")
                            .map((w) => capitalize(w))
                            .join(" ")}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.82rem" }}>
                        {evt.user_name || <span style={{ color: "var(--muted)" }}>--</span>}
                      </td>
                      <td>{evt.company_name}</td>
                      <td
                        style={{
                          color: "var(--muted)",
                          fontSize: "0.82rem",
                        }}
                      >
                        {evt.plan_from && evt.plan_to
                          ? `${capitalize(evt.plan_from)} \u2192 ${capitalize(evt.plan_to)}`
                          : evt.plan_to
                            ? `\u2192 ${capitalize(evt.plan_to)}`
                            : evt.plan_from
                              ? `${capitalize(evt.plan_from)} \u2192`
                              : "--"}
                      </td>
                      <td>
                        {evt.amount != null ? (
                          <span style={{ fontWeight: 600 }}>
                            ${evt.amount.toFixed(2)}
                          </span>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>--</span>
                        )}
                      </td>
                      <td>
                        {evt.is_recurring ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--color-green)", fontSize: "0.82rem" }}>
                            <RefreshCw size={13} /> Yes
                          </span>
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>No</span>
                        )}
                      </td>
                      <td>
                        {isCanceled ? (
                          <span className="sa-badge sa-badge-red" style={{ fontSize: "0.7rem" }}>
                            <X size={12} /> Canceled
                          </span>
                        ) : evt.subscription_status === "active" ? (
                          <span className="sa-badge sa-badge-green" style={{ fontSize: "0.7rem" }}>
                            <Check size={12} /> Active
                          </span>
                        ) : evt.subscription_status === "past_due" ? (
                          <span className="sa-badge sa-badge-amber" style={{ fontSize: "0.7rem" }}>
                            <AlertTriangle size={12} /> Past Due
                          </span>
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                            {evt.subscription_status ? capitalize(evt.subscription_status) : "--"}
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          color: "var(--muted)",
                          fontSize: "0.82rem",
                          whiteSpace: "nowrap",
                        }}
                        suppressHydrationWarning
                      >
                        {formatDateTime(evt.created_at, dateLocale)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
