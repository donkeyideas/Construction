"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Eye,
  EyeOff,
  ArrowLeft,
  Save,
  ChevronDown,
  ChevronRight,
  Layout,
  Type,
  List,
  DollarSign,
  HelpCircle,
  Megaphone,
  Layers,
  Grid3X3,
  Sparkles,
  EyeIcon,
  EyeOffIcon,
  ExternalLink,
} from "lucide-react";
import {
  DEFAULT_HOMEPAGE_SECTIONS,
  DEFAULT_META_TITLE,
  DEFAULT_META_DESCRIPTION,
  type CmsSection,
} from "@/lib/cms/homepage-defaults";

interface CmsPage {
  id: string;
  page_slug: string;
  title: string;
  status: string;
  published_at: string | null;
  updated_at: string;
}

interface CmsPageFull {
  id: string;
  page_slug: string;
  title: string;
  sections: CmsSection[];
  meta_title: string | null;
  meta_description: string | null;
  status: string;
  published_at: string | null;
  version: number;
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

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero Banner",
  about: "About / Story",
  steps: "Getting Started Steps",
  modules: "Feature Modules",
  value_props: "Value Propositions",
  modules_grid: "Additional Modules Grid",
  pricing: "Pricing Plans",
  faq: "FAQ",
  cta: "Call to Action",
};

function getSectionIcon(type: string) {
  switch (type) {
    case "hero": return <Layout size={16} />;
    case "about": return <Type size={16} />;
    case "steps": return <List size={16} />;
    case "modules": return <Layers size={16} />;
    case "value_props": return <Sparkles size={16} />;
    case "modules_grid": return <Grid3X3 size={16} />;
    case "pricing": return <DollarSign size={16} />;
    case "faq": return <HelpCircle size={16} />;
    case "cta": return <Megaphone size={16} />;
    default: return <FileText size={16} />;
  }
}

function getDefaults(slug: string): { sections: CmsSection[]; metaTitle: string; metaDescription: string } {
  if (slug === "homepage") {
    return {
      sections: DEFAULT_HOMEPAGE_SECTIONS,
      metaTitle: DEFAULT_META_TITLE,
      metaDescription: DEFAULT_META_DESCRIPTION,
    };
  }
  return { sections: [], metaTitle: "", metaDescription: "" };
}

