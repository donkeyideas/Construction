/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { HomepageThemeToggle } from "@/components/homepage-theme-toggle";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_HOMEPAGE_SECTIONS,
  DEFAULT_META_TITLE,
  DEFAULT_META_DESCRIPTION,
  type CmsSection,
} from "@/lib/cms/homepage-defaults";
import type { Metadata } from "next";

/* ================================================================
 *  Dynamic metadata from CMS
 * ================================================================ */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("cms_pages")
      .select("meta_title, meta_description")
      .eq("page_slug", "homepage")
      .eq("status", "published")
      .single();

    return {
      title: data?.meta_title || DEFAULT_META_TITLE,
      description: data?.meta_description || DEFAULT_META_DESCRIPTION,
    };
  } catch {
    return {
      title: DEFAULT_META_TITLE,
      description: DEFAULT_META_DESCRIPTION,
    };
  }
}

/* ================================================================
 *  Page component — reads sections from CMS, falls back to defaults
 * ================================================================ */
export default async function HomePage() {
  let sections: CmsSection[] = DEFAULT_HOMEPAGE_SECTIONS;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("cms_pages")
      .select("sections")
      .eq("page_slug", "homepage")
      .eq("status", "published")
      .single();

    if (data?.sections && Array.isArray(data.sections) && data.sections.length > 0) {
      const dbSections = data.sections as CmsSection[];
      // Detect stale seed data (old format had features/stats/testimonials instead of about/steps/modules/pricing)
      const types = dbSections.map((s) => s.type);
      const hasNewFormat = ["about", "steps", "modules", "pricing"].some((t) => types.includes(t));
      sections = hasNewFormat ? dbSections : DEFAULT_HOMEPAGE_SECTIONS;
    }
  } catch {
    // Use defaults if DB is unreachable
  }

  const visible = sections
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  // Extract FAQ for JSON-LD structured data
  const faqSection = visible.find((s) => s.type === "faq");
  const faqItems = faqSection?.content?.items || [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "Buildwrk",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "All-in-one Buildwrk and real estate management platform for general contractors, developers, and property managers.",
        offers: [
          { "@type": "Offer", name: "Starter", price: "79", priceCurrency: "USD", priceValidUntil: "2027-12-31" },
          { "@type": "Offer", name: "Professional", price: "199", priceCurrency: "USD", priceValidUntil: "2027-12-31" },
          { "@type": "Offer", name: "Enterprise", price: "449", priceCurrency: "USD", priceValidUntil: "2027-12-31" },
        ],
        featureList: [
          "Project Management with Gantt Charts",
          "Job Costing by CSI Division",
          "Accounts Payable and Receivable",
          "Property and Lease Management",
          "Document Management with Plan Room",
          "CRM and Bid Management",
          "Workforce Time Tracking",
          "AI-Powered Analytics and Chat",
          "Role-Based Access Control",
          "Real-Time Dashboards",
        ],
      },
      ...(faqItems.length > 0
        ? [
            {
              "@type": "FAQPage",
              mainEntity: faqItems.map((item: any) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: { "@type": "Answer", text: item.answer },
              })),
            },
          ]
        : []),
    ],
  };

  return (
    <div className="hp">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomepageThemeToggle />

      {/* NAV */}
      <nav className="hp-nav">
        <div className="hp-nav-inner">
          <Link href="/" className="hp-nav-logo">
            Buildwrk
          </Link>
          <ul className="hp-nav-links">
            <li><a href="#about">About</a></li>
            <li><a href="#modules">Features</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#faq">FAQ</a></li>
            <li><Link href="/login">Sign In</Link></li>
            <li><Link href="/register" className="hp-nav-cta">Start Free Trial</Link></li>
          </ul>
        </div>
      </nav>

      {/* CMS-DRIVEN SECTIONS */}
      {visible.map((section, i) => {
        switch (section.type) {
          case "hero":
            return <HeroSection key={i} c={section.content} />;
          case "about":
            return <AboutSection key={i} c={section.content} />;
          case "steps":
            return <StepsSection key={i} c={section.content} />;
          case "modules":
            return <ModulesSection key={i} c={section.content} />;
          case "value_props":
            return <ValuePropsSection key={i} c={section.content} />;
          case "modules_grid":
            return <ModulesGridSection key={i} c={section.content} />;
          case "pricing":
            return <PricingSection key={i} c={section.content} />;
          case "faq":
            return <FaqSection key={i} c={section.content} />;
          case "cta":
            return <CtaSection key={i} c={section.content} />;
          default:
            return null;
        }
      })}

      {/* FOOTER */}
      <footer className="hp-footer">
        <div className="hp-footer-grid">
          <div>
            <h4>Product</h4>
            <ul>
              <li><a href="#modules">Features</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#faq">FAQ</a></li>
              <li><Link href="/register">Start Free Trial</Link></li>
            </ul>
          </div>
          <div>
            <h4>Modules</h4>
            <ul>
              <li><a href="#modules">Project Management</a></li>
              <li><a href="#modules">Property Management</a></li>
              <li><a href="#modules">Financial Management</a></li>
              <li><a href="#modules">Document Management</a></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><a href="#about">About</a></li>
              <li><a href="#pricing">Plans</a></li>
              <li><Link href="/login">Sign In</Link></li>
              <li><a href="mailto:support@buildwrk.com">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Cookie Policy</a></li>
              <li><a href="#">GDPR</a></li>
            </ul>
          </div>
        </div>
        <div className="hp-footer-bottom">
          2026 Buildwrk. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

/* ================================================================
 *  Section renderers – each reads from the CMS content object
 * ================================================================ */

function HeroSection({ c }: { c: any }) {
  return (
    <section className="hp-hero">
      <div className="hp-hero-image">
        <img
          src={c.image_url || "https://placehold.co/800x900/b45309/ffffff?text=Construction+Site"}
          alt={c.image_alt || "Construction management software"}
          width={800}
          height={900}
        />
      </div>
      <div className="hp-hero-content">
        <div className="hp-hero-accent" />
        <h1>{c.title || c.headline}</h1>
        <p>{c.subtitle || c.subheadline}</p>
        <div className="hp-hero-actions">
          <Link href={c.cta_link || c.cta_url || "/register"} className="hp-btn-blue">
            {c.cta_text || "Start Free Trial"}
          </Link>
          <a href={c.secondary_link || c.secondary_cta_url || "#about"} className="hp-link-arrow">
            {c.secondary_text || c.secondary_cta_text || "See How It Works →"}
          </a>
        </div>
      </div>
    </section>
  );
}

function AboutSection({ c }: { c: any }) {
  return (
    <section className="hp-story" id="about">
      <div className="hp-story-inner">
        <h2>{c.title}</h2>
        <p>{c.body}</p>
      </div>
    </section>
  );
}

function StepsSection({ c }: { c: any }) {
  return (
    <section className="hp-steps">
      <div className="hp-container">
        <h2>{c.title}</h2>
        <div className="hp-steps-row">
          {(c.steps || []).map((step: any, i: number) => (
            <div key={i} className="hp-step">
              <div className="hp-step-number">{i + 1}</div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ModulesSection({ c }: { c: any }) {
  return (
    <section id="modules">
      {(c.modules || []).map((mod: any, i: number) => (
        <div key={i} className={`hp-module-block ${i % 2 !== 0 ? "hp-module-reverse" : ""}`}>
          <div className="hp-module-img">
            <img
              src={mod.image_url || `https://placehold.co/700x480/292524/ffffff?text=${encodeURIComponent(mod.title)}`}
              alt={mod.image_alt || mod.title}
              width={700}
              height={480}
            />
          </div>
          <div className="hp-module-text">
            <div className="hp-label">{mod.label || "Module"}</div>
            <h2>{mod.title}</h2>
            <p>{mod.body}</p>
            <Link href="/register" className="hp-link-arrow">
              {mod.cta_text || `Start Managing ${mod.title} →`}
            </Link>
          </div>
        </div>
      ))}
    </section>
  );
}

function ValuePropsSection({ c }: { c: any }) {
  const icons = [
    <svg key="0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>,
    <svg key="1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    <svg key="2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
    <svg key="3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  ];

  return (
    <section className="hp-value-banner" id="value">
      <div className="hp-value-grid">
        {(c.items || []).map((item: any, i: number) => (
          <div key={i} className="hp-value-item">
            <div className="hp-value-icon">{icons[i] || icons[0]}</div>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ModulesGridSection({ c }: { c: any }) {
  return (
    <section className="hp-modules-grid">
      <div className="hp-container">
        <h2>{c.title}</h2>
        <p className="hp-section-sub">{c.subtitle}</p>
        <div className="hp-cards-grid">
          {(c.cards || []).map((card: any, i: number) => (
            <div key={i} className="hp-card">
              <div className="hp-card-icon">{card.icon}</div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection({ c }: { c: any }) {
  return (
    <section className="hp-pricing" id="pricing">
      <div className="hp-container">
        <h2>{c.title}</h2>
        <p className="hp-section-sub">{c.subtitle}</p>
        <div className="hp-pricing-grid">
          {(c.plans || []).map((plan: any, i: number) => (
            <div key={i} className={`hp-pricing-card ${plan.featured ? "hp-pricing-featured" : ""}`}>
              {plan.badge && <div className="hp-pricing-badge">{plan.badge}</div>}
              <div className="hp-pricing-name">{plan.name}</div>
              <div className="hp-pricing-desc">{plan.description}</div>
              <div className="hp-pricing-price">
                <span className="hp-pricing-dollar">$</span>
                <span className="hp-pricing-amount">{plan.price}</span>
                <span className="hp-pricing-period">{plan.period}</span>
              </div>
              <ul className="hp-pricing-features">
                {(plan.features || []).map((f: string, fi: number) => (
                  <li key={fi}>{f}</li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`hp-pricing-btn ${plan.featured ? "hp-pricing-btn-primary" : ""}`}
              >
                Start Free Trial
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection({ c }: { c: any }) {
  return (
    <section className="hp-faq" id="faq">
      <div className="hp-container">
        <h2>{c.title}</h2>
        <div className="hp-faq-grid">
          {(c.items || []).map((item: any, i: number) => (
            <details key={i} className="hp-faq-item">
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection({ c }: { c: any }) {
  return (
    <section className="hp-cta-section">
      <h2>{c.title}</h2>
      <p>{c.subtitle}</p>
      <Link href={c.cta_link || "/register"} className="hp-btn-blue hp-btn-lg">
        {c.cta_text || "Start Your Free Trial"}
      </Link>
    </section>
  );
}
