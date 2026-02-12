"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Eye, EyeOff } from "lucide-react";

interface CmsPage {
  id: string;
  page_slug: string;
  title: string;
  status: string;
  published_at: string | null;
  updated_at: string;
}

interface Props {
  pages: CmsPage[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ContentClient({ pages }: Props) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState("");

  const publishedCount = pages.filter((p) => p.status === "published").length;
  const draftCount = pages.filter((p) => p.status === "draft").length;

  async function toggleStatus(slug: string, currentStatus: string) {
    setUpdating(slug);
    setError("");
    try {
      const newStatus = currentStatus === "published" ? "draft" : "published";
      const res = await fetch(`/api/super-admin/content/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update page status.");
        return;
      }

      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <>
      <div className="admin-header">
        <div>
          <h2>CMS Pages</h2>
          <p className="admin-header-sub">
            Manage marketing pages for the platform website
          </p>
        </div>
      </div>

      <div className="admin-stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <FileText size={18} />
          </div>
          <div className="admin-stat-label">Total Pages</div>
          <div className="admin-stat-value">{pages.length}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon green">
            <Eye size={18} />
          </div>
          <div className="admin-stat-label">Published</div>
          <div className="admin-stat-value">{publishedCount}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon amber">
            <EyeOff size={18} />
          </div>
          <div className="admin-stat-label">Draft</div>
          <div className="admin-stat-value">{draftCount}</div>
        </div>
      </div>

      {error && <div className="invite-error">{error}</div>}

      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>Page</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Published</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                  No CMS pages found
                </td>
              </tr>
            ) : (
              pages.map((page) => (
                <tr
                  key={page.id}
                  style={{ opacity: updating === page.page_slug ? 0.5 : 1 }}
                >
                  <td style={{ fontWeight: 500 }}>{page.title}</td>
                  <td style={{ color: "var(--muted)", fontFamily: "monospace", fontSize: "0.8rem" }}>
                    /{page.page_slug}
                  </td>
                  <td>
                    <span className={`sa-cms-status ${page.status === "published" ? "sa-cms-published" : "sa-cms-draft"}`}>
                      {page.status}
                    </span>
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                    {page.published_at ? formatDate(page.published_at) : "-"}
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                    {formatDate(page.updated_at)}
                  </td>
                  <td>
                    <button
                      className={`sa-action-btn ${page.status === "published" ? "" : "primary"}`}
                      onClick={() => toggleStatus(page.page_slug, page.status)}
                      disabled={updating === page.page_slug}
                      style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                    >
                      {page.status === "published" ? "Unpublish" : "Publish"}
                    </button>
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