export default function ContentClient({ pages }: Props) {
  const router = useRouter();

  // List view state
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Editor view state
  const [view, setView] = useState<"list" | "editor">("list");
  const [editingPage, setEditingPage] = useState<CmsPageFull | null>(null);
  const [sections, setSections] = useState<CmsSection[]>([]);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [pageStatus, setPageStatus] = useState("draft");
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: string; message: string } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

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
        setError(data.error || "Failed to update.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setUpdating(null);
    }
  }

  async function openEditor(slug: string) {
    setLoading(true);
    setNotification(null);
    try {
      const res = await fetch(`/api/super-admin/content/${slug}`);
      if (!res.ok) throw new Error("Failed to fetch page data");
      const data: CmsPageFull = await res.json();

      const defaults = getDefaults(slug);
      const loadedSections =
        data.sections && data.sections.length > 0
          ? data.sections
          : defaults.sections;

      setEditingPage(data);
      setSections(loadedSections);
      setMetaTitle(data.meta_title || defaults.metaTitle);
      setMetaDescription(data.meta_description || defaults.metaDescription);
      setPageTitle(data.title);
      setPageStatus(data.status);
      setExpandedSections(new Set());
      setView("editor");
    } catch {
      setError("Failed to load page data.");
    } finally {
      setLoading(false);
    }
  }

  function closeEditor() {
    setView("list");
    setEditingPage(null);
    setNotification(null);
    router.refresh();
  }

  async function handleSave() {
    if (!editingPage) return;
    setSaving(true);
    setNotification(null);
    try {
      const res = await fetch(
        `/api/super-admin/content/${editingPage.page_slug}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: pageTitle,
            meta_title: metaTitle,
            meta_description: metaDescription,
            sections,
            status: pageStatus,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to save");
      setNotification({ type: "success", message: "Content saved successfully! Changes are now live." });
    } catch {
      setNotification({ type: "error", message: "Failed to save changes. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  /* ---- Section helpers ---- */

  function updateSectionContent(index: number, key: string, value: any) {
    setSections((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], content: { ...next[index].content, [key]: value } };
      return next;
    });
  }

  function updateArrayItem(sectionIndex: number, arrayKey: string, itemIndex: number, field: string, value: any) {
    setSections((prev) => {
      const next = [...prev];
      const arr = [...(next[sectionIndex].content[arrayKey] || [])];
      arr[itemIndex] = { ...arr[itemIndex], [field]: value };
      next[sectionIndex] = { ...next[sectionIndex], content: { ...next[sectionIndex].content, [arrayKey]: arr } };
      return next;
    });
  }

  function toggleSectionVisible(index: number) {
    setSections((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], visible: !next[index].visible };
      return next;
    });
  }

  function toggleExpanded(index: number) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function expandAll() {
    setExpandedSections(new Set(sections.map((_, i) => i)));
  }

  /* ---- Section-type editors ---- */

  function renderSectionEditor(section: CmsSection, idx: number) {
    const c = section.content;
    switch (section.type) {
      case "hero":
        return (
          <div className="content-section-fields">
            <Field label="Headline" hint="Primary H1 — include target keyword">
              <input value={c.title || ""} onChange={(e) => updateSectionContent(idx, "title", e.target.value)} />
            </Field>
            <Field label="Subtitle" hint="Supporting text under the headline">
              <textarea rows={3} value={c.subtitle || ""} onChange={(e) => updateSectionContent(idx, "subtitle", e.target.value)} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="CTA Button Text">
                <input value={c.cta_text || ""} onChange={(e) => updateSectionContent(idx, "cta_text", e.target.value)} />
              </Field>
              <Field label="CTA Button Link">
                <input value={c.cta_link || ""} onChange={(e) => updateSectionContent(idx, "cta_link", e.target.value)} />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Secondary Link Text">
                <input value={c.secondary_text || ""} onChange={(e) => updateSectionContent(idx, "secondary_text", e.target.value)} />
              </Field>
              <Field label="Secondary Link URL">
                <input value={c.secondary_link || ""} onChange={(e) => updateSectionContent(idx, "secondary_link", e.target.value)} />
              </Field>
            </div>
            <Field label="Image URL">
              <input value={c.image_url || ""} onChange={(e) => updateSectionContent(idx, "image_url", e.target.value)} />
            </Field>
            <Field label="Image Alt Text" hint="Describe the image for SEO and accessibility">
              <input value={c.image_alt || ""} onChange={(e) => updateSectionContent(idx, "image_alt", e.target.value)} />
            </Field>
          </div>
        );

      case "about":
        return (
          <div className="content-section-fields">
            <Field label="Section Title">
              <input value={c.title || ""} onChange={(e) => updateSectionContent(idx, "title", e.target.value)} />
            </Field>
            <Field label="Body Text" hint="Use natural language with target keywords">
              <textarea rows={5} value={c.body || ""} onChange={(e) => updateSectionContent(idx, "body", e.target.value)} />
            </Field>
          </div>
        );

      case "steps":
        return (
          <div className="content-section-fields">
            <Field label="Section Title">
              <input value={c.title || ""} onChange={(e) => updateSectionContent(idx, "title", e.target.value)} />
            </Field>
            {(c.steps || []).map((step: any, si: number) => (
              <div key={si} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 14, marginTop: 10 }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-amber)", marginBottom: 8 }}>Step {si + 1}</div>
                <Field label="Title">
                  <input value={step.title || ""} onChange={(e) => updateArrayItem(idx, "steps", si, "title", e.target.value)} />
                </Field>
                <Field label="Description">
                  <textarea rows={2} value={step.body || ""} onChange={(e) => updateArrayItem(idx, "steps", si, "body", e.target.value)} />
                </Field>
              </div>
            ))}
          </div>
        );

      case "modules":
        return (
          <div className="content-section-fields">
            {(c.modules || []).map((mod: any, mi: number) => (
              <div key={mi} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 14, marginTop: mi > 0 ? 10 : 0 }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-blue)", marginBottom: 8 }}>{mod.title || `Module ${mi + 1}`}</div>
                <Field label="Label">
                  <input value={mod.label || ""} onChange={(e) => updateArrayItem(idx, "modules", mi, "label", e.target.value)} />
                </Field>
                <Field label="Title">
                  <input value={mod.title || ""} onChange={(e) => updateArrayItem(idx, "modules", mi, "title", e.target.value)} />
                </Field>
                <Field label="Description">
                  <textarea rows={3} value={mod.body || ""} onChange={(e) => updateArrayItem(idx, "modules", mi, "body", e.target.value)} />
                </Field>
                <Field label="CTA Text">
                  <input value={mod.cta_text || ""} onChange={(e) => updateArrayItem(idx, "modules", mi, "cta_text", e.target.value)} />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Image URL">
                    <input value={mod.image_url || ""} onChange={(e) => updateArrayItem(idx, "modules", mi, "image_url", e.target.value)} />
                  </Field>
                  <Field label="Image Alt">
                    <input value={mod.image_alt || ""} onChange={(e) => updateArrayItem(idx, "modules", mi, "image_alt", e.target.value)} />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        );

      case "value_props":
        return (
          <div className="content-section-fields">
            {(c.items || []).map((item: any, ii: number) => (
              <div key={ii} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 14, marginTop: ii > 0 ? 10 : 0 }}>
                <Field label="Title">
                  <input value={item.title || ""} onChange={(e) => updateArrayItem(idx, "items", ii, "title", e.target.value)} />
                </Field>
                <Field label="Description">
                  <textarea rows={2} value={item.body || ""} onChange={(e) => updateArrayItem(idx, "items", ii, "body", e.target.value)} />
                </Field>
              </div>
            ))}
          </div>
        );

      case "modules_grid":
        return (
          <div className="content-section-fields">
            <Field label="Section Title">
              <input value={c.title || ""} onChange={(e) => updateSectionContent(idx, "title", e.target.value)} />
            </Field>
            <Field label="Subtitle">
              <input value={c.subtitle || ""} onChange={(e) => updateSectionContent(idx, "subtitle", e.target.value)} />
            </Field>
            {(c.cards || []).map((card: any, ci: number) => (
              <div key={ci} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 14, marginTop: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: 12 }}>
                  <Field label="Icon">
                    <input value={card.icon || ""} onChange={(e) => updateArrayItem(idx, "cards", ci, "icon", e.target.value)} />
                  </Field>
                  <Field label="Title">
                    <input value={card.title || ""} onChange={(e) => updateArrayItem(idx, "cards", ci, "title", e.target.value)} />
                  </Field>
                </div>
                <Field label="Description">
                  <textarea rows={2} value={card.body || ""} onChange={(e) => updateArrayItem(idx, "cards", ci, "body", e.target.value)} />
                </Field>
              </div>
            ))}
          </div>
        );

      case "pricing":
        return (
          <div className="content-section-fields">
            <Field label="Section Title">
              <input value={c.title || ""} onChange={(e) => updateSectionContent(idx, "title", e.target.value)} />
            </Field>
            <Field label="Subtitle">
              <textarea rows={2} value={c.subtitle || ""} onChange={(e) => updateSectionContent(idx, "subtitle", e.target.value)} />
            </Field>
            {(c.plans || []).map((plan: any, pi: number) => (
              <div key={pi} style={{ background: "var(--bg)", border: `1px solid ${plan.featured ? "var(--color-blue)" : "var(--border)"}`, borderRadius: 8, padding: 14, marginTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{plan.name || `Plan ${pi + 1}`}</span>
                  {plan.badge && (
                    <span style={{ fontSize: "0.7rem", padding: "2px 8px", background: "rgba(29, 78, 216, 0.1)", color: "var(--color-blue)", borderRadius: 8, fontWeight: 600 }}>
                      {plan.badge}
                    </span>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Plan Name">
                    <input value={plan.name || ""} onChange={(e) => updateArrayItem(idx, "plans", pi, "name", e.target.value)} />
                  </Field>
                  <Field label="Badge (optional)">
                    <input value={plan.badge || ""} onChange={(e) => updateArrayItem(idx, "plans", pi, "badge", e.target.value)} />
                  </Field>
                </div>
                <Field label="Description">
                  <input value={plan.description || ""} onChange={(e) => updateArrayItem(idx, "plans", pi, "description", e.target.value)} />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Price">
                    <input value={plan.price || ""} onChange={(e) => updateArrayItem(idx, "plans", pi, "price", e.target.value)} />
                  </Field>
                  <Field label="Period">
                    <input value={plan.period || ""} onChange={(e) => updateArrayItem(idx, "plans", pi, "period", e.target.value)} />
                  </Field>
                </div>
                <Field label="Features (one per line)">
                  <textarea
                    rows={6}
                    value={(plan.features || []).join("\n")}
                    onChange={(e) => updateArrayItem(idx, "plans", pi, "features", e.target.value.split("\n"))}
                  />
                </Field>
              </div>
            ))}
          </div>
        );

      case "faq":
        return (
          <div className="content-section-fields">
            <Field label="Section Title">
              <input value={c.title || ""} onChange={(e) => updateSectionContent(idx, "title", e.target.value)} />
            </Field>
            {(c.items || []).map((item: any, ii: number) => (
              <div key={ii} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 14, marginTop: 10 }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Q{ii + 1}</div>
                <Field label="Question">
                  <input value={item.question || ""} onChange={(e) => updateArrayItem(idx, "items", ii, "question", e.target.value)} />
                </Field>
                <Field label="Answer">
                  <textarea rows={3} value={item.answer || ""} onChange={(e) => updateArrayItem(idx, "items", ii, "answer", e.target.value)} />
                </Field>
              </div>
            ))}
          </div>
        );

      case "cta":
        return (
          <div className="content-section-fields">
            <Field label="Headline">
              <input value={c.title || ""} onChange={(e) => updateSectionContent(idx, "title", e.target.value)} />
            </Field>
            <Field label="Subtitle">
              <textarea rows={2} value={c.subtitle || ""} onChange={(e) => updateSectionContent(idx, "subtitle", e.target.value)} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Button Text">
                <input value={c.cta_text || ""} onChange={(e) => updateSectionContent(idx, "cta_text", e.target.value)} />
              </Field>
              <Field label="Button Link">
                <input value={c.cta_link || ""} onChange={(e) => updateSectionContent(idx, "cta_link", e.target.value)} />
              </Field>
            </div>
          </div>
        );

      default:
        return (
          <div style={{ padding: 12, fontSize: "0.85rem", color: "var(--muted)" }}>
            Unknown section type: {section.type}. Raw JSON will be preserved on save.
          </div>
        );
    }
  }

  /* ================================================================
   *  RENDER — LIST VIEW
   * ================================================================ */
  if (view === "list") {
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
            <div className="admin-stat-icon blue"><FileText size={18} /></div>
            <div className="admin-stat-label">Total Pages</div>
            <div className="admin-stat-value">{pages.length}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon green"><Eye size={18} /></div>
            <div className="admin-stat-label">Published</div>
            <div className="admin-stat-value">{publishedCount}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon amber"><EyeOff size={18} /></div>
            <div className="admin-stat-label">Draft</div>
            <div className="admin-stat-value">{draftCount}</div>
          </div>
        </div>

        {error && <div className="content-notification error">{error}</div>}

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
                  <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
                    No CMS pages found
                  </td>
                </tr>
              ) : (
                pages.map((page) => (
                  <tr
                    key={page.id}
                    style={{ opacity: updating === page.page_slug || loading ? 0.5 : 1, cursor: "pointer" }}
                    onClick={() => openEditor(page.page_slug)}
                  >
                    <td style={{ fontWeight: 500 }}>{page.title}</td>
                    <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
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
                        onClick={(e) => { e.stopPropagation(); toggleStatus(page.page_slug, page.status); }}
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

  /* ================================================================
   *  RENDER — EDITOR VIEW
   * ================================================================ */
  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <button
          onClick={closeEditor}
          className="btn-secondary"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <ArrowLeft size={14} /> Back to Pages
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", fontWeight: 700 }}>
            {pageTitle}
          </h2>
          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
            /{editingPage?.page_slug}
          </span>
        </div>
        <a
          href={editingPage?.page_slug === "homepage" ? "/" : `/${editingPage?.page_slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
        >
          <ExternalLink size={14} /> Preview
        </a>
        <button
          onClick={handleSave}
          className="btn-primary"
          disabled={saving}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {notification && (
        <div className={`content-notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Editor Layout */}
      <div className="content-editor">
        {/* Main — Sections */}
        <div className="content-editor-main">
          {/* Page title field */}
          <div className="content-editor-section">
            <div className="content-editor-section-title">Page Settings</div>
            <div className="content-field">
              <label>Page Title</label>
              <input
                value={pageTitle}
                onChange={(e) => setPageTitle(e.target.value)}
              />
            </div>
            <div className="content-field">
              <label>Status</label>
              <select value={pageStatus} onChange={(e) => setPageStatus(e.target.value)}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          {/* Expand all */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              onClick={expandAll}
              style={{ fontSize: "0.78rem", color: "var(--color-blue)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}
            >
              Expand All Sections
            </button>
          </div>

          {/* Section editors */}
          {sections.map((section, idx) => (
            <div key={idx} className="content-section-item">
              <div
                className="content-section-header"
                onClick={() => toggleExpanded(idx)}
                style={{ cursor: "pointer", userSelect: "none" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {getSectionIcon(section.type)}
                  <span className="content-section-number">
                    {SECTION_LABELS[section.type] || section.type}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSectionVisible(idx); }}
                    title={section.visible ? "Section visible — click to hide" : "Section hidden — click to show"}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: section.visible ? "var(--color-green)" : "var(--muted)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {section.visible ? <EyeIcon size={14} /> : <EyeOffIcon size={14} />}
                  </button>
                  {expandedSections.has(idx) ? (
                    <ChevronDown size={16} style={{ color: "var(--muted)" }} />
                  ) : (
                    <ChevronRight size={16} style={{ color: "var(--muted)" }} />
                  )}
                </div>
              </div>

              {expandedSections.has(idx) && (
                <div style={{ marginTop: 12 }}>
                  {renderSectionEditor(section, idx)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Sidebar — SEO */}
        <div className="content-editor-sidebar">
          <div className="content-editor-section">
            <div className="content-editor-section-title">SEO Settings</div>
            <div className="content-field">
              <label>Meta Title</label>
              <input
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Page title for search engines"
              />
              <span className={`char-count ${metaTitle.length > 60 ? "over" : ""}`}>
                {metaTitle.length}/60
              </span>
            </div>
            <div className="content-field">
              <label>Meta Description</label>
              <textarea
                rows={4}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Description shown in search results"
              />
              <span className={`char-count ${metaDescription.length > 160 ? "over" : ""}`}>
                {metaDescription.length}/160
              </span>
            </div>
          </div>

          <div className="content-editor-section">
            <div className="content-editor-section-title">SEO Tips</div>
            <ul style={{ fontSize: "0.8rem", color: "var(--muted)", paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6, lineHeight: 1.5 }}>
              <li>Keep meta title under 60 characters</li>
              <li>Meta description: 120-160 characters</li>
              <li>Include primary keyword in H1 (hero title)</li>
              <li>Use natural language, avoid keyword stuffing</li>
              <li>Every image needs descriptive alt text</li>
              <li>FAQ section helps capture featured snippets</li>
            </ul>
          </div>

          <div className="content-editor-section">
            <div className="content-editor-section-title">Quick Info</div>
            <div style={{ fontSize: "0.82rem", color: "var(--muted)", display: "flex", flexDirection: "column", gap: 6 }}>
              <div><strong>Sections:</strong> {sections.length}</div>
              <div><strong>Visible:</strong> {sections.filter((s) => s.visible).length}</div>
              <div><strong>Last saved:</strong> {editingPage ? formatDate(editingPage.updated_at) : "-"}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---- Reusable Field wrapper ---- */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="content-field">
      <label>{label}</label>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}
