import { redirect } from "next/navigation";
import Link from "next/link";
import {
  HardHat,
  DollarSign,
  Building2,
  Users,
  ChevronRight,
  BarChart3,
  TrendingUp,
  Calendar,
  PieChart,
  CreditCard,
  Wallet,
  LineChart,
  Home,
  Percent,
  FileText,
  Clock,
  Shield,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Reports Center - Buildwrk",
};

interface ReportItem {
  name: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

interface ReportCategory {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  reports: ReportItem[];
}

export default async function ReportsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const t = await getTranslations("reports");

  const reportCategories: ReportCategory[] = [
    {
      title: t("catProjects"),
      icon: <HardHat size={22} />,
      iconColor: "var(--color-blue)",
      reports: [
        {
          name: t("rptProjectPerformance"),
          description: t("rptProjectPerformanceDesc"),
          href: "/reports/project-performance",
          icon: <BarChart3 size={16} />,
        },
        {
          name: t("rptBudgetVsActual"),
          description: t("rptBudgetVsActualDesc"),
          href: "/financial/job-costing",
          icon: <TrendingUp size={16} />,
        },
        {
          name: t("rptScheduleAnalysis"),
          description: t("rptScheduleAnalysisDesc"),
          href: "/projects/gantt",
          icon: <Calendar size={16} />,
        },
      ],
    },
    {
      title: t("catFinancial"),
      icon: <DollarSign size={22} />,
      iconColor: "var(--color-green)",
      reports: [
        {
          name: t("rptFinancialSummary"),
          description: t("rptFinancialSummaryDesc"),
          href: "/reports/financial-summary",
          icon: <PieChart size={16} />,
        },
        {
          name: t("rptArAging"),
          description: t("rptArAgingDesc"),
          href: "/reports/aging?type=receivable",
          icon: <CreditCard size={16} />,
        },
        {
          name: t("rptApAging"),
          description: t("rptApAgingDesc"),
          href: "/reports/aging?type=payable",
          icon: <Wallet size={16} />,
        },
        {
          name: t("rptCashFlow"),
          description: t("rptCashFlowDesc"),
          href: "/financial/cash-flow",
          icon: <LineChart size={16} />,
        },
      ],
    },
    {
      title: t("catProperty"),
      icon: <Building2 size={22} />,
      iconColor: "var(--color-amber)",
      reports: [
        {
          name: t("rptPortfolioSummary"),
          description: t("rptPortfolioSummaryDesc"),
          href: "/reports/portfolio",
          icon: <Home size={16} />,
        },
        {
          name: t("rptOccupancyAnalysis"),
          description: t("rptOccupancyAnalysisDesc"),
          href: "/properties",
          icon: <Percent size={16} />,
        },
        {
          name: t("rptProfitLoss"),
          description: t("rptProfitLossDesc"),
          href: "/financial/income-statement",
          icon: <TrendingUp size={16} />,
        },
        {
          name: t("rptRentRoll"),
          description: t("rptRentRollDesc"),
          href: "/properties/leases",
          icon: <FileText size={16} />,
        },
      ],
    },
    {
      title: t("catPeople"),
      icon: <Users size={22} />,
      iconColor: "var(--color-red)",
      reports: [
        {
          name: t("rptWorkforceSummary"),
          description: t("rptWorkforceSummaryDesc"),
          href: "/people",
          icon: <Users size={16} />,
        },
        {
          name: t("rptTimeAttendance"),
          description: t("rptTimeAttendanceDesc"),
          href: "/people/time",
          icon: <Clock size={16} />,
        },
        {
          name: t("rptCertStatus"),
          description: t("rptCertStatusDesc"),
          href: "/people/certifications",
          icon: <Shield size={16} />,
        },
      ],
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="reports-header">
        <div>
          <h2>{t("centerTitle")}</h2>
          <p className="reports-header-sub">
            {t("centerSubtitle")}
          </p>
        </div>
      </div>

      {/* Authoritative Reports Banner */}
      <Link
        href="/reports/authoritative"
        className="auth-report-card"
        data-type="market_feasibility"
        style={{ marginBottom: "2rem", display: "block" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            className="auth-report-card-icon"
            style={{ background: "#1B2A4A15", color: "#1B2A4A" }}
          >
            <Sparkles size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: "0 0 0.25rem" }}>{t("authoritativeReports")}</h3>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>
              {t("authoritativeDesc")}
            </p>
          </div>
          <ChevronRight size={18} style={{ color: "var(--color-blue)" }} />
        </div>
      </Link>

      {/* Report Categories Grid */}
      <div className="reports-grid">
        {reportCategories.map((category) => (
          <div key={category.title} className="report-category">
            <div className="report-category-header">
              <div
                className="report-category-icon"
                style={{ color: category.iconColor }}
              >
                {category.icon}
              </div>
              <h3 className="report-category-title">{category.title}</h3>
            </div>
            <div className="report-list">
              {category.reports.map((report) => (
                <Link
                  key={report.name}
                  href={report.href}
                  className="report-link"
                >
                  <div className="report-link-icon">{report.icon}</div>
                  <div className="report-link-content">
                    <div className="report-link-name">{report.name}</div>
                    <div className="report-link-desc">{report.description}</div>
                  </div>
                  <ChevronRight size={16} className="report-link-arrow" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
