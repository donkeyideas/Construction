"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Key,
  Shield,
  Check,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface SettingValue {
  value: string;
  is_encrypted: boolean;
}

interface Props {
  settings: Record<string, SettingValue>;
  initialMode: string;
}

export default function StripeSettingsClient({ settings, initialMode }: Props) {
  const router = useRouter();
  const t = useTranslations("superAdmin");

  const [mode, setMode] = useState<"test" | "live">(
    initialMode === "live" ? "live" : "test"
  );
  const [secretKey, setSecretKey] = useState("");
  const [publishableKey, setPublishableKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showPublishableKey, setShowPublishableKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [switchingMode, setSwitchingMode] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [testResult, setTestResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);

  // Determine which settings are configured for the current mode
  const secretKeySetting = settings[`stripe_secret_key_${mode}`];
  const publishableKeySetting = settings[`stripe_publishable_key_${mode}`];
  const webhookSecretSetting = settings[`stripe_webhook_secret_${mode}`];

  const hasSecretKey = !!secretKeySetting;
  const hasPublishableKey = !!publishableKeySetting;
  const hasWebhookSecret = !!webhookSecretSetting;

  async function handleModeSwitch(newMode: "test" | "live") {
    if (newMode === mode) return;

    setSwitchingMode(true);
    setError("");
    setSuccess("");
    setTestResult(null);

    try {
      const res = await fetch("/api/super-admin/stripe-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stripe_mode: newMode }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to switch mode.");
        return;
      }

      setMode(newMode);
      setSecretKey("");
      setPublishableKey("");
      setWebhookSecret("");
      setSuccess(`Switched to ${newMode} mode.`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSwitchingMode(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    setTestResult(null);

    try {
      const body: Record<string, string> = {};
      if (secretKey.trim()) body.secret_key = secretKey.trim();
      if (publishableKey.trim()) body.publishable_key = publishableKey.trim();
      if (webhookSecret.trim()) body.webhook_secret = webhookSecret.trim();

      if (Object.keys(body).length === 0) {
        setError("No changes to save. Enter at least one key.");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/super-admin/stripe-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save settings.");
        return;
      }

      setSecretKey("");
      setPublishableKey("");
      setWebhookSecret("");
      setSuccess("Settings saved successfully.");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setError("");
    setSuccess("");
    setTestResult(null);

    try {
      const res = await fetch("/api/super-admin/stripe-settings/test", {
        method: "POST",
      });

      const data = await res.json();
      setTestResult(data);

      if (data.success) {
        setSuccess("Connection test successful! Stripe is reachable.");
      }
    } catch {
      setTestResult({ success: false, error: "Network error." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="admin-header">
        <div>
          <h2>{t("stripeSettings")}</h2>
          <p className="admin-header-sub">{t("stripeSettingsDesc")}</p>
        </div>
      </div>

      {/* Stats */}
      <div
        className="admin-stats"
        style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
      >
        <div className="admin-stat-card">
          <div className={`admin-stat-icon ${mode === "test" ? "green" : "amber"}`}>
            <Shield size={18} />
          </div>
          <div className="admin-stat-label">{t("currentMode")}</div>
          <div className="admin-stat-value" style={{ textTransform: "capitalize" }}>
            {mode}
          </div>
        </div>
        <div className="admin-stat-card">
          <div className={`admin-stat-icon ${hasSecretKey ? "green" : ""}`}
            style={!hasSecretKey ? { background: "var(--surface)", color: "var(--muted)" } : {}}
          >
            <Key size={18} />
          </div>
          <div className="admin-stat-label">{t("secretKey")}</div>
          <div className="admin-stat-value" style={{ fontSize: "1rem" }}>
            {hasSecretKey ? (
              <span style={{ color: "var(--color-green)", display: "flex", alignItems: "center", gap: 6 }}>
                <Check size={16} /> {t("configured")}
              </span>
            ) : (
              <span style={{ color: "var(--muted)" }}>{t("notConfigured")}</span>
            )}
          </div>
        </div>
        <div className="admin-stat-card">
          <div className={`admin-stat-icon ${hasWebhookSecret ? "green" : ""}`}
            style={!hasWebhookSecret ? { background: "var(--surface)", color: "var(--muted)" } : {}}
          >
            <Shield size={18} />
          </div>
          <div className="admin-stat-label">{t("webhookSecret")}</div>
          <div className="admin-stat-value" style={{ fontSize: "1rem" }}>
            {hasWebhookSecret ? (
              <span style={{ color: "var(--color-green)", display: "flex", alignItems: "center", gap: 6 }}>
                <Check size={16} /> {t("configured")}
              </span>
            ) : (
              <span style={{ color: "var(--muted)" }}>{t("notConfigured")}</span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && <div className="invite-error">{error}</div>}
      {success && <div className="invite-success">{success}</div>}
      {testResult && !testResult.success && (
        <div className="invite-error">
          <AlertTriangle size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
          Connection test failed: {testResult.error}
        </div>
      )}

      {/* Mode Toggle */}
      <div className="sa-card" style={{ marginBottom: 24 }}>
        <div className="sa-card-title">
          <Shield size={18} /> {t("stripeMode")}
        </div>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: 16 }}>
          {t("stripeModeDesc")}
        </p>

        <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
          <button
            className={`sa-action-btn ${mode === "test" ? "primary" : ""}`}
            onClick={() => handleModeSwitch("test")}
            disabled={switchingMode || mode === "test"}
            style={
              mode === "test"
                ? { background: "var(--color-green)", borderColor: "var(--color-green)", color: "#fff" }
                : {}
            }
          >
            {switchingMode ? (
              <Loader2 size={14} className="spin-animation" />
            ) : null}
            {t("testMode")}
          </button>
          <button
            className={`sa-action-btn ${mode === "live" ? "primary" : ""}`}
            onClick={() => handleModeSwitch("live")}
            disabled={switchingMode || mode === "live"}
            style={
              mode === "live"
                ? { background: "var(--color-amber)", borderColor: "var(--color-amber)", color: "#fff" }
                : {}
            }
          >
            {switchingMode ? (
              <Loader2 size={14} className="spin-animation" />
            ) : null}
            {t("liveMode")}
          </button>
        </div>

        {mode === "live" && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              background: "rgba(245, 158, 11, 0.08)",
              border: "1px solid var(--color-amber)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: "0.85rem",
              color: "var(--color-amber)",
            }}
          >
            <AlertTriangle size={16} />
            {t("liveModeWarning")}
          </div>
        )}
      </div>

      {/* Key Settings Form */}
      <div className="sa-card" style={{ marginBottom: 24 }}>
        <div className="sa-card-title">
          <Key size={18} /> {t("apiKeys")} ({mode === "test" ? t("testMode") : t("liveMode")})
        </div>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: 20 }}>
          {t("apiKeysDesc")}
        </p>

        <form onSubmit={handleSave}>
          {/* Secret Key */}
          <div className="ticket-form-group">
            <label className="ticket-form-label">{t("secretKey")}</label>
            <div style={{ position: "relative" }}>
              <input
                type={showSecretKey ? "text" : "password"}
                className="ticket-form-input"
                placeholder={
                  hasSecretKey
                    ? `${secretKeySetting.value} (${t("leaveBlankToKeep")})`
                    : `sk_${mode}_...`
                }
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                  padding: 4,
                }}
              >
                {showSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {hasSecretKey && (
              <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 4 }}>
                {t("currentValue")}: {secretKeySetting.value}
              </span>
            )}
          </div>

          {/* Publishable Key */}
          <div className="ticket-form-group">
            <label className="ticket-form-label">{t("publishableKey")}</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPublishableKey ? "text" : "password"}
                className="ticket-form-input"
                placeholder={
                  hasPublishableKey
                    ? `${publishableKeySetting.value} (${t("leaveBlankToKeep")})`
                    : `pk_${mode}_...`
                }
                value={publishableKey}
                onChange={(e) => setPublishableKey(e.target.value)}
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPublishableKey(!showPublishableKey)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                  padding: 4,
                }}
              >
                {showPublishableKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {hasPublishableKey && (
              <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 4 }}>
                {t("currentValue")}: {publishableKeySetting.value}
              </span>
            )}
          </div>

          {/* Webhook Secret */}
          <div className="ticket-form-group">
            <label className="ticket-form-label">{t("webhookSecret")}</label>
            <div style={{ position: "relative" }}>
              <input
                type={showWebhookSecret ? "text" : "password"}
                className="ticket-form-input"
                placeholder={
                  hasWebhookSecret
                    ? `${webhookSecretSetting.value} (${t("leaveBlankToKeep")})`
                    : "whsec_..."
                }
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                  padding: 4,
                }}
              >
                {showWebhookSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {hasWebhookSecret && (
              <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 4 }}>
                {t("currentValue")}: {webhookSecretSetting.value}
              </span>
            )}
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px solid var(--border)",
            }}
          >
            <button
              type="button"
              className="sa-action-btn"
              onClick={handleTestConnection}
              disabled={testing || saving}
            >
              {testing ? (
                <Loader2 size={14} className="spin-animation" />
              ) : (
                <Shield size={14} />
              )}
              {testing ? t("testingConnection") : t("testConnection")}
            </button>
            <button
              type="submit"
              className="sa-action-btn primary"
              disabled={saving || testing}
            >
              {saving ? (
                <Loader2 size={14} className="spin-animation" />
              ) : (
                <Check size={14} />
              )}
              {saving ? t("saving") : t("saveSettings")}
            </button>
          </div>
        </form>
      </div>

      {/* Connection Test Result */}
      {testResult && testResult.success && (
        <div className="sa-card" style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "var(--color-green)",
            }}
          >
            <Check size={20} />
            <span style={{ fontWeight: 600 }}>{t("connectionSuccess")}</span>
          </div>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 6 }}>
            {t("connectionSuccessDesc")}
          </p>
        </div>
      )}

      {/* Inline spin animation */}
      <style>{`
        .spin-animation {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
