import Link from "next/link";

export default function HomePage() {
  return (
    <div className="homepage">
      {/* Navigation */}
      <nav className="homepage-nav">
        <div className="homepage-nav-inner">
          <Link href="/" className="homepage-logo">
            Construction<span>ERP</span>
          </Link>
          <div className="homepage-nav-links">
            <Link href="/login" className="homepage-nav-link">
              Sign In
            </Link>
            <Link href="/register" className="homepage-btn-primary">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="homepage-hero">
        <h1>Build Smarter. Manage Everything.</h1>
        <p className="homepage-hero-sub">
          The all-in-one platform for construction project management, financial
          tracking, and real estate operations. From pre-construction to
          closeout, keep your entire business in one place.
        </p>
        <div className="homepage-hero-actions">
          <Link href="/register" className="homepage-btn-primary homepage-btn-lg">
            Start Free Trial
          </Link>
          <Link href="/login" className="homepage-btn-secondary homepage-btn-lg">
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="homepage-features">
        <h2>Everything You Need to Run Your Construction Business</h2>
        <p className="homepage-features-sub">
          Purpose-built tools for general contractors, specialty contractors, and
          real estate operators.
        </p>
        <div className="homepage-feature-grid">
          <div className="homepage-feature-card">
            <div className="homepage-feature-icon">P</div>
            <h3>Project Management</h3>
            <p>
              Gantt charts, task tracking, daily logs, RFIs, change orders, and
              submittals. Keep every project on schedule and on budget.
            </p>
          </div>
          <div className="homepage-feature-card">
            <div className="homepage-feature-icon">$</div>
            <h3>Financial Management</h3>
            <p>
              CSI MasterFormat chart of accounts, job costing, AIA billing,
              accounts payable and receivable, and real-time budget tracking.
            </p>
          </div>
          <div className="homepage-feature-card">
            <div className="homepage-feature-icon">R</div>
            <h3>Real Estate Operations</h3>
            <p>
              Property management, lease tracking, rent collection, maintenance
              requests, and portfolio-level financial reporting.
            </p>
          </div>
          <div className="homepage-feature-card">
            <div className="homepage-feature-icon">T</div>
            <h3>Team Collaboration</h3>
            <p>
              Role-based access control, field-to-office communication, time
              tracking with GPS, and document management.
            </p>
          </div>
          <div className="homepage-feature-card">
            <div className="homepage-feature-icon">C</div>
            <h3>CRM and Estimating</h3>
            <p>
              Lead tracking, opportunity pipeline, bid management, and client
              relationship tools to win more work.
            </p>
          </div>
          <div className="homepage-feature-card">
            <div className="homepage-feature-icon">AI</div>
            <h3>AI-Powered Insights</h3>
            <p>
              Connect your preferred AI provider for document analysis, cost
              predictions, and natural-language queries across your project data.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="homepage-stats">
        <div className="homepage-stat">
          <div className="homepage-stat-value">500+</div>
          <div className="homepage-stat-label">Projects Managed</div>
        </div>
        <div className="homepage-stat">
          <div className="homepage-stat-value">98%</div>
          <div className="homepage-stat-label">On-Time Delivery</div>
        </div>
        <div className="homepage-stat">
          <div className="homepage-stat-value">$2B+</div>
          <div className="homepage-stat-label">Contract Value Tracked</div>
        </div>
        <div className="homepage-stat">
          <div className="homepage-stat-value">15,000+</div>
          <div className="homepage-stat-label">Daily Logs Submitted</div>
        </div>
      </section>

      {/* CTA */}
      <section className="homepage-cta">
        <h2>Ready to Streamline Your Operations?</h2>
        <p>
          Start your free 14-day trial. No credit card required. Full access to
          all features.
        </p>
        <Link href="/register" className="homepage-btn-primary homepage-btn-lg">
          Get Started Free
        </Link>
      </section>

      {/* Footer */}
      <footer className="homepage-footer">
        <div className="homepage-footer-inner">
          <div className="homepage-footer-brand">
            Construction<span>ERP</span>
          </div>
          <div className="homepage-footer-text">
            Building smarter from blueprint to closeout.
          </div>
        </div>
      </footer>
    </div>
  );
}
