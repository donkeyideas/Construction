import Link from "next/link";
import { HomepageThemeToggle } from "@/components/homepage-theme-toggle";
import BetaSignupForm from "@/components/BetaSignupForm";
import "@/styles/beta.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Founding Member Program - Buildwrk",
  description:
    "Join the Buildwrk Founding Member Program. Get 1 year free. Limited to 30 construction companies.",
};

export default function BetaPage() {
  return (
    <div className="beta-page hp">
      <HomepageThemeToggle />

      {/* NAV — matches homepage */}
      <nav className="hp-nav">
        <div className="hp-nav-inner">
          <Link href="/" className="hp-nav-logo">
            Buildwrk
          </Link>
          <ul className="hp-nav-links">
            <li><Link href="/#about">About</Link></li>
            <li><Link href="/#modules">Features</Link></li>
            <li><Link href="/#pricing">Pricing</Link></li>
            <li><Link href="/#faq">FAQ</Link></li>
            <li><Link href="/login">Sign In</Link></li>
            <li><Link href="/beta" className="hp-nav-cta">Join Beta</Link></li>
          </ul>
        </div>
      </nav>

      {/* HERO */}
      <section className="beta-hero">
        <div className="beta-badge">Limited to 30 Companies</div>
        <h1>The Buildwrk Founding Member Program</h1>
        <p>
          We&apos;re selecting 30 construction companies to help shape the future of
          Buildwrk. In exchange for your feedback, you&apos;ll get 1 full year
          completely free and direct access to our founder.
        </p>
      </section>

      {/* OFFER CARDS */}
      <div className="beta-offer">
        <div className="beta-offer-card">
          <div className="beta-offer-icon">🎁</div>
          <h3>1 Year Free</h3>
          <p>
            Full platform access — every module, every feature, no credit card
            required. Use Buildwrk for 12 months at zero cost.
          </p>
        </div>
        <div className="beta-offer-card">
          <div className="beta-offer-icon">💬</div>
          <h3>Direct Founder Access</h3>
          <p>
            A direct line to our founder. Your feedback shapes the product
            roadmap. Tell us what to build next.
          </p>
        </div>
      </div>

      {/* WHO WE'RE LOOKING FOR */}
      <section className="beta-types">
        <h2>Who We&apos;re Looking For</h2>
        <div className="beta-types-grid">
          <div className="beta-type-chip">General Contractors</div>
          <div className="beta-type-chip">Developers</div>
          <div className="beta-type-chip">Property Managers</div>
          <div className="beta-type-chip">Owner-Builders</div>
          <div className="beta-type-chip">Subcontractors</div>
          <div className="beta-type-chip">Specialty Trades</div>
          <div className="beta-type-chip">Architects / Engineers</div>
        </div>
      </section>

      {/* APPLICATION FORM */}
      <section className="beta-form-section">
        <h2>Apply Now</h2>
        <p>Fill out the form below and we&apos;ll reach out within 48 hours.</p>
        <BetaSignupForm />
      </section>

      {/* WHAT WE ASK */}
      <section className="beta-ask">
        <h2>What We Ask in Return</h2>
        <ul>
          <li>Use the platform actively for at least 30 days</li>
          <li>Share honest feedback on what works and what doesn&apos;t</li>
          <li>Join a 15-minute call once a month to share your experience</li>
          <li>Allow us to feature your company as an early adopter (optional)</li>
        </ul>
      </section>

      {/* FOOTER — matches homepage */}
      <footer className="hp-footer">
        <div className="hp-footer-grid">
          <div>
            <h4>Product</h4>
            <ul>
              <li><Link href="/#modules">Features</Link></li>
              <li><Link href="/#pricing">Pricing</Link></li>
              <li><Link href="/#faq">FAQ</Link></li>
              <li><Link href="/beta">Founding Member Program</Link></li>
            </ul>
          </div>
          <div>
            <h4>Modules</h4>
            <ul>
              <li><Link href="/p/project-management">Project Management</Link></li>
              <li><Link href="/p/property-management">Property Management</Link></li>
              <li><Link href="/p/financial-management">Financial Management</Link></li>
              <li><Link href="/p/document-management">Document Management</Link></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><Link href="/p/about">About</Link></li>
              <li><Link href="/#pricing">Plans</Link></li>
              <li><Link href="/login">Sign In</Link></li>
              <li><Link href="/p/contact">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              <li><Link href="/p/privacy-policy">Privacy Policy</Link></li>
              <li><Link href="/p/terms-of-service">Terms of Service</Link></li>
              <li><Link href="/p/cookie-policy">Cookie Policy</Link></li>
              <li><Link href="/p/gdpr">GDPR</Link></li>
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
