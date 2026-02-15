"use client";

import { useTranslations, useLocale } from "next-intl";

export default function IntegrationsClient() {
  const t = useTranslations("adminPanel");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const integrations = [
    {
      name: "QuickBooks Online",
      description: t("quickbooksDescription"),
      category: t("categoryAccounting"),
      status: "not_connected",
    },
    {
      name: "Procore",
      description: t("procoreDescription"),
      category: t("categoryProjectManagement"),
      status: "not_connected",
    },
    {
      name: "PlanGrid",
      description: t("plangridDescription"),
      category: t("categoryDocuments"),
      status: "not_connected",
    },
    {
      name: "Stripe",
      description: t("stripeDescription"),
      category: t("categoryPayments"),
      status: "not_connected",
    },
    {
      name: "Google Workspace",
      description: t("googleWorkspaceDescription"),
      category: t("categoryProductivity"),
      status: "not_connected",
    },
    {
      name: "Slack",
      description: t("slackDescription"),
      category: t("categoryCommunication"),
      status: "not_connected",
    },
    {
      name: "Zapier",
      description: t("zapierDescription"),
      category: t("categoryAutomation"),
      status: "not_connected",
    },
    {
      name: "Microsoft 365",
      description: t("microsoft365Description"),
      category: t("categoryProductivity"),
      status: "not_connected",
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>{t("integrations")}</h1>
          <p className="page-subtitle">
            {t("connectYourToolsAndServices")}
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
                {t("notConnected")}
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
                {t("connect")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
