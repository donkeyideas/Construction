"use client";

import { useTranslations } from "next-intl";
import "@/styles/integrations.css";

type CategoryKey =
  | "accounting"
  | "project_management"
  | "payment"
  | "communication"
  | "productivity"
  | "automation";

interface Integration {
  name: string;
  descriptionKey: string;
  categoryKey: string;
  categoryClass: CategoryKey;
}

const INTEGRATIONS: Integration[] = [
  {
    name: "QuickBooks Online",
    descriptionKey: "quickbooksDescription",
    categoryKey: "categoryAccounting",
    categoryClass: "accounting",
  },
  {
    name: "Procore",
    descriptionKey: "procoreDescription",
    categoryKey: "categoryProjectManagement",
    categoryClass: "project_management",
  },
  {
    name: "PlanGrid",
    descriptionKey: "plangridDescription",
    categoryKey: "categoryDocuments",
    categoryClass: "project_management",
  },
  {
    name: "Stripe",
    descriptionKey: "stripeDescription",
    categoryKey: "categoryPayments",
    categoryClass: "payment",
  },
  {
    name: "Google Workspace",
    descriptionKey: "googleWorkspaceDescription",
    categoryKey: "categoryProductivity",
    categoryClass: "productivity",
  },
  {
    name: "Slack",
    descriptionKey: "slackDescription",
    categoryKey: "categoryCommunication",
    categoryClass: "communication",
  },
  {
    name: "Zapier",
    descriptionKey: "zapierDescription",
    categoryKey: "categoryAutomation",
    categoryClass: "automation",
  },
  {
    name: "Microsoft 365",
    descriptionKey: "microsoft365Description",
    categoryKey: "categoryProductivity",
    categoryClass: "productivity",
  },
];

export default function IntegrationsClient() {
  const t = useTranslations("adminPanel");

  return (
    <div>
      <div className="integrations-header">
        <div>
          <h2>{t("integrations")}</h2>
          <p className="integrations-header-sub">
            {t("connectYourToolsAndServices")}
          </p>
        </div>
      </div>

      <div className="integrations-grid">
        {INTEGRATIONS.map((int) => (
          <div key={int.name} className="integrations-card">
            <div className="integrations-card-header">
              <div className="integrations-card-info">
                <div className="integrations-card-name">
                  {int.name}
                </div>
                <div className="integrations-card-desc">
                  {t(int.descriptionKey)}
                </div>
              </div>
              <span
                className={`integrations-category-badge ${int.categoryClass}`}
              >
                {t(int.categoryKey)}
              </span>
            </div>

            <div className="integrations-card-actions">
              <div className="integrations-card-sync">
                <span
                  className="integrations-dot disconnected"
                />
                {t("notConnected")}
              </div>
              <button
                className="ui-btn ui-btn-sm ui-btn-secondary"
                disabled
                style={{ marginLeft: "auto", opacity: 0.6 }}
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
