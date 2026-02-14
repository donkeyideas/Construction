import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, TrendingUp, FileText, Ruler, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getSavedReports } from "@/lib/queries/authoritative-reports";
import { REPORT_TYPE_LABELS } from "@/types/authoritative-reports";
import type { ReportType } from "@/types/authoritative-reports";

export const metadata = {
  title: "Authoritative Reports - Buildwrk",
};

const reportTypes = [
  {
    type: "market_feasibility" as ReportType,
    title: "Market Feasibility Study",
    description:
      "Prove to investors and lenders that a specific development is viable. Includes absorption rates, demographic analysis, competitive supply, and rental rate projections.",
    icon: TrendingUp,
    iconBg: "#1B2A4A",
  },
  {
    type: "offering_memorandum" as ReportType,
    title: "Offering Memorandum",
    description:
      "The gold standard report for selling a property or development opportunity to investors. Includes financial modeling, site plans, and market trend narratives.",
    icon: FileText,
    iconBg: "#0D3B3E",
  },
  {
    type: "basis_of_design" as ReportType,
    title: "Basis of Design",
    description:
      "Document the technical requirements and engineering decisions behind a project\u2019s systems. Includes performance criteria, materials selection, and specifications.",
    icon: Ruler,
    iconBg: "#2D2D3D",
  },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function AuthoritativeReportsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const savedReports = await getSavedReports(supabase, userCompany.companyId);

  return (
    <div>
      {/* Header */}
      <div className="auth-reports-header">
        <h2>Authoritative Reports</h2>
        <p>
          Generate professional, investor-grade reports powered by your platform
          data and AI-generated narratives. Download as magazine-quality PDFs.
        </p>
      </div>

      {/* Report Type Cards */}
      <div className="auth-reports-cards">
        {reportTypes.map((rt) => {
          const Icon = rt.icon;
          const href =
            rt.type === "market_feasibility"
              ? "/reports/authoritative/market-feasibility"
              : rt.type === "offering_memorandum"
                ? "/reports/authoritative/offering-memorandum"
                : "/reports/authoritative/basis-of-design";

          return (
            <Link
              key={rt.type}
              href={href}
              className="auth-report-card"
              data-type={rt.type}
            >
              <div
                className="auth-report-card-icon"
                style={{ background: `${rt.iconBg}15`, color: rt.iconBg }}
              >
                <Icon size={24} />
              </div>
              <h3>{rt.title}</h3>
              <p>{rt.description}</p>
              <div className="auth-report-card-footer">
                Create Report <ChevronRight size={14} />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Saved Reports */}
      {savedReports.length > 0 && (
        <div className="saved-reports-section">
          <h3>Saved Reports</h3>
          <div className="saved-reports-list">
            {savedReports.map((report) => (
              <Link
                key={report.id}
                href={`/reports/authoritative/${report.id}`}
                className="saved-report-row"
              >
                <span
                  className="saved-report-type-badge"
                  data-type={report.report_type}
                >
                  {REPORT_TYPE_LABELS[report.report_type as ReportType]}
                </span>
                <span className="saved-report-title">{report.title}</span>
                <span className="saved-report-date">
                  <Clock size={12} style={{ marginRight: 4, opacity: 0.5 }} />
                  {formatDate(report.updated_at)}
                </span>
                <span
                  className="saved-report-status"
                  data-status={report.status}
                >
                  {report.status}
                </span>
                <ChevronRight size={14} style={{ color: "var(--muted)" }} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
