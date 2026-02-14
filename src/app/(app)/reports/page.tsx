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
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

export const metadata = {
  title: "Reports Center - ConstructionERP",
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

const reportCategories: ReportCategory[] = [
  {
    title: "Project Reports",
    icon: <HardHat size={22} />,
    iconColor: "var(--color-blue)",
    reports: [
      {
        name: "Project Performance Summary",
        description:
          "Budget variance, schedule status, and completion tracking across all active projects.",
        href: "/reports/project-performance",
        icon: <BarChart3 size={16} />,
      },
      {
        name: "Budget vs Actual",
        description:
          "Detailed comparison of budgeted amounts against actual costs by project and CSI division.",
        href: "/financial/job-costing",
        icon: <TrendingUp size={16} />,
      },
      {
        name: "Schedule Analysis",
        description:
          "Timeline adherence, milestone tracking, and critical path analysis for active projects.",
        href: "/projects/gantt",
        icon: <Calendar size={16} />,
      },
    ],
  },
  {
    title: "Financial Reports",
    icon: <DollarSign size={22} />,
    iconColor: "var(--color-green)",
    reports: [
      {
        name: "Financial Summary",
        description:
          "Revenue, expenses, net income, AR/AP balances, and profit margin for the current fiscal period.",
        href: "/reports/financial-summary",
        icon: <PieChart size={16} />,
      },
      {
        name: "AR Aging Report",
        description:
          "Accounts receivable aging by bucket with outstanding invoice details.",
        href: "/reports/aging?type=receivable",
        icon: <CreditCard size={16} />,
      },
      {
        name: "AP Aging Report",
        description:
          "Accounts payable aging by bucket with vendor invoice details.",
        href: "/reports/aging?type=payable",
        icon: <Wallet size={16} />,
      },
      {
        name: "Cash Flow",
        description:
          "Monthly inflows and outflows with net cash position trending.",
        href: "/financial/cash-flow",
        icon: <LineChart size={16} />,
      },
    ],
  },
  {
    title: "Property Reports",
    icon: <Building2 size={22} />,
    iconColor: "var(--color-amber)",
    reports: [
      {
        name: "Portfolio Summary",
        description:
          "Occupancy rates, NOI, revenue, and cap rates across all properties.",
        href: "/reports/portfolio",
        icon: <Home size={16} />,
      },
      {
        name: "Occupancy Analysis",
        description:
          "Unit-level occupancy trends, vacancy rates, and lease expiration timelines.",
        href: "/properties",
        icon: <Percent size={16} />,
      },
      {
        name: "Profit & Loss",
        description:
          "Detailed income and expenses breakdown from the financial overview page.",
        href: "/financial/income-statement",
        icon: <TrendingUp size={16} />,
      },
      {
        name: "Rent Roll",
        description:
          "Complete tenant listing with lease terms, monthly rent, and payment status.",
        href: "/properties/leases",
        icon: <FileText size={16} />,
      },
    ],
  },
  {
    title: "People Reports",
    icon: <Users size={22} />,
    iconColor: "var(--color-red)",
    reports: [
      {
        name: "Workforce Summary",
        description:
          "Team headcount, role distribution, and project assignments overview.",
        href: "/people",
        icon: <Users size={16} />,
      },
      {
        name: "Time & Attendance",
        description:
          "Hours logged, overtime tracking, and attendance patterns by team member.",
        href: "/people/time",
        icon: <Clock size={16} />,
      },
      {
        name: "Certification Status",
        description:
          "License and certification tracking with expiration alerts and compliance status.",
        href: "/people/certifications",
        icon: <Shield size={16} />,
      },
    ],
  },
];

export default async function ReportsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  return (
    <div>
      {/* Header */}
      <div className="reports-header">
        <div>
          <h2>Reports Center</h2>
          <p className="reports-header-sub">
            Generate and view reports across projects, financials, properties, and workforce.
          </p>
        </div>
      </div>

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
