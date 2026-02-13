"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Cpu,
  DollarSign,
  Activity,
  BarChart3,
  Zap,
  Sparkles,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MaskedProvider {
  id: string;
  provider_name: string;
  api_key_masked: string;
  model_id: string;
  is_active: boolean;
  use_for_chat: boolean;
  use_for_documents: boolean;
  use_for_predictions: boolean;
  is_default: boolean;
  monthly_budget_limit: number | null;
  current_month_usage: number | null;
  created_at: string;
}

interface UsageSummaryEntry {
  provider_config_id: string;
  provider_name: string;
  model_id: string;
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_estimated_cost: number;
}

interface StatsData {
  activeCount: number;
  totalBudget: number;
  totalUsage: number;
  totalRequests: number;
}

interface AIProvidersClientProps {
  providers: MaskedProvider[];
  usageMap: Record<string, UsageSummaryEntry>;
  stats: StatsData;
}

type ProviderNameOption =
  | "openai"
  | "anthropic"
  | "google"
  | "groq"
  | "mistral"
  | "cohere"
  | "xai"
  | "bedrock"
  | "deepseek";

const PROVIDER_OPTIONS: { value: ProviderNameOption; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google AI" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "groq", label: "Groq" },
  { value: "mistral", label: "Mistral" },
  { value: "cohere", label: "Cohere" },
  { value: "xai", label: "xAI (Grok)" },
  { value: "bedrock", label: "AWS Bedrock" },
];

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google AI",
  deepseek: "DeepSeek",
  groq: "Groq",
  mistral: "Mistral",
  cohere: "Cohere",
  xai: "xAI",
  bedrock: "Bedrock",
};

