import { redirect } from "next/navigation";
import Link from "next/link";
import {
  DollarSign,
  Briefcase,
  FileWarning,
  Clock,
  MessageSquare,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getDashboardKPIs,
  getProjectStatusBreakdown,
  getPendingApprovals,
} from "@/lib/queries/dashboard";
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
} from "@/lib/utils/format";
import { getTranslations, getLocale } from "next-intl/server";
import ExecutiveAiInput from "./ExecutiveAiInput";

export const metadata = {
  title: "Executive Dashboard - Buildwrk",
};

export default async function ExecutiveMobilePage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/login");
  }

  const { companyId } = userCompany;
  const t = await getTranslations("mobile.executive");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const [kpis, projectStatus, pendingApprovalsResult] = await Promise.all([
    getDashboardKPIs(supabase, companyId),
    getProjectStatusBreakdown(supabase, companyId),
    getPendingApprovals(supabase, companyId),
  ]);
  const { items: pendingApprovals, totalCount: pendingApprovalsTotal } = pendingApprovalsResult;

  return (
    <div>
      <div className="mobile-header">
        <div>
          <h2>{t("title")}</h2>
          <div className="mobile-header-date">
            {new Date().toLocaleDateString(dateLocale, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
        <Link
          href="/mobile/profile"
          style={{
            fontSize: "0.75rem",
            color: "var(--color-blue)",
            textDecoration: "none",
          }}
        >
          {tc("back")}
        </Link>
      </div>

      {/* KPI Grid */}
      <div className="mobile-kpi-grid">
        <div className="mobile-kpi">
          <div className="mobile-kpi-label">
            <Briefcase
              size={12}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: "4px",
              }}
            />
            {t("activeProjects")}
          </div>
          <div className="mobile-kpi-value">
            {formatCompactCurrency(kpis.activeProjectsValue)}
          </div>
        </div>
        <div className="mobile-kpi">
          <div className="mobile-kpi-label">
            <DollarSign
              size={12}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: "4px",
              }}
            />
            {t("cashPosition")}
          </div>
          <div className="mobile-kpi-value">
            {formatCompactCurrency(kpis.cashPosition)}
          </div>
        </div>
        <div className="mobile-kpi">
          <div className="mobile-kpi-label">
            <FileWarning
              size={12}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: "4px",
              }}
            />
            {t("openCOs")}
          </div>
          <div
            className="mobile-kpi-value"
            style={{
              color:
                kpis.openChangeOrders > 0
                  ? "var(--color-amber)"
                  : "var(--text)",
            }}
          >
            {kpis.openChangeOrders}
          </div>
        </div>
        <div className="mobile-kpi">
          <div className="mobile-kpi-label">
            <Clock
              size={12}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: "4px",
              }}
            />
            {t("schedule")}
          </div>
          <div className="mobile-kpi-value">
            {formatPercent(kpis.schedulePerformance)}
          </div>
        </div>
      </div>

      {/* Project Counts */}
      <div className="mobile-card">
        <div className="mobile-card-title">{t("projectStatus")}</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "8px",
          }}
        >
          <StatusItem label={t("statusActive")} count={projectStatus.active} color="var(--color-blue)" />
          <StatusItem
            label={t("preConstruction")}
            count={projectStatus.pre_construction}
            color="var(--color-amber)"
          />
          <StatusItem label={t("completed")} count={projectStatus.completed} color="var(--color-green)" />
          <StatusItem label={t("onHold")} count={projectStatus.on_hold} color="var(--color-red)" />
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="mobile-card">
        <div className="mobile-card-title">
          {t("pendingApprovals", { count: pendingApprovalsTotal })}
        </div>
        {pendingApprovals.length === 0 ? (
          <div className="mobile-empty">{t("noPendingApprovals")}</div>
        ) : (
          pendingApprovals.map((item) => (
            <div key={item.entityId} className="mobile-approval">
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  flexShrink: 0,
                  background:
                    item.urgency === "high"
                      ? "var(--color-red)"
                      : item.urgency === "medium"
                        ? "var(--color-amber)"
                        : "var(--color-green)",
                }}
              />
              <div className="mobile-approval-info">
                <div className="mobile-approval-title">{item.title}</div>
                <div className="mobile-approval-meta">
                  {item.type.replace("_", " ")} --{" "}
                  {item.amount != null ? formatCurrency(item.amount) : "N/A"}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* AI Query */}
      <div className="mobile-card">
        <div className="mobile-card-title">
          <MessageSquare
            size={16}
            style={{
              display: "inline",
              verticalAlign: "middle",
              marginRight: "6px",
            }}
          />
          {t("askAi")}
        </div>
        <ExecutiveAiInput />
      </div>
    </div>
  );
}

function StatusItem({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: "0.8rem" }}>
        {label}:{" "}
        <strong>{count}</strong>
      </span>
    </div>
  );
}
