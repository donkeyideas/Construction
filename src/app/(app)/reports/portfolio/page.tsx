import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getPropertyPortfolioReport } from "@/lib/queries/reports";
import { formatCurrency, formatPercent, formatCompactCurrency } from "@/lib/utils/format";
import ExportButton from "@/components/reports/ExportButton";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Property Portfolio Report - Buildwrk",
};

export default async function PortfolioReportPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const t = await getTranslations("reports");

  const portfolio = await getPropertyPortfolioReport(
    supabase,
    userCompany.companyId
  );

  return (
    <div>
      {/* Header */}
      <div className="report-page-header">
        <div className="report-page-nav">
          <Link href="/reports" className="report-back-link">
            <ArrowLeft size={16} />
            {t("centerTitle")}
          </Link>
        </div>
        <div className="report-page-title-row">
          <div>
            <h2>{t("portfolioTitle")}</h2>
            <p className="report-page-sub">
              {t("portfolioSubtitle")}
            </p>
          </div>
          <div className="report-page-actions">
            <ExportButton
              reportType="portfolio"
              reportTitle={t("portfolioTitle")}
              data={portfolio.properties.map((p) => ({
                name: p.name,
                property_type: p.property_type,
                total_units: p.total_units,
                occupied_units: p.occupied_units,
                occupancy_rate: p.occupancy_rate,
                monthly_revenue: p.monthly_revenue,
                monthly_expenses: p.monthly_expenses,
                noi: p.noi,
                cap_rate: p.cap_rate,
              }))}
              columns={[
                { key: "name", label: t("thProperty") },
                { key: "property_type", label: t("thType") },
                { key: "total_units", label: t("totalUnits") },
                { key: "occupied_units", label: t("thOccupancy") },
                { key: "occupancy_rate", label: t("thOccupancy") + " %" },
                { key: "monthly_revenue", label: t("thMonthlyRevenue") },
                { key: "monthly_expenses", label: t("thMonthlyExpenses") },
                { key: "noi", label: t("thNOI") },
                { key: "cap_rate", label: t("thCapRate") + " %" },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Portfolio KPIs */}
      {portfolio.totalProperties > 0 && (
        <div className="portfolio-kpi-row">
          <div className="portfolio-kpi">
            <span className="portfolio-kpi-label">{t("totalProperties")}</span>
            <span className="portfolio-kpi-value">
              {portfolio.totalProperties}
            </span>
          </div>
          <div className="portfolio-kpi">
            <span className="portfolio-kpi-label">{t("totalUnits")}</span>
            <span className="portfolio-kpi-value">
              {portfolio.totalUnits}
            </span>
          </div>
          <div className="portfolio-kpi">
            <span className="portfolio-kpi-label">{t("avgOccupancyShort")}</span>
            <span className="portfolio-kpi-value">
              {formatPercent(portfolio.avgOccupancy)}
            </span>
          </div>
          <div className="portfolio-kpi">
            <span className="portfolio-kpi-label">{t("totalMonthlyNOI")}</span>
            <span className="portfolio-kpi-value">
              {formatCompactCurrency(portfolio.totalNOI)}
            </span>
          </div>
        </div>
      )}

      {/* Detail Table */}
      {portfolio.properties.length === 0 ? (
        <div className="report-empty">
          <Building2 size={48} style={{ color: "var(--border)" }} />
          <div className="report-empty-title">{t("noProperties")}</div>
          <div className="report-empty-desc">
            {t("addPropertiesToSeeReport")}
          </div>
          <Link
            href="/properties"
            className="ui-btn ui-btn-primary ui-btn-md"
            style={{ marginTop: "12px" }}
          >
            {t("goToProperties")}
          </Link>
        </div>
      ) : (
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>{t("thProperty")}</th>
                <th>{t("thType")}</th>
                <th style={{ textAlign: "center" }}>{t("thUnits")}</th>
                <th style={{ textAlign: "center" }}>{t("thOccupancy")}</th>
                <th style={{ textAlign: "right" }}>{t("thMonthlyRevenue")}</th>
                <th style={{ textAlign: "right" }}>{t("thMonthlyExpenses")}</th>
                <th style={{ textAlign: "right" }}>{t("thNOI")}</th>
                <th style={{ textAlign: "right" }}>{t("thCapRate")}</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.properties.map((p) => {
                const occupancyClass =
                  p.occupancy_rate >= 90
                    ? "variance-positive"
                    : p.occupancy_rate >= 75
                      ? "variance-warning"
                      : "variance-negative";

                const noiClass =
                  p.noi > 0
                    ? "variance-positive"
                    : p.noi === 0
                      ? ""
                      : "variance-negative";

                const typeLabels: Record<string, string> = {
                  residential: "Residential",
                  commercial: "Commercial",
                  industrial: "Industrial",
                  mixed_use: "Mixed Use",
                };

                return (
                  <tr key={p.id}>
                    <td>
                      <Link
                        href={`/properties/${p.id}`}
                        className="report-project-link"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td>
                      <span className="badge badge-blue">
                        {typeLabels[p.property_type] ?? p.property_type}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {p.occupied_units}/{p.total_units}
                    </td>
                    <td style={{ textAlign: "center" }} className={occupancyClass}>
                      {formatPercent(p.occupancy_rate)}
                    </td>
                    <td className="report-num">
                      {formatCurrency(p.monthly_revenue)}
                    </td>
                    <td className="report-num">
                      {formatCurrency(p.monthly_expenses)}
                    </td>
                    <td className={`report-num ${noiClass}`}>
                      {formatCurrency(p.noi)}
                    </td>
                    <td className="report-num">
                      {p.cap_rate != null
                        ? formatPercent(p.cap_rate)
                        : "--"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="report-summary-row">
                <td colSpan={2}>
                  <strong>
                    {t("portfolioTotal")} ({portfolio.totalProperties} propert
                    {portfolio.totalProperties !== 1 ? "ies" : "y"})
                  </strong>
                </td>
                <td style={{ textAlign: "center" }}>
                  <strong>
                    {portfolio.totalOccupied}/{portfolio.totalUnits}
                  </strong>
                </td>
                <td
                  style={{ textAlign: "center" }}
                  className={
                    portfolio.avgOccupancy >= 90
                      ? "variance-positive"
                      : portfolio.avgOccupancy >= 75
                        ? "variance-warning"
                        : "variance-negative"
                  }
                >
                  <strong>{formatPercent(portfolio.avgOccupancy)}</strong>
                </td>
                <td className="report-num">
                  <strong>
                    {formatCurrency(portfolio.totalMonthlyRevenue)}
                  </strong>
                </td>
                <td className="report-num">
                  <strong>
                    {formatCurrency(portfolio.totalMonthlyExpenses)}
                  </strong>
                </td>
                <td
                  className={`report-num ${portfolio.totalNOI >= 0 ? "variance-positive" : "variance-negative"}`}
                >
                  <strong>{formatCurrency(portfolio.totalNOI)}</strong>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
