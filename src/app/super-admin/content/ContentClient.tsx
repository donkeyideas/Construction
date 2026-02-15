"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
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

function formatDate(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
  const t = useTranslations("superAdmin");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const router = useRouter();

  const SECTION_LABELS: Record<string, string> = {
    hero: t("heroLabel"),
    about: t("aboutLabel"),
    steps: t("stepsLabel"),
    modules: t("modulesLabel"),
    value_props: t("valuePropsLabel"),
    modules_grid: t("modulesGridLabel"),
    pricing: t("pricingLabel"),
    faq: t("faqLabel"),
    cta: t("ctaLabel"),
  };

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
        setError(data.error || t("failedUpdate"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("networkError"));
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

      // Detect stale seed data: if homepage sections lack our expected
      // types (about, steps, modules, pricing) they are from the old
      // seed and should be replaced with the SEO-optimised defaults.
      const dbSections = data.sections as CmsSection[] | null;
      const hasExpectedTypes = dbSections?.some((s) =>
        ["about", "steps", "modules", "pricing"].includes(s.type)
      );
      const loadedSections =
        dbSections && dbSections.length > 0 && hasExpectedTypes
          ? dbSections
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
      setError(t("failedSaveContent"));
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
      setNotification({ type: "success", message: t("contentSaved") });
    } catch {
      setNotification({ type: "error", message: t("failedSaveContent") });
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

  function resetToDefaults() {
    if (!editingPage) return;
    const defaults = getDefaults(editingPage.page_slug);
    if (defaults.sections.length === 0) return;
    setSections(defaults.sections);
    setMetaTitle(defaults.metaTitle);
    setMetaDescription(defaults.metaDescription);
    setNotification({ type: "success", message: t("resetToDefaultsSuccess") });
  }

  /* ---- Section-type editors ---- */

  function renderSectionEditor(section: CmsSection, idx: number) {
    const c = section.content;
    switch (section.type) {
      case "hero":
        return (
          <div className="content-section-fields">
            <Field label={t("headline")} hint={t("headlineHint")}>
              <input value={c.title || ""} onChange={(e) => updateSectionContent(idx, "title", e.target.value)} />
            </Field>
            <Field label={t("subtitle")} hint={t("subtitleHint")}>
              <textarea rows={3} value={c.subtitle || ""} onChange={(e) => updateSectionContent(idx, "subtitle", e.target.value)} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label={t("ctaButtonText")}>
                <input value={c.cta_text || ""} onChange={(e) => updateSectionContent(idx, "cta_text", e.target.value)} />
              </Field>
              <Field label={t("ctaButtonLink")}>
                <input value={c.cta_link || ""} onChange={(e) => updateSectionContent(idx, "cta_link", e.target.value)} />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label={t("secondaryLinkText")}>
                <input value={c.secondary_text || ""} onChange={(e) => updateSectionContent(idx, "secondary_text", e.target.value)} />
              </Field>
              <Field label={t("secondaryLinkUrl")}>
                <input value={c.secondary_link || ""} onChange={(e) => updateSectionContent(idx, "secondary_link", e.target.value)} />
              </Field>
            </div>
            <Field label={t("imageUrl")}>
              <input value={c.image_url || ""} onChange={(e) => updateSectionContent(idx, "image_url", e.target.value)} />
            </Field>
            <Field label={t("imageAlt")} hint={t("imageAltHint")}>
              <input value={c.image_alt || ""} onChange={(e) => updateSectionContent(idx, "image_alt", e.target.value)} />
            </Field>
          </div>
        );

      case "about":
        return (
          <div className="content-section-fields">
            <Field label={t("sectionTitle")}>
              <input value={c.title || ""} onChange={(e) => updateSectionContent(idx, "title", e.target.value)} />
            </Field>
            <Field label={t("bodyText")} hint={t("bodyTextHint")}>
              <textarea rows={5} value={c.body || ""} onChange={(e) => updateSectionContent(idx, "body", e.target.value)} />
            </Field>
          </div>
        );

      case "steps":
        return (
          <div className="content-section-fields">
            <Field label={t("sectionTitle")}>
              <input value={c.title || ""} onChange={(e) => updateSectionContent(idx, "title", e.target.value)} />
            </Field>
            {(c.steps || []).map((step: any, si: number) => (
              <div key={si} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 14, marginTop: 10 }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-amber)", marginBottom: 8 }}>{t("step", { number: si + 1 })}</div>
                <Field label={t("title")}>
                  <input value={step.title || ""} onChange={(e) => updateArrayItem(idx, "steps", si, "title", e.target.value)} />
                </Field>
                <Field label={t("description")}>
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
                <Field label={t("label")}>
                  <input value={mod.label || ""} onChange={(e) => updateArrayItem(idx, "modules", mi, "label", e.target.value)} />
                </Field>
                <Field label={t("title")}>
                  <input value={mod.title || ""} onChange={(e) => updateArrayItem(idx, "modules", mi, "title", e.target.value)} />
                </Field>
                <Field label={t("description")}>
                  <textarea rows={3} value={mod.body || ""} onChange={(e) => updateArrayItem(idx, "modules", mi, "body", e.target.value)} />
                </Field>
                <Field label={t("ctaText")}>
                  <input value={mod.cta_text || ""} onChange={(e) => updateArrayItem(idx, "modules", mi, "cta_text", e.target.value)} />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label={t("imageUrl")}>
                    <input value={mod.image_url || ""} onChange={(e) => updateArrayItem(idx, "modules", mi, "image_url", e.target.value)} />
                  </Field>
                  <Field label={t("imageAlt")}>
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
                <Field label={t("title")}>
                  <input value={item.title || ""} onChange={(e) => updateArrayItem(idx, "items", ii, "title", e.target.value)} />
                </Field>
                <Field label={t("description")}>
                  <textarea rows={2} value={item.body || ""} onChange={(e) => updateArrayItem(idx, "items", ii, "body", e.target.value)} />
                </Field>
              </div>
            ))}
          </div>
        );

      case "modules_grid":
        return (
          <div className="content-section-fields">
            <Field label={t("sectionTitle")}>
              <input value={c.title || ""} onChange={(e) => updateSectionContent(idx, "title", e.target.value)} />
            </Field>
            <Field label={t("subtitle")}>
              <input value={c.subtitle || ""} onChange={(e) => updateSectionContent(idx, "subtitle", e.target.value)} />
            </Field>
            {(c.cards || []).map((card: any, ci: number) => (
              <div key={ci} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 14, marginTop: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: 12 }}>
                  <Field label={t("icon")}>
                    <input value={card.icon || ""} onChange={(e) => updateArrayItem(idx, "cards", ci, "icon", e.target.value)} />
                  </Field>
                  <Field label={t("title")}>
                    <input value={card.title || ""} onChange={(e) => updateArrayItem(idx, "cards", ci, "title", e.target.value)} />
                  </Field>
                </div>
                <Field label={t("description")}>
                  <textarea rows={2} value={card.body || ""} onChange={(e) => updateArrayItem(idx, "cards", ci, "body", e.target.value)} />
                </Field>
              </div>
            ))}
          </div>
        );

      case "pricing":
        return (
          <div className="content-section-fields">
            <Field label={t("sectionTitle")}>
              <input value={c.title || ""} onChange={(e) => updateSectionContent(idx, "title", e.target.value)} />
            </Field>
            <Field label={t("subtitle")}>
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
                  <Field label={t("planName")}>
                    <input value={plan.name || ""} onChange={(e) => updateArrayItem(idx, "plans", pi, "name", e.target.value)} />
                  </Field>
                  <Field label={t("badge")}>
                    <input value={plan.badge || ""} onChange={(e) => updateArrayItem(idx, "plans", pi, "badge", e.target.value)} />
                  </Field>
                </div>
                <Field label={t("description")}>
                  <input value={plan.description || ""} onChange={(e) => updateArrayItem(idx, "plans", pi, "description", e.target.value)} />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label={t("price")}>
                    <input value={plan.price || ""} onChange={(e) => updateArrayItem(idx, "plans", pi, "price", e.target.value)} />
                  </Field>
                  <Field label={t("period")}>
                    <input value={plan.period || ""} onChange={(e) => updateArrayItem(idx, "plans", pi, "period", e.target.value)} />
                  </Field>
                </div>
                <Field label={t("featuresPerLine")}>
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
            <Field label={t("sectionTitle")}>
              <input value={c.title || ""} onChange={(e) => updateSectionContent(idx, "title", e.target.value)} />
            </Field>
            {(c.items || []).map((item: any, ii: number) => (
              <div key={ii} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 14, marginTop: 10 }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>{t("question", { number: ii + 1 })}</div>
                <Field label={t("questionLabel")}>
                  <input value={item.question || ""} onChange={(e) => updateArrayItem(idx, "items", ii, "question", e.target.value)} />
                </Field>
                <Field label={t("answer")}>
                  <textarea rows={3} value={item.answer || ""} onChange={(e) => updateArrayItem(idx, "items", ii, "answer", e.target.value)} />
                </Field>
              </div>
            ))}
          </div>
        );

      case "cta":
        return (
          <div className="content-section-fields">
            <Field label={t("headline")}>
              <input value={c.title || ""} onChange={(e) => updateSectionContent(idx, "title", e.target.value)} />
            </Field>
            <Field label={t("subtitle")}>
              <textarea rows={2} value={c.subtitle || ""} onChange={(e) => updateSectionContent(idx, "subtitle", e.target.value)} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label={t("buttonText")}>
                <input value={c.cta_text || ""} onChange={(e) => updateSectionContent(idx, "cta_text", e.target.value)} />
              </Field>
              <Field label={t("buttonLink")}>
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
   *  RENDER -- LIST VIEW
   * ================================================================ */
  if (view === "list") {
    return (
      <>
        <div className="admin-header">
          <div>
            <h2>{t("cmsTitle")}</h2>
            <p className="admin-header-sub">
              {t("cmsDesc")}
            </p>
          </div>
        </div>

        <div className="admin-stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="admin-stat-card">
            <div className="admin-stat-icon blue"><FileText size={18} /></div>
            <div className="admin-stat-label">{t("totalPages")}</div>
            <div className="admin-stat-value">{pages.length}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon green"><Eye size={18} /></div>
            <div className="admin-stat-label">{t("published")}</div>
            <div className="admin-stat-value">{publishedCount}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon amber"><EyeOff size={18} /></div>
            <div className="admin-stat-label">{t("draft")}</div>
            <div className="admin-stat-value">{draftCount}</div>
          </div>
        </div>

        {error && <div className="content-notification error">{error}</div>}

        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>{t("page")}</th>
                <th>{t("slug")}</th>
                <th>{t("status")}</th>
                <th>{t("published")}</th>
                <th>{t("lastUpdated")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {pages.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
                    {t("noCmsPages")}
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
                      {page.published_at ? formatDate(page.published_at, dateLocale) : "-"}
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                      {formatDate(page.updated_at, dateLocale)}
                    </td>
                    <td>
                      <button
                        className={`sa-action-btn ${page.status === "published" ? "" : "primary"}`}
                        onClick={(e) => { e.stopPropagation(); toggleStatus(page.page_slug, page.status); }}
                        disabled={updating === page.page_slug}
                        style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                      >
                        {page.status === "published" ? t("unpublish") : t("publish")}
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
   *  RENDER -- EDITOR VIEW
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
          <ArrowLeft size={14} /> {t("backToPages")}
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
          href={editingPage?.page_slug === "homepage" ? "/" : `/p/${editingPage?.page_slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
        >
          <ExternalLink size={14} /> {t("preview")}
        </a>
        <button
          onClick={handleSave}
          className="btn-primary"
          disabled={saving}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Save size={14} /> {saving ? t("saving") : t("saveChanges")}
        </button>
      </div>

      {notification && (
        <div className={`content-notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Editor Layout */}
      <div className="content-editor">
        {/* Main -- Sections */}
        <div className="content-editor-main">
          {/* Page title field */}
          <div className="content-editor-section">
            <div className="content-editor-section-title">{t("pageSettings")}</div>
            <div className="content-field">
              <label>{t("pageTitle")}</label>
              <input
                value={pageTitle}
                onChange={(e) => setPageTitle(e.target.value)}
              />
            </div>
            <div className="content-field">
              <label>{t("status")}</label>
              <select value={pageStatus} onChange={(e) => setPageStatus(e.target.value)}>
                <option value="published">{t("published")}</option>
                <option value="draft">{t("draft")}</option>
              </select>
            </div>
          </div>

          {/* Section toolbar */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            {editingPage?.page_slug === "homepage" && (
              <button
                onClick={resetToDefaults}
                style={{ fontSize: "0.78rem", color: "var(--color-amber)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}
              >
                {t("resetToDefaults")}
              </button>
            )}
            <button
              onClick={expandAll}
              style={{ fontSize: "0.78rem", color: "var(--color-blue)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}
            >
              {t("expandAll")}
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

        {/* Sidebar -- SEO */}
        <div className="content-editor-sidebar">
          <div className="content-editor-section">
            <div className="content-editor-section-title">{t("seoSettings")}</div>
            <div className="content-field">
              <label>{t("metaTitle")}</label>
              <input
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder={t("metaTitleHint")}
              />
              <span className={`char-count ${metaTitle.length > 60 ? "over" : ""}`}>
                {metaTitle.length}/60
              </span>
            </div>
            <div className="content-field">
              <label>{t("metaDescription")}</label>
              <textarea
                rows={4}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder={t("metaDescHint")}
              />
              <span className={`char-count ${metaDescription.length > 160 ? "over" : ""}`}>
                {metaDescription.length}/160
              </span>
            </div>
          </div>

          <div className="content-editor-section">
            <div className="content-editor-section-title">{t("seoTips")}</div>
            <ul style={{ fontSize: "0.8rem", color: "var(--muted)", paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6, lineHeight: 1.5 }}>
              <li>{t("seoTip1")}</li>
              <li>{t("seoTip2")}</li>
              <li>{t("seoTip3")}</li>
              <li>{t("seoTip4")}</li>
              <li>{t("seoTip5")}</li>
              <li>{t("seoTip6")}</li>
            </ul>
          </div>

          <div className="content-editor-section">
            <div className="content-editor-section-title">{t("quickInfo")}</div>
            <div style={{ fontSize: "0.82rem", color: "var(--muted)", display: "flex", flexDirection: "column", gap: 6 }}>
              <div><strong>{t("sections")}</strong> {sections.length}</div>
              <div><strong>{t("visible")}</strong> {sections.filter((s) => s.visible).length}</div>
              <div><strong>{t("lastSaved")}</strong> {editingPage ? formatDate(editingPage.updated_at, dateLocale) : "-"}</div>
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
