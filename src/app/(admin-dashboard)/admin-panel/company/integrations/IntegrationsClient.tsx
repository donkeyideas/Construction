"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Puzzle,
  Link2,
  Unlink,
  AlertTriangle,
  Settings,
  Plus,
  X,
  Trash2,
  Clock,
} from "lucide-react";
import {
  INTEGRATION_PROVIDERS,
  CATEGORY_LABELS,
  type IntegrationProvider,
} from "@/lib/integrations/providers";
import type { IntegrationRow, IntegrationStats } from "@/lib/queries/integrations";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IntegrationsClientProps {
  integrations: IntegrationRow[];
  stats: IntegrationStats;
}

type CategoryFilter = "all" | "accounting" | "project_management" | "communication" | "payment";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function IntegrationsClient({
  integrations,
  stats,
}: IntegrationsClientProps) {
  const router = useRouter();
  const t = useTranslations("adminPanel");

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  // Modal state
  const [configModal, setConfigModal] = useState<IntegrationRow | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});

  // Action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Build a map of connected provider keys for quick lookup
  const connectedMap = useMemo(() => {
    const map: Record<string, IntegrationRow> = {};
    for (const integ of integrations) {
      map[integ.provider_key] = integ;
    }
    return map;
  }, [integrations]);

  // Filter providers by category
  const filteredProviders = useMemo(() => {
    if (categoryFilter === "all") return INTEGRATION_PROVIDERS;
    return INTEGRATION_PROVIDERS.filter((p) => p.category === categoryFilter);
  }, [categoryFilter]);

  const availableCount = INTEGRATION_PROVIDERS.length - integrations.length;

  // -----------------------------------------------------------------------
  // Add Integration (create + connect)
  // -----------------------------------------------------------------------
  async function handleConnect(provider: IntegrationProvider) {
    setActionLoading(provider.key);
    setMessage(null);

    try {
      // Check if already exists
      const existing = connectedMap[provider.key];
      if (existing) {
        // Re-connect
        const res = await fetch(
          `/api/admin/integrations/${existing.id}/connect`,
          { method: "POST" }
        );
        if (!res.ok) {
          const data = await res.json();
          setMessage({ type: "error", text: data.error || "Failed to connect." });
          return;
        }
      } else {
        // Create new + it starts disconnected, then connect it
        const createRes = await fetch("/api/admin/integrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider_key: provider.key,
            provider_name: provider.name,
            description: provider.description,
            category: provider.category,
            auth_type: provider.auth_type,
          }),
        });

        if (!createRes.ok) {
          const data = await createRes.json();
          setMessage({ type: "error", text: data.error || "Failed to add integration." });
          return;
        }

        const newInteg = await createRes.json();

        // Now connect it
        const connectRes = await fetch(
          `/api/admin/integrations/${newInteg.id}/connect`,
          { method: "POST" }
        );
        if (!connectRes.ok) {
          const data = await connectRes.json();
          setMessage({ type: "error", text: data.error || "Failed to connect." });
          return;
        }
      }

      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setActionLoading(null);
    }
  }

  // -----------------------------------------------------------------------
  // Disconnect
  // -----------------------------------------------------------------------
  async function handleDisconnect(integrationId: string) {
    setActionLoading(integrationId);
    setMessage(null);

    try {
      const res = await fetch(
        `/api/admin/integrations/${integrationId}/disconnect`,
        { method: "POST" }
      );

      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to disconnect." });
        return;
      }

      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setActionLoading(null);
    }
  }

  // -----------------------------------------------------------------------
  // Delete
  // -----------------------------------------------------------------------
  async function handleDelete(integrationId: string) {
    if (!window.confirm("Remove this integration? This cannot be undone.")) return;
    setActionLoading(integrationId);

    try {
      const res = await fetch(`/api/admin/integrations/${integrationId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete.");
        return;
      }

      router.refresh();
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  // -----------------------------------------------------------------------
  // Open Configure Modal
  // -----------------------------------------------------------------------
  function openConfigModal(integ: IntegrationRow) {
    const cfg = (integ.config ?? {}) as Record<string, string>;
    setConfigValues({ ...cfg });
    setConfigModal(integ);
    setMessage(null);
  }

  // -----------------------------------------------------------------------
  // Save Config
  // -----------------------------------------------------------------------
  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!configModal) return;
    setActionLoading(configModal.id);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/integrations/${configModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: configValues }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save." });
        return;
      }

      setMessage({ type: "success", text: "Configuration saved." });
      setTimeout(() => {
        setConfigModal(null);
        setMessage(null);
        router.refresh();
      }, 800);
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setActionLoading(null);
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------
  function getStatusClass(status: string): string {
    if (status === "connected") return "integrations-status-connected";
    if (status === "error") return "integrations-status-error";
    return "integrations-status-disconnected";
  }

  function getStatusDotClass(status: string): string {
    if (status === "connected") return "integrations-dot connected";
    if (status === "error") return "integrations-dot error";
    return "integrations-dot disconnected";
  }

  function formatSyncTime(ts: string | null): string {
    if (!ts) return "Never";
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // -----------------------------------------------------------------------
  // Get config fields per provider
  // -----------------------------------------------------------------------
  function getConfigFields(providerKey: string): { key: string; label: string; type: string; placeholder: string }[] {
    switch (providerKey) {
      case "quickbooks":
      case "procore":
      case "xero":
      case "google_calendar":
      case "slack":
        return [
          { key: "client_id", label: "Client ID", type: "text", placeholder: "Enter client ID" },
          { key: "client_secret", label: "Client Secret", type: "password", placeholder: "Enter client secret" },
          { key: "redirect_uri", label: "Redirect URI", type: "text", placeholder: "https://..." },
        ];
      case "sage":
      case "stripe":
        return [
          { key: "api_key", label: "API Key", type: "password", placeholder: "Enter API key" },
          { key: "environment", label: "Environment", type: "text", placeholder: "production or sandbox" },
        ];
      case "email_smtp":
        return [
          { key: "smtp_host", label: "SMTP Host", type: "text", placeholder: "smtp.example.com" },
          { key: "smtp_port", label: "SMTP Port", type: "text", placeholder: "587" },
          { key: "smtp_user", label: "Username", type: "text", placeholder: "user@example.com" },
          { key: "smtp_password", label: "Password", type: "password", placeholder: "Enter password" },
        ];
      default:
        return [
          { key: "api_key", label: "API Key", type: "password", placeholder: "Enter API key" },
        ];
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div>
      {/* Header */}
      <div className="integrations-header">
        <div>
          <h2>{t("integrations.title")}</h2>
          <p className="integrations-header-sub">
            {t("integrations.subtitle")}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="integrations-stats">
        <div className="integrations-stat-card">
          <div className="integrations-stat-icon green">
            <Link2 size={18} />
          </div>
          <div className="integrations-stat-label">{t("integrations.connected")}</div>
          <div className="integrations-stat-value">{stats.connected}</div>
        </div>
        <div className="integrations-stat-card">
          <div className="integrations-stat-icon blue">
            <Puzzle size={18} />
          </div>
          <div className="integrations-stat-label">{t("integrations.available")}</div>
          <div className="integrations-stat-value">{availableCount > 0 ? availableCount : 0}</div>
        </div>
        <div className="integrations-stat-card">
          <div className="integrations-stat-icon red">
            <AlertTriangle size={18} />
          </div>
          <div className="integrations-stat-label">{t("integrations.errors")}</div>
          <div className="integrations-stat-value">{stats.error}</div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`integrations-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Category Filter Tabs */}
      <div className="integrations-tabs">
        {(
          [
            { key: "all", label: t("integrations.all") },
            { key: "accounting", label: t("integrations.accounting") },
            { key: "project_management", label: t("integrations.projectManagement") },
            { key: "communication", label: t("integrations.communication") },
            { key: "payment", label: t("integrations.payment") },
          ] as { key: CategoryFilter; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            className={`integrations-tab ${categoryFilter === tab.key ? "active" : ""}`}
            onClick={() => setCategoryFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Integration Cards Grid */}
      <div className="integrations-grid">
        {filteredProviders.map((provider) => {
          const existing = connectedMap[provider.key];
          const isConnected = existing?.is_connected ?? false;
          const status = existing?.status ?? "disconnected";

          return (
            <div key={provider.key} className="integrations-card">
              <div className="integrations-card-header">
                <div className="integrations-card-info">
                  <div className="integrations-card-name">
                    {provider.name}
                    <span className={getStatusDotClass(status)} />
                  </div>
                  <div className="integrations-card-desc">
                    {provider.description}
                  </div>
                </div>
                <span className={`integrations-category-badge ${provider.category}`}>
                  {CATEGORY_LABELS[provider.category] || provider.category}
                </span>
              </div>

              {isConnected && existing?.last_sync_at && (
                <div className="integrations-card-sync">
                  <Clock size={12} />
                  Last sync: {formatSyncTime(existing.last_sync_at)}
                </div>
              )}

              {existing?.error_message && (
                <div className="integrations-card-error">
                  <AlertTriangle size={12} />
                  {existing.error_message}
                </div>
              )}

              <div className="integrations-card-actions">
                {isConnected ? (
                  <>
                    <button
                      className="btn-secondary integrations-btn"
                      onClick={() => openConfigModal(existing!)}
                      disabled={actionLoading === existing?.id}
                    >
                      <Settings size={14} />
                      {t("integrations.configure")}
                    </button>
                    <button
                      className="btn-secondary integrations-btn danger"
                      onClick={() => handleDisconnect(existing!.id)}
                      disabled={actionLoading === existing?.id}
                    >
                      <Unlink size={14} />
                      {t("integrations.disconnect")}
                    </button>
                  </>
                ) : existing && status === "disconnected" ? (
                  <>
                    <button
                      className="btn-primary integrations-btn"
                      onClick={() => handleConnect(provider)}
                      disabled={actionLoading === provider.key}
                    >
                      <Link2 size={14} />
                      {actionLoading === provider.key ? t("integrations.connecting") : t("integrations.reconnect")}
                    </button>
                    <button
                      className="btn-secondary integrations-btn danger"
                      onClick={() => handleDelete(existing.id)}
                      disabled={actionLoading === existing.id}
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : (
                  <button
                    className="btn-primary integrations-btn"
                    onClick={() => handleConnect(provider)}
                    disabled={actionLoading === provider.key}
                  >
                    <Plus size={14} />
                    {actionLoading === provider.key ? t("integrations.connecting") : t("integrations.connect")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Configure Modal */}
      {configModal && (
        <>
          <div
            className="integrations-modal-overlay"
            onClick={() => setConfigModal(null)}
          />
          <div className="integrations-modal">
            <button
              className="integrations-modal-close"
              onClick={() => setConfigModal(null)}
            >
              <X size={18} />
            </button>

            <div className="integrations-modal-title">
              Configure {configModal.provider_name}
            </div>
            <div className="integrations-modal-desc">
              {t("integrations.updateConnectionSettings")}
            </div>

            {message && (
              <div className={`integrations-message ${message.type}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSaveConfig}>
              {getConfigFields(configModal.provider_key).map((field) => (
                <div key={field.key} className="integrations-form-group">
                  <label className="integrations-form-label">{field.label}</label>
                  <input
                    type={field.type}
                    className="integrations-form-input"
                    placeholder={field.placeholder}
                    value={configValues[field.key] ?? ""}
                    onChange={(e) =>
                      setConfigValues((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    autoComplete="off"
                  />
                </div>
              ))}

              <div className="integrations-modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setConfigModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={actionLoading === configModal.id}
                >
                  {actionLoading === configModal.id ? t("integrations.saving") : t("integrations.saveConfiguration")}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
