"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { IntegrationConnection } from "./page";
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
  provider: string; // matches DB provider column
  descriptionKey: string;
  categoryKey: string;
  categoryClass: CategoryKey;
  connectUrl?: string; // OAuth connect endpoint if available
}

const INTEGRATIONS: Integration[] = [
  {
    name: "QuickBooks Online",
    provider: "quickbooks",
    descriptionKey: "quickbooksDescription",
    categoryKey: "categoryAccounting",
    categoryClass: "accounting",
    connectUrl: "/api/integrations/quickbooks/connect",
  },
  {
    name: "Procore",
    provider: "procore",
    descriptionKey: "procoreDescription",
    categoryKey: "categoryProjectManagement",
    categoryClass: "project_management",
  },
  {
    name: "PlanGrid",
    provider: "plangrid",
    descriptionKey: "plangridDescription",
    categoryKey: "categoryDocuments",
    categoryClass: "project_management",
  },
  {
    name: "Stripe",
    provider: "stripe",
    descriptionKey: "stripeDescription",
    categoryKey: "categoryPayments",
    categoryClass: "payment",
  },
  {
    name: "Google Workspace",
    provider: "google_workspace",
    descriptionKey: "googleWorkspaceDescription",
    categoryKey: "categoryProductivity",
    categoryClass: "productivity",
  },
  {
    name: "Slack",
    provider: "slack",
    descriptionKey: "slackDescription",
    categoryKey: "categoryCommunication",
    categoryClass: "communication",
  },
  {
    name: "Zapier",
    provider: "zapier",
    descriptionKey: "zapierDescription",
    categoryKey: "categoryAutomation",
    categoryClass: "automation",
  },
  {
    name: "Microsoft 365",
    provider: "microsoft365",
    descriptionKey: "microsoft365Description",
    categoryKey: "categoryProductivity",
    categoryClass: "productivity",
  },
];

interface Props {
  connections: IntegrationConnection[];
  userRole: string;
}

export default function IntegrationsClient({ connections, userRole }: Props) {
  const t = useTranslations("adminPanel");
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const canManage = userRole === "owner" || userRole === "admin";

  function getConnection(provider: string): IntegrationConnection | undefined {
    return connections.find((c) => c.provider === provider);
  }

  function isConnected(provider: string): boolean {
    const conn = getConnection(provider);
    return conn?.is_connected === true && conn?.status === "connected";
  }

  async function handleDisconnect(provider: string) {
    if (!confirm(t("confirmDisconnectIntegration"))) return;
    setDisconnecting(provider);
    try {
      const res = await fetch(`/api/integrations/${provider}/disconnect`, { method: "POST" });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setDisconnecting(null);
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

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
        {INTEGRATIONS.map((int) => {
          const connected = isConnected(int.provider);
          const conn = getConnection(int.provider);
          const hasConnectUrl = !!int.connectUrl;

          return (
            <div key={int.provider} className="integrations-card">
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
                    className={`integrations-dot ${connected ? "connected" : "disconnected"}`}
                  />
                  {connected
                    ? t("connectedOn", { date: conn?.connected_at ? formatDate(conn.connected_at) : "" })
                    : t("notConnected")}
                </div>

                {connected ? (
                  <button
                    className="ui-btn ui-btn-sm ui-btn-danger"
                    style={{ marginLeft: "auto" }}
                    disabled={disconnecting === int.provider || !canManage}
                    onClick={() => handleDisconnect(int.provider)}
                  >
                    {disconnecting === int.provider ? t("disconnecting") : t("disconnect")}
                  </button>
                ) : hasConnectUrl ? (
                  <a
                    href={int.connectUrl}
                    className="ui-btn ui-btn-sm ui-btn-primary"
                    style={{ marginLeft: "auto", textDecoration: "none" }}
                    aria-disabled={!canManage}
                    onClick={(e) => {
                      if (!canManage) e.preventDefault();
                    }}
                  >
                    {t("connect")}
                  </a>
                ) : (
                  <button
                    className="ui-btn ui-btn-sm ui-btn-secondary"
                    disabled
                    style={{ marginLeft: "auto", opacity: 0.6 }}
                  >
                    {t("comingSoon")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