const PROVIDER_MODELS: Record<ProviderNameOption, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "o3-mini", label: "O3 Mini" },
    { value: "o1", label: "O1" },
    { value: "o1-mini", label: "O1 Mini" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  anthropic: [
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
    { value: "claude-haiku-4-20250414", label: "Claude Haiku 4" },
  ],
  google: [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  ],
  deepseek: [
    { value: "deepseek-chat", label: "DeepSeek Chat (V3)" },
    { value: "deepseek-reasoner", label: "DeepSeek Reasoner (R1)" },
  ],
  groq: [
    { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
    { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
    { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
    { value: "gemma2-9b-it", label: "Gemma 2 9B" },
  ],
  mistral: [
    { value: "mistral-large-latest", label: "Mistral Large" },
    { value: "mistral-small-latest", label: "Mistral Small" },
    { value: "open-mistral-nemo", label: "Mistral Nemo" },
    { value: "codestral-latest", label: "Codestral" },
  ],
  cohere: [
    { value: "command-r-plus", label: "Command R+" },
    { value: "command-r", label: "Command R" },
    { value: "command", label: "Command" },
  ],
  xai: [
    { value: "grok-2", label: "Grok 2" },
    { value: "grok-2-mini", label: "Grok 2 Mini" },
  ],
  bedrock: [
    { value: "anthropic.claude-3-5-sonnet-20241022-v2:0", label: "Claude 3.5 Sonnet (Bedrock)" },
    { value: "anthropic.claude-3-haiku-20240307-v1:0", label: "Claude 3 Haiku (Bedrock)" },
    { value: "amazon.titan-text-express-v1", label: "Titan Text Express" },
    { value: "meta.llama3-70b-instruct-v1:0", label: "Llama 3 70B (Bedrock)" },
  ],
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getUsagePercent(
  usage: number | null,
  budget: number | null
): number {
  if (!budget || budget === 0 || !usage) return 0;
  return Math.min(100, Math.round((usage / budget) * 100));
}

function getUsageLevel(pct: number): "low" | "mid" | "high" {
  if (pct >= 90) return "high";
  if (pct >= 60) return "mid";
  return "low";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AIProvidersClient({
  providers,
  stats,
}: AIProvidersClientProps) {
  const router = useRouter();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formProvider, setFormProvider] =
    useState<ProviderNameOption>("openai");
  const [formApiKey, setFormApiKey] = useState("");
  const [formModelId, setFormModelId] = useState("");
  const [formChat, setFormChat] = useState(false);
  const [formDocuments, setFormDocuments] = useState(false);
  const [formPredictions, setFormPredictions] = useState(false);
  const [formDefault, setFormDefault] = useState(false);
  const [formBudget, setFormBudget] = useState("");

  // UI state
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    id: string;
    type: "pass" | "fail";
    text: string;
  } | null>(null);

  // -----------------------------------------------------------------------
  // Open Add Modal
  // -----------------------------------------------------------------------
  function openAddModal() {
    setEditingId(null);
    setFormProvider("openai");
    setFormApiKey("");
    setFormModelId(PROVIDER_MODELS["openai"][0].value);
    setFormChat(false);
    setFormDocuments(false);
    setFormPredictions(false);
    setFormDefault(false);
    setFormBudget("");
    setMessage(null);
    setShowModal(true);
  }

  // -----------------------------------------------------------------------
  // Open Edit Modal
  // -----------------------------------------------------------------------
  function openEditModal(p: MaskedProvider) {
    setEditingId(p.id);
    const prov = p.provider_name as ProviderNameOption;
    setFormProvider(prov);
    setFormApiKey(""); // Don't pre-fill encrypted key
    const models = PROVIDER_MODELS[prov] ?? [];
    const knownModel = models.some((m) => m.value === p.model_id);
    setFormModelId(knownModel ? p.model_id : models[0]?.value ?? "");
    setFormChat(p.use_for_chat);
    setFormDocuments(p.use_for_documents);
    setFormPredictions(p.use_for_predictions);
    setFormDefault(p.is_default);
    setFormBudget(
      p.monthly_budget_limit != null ? String(p.monthly_budget_limit) : ""
    );
    setMessage(null);
    setShowModal(true);
  }

  // -----------------------------------------------------------------------
  // Close Modal
  // -----------------------------------------------------------------------
  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setMessage(null);
  }

  // -----------------------------------------------------------------------
  // Save (Create / Update)
  // -----------------------------------------------------------------------
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      if (editingId) {
        // Update
        const body: Record<string, unknown> = {
          provider_name: formProvider,
          model_id: formModelId,
          use_for_chat: formChat,
          use_for_documents: formDocuments,
          use_for_predictions: formPredictions,
          is_default: formDefault,
          monthly_budget_limit: formBudget ? Number(formBudget) : null,
        };

        // Only send API key if user entered a new one
        if (formApiKey.trim()) {
          body.api_key = formApiKey.trim();
        }

        const res = await fetch(`/api/ai/providers/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          setMessage({
            type: "error",
            text: data.error || "Failed to update provider.",
          });
          return;
        }

        setMessage({
          type: "success",
          text: "Provider updated successfully.",
        });
      } else {
        // Create
        if (!formApiKey.trim()) {
          setMessage({ type: "error", text: "API key is required." });
          return;
        }

        const res = await fetch("/api/ai/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider_name: formProvider,
            api_key: formApiKey.trim(),
            model_id: formModelId,
            use_for_chat: formChat,
            use_for_documents: formDocuments,
            use_for_predictions: formPredictions,
            is_default: formDefault,
            monthly_budget_limit: formBudget ? Number(formBudget) : null,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setMessage({
            type: "error",
            text: data.error || "Failed to add provider.",
          });
          return;
        }

        setMessage({
          type: "success",
          text: "Provider added successfully.",
        });
      }

      // Refresh page data and close modal
      setTimeout(() => {
        closeModal();
        router.refresh();
      }, 800);
    } catch {
      setMessage({
        type: "error",
        text: "Network error. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------------------------------------------
  // Delete
  // -----------------------------------------------------------------------
  async function handleDelete(id: string) {
    if (
      !window.confirm(
        "Are you sure you want to remove this AI provider? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/ai/providers/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete provider.");
        return;
      }

      router.refresh();
    } catch {
      alert("Network error. Please try again.");
    }
  }

  // -----------------------------------------------------------------------
  // Toggle Active
  // -----------------------------------------------------------------------
  async function handleToggleActive(
    id: string,
    currentActive: boolean
  ) {
    try {
      const res = await fetch(`/api/ai/providers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to toggle provider.");
        return;
      }

      router.refresh();
    } catch {
      alert("Network error. Please try again.");
    }
  }

  // -----------------------------------------------------------------------
  // Test Connection
  // -----------------------------------------------------------------------
  async function handleTestConnection(id: string) {
    setTestingId(id);
    setTestResult(null);

    try {
      const res = await fetch(`/api/ai/providers/${id}/test`, {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult({
          id,
          type: "pass",
          text: "Connection successful. Provider is working.",
        });
      } else {
        setTestResult({
          id,
          type: "fail",
          text: data.error || "Connection failed. Check your API key.",
        });
      }
    } catch {
      setTestResult({
        id,
        type: "fail",
        text: "Network error during test.",
      });
    } finally {
      setTestingId(null);
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div>
      {/* Header */}
      <div className="ai-header">
        <div>
          <h2>AI Provider Configuration</h2>
          <p className="ai-header-sub">
            Manage API keys, models, and usage limits for AI-powered features
          </p>
        </div>
        <div className="ai-header-actions">
          <button className="btn-primary" onClick={openAddModal}>
            <Plus size={16} />
            Add Provider
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="ai-stats">
        <div className="ai-stat-card">
          <div className="ai-stat-icon blue">
            <Cpu size={18} />
          </div>
          <div className="ai-stat-label">Active Providers</div>
          <div className="ai-stat-value">{stats.activeCount}</div>
        </div>
        <div className="ai-stat-card">
          <div className="ai-stat-icon green">
            <Activity size={18} />
          </div>
          <div className="ai-stat-label">Monthly Requests</div>
          <div className="ai-stat-value">
            {stats.totalRequests.toLocaleString()}
          </div>
        </div>
        <div className="ai-stat-card">
          <div className="ai-stat-icon amber">
            <DollarSign size={18} />
          </div>
          <div className="ai-stat-label">Monthly Budget</div>
          <div className="ai-stat-value">
            {stats.totalBudget > 0
              ? formatCurrency(stats.totalBudget)
              : "--"}
          </div>
        </div>
        <div className="ai-stat-card">
          <div className="ai-stat-icon red">
            <BarChart3 size={18} />
          </div>
          <div className="ai-stat-label">Cost This Month</div>
          <div className="ai-stat-value">
            {formatCurrency(stats.totalUsage)}
          </div>
        </div>
      </div>

      {/* Providers Table or Empty State */}
      {providers.length === 0 ? (
        <div className="ai-empty">
          <div className="ai-empty-icon">
            <Sparkles size={32} />
          </div>
          <div className="ai-empty-title">
            No AI providers configured yet
          </div>
          <div className="ai-empty-desc">
            Add your first provider to enable AI features like chat,
            document processing, and predictive analytics.
          </div>
          <button className="btn-primary" onClick={openAddModal}>
            <Plus size={16} />
            Add Provider
          </button>
        </div>
      ) : (
        <div className="ai-providers-table-wrap">
          <table className="ai-providers-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Model</th>
                <th>Status</th>
                <th>Tasks</th>
                <th>Budget / Usage</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => {
                const usagePct = getUsagePercent(
                  p.current_month_usage,
                  p.monthly_budget_limit
                );
                const usageLevel = getUsageLevel(usagePct);

                return (
                  <tr key={p.id}>
                    {/* Provider Name */}
                    <td>
                      <span
                        className={`provider-badge provider-badge-${p.provider_name}`}
                      >
                        {PROVIDER_LABELS[p.provider_name] ||
                          p.provider_name}
                      </span>
                      {p.is_default && (
                        <span className="ai-default-badge">Default</span>
                      )}
                    </td>

                    {/* Model */}
                    <td>
                      <span className="ai-model-id">{p.model_id}</span>
                    </td>

                    {/* Status */}
                    <td>
                      <button
                        className={`ai-toggle ${
                          p.is_active ? "on" : ""
                        }`}
                        title={
                          p.is_active
                            ? "Click to deactivate"
                            : "Click to activate"
                        }
                        onClick={() =>
                          handleToggleActive(p.id, p.is_active)
                        }
                      />
                    </td>

                    {/* Task Badges */}
                    <td>
                      <div className="task-badges">
                        {p.use_for_chat && (
                          <span className="task-badge task-badge-chat">
                            Chat
                          </span>
                        )}
                        {p.use_for_documents && (
                          <span className="task-badge task-badge-documents">
                            Docs
                          </span>
                        )}
                        {p.use_for_predictions && (
                          <span className="task-badge task-badge-predictions">
                            Predictions
                          </span>
                        )}
                        {!p.use_for_chat &&
                          !p.use_for_documents &&
                          !p.use_for_predictions && (
                            <span
                              style={{
                                fontSize: "0.78rem",
                                color: "var(--muted)",
                              }}
                            >
                              None
                            </span>
                          )}
                      </div>
                    </td>

                    {/* Budget / Usage */}
                    <td>
                      {p.monthly_budget_limit != null ? (
                        <div className="usage-bar-wrap">
                          <div className="usage-bar">
                            <div
                              className={`usage-bar-fill ${usageLevel}`}
                              style={{
                                width: `${usagePct}%`,
                              }}
                            />
                          </div>
                          <span className="usage-bar-label">
                            {formatCurrency(
                              p.current_month_usage ?? 0
                            )}{" "}
                            / {formatCurrency(p.monthly_budget_limit)}
                          </span>
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: "0.78rem",
                            color: "var(--muted)",
                          }}
                        >
                          No limit
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="ai-actions">
                        <button
                          className="ai-test-btn"
                          title="Test Connection"
                          onClick={() => handleTestConnection(p.id)}
                          disabled={testingId === p.id}
                        >
                          <Zap size={13} />
                          {testingId === p.id ? "Testing..." : "Test"}
                        </button>
                        <button
                          className="ai-action-btn"
                          title="Edit"
                          onClick={() => openEditModal(p)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="ai-action-btn danger"
                          title="Delete"
                          onClick={() => handleDelete(p.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      {testResult && testResult.id === p.id && (
                        <div
                          className={`ai-test-result ${testResult.type}`}
                        >
                          {testResult.text}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== Add / Edit Modal ===== */}
      {showModal && (
        <>
          <div
            className="provider-modal-overlay"
            onClick={closeModal}
          />
          <div className="provider-modal">
            <button
              className="provider-modal-close"
              onClick={closeModal}
            >
              <X size={18} />
            </button>

            <div className="provider-modal-title">
              {editingId ? "Edit AI Provider" : "Add AI Provider"}
            </div>
            <div className="provider-modal-desc">
              {editingId
                ? "Update the configuration for this AI provider."
                : "Configure a new AI provider with your API credentials."}
            </div>

            {message && (
              <div className={`provider-message ${message.type}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSave}>
              {/* Provider Select */}
              <div className="provider-form-group">
                <label className="provider-form-label">Provider</label>
                <select
                  className="provider-form-select"
                  value={formProvider}
                  onChange={(e) => {
                    const next = e.target.value as ProviderNameOption;
                    setFormProvider(next);
                    setFormModelId(PROVIDER_MODELS[next][0].value);
                  }}
                >
                  {PROVIDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* API Key */}
              <div className="provider-form-group">
                <label className="provider-form-label">
                  API Key
                  {editingId && (
                    <span
                      style={{
                        fontWeight: 400,
                        textTransform: "none",
                        marginLeft: 4,
                      }}
                    >
                      (leave blank to keep current)
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  className="provider-form-input"
                  placeholder={
                    editingId ? "Enter new key to change..." : "sk-..."
                  }
                  value={formApiKey}
                  onChange={(e) => setFormApiKey(e.target.value)}
                  autoComplete="off"
                />
              </div>

              {/* Model ID */}
              <div className="provider-form-group">
                <label className="provider-form-label">Model</label>
                <select
                  className="provider-form-select"
                  value={formModelId}
                  onChange={(e) => setFormModelId(e.target.value)}
                  required
                >
                  {PROVIDER_MODELS[formProvider].map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Checkboxes */}
              <div className="provider-form-group">
                <label className="provider-form-label">
                  Assign to Tasks
                </label>
                <div className="provider-checkbox-row">
                  <label className="provider-checkbox-item">
                    <input
                      type="checkbox"
                      checked={formChat}
                      onChange={(e) => setFormChat(e.target.checked)}
                    />
                    Chat
                  </label>
                  <label className="provider-checkbox-item">
                    <input
                      type="checkbox"
                      checked={formDocuments}
                      onChange={(e) =>
                        setFormDocuments(e.target.checked)
                      }
                    />
                    Document Processing
                  </label>
                  <label className="provider-checkbox-item">
                    <input
                      type="checkbox"
                      checked={formPredictions}
                      onChange={(e) =>
                        setFormPredictions(e.target.checked)
                      }
                    />
                    Predictions
                  </label>
                  <label className="provider-checkbox-item">
                    <input
                      type="checkbox"
                      checked={formDefault}
                      onChange={(e) =>
                        setFormDefault(e.target.checked)
                      }
                    />
                    Set as Default
                  </label>
                </div>
              </div>

              {/* Monthly Budget */}
              <div className="provider-form-group">
                <label className="provider-form-label">
                  Monthly Budget Limit (USD)
                </label>
                <input
                  type="number"
                  className="provider-form-input"
                  placeholder="Leave blank for no limit"
                  value={formBudget}
                  onChange={(e) => setFormBudget(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Footer */}
              <div className="provider-modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Provider"
                    : "Add Provider"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
