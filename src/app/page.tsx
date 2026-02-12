import Link from "next/link";

export default function HomePage() {
  return (
    <div className="hp">
      {/* NAV */}
      <nav className="hp-nav">
        <div className="hp-nav-inner">
          <Link href="/" className="hp-nav-logo">ConstructionERP</Link>
          <ul className="hp-nav-links">
            <li><a href="#story">About</a></li>
            <li><a href="#modules">Features</a></li>
            <li><a href="#stats">Pricing</a></li>
            <li><Link href="/login">Sign In</Link></li>
            <li><Link href="/register" className="hp-nav-cta">Start Free Trial</Link></li>
          </ul>
        </div>
      </nav>

      {/* HERO */}
      <section className="hp-hero">
        <div className="hp-hero-image">
          {/* PLACEHOLDER: Replace with real construction site photo */}
          <img src="https://placehold.co/800x900/b45309/ffffff?text=Construction+Site" alt="Active construction site with cranes and steel framework" />
        </div>
        <div className="hp-hero-content">
          <div className="hp-hero-accent" />
          <h1>Building Smarter from Blueprint to Closeout</h1>
          <p>A unified platform for general contractors, real estate developers, and property managers -- bringing projects, finances, and operations into one command center.</p>
          <div className="hp-hero-actions">
            <Link href="/register" className="hp-btn-blue">Explore Platform</Link>
            <a href="#story" className="hp-link-arrow">Our Story &rarr;</a>
          </div>
        </div>
      </section>

      {/* STORY */}
      <section className="hp-story" id="story">
        <div className="hp-story-inner">
          <p>We built ConstructionERP because builders deserve better than disconnected spreadsheets and outdated legacy systems. From preconstruction bids to final closeout, our platform brings every project, every dollar, and every document together -- so your team can focus on what they do best: building.</p>
        </div>
      </section>

      {/* 3-STEP PROCESS */}
      <section className="hp-steps">
        <div className="hp-container">
          <h2>How It Works</h2>
          <div className="hp-steps-row">
            <div className="hp-step">
              <div className="hp-step-number">1</div>
              <h3>Sign Up</h3>
              <p>Create your account and set up your company profile in under five minutes.</p>
            </div>
            <div className="hp-step">
              <div className="hp-step-number">2</div>
              <h3>Import Your Projects</h3>
              <p>Bring in active jobs, budgets, subcontractor lists, and documents with guided onboarding.</p>
            </div>
            <div className="hp-step">
              <div className="hp-step-number">3</div>
              <h3>Build with Confidence</h3>
              <p>Go live with real-time dashboards, automated workflows, and full project visibility.</p>
            </div>
          </div>
        </div>
      </section>

      {/* MODULE BLOCKS - Alternating */}
      <section id="modules">
        <div className="hp-module-block">
          <div className="hp-module-img">
            {/* PLACEHOLDER: Replace with project management screenshot */}
            <img src="https://placehold.co/700x480/292524/ffffff?text=Project+Management" alt="Project Management Module" />
          </div>
          <div className="hp-module-text">
            <div className="hp-label">Module</div>
            <h2>Project Management</h2>
            <p>Gantt charts, daily logs, RFIs, submittals, and change orders -- all in one place. Track every milestone from groundbreaking to substantial completion with real-time progress dashboards and automated notifications.</p>
            <Link href="/register" className="hp-link-arrow">Learn More &rarr;</Link>
          </div>
        </div>

        <div className="hp-module-block hp-module-reverse">
          <div className="hp-module-img">
            {/* PLACEHOLDER: Replace with property management screenshot */}
            <img src="https://placehold.co/700x480/1d4ed8/ffffff?text=Property+Management" alt="Property Management Module" />
          </div>
          <div className="hp-module-text">
            <div className="hp-label">Module</div>
            <h2>Property Management</h2>
            <p>Unit tracking, lease management, tenant communications, and maintenance workflows for your completed assets. Manage the full lifecycle from construction handover to long-term property operations.</p>
            <Link href="/register" className="hp-link-arrow">Learn More &rarr;</Link>
          </div>
        </div>

        <div className="hp-module-block">
          <div className="hp-module-img">
            {/* PLACEHOLDER: Replace with financial dashboard screenshot */}
            <img src="https://placehold.co/700x480/78716c/ffffff?text=Financial+Management" alt="Financial Management Module" />
          </div>
          <div className="hp-module-text">
            <div className="hp-label">Module</div>
            <h2>Financial Management</h2>
            <p>Job costing, accounts payable and receivable, progress billing, lien waivers, and budget vs. actual analysis. See exactly where every dollar goes across every project in your portfolio.</p>
            <Link href="/register" className="hp-link-arrow">Learn More &rarr;</Link>
          </div>
        </div>

        <div className="hp-module-block hp-module-reverse">
          <div className="hp-module-img">
            {/* PLACEHOLDER: Replace with document library screenshot */}
            <img src="https://placehold.co/700x480/b45309/ffffff?text=Document+Management" alt="Document Management Module" />
          </div>
          <div className="hp-module-text">
            <div className="hp-label">Module</div>
            <h2>Document Management</h2>
            <p>Plan room with version control, centralized document library, and AI-powered data extraction. Upload blueprints, specs, contracts, and permits -- then find anything in seconds with intelligent search.</p>
            <Link href="/register" className="hp-link-arrow">Learn More &rarr;</Link>
          </div>
        </div>
      </section>

      {/* STATS BANNER */}
      <section className="hp-stats-banner" id="stats">
        <div className="hp-stats-grid">
          <div>
            <div className="hp-stat-number">1,200+</div>
            <div className="hp-stat-label">Contractors Nationwide</div>
          </div>
          <div>
            <div className="hp-stat-number">99.9%</div>
            <div className="hp-stat-label">Platform Uptime</div>
          </div>
          <div>
            <div className="hp-stat-number">35%</div>
            <div className="hp-stat-label">Average Cost Savings</div>
          </div>
          <div>
            <div className="hp-stat-number">24/7</div>
            <div className="hp-stat-label">Dedicated Support</div>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="hp-testimonial">
        <div className="hp-testimonial-inner">
          <div className="hp-testimonial-mark">&ldquo;</div>
          <blockquote>ConstructionERP gave us real-time visibility across 14 active job sites. Change orders that used to take three days now close in hours. It transformed how we run our business.</blockquote>
          <cite><strong>Marcus Rivera</strong>, President, Ironclad General Contractors</cite>
        </div>
      </section>

      {/* REMAINING MODULES GRID */}
      <section className="hp-modules-grid">
        <div className="hp-container">
          <h2>And So Much More</h2>
          <div className="hp-cards-grid">
            <div className="hp-card">
              <div className="hp-card-icon">C</div>
              <h3>CRM and Bids</h3>
              <p>Track leads, manage bid invitations, generate proposals, and convert opportunities into active projects -- all from a centralized pipeline view.</p>
            </div>
            <div className="hp-card">
              <div className="hp-card-icon">W</div>
              <h3>Workforce Management</h3>
              <p>Time tracking, crew scheduling, certified payroll, safety compliance, and field worker mobile access for every job site in your portfolio.</p>
            </div>
            <div className="hp-card">
              <div className="hp-card-icon">AI</div>
              <h3>AI Intelligence</h3>
              <p>Predictive cost forecasting, schedule risk analysis, material price trend alerts, and natural language queries across all your project data.</p>
            </div>
            <div className="hp-card">
              <div className="hp-card-icon">S</div>
              <h3>Enterprise Security</h3>
              <p>Role-based access control, SOC 2 compliance, SSO integration, audit logging, and encrypted document storage built for enterprise scale.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="hp-cta-section">
        <h2>Start Building Smarter Today</h2>
        <p>Join 1,200+ contractors who chose clarity over chaos.</p>
        <Link href="/register" className="hp-btn-blue hp-btn-lg">Start Free Trial</Link>
      </section>

      {/* FOOTER */}
      <footer className="hp-footer">
        <div className="hp-footer-grid">
          <div>
            <h4>Product</h4>
            <ul>
              <li><a href="#">Overview</a></li>
              <li><a href="#">Pricing</a></li>
              <li><a href="#">Changelog</a></li>
              <li><a href="#">Documentation</a></li>
            </ul>
          </div>
          <div>
            <h4>Modules</h4>
            <ul>
              <li><a href="#">Project Management</a></li>
              <li><a href="#">Property Management</a></li>
              <li><a href="#">Financial Management</a></li>
              <li><a href="#">Document Management</a></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><a href="#">About Us</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Contact</a></li>
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
        <div className="hp-footer-bottom">2026 ConstructionERP. All rights reserved.</div>
      </footer>
    </div>
  );
}
