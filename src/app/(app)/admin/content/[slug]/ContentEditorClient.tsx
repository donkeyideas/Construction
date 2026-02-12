"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Save, Globe } from "lucide-react";
import type { CmsPageRow } from "@/lib/queries/content";

interface ContentSection {
  heading: string;
  body: string;
}

interface ContentEditorClientProps {
  page: CmsPageRow | null;
  isNew: boolean;
  userId: string;
}

function parseContent(content: Record<string, unknown>) {
  return {
    heroTitle: (content.hero_title as string) ?? "",
    heroSubtitle: (content.hero_subtitle as string) ?? "",
    sections: Array.isArray(content.sections)
      ? (content.sections as ContentSection[])
      : [],
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function ContentEditorClient({
  page,
  isNew,
  userId,
}: ContentEditorClientProps) {
  const router = useRouter();

  // Page-level fields
  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [isPublished, setIsPublished] = useState(page?.is_published ?? false);

  // SEO fields
  const [metaTitle, setMetaTitle] = useState(page?.meta_title ?? "");
  const [metaDescription, setMetaDescription] = useState(
    page?.meta_description ?? ""
  );

  // Content fields
  const parsed = page ? parseContent(page.content) : { heroTitle: "", heroSubtitle: "", sections: [] };
  const [heroTitle, setHeroTitle] = useState(parsed.heroTitle);
  const [heroSubtitle, setHeroSubtitle] = useState(parsed.heroSubtitle);
  const [sections, setSections] = useState<ContentSection[]>(parsed.sections);

  // UI state
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleTitleChange = useCallback(
    (value: string) => {
      setTitle(value);
      if (isNew) {
        setSlug(slugify(value));
      }
    },
    [isNew]
  );

  function addSection() {
    setSections([...sections, { heading: "", body: "" }]);
  }

  function removeSection(index: number) {
    setSections(sections.filter((_, i) => i !== index));
  }

  function updateSection(index: number, field: keyof ContentSection, value: string) {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  }

  async function handleSave() {
    if (!title.trim()) {
      setNotification({ type: "error", message: "Page title is required." });
      return;
    }
    if (!slug.trim()) {
      setNotification({ type: "error", message: "Page slug is required." });
      return;
    }

    setSaving(true);
    setNotification(null);

    const contentPayload = {
      hero_title: heroTitle,
      hero_subtitle: heroSubtitle,
      sections,
    };

    const body = {
      title: title.trim(),
      slug: slug.trim(),
      content: contentPayload,
      meta_title: metaTitle.trim() || null,
      meta_description: metaDescription.trim() || null,
      is_published: isPublished,
    };

    try {
      let res: Response;

      if (isNew) {
        res = await fetch("/api/admin/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`/api/admin/content/${page!.slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        setNotification({
          type: "error",
          message: data.error || "Failed to save page.",
        });
      } else {
        const savedPage = await res.json();
        setNotification({
          type: "success",
          message: isNew ? "Page created successfully." : "Page saved successfully.",
        });

        if (isNew) {
          // Redirect to the edit page of the newly created page
          router.push(`/admin/content/${savedPage.slug}`);
        } else if (slug !== page!.slug) {
          // Slug changed, redirect to new URL
          router.push(`/admin/content/${slug}`);
        } else {
          router.refresh();
        }
      }
    } catch {
      setNotification({
        type: "error",
        message: "Network error. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {notification && (
        <div className={`content-notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="content-editor">
        {/* Main content area */}
        <div className="content-editor-main">
          {/* Page Details */}
          <div className="content-editor-section">
            <div className="content-editor-section-title">Page Details</div>
            <div className="content-field">
              <label htmlFor="page-title">Page Title</label>
              <input
                id="page-title"
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter page title"
              />
            </div>
          </div>

          {/* Hero Section */}
          <div className="content-editor-section">
            <div className="content-editor-section-title">Hero Section</div>
            <div className="content-field">
              <label htmlFor="hero-title">Hero Title</label>
              <input
                id="hero-title"
                type="text"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                placeholder="Main headline for the page"
              />
            </div>
            <div className="content-field">
              <label htmlFor="hero-subtitle">Hero Subtitle</label>
              <textarea
                id="hero-subtitle"
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                placeholder="Supporting text below the headline"
                style={{ minHeight: "60px" }}
              />
            </div>
          </div>

          {/* Content Sections */}
          <div className="content-editor-section">
            <div
              className="content-editor-section-title"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Content Sections</span>
              <button
                type="button"
                className="ui-btn ui-btn-outline ui-btn-sm"
                onClick={addSection}
              >
                <Plus size={14} />
                Add Section
              </button>
            </div>

            {sections.length === 0 && (
              <p
                style={{
                  color: "var(--muted)",
                  fontSize: "0.85rem",
                  textAlign: "center",
                  padding: "24px 0",
                }}
              >
                No content sections yet. Click "Add Section" to start building
                your page.
              </p>
            )}

            {sections.map((section, index) => (
              <div key={index} className="content-section-item">
                <div className="content-section-header">
                  <span className="content-section-number">
                    Section {index + 1}
                  </span>
                  <button
                    type="button"
                    className="content-section-remove"
                    onClick={() => removeSection(index)}
                    title="Remove section"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="content-field">
                  <label>Heading</label>
                  <input
                    type="text"
                    value={section.heading}
                    onChange={(e) =>
                      updateSection(index, "heading", e.target.value)
                    }
                    placeholder="Section heading"
                  />
                </div>
                <div className="content-field">
                  <label>Body</label>
                  <textarea
                    value={section.body}
                    onChange={(e) =>
                      updateSection(index, "body", e.target.value)
                    }
                    placeholder="Section body content"
                    style={{ minHeight: "100px" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="content-editor-sidebar">
          {/* Publish Controls */}
          <div className="content-editor-section">
            <div className="content-editor-section-title">Publishing</div>
            <div className="publish-toggle">
              <span className="publish-toggle-label">
                {isPublished ? "Published" : "Draft"}
              </span>
              <button
                type="button"
                className={`publish-switch ${isPublished ? "active" : ""}`}
                onClick={() => setIsPublished(!isPublished)}
              >
                <span className="publish-switch-knob" />
              </button>
            </div>

            {page && (
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "var(--muted)",
                  marginTop: "8px",
                }}
              >
                {page.published_at && (
                  <p>
                    Published:{" "}
                    {new Date(page.published_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}
                <p>
                  Last updated:{" "}
                  {new Date(page.updated_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}

            <div className="content-form-actions">
              <button
                type="button"
                className="ui-btn ui-btn-primary ui-btn-md"
                onClick={handleSave}
                disabled={saving}
                style={{ width: "100%" }}
              >
                {saving ? (
                  <span className="ui-btn-spinner" />
                ) : (
                  <Save size={16} />
                )}
                {saving ? "Saving..." : isNew ? "Create Page" : "Save Changes"}
              </button>
            </div>
          </div>

          {/* SEO Settings */}
          <div className="content-editor-section">
            <div className="content-editor-section-title">
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Globe size={16} />
                SEO Settings
              </span>
            </div>
            <div className="content-field">
              <label htmlFor="page-slug">URL Slug</label>
              <input
                id="page-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="page-url-slug"
              />
              <span className="field-hint">
                The URL path for this page: /{slug || "..."}
              </span>
            </div>
            <div className="content-field">
              <label htmlFor="meta-title">Meta Title</label>
              <input
                id="meta-title"
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="SEO title for search engines"
              />
              <span
                className={`char-count ${metaTitle.length > 70 ? "over" : ""}`}
              >
                {metaTitle.length}/70 characters
              </span>
            </div>
            <div className="content-field">
              <label htmlFor="meta-desc">Meta Description</label>
              <textarea
                id="meta-desc"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Brief description for search results"
                style={{ minHeight: "80px" }}
              />
              <span
                className={`char-count ${metaDescription.length > 160 ? "over" : ""}`}
              >
                {metaDescription.length}/160 characters
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
