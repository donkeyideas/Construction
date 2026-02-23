import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import ContactForm from "@/components/ContactForm";
import "@/styles/cms-page.css";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CmsSection {
  type: "hero" | "text" | "features" | "cta";
  visible?: boolean;
  order?: number;
  content: {
    headline?: string;
    subheadline?: string;
    body?: string;
    features?: { title: string; description: string }[];
    items?: { title: string; description: string }[];
    button_text?: string;
    button_link?: string;
    buttonText?: string;
    buttonUrl?: string;
  };
}

interface CmsPage {
  id: string;
  page_slug: string;
  title: string;
  sections: CmsSection[];
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  status: string;
  published_at: string | null;
}

/* ------------------------------------------------------------------ */
/*  Data fetching                                                      */
/* ------------------------------------------------------------------ */

async function getCmsPage(slug: string): Promise<CmsPage | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("cms_pages")
    .select("*")
    .eq("page_slug", slug)
    .eq("status", "published")
    .single();

  if (error || !data) return null;
  return data as CmsPage;
}

/* ------------------------------------------------------------------ */
/*  Metadata                                                           */
/* ------------------------------------------------------------------ */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getCmsPage(slug);

  if (!page) {
    return { title: "Page Not Found" };
  }

  return {
    title: page.meta_title || page.title,
    description: page.meta_description || undefined,
    openGraph: {
      title: page.meta_title || page.title,
      description: page.meta_description || undefined,
      images: page.og_image_url ? [{ url: page.og_image_url }] : undefined,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Section renderers                                                  */
/* ------------------------------------------------------------------ */

function renderHero(section: CmsSection, index: number) {
  const { headline, subheadline } = section.content;
  return (
    <section key={index} className="cms-hero">
      {headline && <h1 className="cms-hero-headline">{headline}</h1>}
      {subheadline && (
        <p className="cms-hero-subheadline">{subheadline}</p>
      )}
    </section>
  );
}

function renderText(section: CmsSection, index: number) {
  const { body } = section.content;
  if (!body) return null;

  const paragraphs = body.split("\n\n");
  return (
    <section key={index} className="cms-text">
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </section>
  );
}

function renderFeatures(section: CmsSection, index: number) {
  const { headline } = section.content;
  const features = section.content.features || section.content.items;
  if (!features || features.length === 0) return null;

  return (
    <section key={index} className="cms-features">
      {headline && <h2 className="cms-features-headline">{headline}</h2>}
      <div className="cms-features-grid">
        {features.map((feature, i) => (
          <div key={i} className="cms-feature-card">
            <h3 className="cms-feature-card-title">{feature.title}</h3>
            <p className="cms-feature-card-desc">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function renderCta(section: CmsSection, index: number) {
  const { headline } = section.content;
  const btnText = section.content.button_text || section.content.buttonText;
  const btnLink = section.content.button_link || section.content.buttonUrl;
  return (
    <section key={index} className="cms-cta">
      {headline && <h2 className="cms-cta-headline">{headline}</h2>}
      {btnText && btnLink && (
        <Link href={btnLink} className="cms-cta-button">
          {btnText}
        </Link>
      )}
    </section>
  );
}

function renderSection(section: CmsSection, index: number) {
  if (section.visible === false) return null;

  switch (section.type) {
    case "hero":
      return renderHero(section, index);
    case "text":
      return renderText(section, index);
    case "features":
      return renderFeatures(section, index);
    case "cta":
      return renderCta(section, index);
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default async function CmsPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getCmsPage(slug);

  if (!page) {
    notFound();
  }

  const sections = Array.isArray(page.sections) ? page.sections : [];
  const sorted = [...sections].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );

  return (
    <div className="cms-page">
      <div className="cms-page-container">
        {sorted.map((section, index) => renderSection(section, index))}

        {slug === "contact" && <ContactForm />}

        <div className="cms-back-link-wrap">
          <Link href="/" className="cms-back-link">
            &larr; Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
