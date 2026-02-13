"use client";

const integrations = [
  {
    name: "QuickBooks Online",
    description: "Sync invoices, payments, and chart of accounts with QuickBooks.",
    category: "Accounting",
    status: "not_connected",
  },
  {
    name: "Procore",
    description: "Sync projects, RFIs, submittals, and daily logs with Procore.",
    category: "Project Management",
    status: "not_connected",
  },
  {
    name: "PlanGrid",
    description: "Drawing and document management integration.",
    category: "Documents",
    status: "not_connected",
  },
  {
    name: "Stripe",
    description: "Accept online payments from clients and tenants.",
    category: "Payments",
    status: "not_connected",
  },
  {
    name: "Google Workspace",
    description: "Calendar sync, email notifications, and Drive storage.",
    category: "Productivity",
    status: "not_connected",
  },
  {
    name: "Slack",
    description: "Send notifications and alerts to Slack channels.",
    category: "Communication",
    status: "not_connected",
  },
  {
    name: "Zapier",
    description: "Connect to 5,000+ apps with custom automations.",
    category: "Automation",
    status: "not_connected",
  },
  {
    name: "Microsoft 365",
    description: "Outlook calendar, Teams notifications, and OneDrive storage.",
    category: "Productivity",
    status: "not_connected",
  },
];

export default function IntegrationsClient() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Integrations</h1>
          <p className="page-subtitle">
            Connect your tools and services
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "1rem",
        }}
      >
        {integrations.map((int) => (
          <div
            key={int.name}
            className="card"
            style={{
              padding: "1.25rem",
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--card-bg)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "0.5rem",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1rem" }}>{int.name}</h3>
              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "2px 8px",
                  borderRadius: 12,
                  background: "#f3f4f6",
                  color: "#6b7280",
                }}
              >
                {int.category}
              </span>
            </div>
            <p
              style={{
                margin: "0 0 1rem",
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
              }}
            >
              {int.description}
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "#6b7280",
                }}
              >
                Not Connected
              </span>
              <button
                className="btn-secondary"
                style={{
                  padding: "0.35rem 1rem",
                  fontSize: "0.8rem",
                  borderRadius: 6,
                  cursor: "not-allowed",
                  opacity: 0.6,
                }}
                disabled
              >
                Connect
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
