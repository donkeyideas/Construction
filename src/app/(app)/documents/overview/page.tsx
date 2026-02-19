import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Map, Layers, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getDocumentsOverview } from "@/lib/queries/documents";
import DocCategoryChart from "@/components/charts/DocCategoryChart";
import DocUploadTrendChart from "@/components/charts/DocUploadTrendChart";
import { getDocumentTransactions } from "@/lib/queries/section-transactions";
import SectionTransactions from "@/components/SectionTransactions";

export const metadata = {
  title: "Documents Overview - Buildwrk",
};

const CAT_LABELS: Record<string, string> = {
  plan: "Plan", spec: "Spec", contract: "Contract",
  photo: "Photo", report: "Report", correspondence: "Corr.",
};
const CAT_COLORS: Record<string, string> = {
  plan: "badge-blue", spec: "badge-amber", contract: "badge-green",
  photo: "badge-red", report: "badge-red", correspondence: "badge-blue",
};

function formatFileSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

export default async function DocumentsOverviewPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const overview = await getDocumentsOverview(supabase, userCompany.companyId);
  const txnData = await getDocumentTransactions(supabase, userCompany.companyId);

  return (
    <div>
      {/* Header */}
      <div className="fin-header">
        <div>
          <h2>Documents Overview</h2>
          <p className="fin-header-sub">Document library analytics and recent activity.</p>
        </div>
        <div className="fin-header-actions">
          <Link href="/documents" className="ui-btn ui-btn-md ui-btn-secondary">Document Library</Link>
          <Link href="/documents/plan-room" className="ui-btn ui-btn-md ui-btn-secondary">Plan Room</Link>
          <Link href="/documents?upload=true" className="ui-btn ui-btn-md ui-btn-primary">
            <Upload size={16} /> Upload
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div className="kpi">
            <div className="kpi-info">
              <span className="kpi-label">Total Documents</span>
              <span className="kpi-value">{overview.totalCount}</span>
            </div>
            <div className="kpi-icon"><FileText size={20} /></div>
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="kpi">
            <div className="kpi-info">
              <span className="kpi-label">Plans & Specs</span>
              <span className="kpi-value">{overview.planSpecCount}</span>
            </div>
            <div className="kpi-icon" style={{ color: "var(--color-blue)" }}><Map size={20} /></div>
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="kpi">
            <div className="kpi-info">
              <span className="kpi-label">Drawing Sets</span>
              <span className="kpi-value">{overview.drawingSetCount}</span>
            </div>
            <div className="kpi-icon" style={{ color: "var(--color-blue)" }}><Layers size={20} /></div>
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="kpi">
            <div className="kpi-info">
              <span className="kpi-label">Uploads (7d)</span>
              <span className="kpi-value" style={{ color: overview.recentUploadCount > 0 ? "var(--color-green)" : undefined }}>
                {overview.recentUploadCount}
              </span>
            </div>
            <div className="kpi-icon" style={{ color: "var(--color-green)" }}><Upload size={20} /></div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="financial-charts-row" style={{ marginBottom: 24 }}>
        <div className="fin-chart-card">
          <div className="fin-chart-title">Documents by Category</div>
          <DocCategoryChart data={overview.categoryBreakdown} />
        </div>
        <div className="fin-chart-card">
          <div className="fin-chart-title">Upload Activity (12 Weeks)</div>
          <DocUploadTrendChart data={overview.weeklyUploads} />
        </div>
      </div>

      {/* Recent Uploads */}
      {overview.recentDocuments.length > 0 && (
        <div className="fin-chart-card" style={{ marginBottom: 24 }}>
          <div className="fin-chart-title">Recent Uploads</div>
          <div style={{ overflowX: "auto" }}>
            <table className="invoice-table">
              <thead>
                <tr><th>Name</th><th>Category</th><th>Project</th><th>Date</th><th>Size</th></tr>
              </thead>
              <tbody>
                {overview.recentDocuments.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500 }}>{d.name}</td>
                    <td>
                      <span className={`badge ${CAT_COLORS[d.category] ?? "badge-blue"}`}>
                        {CAT_LABELS[d.category] ?? d.category}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                      {d.project?.name ?? "—"}
                    </td>
                    <td style={{ fontSize: "0.78rem" }}>
                      {new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{formatFileSize(d.file_size)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
        <Link href="/documents" className="ui-btn ui-btn-sm ui-btn-secondary">Document Library</Link>
        <Link href="/documents/plan-room" className="ui-btn ui-btn-sm ui-btn-secondary">Plan Room</Link>
      </div>

      <SectionTransactions data={txnData} sectionName="Documents" />
    </div>
  );
}
