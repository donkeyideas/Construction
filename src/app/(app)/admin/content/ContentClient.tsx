"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  FileText,
} from "lucide-react";
import type { CmsPageRow } from "@/lib/queries/content";

interface ContentClientProps {
  pages: CmsPageRow[];
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ContentClient({ pages }: ContentClientProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function handleTogglePublish(page: CmsPageRow) {
    setLoadingId(page.id);
    setNotification(null);

    try {
      const res = await fetch(`/api/admin/content/${page.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !page.is_published }),
      });

      if (!res.ok) {
        const data = await res.json();
        setNotification({
          type: "error",
          message: data.error || "Failed to update page status.",
        });
      } else {
        setNotification({
          type: "success",
          message: `"${page.title}" ${page.is_published ? "unpublished" : "published"} successfully.`,
        });
        router.refresh();
      }
    } catch {
      setNotification({
        type: "error",
        message: "Network error. Please try again.",
      });
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(page: CmsPageRow) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${page.title}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setLoadingId(page.id);
    setNotification(null);

    try {
      const res = await fetch(`/api/admin/content/${page.slug}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setNotification({
          type: "error",
          message: data.error || "Failed to delete page.",
        });
      } else {
        setNotification({
          type: "success",
          message: `"${page.title}" deleted successfully.`,
        });
        router.refresh();
      }
    } catch {
      setNotification({
        type: "error",
        message: "Network error. Please try again.",
      });
    } finally {
      setLoadingId(null);
    }
  }

  if (pages.length === 0) {
    return (
      <div className="content-empty">
        <div className="content-empty-icon">
          <FileText size={32} />
        </div>
        <h3>No Pages Yet</h3>
        <p>
          Create your first CMS page to start managing your website content.
        </p>
        <Link
          href="/admin/content/new"
          className="ui-btn ui-btn-primary ui-btn-md"
        >
          Create First Page
        </Link>
      </div>
    );
  }

  return (
    <>
      {notification && (
        <div className={`content-notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="content-table-wrap">
        <table className="content-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Meta Title</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id}>
                <td className="page-title-cell">
                  <Link href={`/admin/content/${page.slug}`}>
                    {page.title}
                  </Link>
                </td>
                <td className="slug-cell">/{page.slug}</td>
                <td>
                  <span
                    className={`status-badge ${page.is_published ? "published" : "draft"}`}
                  >
                    {page.is_published ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="meta-cell">
                  {page.meta_title || (
                    <span style={{ color: "var(--color-red)", fontSize: "0.8rem" }}>
                      Missing
                    </span>
                  )}
                </td>
                <td className="date-cell">{formatDate(page.updated_at)}</td>
                <td>
                  <div className="content-table-actions">
                    <Link
                      href={`/admin/content/${page.slug}`}
                      className="action-btn"
                      title="Edit page"
                    >
                      <Pencil size={14} />
                    </Link>
                    <button
                      className="action-btn"
                      title={page.is_published ? "Unpublish" : "Publish"}
                      onClick={() => handleTogglePublish(page)}
                      disabled={loadingId === page.id}
                    >
                      {page.is_published ? (
                        <EyeOff size={14} />
                      ) : (
                        <Eye size={14} />
                      )}
                    </button>
                    <button
                      className="action-btn danger"
                      title="Delete page"
                      onClick={() => handleDelete(page)}
                      disabled={loadingId === page.id}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
