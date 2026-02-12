import Link from "next/link";
import { HomepageThemeToggle } from "@/components/homepage-theme-toggle";

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "ConstructionERP",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "All-in-one construction ERP and real estate management platform for general contractors, developers, and property managers. Project management, financial tracking, document control, and AI-powered analytics in one platform.",
        offers: [
          {
            "@type": "Offer",
            name: "Starter",
            price: "79",
            priceCurrency: "USD",
            priceValidUntil: "2027-12-31",
            description:
              "For small contractors. Up to 3 active projects, 5 team members.",
          },
          {
            "@type": "Offer",
            name: "Professional",
            price: "199",
            priceCurrency: "USD",
            priceValidUntil: "2027-12-31",
            description:
              "For growing firms. Up to 15 active projects, 25 team members, AI assistant (BYOK), property management.",
          },
          {
            "@type": "Offer",
            name: "Enterprise",
            price: "449",
            priceCurrency: "USD",
            priceValidUntil: "2027-12-31",
            description:
              "For established companies. Unlimited projects, unlimited team members, tenant and vendor portals, dedicated support channel.",
          },
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
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is construction ERP software?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Construction ERP (Enterprise Resource Planning) software is a unified platform that integrates project management, financial tracking, document control, workforce management, and business operations into a single system. Instead of juggling separate tools for scheduling, accounting, and document storage, construction ERP brings everything together so teams can work faster with complete visibility across all projects.",
            },
          },
          {
            "@type": "Question",
            name: "Who is ConstructionERP built for?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "ConstructionERP is designed for general contractors, real estate developers, property managers, and owner-builders who need a single platform to manage construction projects and real estate assets. Whether you run 3 projects or 300, the platform scales with your business.",
            },
          },
          {
            "@type": "Question",
            name: "How does ConstructionERP compare to Procore or Buildertrend?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Unlike legacy platforms, ConstructionERP is built on modern cloud infrastructure with AI capabilities available from day one. It combines construction project management AND property management in one platform -- so you do not need separate systems for building and managing real estate. Pricing starts at $79/month versus the $375+ typical of enterprise construction software.",
            },
          },
          {
            "@type": "Question",
            name: "What AI features does ConstructionERP include?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "ConstructionERP includes an AI assistant that can answer questions about your projects, finances, and properties in real time, plus AI-powered document extraction for invoices, contracts, and lien waivers. AI features use a bring-your-own-key model -- you connect your preferred provider (OpenAI, Claude, Gemini, and 7 others) so you control costs and data privacy.",
            },
          },
          {
            "@type": "Question",
            name: "Is there a free trial?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Every plan includes a 14-day free trial with full access to all features. No credit card required to start. You can import your existing projects and test every module before committing.",
            },
          },
          {
            "@type": "Question",
            name: "Can I manage both construction projects and rental properties?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. ConstructionERP is one of the few platforms that covers the full lifecycle -- from pre-construction bidding through project execution, then into property management with unit tracking, lease management, tenant communications, and maintenance workflows. This eliminates the need for separate systems like Procore plus Yardi.",
            },
          },
        ],
      },
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
            ConstructionERP
          </Link>
          <ul className="hp-nav-links">
            <li>
              <a href="#about">About</a>
            </li>
            <li>
              <a href="#modules">Features</a>
            </li>
            <li>
              <a href="#pricing">Pricing</a>
            </li>
            <li>
              <a href="#faq">FAQ</a>
            </li>
            <li>
              <Link href="/login">Sign In</Link>
            </li>
            <li>
              <Link href="/register" className="hp-nav-cta">
                Start Free Trial
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* HERO */}
      <section className="hp-hero">
        <div className="hp-hero-image">
          <img
            src="https://placehold.co/800x900/b45309/ffffff?text=Construction+Site"
            alt="Construction project management software showing active job site with cranes and steel framework"
            width={800}
            height={900}
          />
        </div>
        <div className="hp-hero-content">
          <div className="hp-hero-accent" />
          <h1>
            One Platform for Every Project, Every Property, Every Dollar
          </h1>
          <p>
            Construction ERP software that unifies project management,
            financial tracking, property operations, and AI-powered analytics
            -- so your team stops juggling tools and starts building.
          </p>
          <div className="hp-hero-actions">
            <Link href="/register" className="hp-btn-blue">
              Start Free 14-Day Trial
            </Link>
            <a href="#about" className="hp-link-arrow">
              See How It Works &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* ABOUT / STORY */}
      <section className="hp-story" id="about">
        <div className="hp-story-inner">
          <h2>Why We Built This</h2>
          <p>
            Builders deserve better than disconnected spreadsheets, overpriced
            legacy platforms, and duct-taped tool stacks. We built
            ConstructionERP as a modern, AI-native alternative -- one platform
            that covers the full lifecycle from preconstruction bids to final
            closeout and beyond into property management. Every project, every
            dollar, every document, one place.
          </p>
        </div>
      </section>

      {/* 3-STEP PROCESS */}
      <section className="hp-steps">
        <div className="hp-container">
          <h2>Get Started in Minutes, Not Months</h2>
          <div className="hp-steps-row">
            <div className="hp-step">
              <div className="hp-step-number">1</div>
              <h3>Create Your Account</h3>
              <p>
                Sign up and configure your company profile, roles, and
                permissions in under five minutes. No IT department required.
              </p>
            </div>
            <div className="hp-step">
              <div className="hp-step-number">2</div>
              <h3>Import Your Projects</h3>
              <p>
                Bring in active jobs, budgets, subcontractor lists, and
                documents with guided onboarding. Or start fresh.
              </p>
            </div>
            <div className="hp-step">
              <div className="hp-step-number">3</div>
              <h3>Run Everything from One Place</h3>
              <p>
                Real-time dashboards, automated workflows, financial tracking,
                and AI insights -- all live from day one.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MODULE BLOCKS - Alternating */}
      <section id="modules">
        <div className="hp-module-block">
          <div className="hp-module-img">
            <img
              src="https://placehold.co/700x480/292524/ffffff?text=Project+Management"
              alt="Construction project management module with Gantt charts, daily logs, and RFI tracking"
              width={700}
              height={480}
            />
          </div>
          <div className="hp-module-text">
            <div className="hp-label">Module</div>
            <h2>Project Management</h2>
            <p>
              Gantt scheduling, daily field logs, RFIs, submittals, change
              orders, and punch lists -- all connected. Track every milestone
              from groundbreaking to substantial completion with real-time
              progress dashboards, automated notifications, and a complete
              audit trail.
            </p>
            <Link href="/register" className="hp-link-arrow">
              Start Managing Projects &rarr;
            </Link>
          </div>
        </div>

        <div className="hp-module-block hp-module-reverse">
          <div className="hp-module-img">
            <img
              src="https://placehold.co/700x480/1d4ed8/ffffff?text=Property+Management"
              alt="Property management module with unit tracking, lease management, and tenant portal"
              width={700}
              height={480}
            />
          </div>
          <div className="hp-module-text">
            <div className="hp-label">Module</div>
            <h2>Property Management</h2>
            <p>
              Unit tracking, lease management, tenant communications,
              maintenance workflows, and rent roll reporting for your
              completed assets. Manage the full lifecycle from construction
              handover to long-term operations -- no second platform needed.
            </p>
            <Link href="/register" className="hp-link-arrow">
              Start Managing Properties &rarr;
            </Link>
          </div>
        </div>

        <div className="hp-module-block">
          <div className="hp-module-img">
            <img
              src="https://placehold.co/700x480/78716c/ffffff?text=Financial+Management"
              alt="Construction financial management with job costing, accounts payable, and budget tracking"
              width={700}
              height={480}
            />
          </div>
          <div className="hp-module-text">
            <div className="hp-label">Module</div>
            <h2>Financial Management</h2>
            <p>
              Job costing by CSI division, accounts payable and receivable,
              progress billing, lien waiver tracking, and budget-vs-actual
              analysis. See exactly where every dollar goes across every
              project in your portfolio with real-time financial dashboards.
            </p>
            <Link href="/register" className="hp-link-arrow">
              Start Tracking Finances &rarr;
            </Link>
          </div>
        </div>

        <div className="hp-module-block hp-module-reverse">
          <div className="hp-module-img">
            <img
              src="https://placehold.co/700x480/b45309/ffffff?text=Document+Management"
              alt="Construction document management with plan room, version control, and AI extraction"
              width={700}
              height={480}
            />
          </div>
          <div className="hp-module-text">
            <div className="hp-label">Module</div>
            <h2>Document Management</h2>
            <p>
              Plan room with version control, centralized document library,
              and AI-powered data extraction. Upload blueprints, specs,
              contracts, and permits -- then find anything in seconds with
              intelligent search. No more digging through email for the
              latest revision.
            </p>
            <Link href="/register" className="hp-link-arrow">
              Start Organizing Documents &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* VALUE PROPOSITIONS (replaces fake stats) */}
      <section className="hp-value-banner" id="value">
        <div className="hp-value-grid">
          <div className="hp-value-item">
            <div className="hp-value-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
            </div>
            <h3>All-in-One Platform</h3>
            <p>Replace 5+ disconnected tools with one unified system for construction and real estate.</p>
          </div>
          <div className="hp-value-item">
            <div className="hp-value-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <h3>Live in Minutes</h3>
            <p>No six-month implementation. Sign up, import your data, and go live the same day.</p>
          </div>
          <div className="hp-value-item">
            <div className="hp-value-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            </div>
            <h3>AI-Native from Day One</h3>
            <p>Built-in AI for document extraction, cost forecasting, natural language queries, and more.</p>
          </div>
          <div className="hp-value-item">
            <div className="hp-value-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </div>
            <h3>Enterprise Security</h3>
            <p>Row-level data isolation, encrypted storage, role-based access, and full audit logging.</p>
          </div>
        </div>
      </section>

      {/* MORE MODULES GRID */}
      <section className="hp-modules-grid">
        <div className="hp-container">
          <h2>Everything Else You Need</h2>
          <p className="hp-section-sub">
            Beyond the core modules, ConstructionERP includes tools for every
            part of your business.
          </p>
          <div className="hp-cards-grid">
            <div className="hp-card">
              <div className="hp-card-icon">C</div>
              <h3>CRM and Bid Management</h3>
              <p>
                Track leads, manage bid invitations, generate proposals, and
                convert opportunities into active projects from a centralized
                pipeline view.
              </p>
            </div>
            <div className="hp-card">
              <div className="hp-card-icon">W</div>
              <h3>Workforce and Time Tracking</h3>
              <p>
                Crew scheduling, certified payroll, safety compliance, GPS
                clock-in/out, and field worker mobile access for every job
                site.
              </p>
            </div>
            <div className="hp-card">
              <div className="hp-card-icon">AI</div>
              <h3>AI Assistant</h3>
              <p>
                Ask questions in plain English across all your data. Get
                answers like &quot;Which projects are over budget?&quot; or
                &quot;Show overdue invoices&quot; instantly.
              </p>
            </div>
            <div className="hp-card">
              <div className="hp-card-icon">R</div>
              <h3>Reports and Analytics</h3>
              <p>
                Financial statements, project performance, property NOI, and
                custom reports. Export to PDF or Excel. Schedule automated
                delivery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="hp-pricing" id="pricing">
        <div className="hp-container">
          <h2>Simple, Transparent Pricing</h2>
          <p className="hp-section-sub">
            No hidden fees. No per-project charges. Every plan includes a
            14-day free trial with full access.
          </p>
          <div className="hp-pricing-grid">
            {/* Starter */}
            <div className="hp-pricing-card">
              <div className="hp-pricing-name">Starter</div>
              <div className="hp-pricing-desc">
                For small contractors and owner-builders
              </div>
              <div className="hp-pricing-price">
                <span className="hp-pricing-dollar">$</span>
                <span className="hp-pricing-amount">79</span>
                <span className="hp-pricing-period">/month</span>
              </div>
              <ul className="hp-pricing-features">
                <li>Up to 3 active projects</li>
                <li>5 team members</li>
                <li>Project management with Gantt scheduling</li>
                <li>Invoicing and payment tracking</li>
                <li>10 GB document storage</li>
                <li>Standard reports</li>
                <li>Email support</li>
              </ul>
              <Link href="/register" className="hp-pricing-btn">
                Start Free Trial
              </Link>
            </div>

            {/* Professional */}
            <div className="hp-pricing-card hp-pricing-featured">
              <div className="hp-pricing-badge">Most Popular</div>
              <div className="hp-pricing-name">Professional</div>
              <div className="hp-pricing-desc">
                For growing general contractors and developers
              </div>
              <div className="hp-pricing-price">
                <span className="hp-pricing-dollar">$</span>
                <span className="hp-pricing-amount">199</span>
                <span className="hp-pricing-period">/month</span>
              </div>
              <ul className="hp-pricing-features">
                <li>Up to 15 active projects</li>
                <li>25 team members</li>
                <li>Everything in Starter, plus:</li>
                <li>Property and lease management</li>
                <li>AI assistant (bring your own API key)</li>
                <li>CRM and bid pipeline</li>
                <li>Workforce time tracking</li>
                <li>50 GB document storage</li>
                <li>PDF and Excel report exports</li>
                <li>Priority support</li>
              </ul>
              <Link href="/register" className="hp-pricing-btn hp-pricing-btn-primary">
                Start Free Trial
              </Link>
            </div>

            {/* Enterprise */}
            <div className="hp-pricing-card">
              <div className="hp-pricing-name">Enterprise</div>
              <div className="hp-pricing-desc">
                For established firms managing large portfolios
              </div>
              <div className="hp-pricing-price">
                <span className="hp-pricing-dollar">$</span>
                <span className="hp-pricing-amount">449</span>
                <span className="hp-pricing-period">/month</span>
              </div>
              <ul className="hp-pricing-features">
                <li>Unlimited projects</li>
                <li>Unlimited team members</li>
                <li>Everything in Professional, plus:</li>
                <li>Multi-provider AI configuration</li>
                <li>AI document extraction</li>
                <li>Tenant and vendor portals</li>
                <li>Advanced RBAC and audit logging</li>
                <li>500 GB document storage</li>
                <li>Scheduled report delivery</li>
                <li>Dedicated support channel</li>
              </ul>
              <Link href="/register" className="hp-pricing-btn">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="hp-faq" id="faq">
        <div className="hp-container">
          <h2>Frequently Asked Questions</h2>
          <div className="hp-faq-grid">
            <details className="hp-faq-item">
              <summary>What is construction ERP software?</summary>
              <p>
                Construction ERP (Enterprise Resource Planning) software is a
                unified platform that integrates project management, financial
                tracking, document control, workforce management, and business
                operations into a single system. Instead of juggling separate
                tools for scheduling, accounting, and document storage,
                construction ERP brings everything together so teams can work
                faster with complete visibility across all projects.
              </p>
            </details>
            <details className="hp-faq-item">
              <summary>Who is ConstructionERP built for?</summary>
              <p>
                ConstructionERP is designed for general contractors, real
                estate developers, property managers, and owner-builders who
                need a single platform to manage construction projects and
                real estate assets. Whether you run 3 projects or 300, the
                platform scales with your business.
              </p>
            </details>
            <details className="hp-faq-item">
              <summary>
                How does this compare to Procore or Buildertrend?
              </summary>
              <p>
                Unlike legacy platforms, ConstructionERP is built on modern
                cloud infrastructure with AI capabilities from day one. It
                combines construction project management AND property
                management in one platform -- so you do not need separate
                systems for building and managing real estate. Pricing starts
                at $79/month versus the $375+ typical of enterprise
                construction software.
              </p>
            </details>
            <details className="hp-faq-item">
              <summary>What AI features are included?</summary>
              <p>
                An AI assistant that answers questions about your projects,
                finances, and properties in real time, plus AI-powered
                document extraction for invoices, contracts, and lien waivers.
                AI features use a bring-your-own-key model -- you connect your
                preferred provider (OpenAI, Anthropic Claude, Google Gemini,
                and seven others) so you control costs and data privacy.
              </p>
            </details>
            <details className="hp-faq-item">
              <summary>Is there a free trial?</summary>
              <p>
                Yes. Every plan includes a 14-day free trial with full access
                to all features. No credit card required to start. Import
                your existing projects and test every module before
                committing.
              </p>
            </details>
            <details className="hp-faq-item">
              <summary>
                Can I manage both construction projects and rental properties?
              </summary>
              <p>
                Yes. ConstructionERP is one of the few platforms that covers
                the full lifecycle -- from pre-construction bidding through
                project execution, then into property management with unit
                tracking, lease management, tenant communications, and
                maintenance workflows. One platform, one login, one source of
                truth.
              </p>
            </details>
            <details className="hp-faq-item">
              <summary>How secure is my data?</summary>
              <p>
                Every company gets fully isolated data through row-level
                security policies. All documents are stored with encryption at
                rest. The platform includes role-based access control, full
                audit logging, and supports SSO integration on the Enterprise
                plan. Your data is hosted on enterprise-grade cloud
                infrastructure.
              </p>
            </details>
            <details className="hp-faq-item">
              <summary>Can my field team use it on mobile?</summary>
              <p>
                Yes. ConstructionERP includes dedicated mobile views for field
                workers (GPS clock-in, daily logs, photo capture, safety
                checklists) and executives (KPI dashboards, approval queues,
                AI queries). Works on any smartphone or tablet browser -- no
                app store download needed.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="hp-cta-section">
        <h2>Ready to Run Your Business from One Platform?</h2>
        <p>
          14-day free trial. No credit card required. Set up in minutes.
        </p>
        <Link href="/register" className="hp-btn-blue hp-btn-lg">
          Start Your Free Trial
        </Link>
      </section>

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
              <li><a href="mailto:support@constructionerp.com">Contact</a></li>
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
          2026 ConstructionERP. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
