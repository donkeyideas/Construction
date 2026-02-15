import Link from "next/link";
import {
  Plus,
  FileText,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getCmsPages } from "@/lib/queries/content";
import ContentClient from "./ContentClient";

export const metadata = {
  title: "Content Manager - Buildwrk",
};

export default async function ContentManagerPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="content-empty">
        <div className="content-empty-icon">
          <FileText size={48} />
        </div>
        <h3>Set Up Your Company</h3>
        <p>
          Complete your company registration to start managing content pages.
        </p>
        <Link
          href="/admin/settings"
          className="ui-btn ui-btn-primary ui-btn-md"
        >
          Go to Settings
        </Link>
      </div>
    );
  }

  const { companyId } = userCompany;
  const pages = await getCmsPages(supabase, companyId);

  const publishedCount = pages.filter((p) => p.is_published).length;
  const draftCount = pages.filter((p) => !p.is_published).length;

  const lastUpdated = pages.length > 0
    ? new Date(pages[0].updated_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "--";

  return (
    <div>
      {/* Header */}
      <div className="content-header">
        <div>
          <h2>Content Manager</h2>
          <p className="content-header-sub">
            Manage your CMS pages, meta data, and publishing status.
          </p>
        </div>
        <div className="content-header-actions">
          <Link
            href="/admin/content/new"
            className="ui-btn ui-btn-primary ui-btn-md"
          >
            <Plus size={16} />
            New Page
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="content-stats">
        <div className="content-stat-card">
          <span className="content-stat-label">Total Pages</span>
          <span className="content-stat-value">{pages.length}</span>
        </div>
        <div className="content-stat-card">
          <span className="content-stat-label">Published</span>
          <span className="content-stat-value green">{publishedCount}</span>
        </div>
        <div className="content-stat-card">
          <span className="content-stat-label">Draft</span>
          <span className="content-stat-value amber">{draftCount}</span>
        </div>
        <div className="content-stat-card">
          <span className="content-stat-label">Last Updated</span>
          <span
            className="content-stat-value"
            style={{ fontSize: "1rem", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Clock size={16} style={{ color: "var(--muted)" }} />
            {lastUpdated}
          </span>
        </div>
      </div>

      {/* Client component for interactive table */}
      <ContentClient pages={pages} />
    </div>
  );
}
