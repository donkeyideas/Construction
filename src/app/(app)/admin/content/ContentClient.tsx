"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  FileText,
} from "lucide-react";
import type { CmsPageRow } from "@/lib/queries/content";
import { formatDateSafe } from "@/lib/utils/format";

interface ContentClientProps {
  pages: CmsPageRow[];
}

export default function ContentClient({ pages }: ContentClientProps) {
  const router = useRouter();
  const t = useTranslations("adminPanel");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "--";
    return formatDateSafe(dateStr);
  }

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
          message: data.error || t("failedToUpdatePageStatus"),
        });
      } else {
        setNotification({
          type: "success",
          message: page.is_published
            ? t("pageUnpublishedSuccessfully", { title: page.title })
            : t("pagePublishedSuccessfully", { title: page.title }),
        });
        router.refresh();
      }
    } catch {
      setNotification({
        type: "error",
        message: t("networkErrorPleaseTryAgain"),
      });
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(page: CmsPageRow) {
    const confirmed = window.confirm(
      t("confirmDeletePage", { title: page.title })
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
          message: data.error || t("failedToDeletePage"),
        });
      } else {
        setNotification({
          type: "success",
          message: t("pageDeletedSuccessfully", { title: page.title }),
        });
        router.refresh();
      }
    } catch {
      setNotification({
        type: "error",
        message: t("networkErrorPleaseTryAgain"),
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
        <h3>{t("noPagesYet")}</h3>
        <p>
          {t("createFirstCmsPage")}
        </p>
        <Link
          href="/admin/content/new"
          className="ui-btn ui-btn-primary ui-btn-md"
        >
          {t("createFirstPage")}
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
              <th>{t("title")}</th>
              <th>{t("slug")}</th>
              <th>{t("status")}</th>
              <th>{t("metaTitle")}</th>
              <th>{t("lastUpdated")}</th>
              <th>{t("actions")}</th>
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
                    {page.is_published ? t("published") : t("draft")}
                  </span>
                </td>
                <td className="meta-cell">
                  {page.meta_title || (
                    <span style={{ color: "var(--color-red)", fontSize: "0.8rem" }}>
                      {t("missing")}
                    </span>
                  )}
                </td>
                <td className="date-cell">{formatDate(page.updated_at)}</td>
                <td>
                  <div className="content-table-actions">
                    <Link
                      href={`/admin/content/${page.slug}`}
                      className="action-btn"
                      title={t("editPage")}
                    >
                      <Pencil size={14} />
                    </Link>
                    <button
                      className="action-btn"
                      title={page.is_published ? t("unpublish") : t("publish")}
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
                      title={t("deletePage")}
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
