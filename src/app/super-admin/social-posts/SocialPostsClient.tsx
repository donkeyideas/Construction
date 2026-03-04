"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Clock,
  CheckCircle,
  Settings,
  Link2,
  Send,
  Trash2,
  Edit3,
  Loader2,
  X,
  AlertTriangle,
  Eye,
  EyeOff,
  Copy,
  Calendar,
  Zap,
  XCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SocialPost {
  id: string;
  platform: string;
  content: string;
  status: string;
  hashtags: string[];
  image_prompt: string | null;
  image_url: string | null;
  tone: string;
  scheduled_at: string | null;
  published_at: string | null;
  external_post_id: string | null;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: number;
  drafts: number;
  scheduled: number;
  published: number;
  failed: number;
}

interface Props {
  posts: SocialPost[];
  stats: Stats;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORMS = [
  { key: "twitter", label: "Twitter / X", icon: "𝕏", color: "#000" },
  { key: "linkedin", label: "LinkedIn", icon: "in", color: "#0A66C2" },
  { key: "facebook", label: "Facebook", icon: "f", color: "#1877F2" },
  { key: "instagram", label: "Instagram", icon: "📷", color: "#E4405F" },
  { key: "tiktok", label: "TikTok", icon: "♪", color: "#000" },
] as const;

const PLATFORM_LIMITS: Record<string, number> = {
  twitter: 280,
  tiktok: 300,
  facebook: 2000,
  instagram: 2200,
  linkedin: 3000,
};

const TONES = [
  "professional",
  "casual",
  "humorous",
  "authoritative",
  "inspiring",
  "educational",
  "promotional",
  "controversial",
];

const TABS = [
  { key: "generator", icon: Sparkles, label: "Generator" },
  { key: "queue", icon: Clock, label: "Queue" },
  { key: "published", icon: CheckCircle, label: "Published" },
  { key: "automation", icon: Settings, label: "Automation" },
  { key: "connections", icon: Link2, label: "Connections" },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function platformIcon(key: string) {
  return PLATFORMS.find((p) => p.key === key)?.icon || "?";
}

function platformLabel(key: string) {
  return PLATFORMS.find((p) => p.key === key)?.label || key;
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "draft":
      return "sa-badge sa-badge-gray";
    case "scheduled":
      return "sa-badge sa-badge-blue";
    case "published":
      return "sa-badge sa-badge-green";
    case "failed":
      return "sa-badge sa-badge-red";
    case "cancelled":
      return "sa-badge sa-badge-amber";
    default:
      return "sa-badge";
  }
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CharCounter({ current, max }: { current: number; max: number }) {
  const pct = current / max;
  const color =
    pct > 1
      ? "var(--color-red)"
      : pct > 0.9
        ? "var(--color-amber)"
        : "var(--color-green)";
  return (
    <span
      style={{ fontSize: "0.8rem", fontWeight: 600, color, fontFamily: "monospace" }}
    >
      {current}/{max}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SocialPostsClient({ posts: initialPosts, stats }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("generator");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // -----------------------------------------------------------------------
  // Generator state
  // -----------------------------------------------------------------------
  const [genPlatforms, setGenPlatforms] = useState<string[]>(["twitter"]);
  const [genTopic, setGenTopic] = useState("");
  const [genTone, setGenTone] = useState("professional");
  const [generating, setGenerating] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<
    { platform: string; content: string; hashtags: string[]; imagePrompt: string; postId?: string }[]
  >([]);

  // -----------------------------------------------------------------------
  // Queue state
  // -----------------------------------------------------------------------
  const [queueFilter, setQueueFilter] = useState<string>("all");
  const [queuePlatformFilter, setQueuePlatformFilter] = useState<string>("all");
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editHashtags, setEditHashtags] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [bulkScheduling, setBulkScheduling] = useState(false);

  // -----------------------------------------------------------------------
  // Published filter
  // -----------------------------------------------------------------------
  const [pubPlatformFilter, setPubPlatformFilter] = useState<string>("all");

  // -----------------------------------------------------------------------
  // Automation state
  // -----------------------------------------------------------------------
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoPlatforms, setAutoPlatforms] = useState<string[]>(["twitter", "linkedin"]);
  const [autoTopics, setAutoTopics] = useState("");
  const [autoHour, setAutoHour] = useState(9);
  const [autoLoaded, setAutoLoaded] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);

  // -----------------------------------------------------------------------
  // Connections state
  // -----------------------------------------------------------------------
  const [connLoaded, setConnLoaded] = useState(false);
  const [connSaving, setConnSaving] = useState(false);
  const [connTesting, setConnTesting] = useState<string | null>(null);
  const [connTestResult, setConnTestResult] = useState<Record<string, { success: boolean; message: string }>>({});
  const [connStatus, setConnStatus] = useState<Record<string, boolean>>({});
  // Twitter
  const [twitterApiKey, setTwitterApiKey] = useState("");
  const [twitterApiSecret, setTwitterApiSecret] = useState("");
  const [twitterAccessToken, setTwitterAccessToken] = useState("");
  const [twitterAccessSecret, setTwitterAccessSecret] = useState("");
  // LinkedIn
  const [linkedinToken, setLinkedinToken] = useState("");
  // Facebook
  const [facebookToken, setFacebookToken] = useState("");
  const [facebookPageId, setFacebookPageId] = useState("");
  // AI
  const [aiProvider, setAiProvider] = useState("openai");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("gpt-4o");
  // Visibility toggles
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});

  // -----------------------------------------------------------------------
  // Derived data
  // -----------------------------------------------------------------------
  const queuePosts = useMemo(
    () =>
      initialPosts.filter((p) => {
        if (p.status === "published") return false;
        if (queueFilter !== "all" && p.status !== queueFilter) return false;
        if (queuePlatformFilter !== "all" && p.platform !== queuePlatformFilter) return false;
        return true;
      }),
    [initialPosts, queueFilter, queuePlatformFilter]
  );

  const publishedPosts = useMemo(
    () =>
      initialPosts.filter((p) => {
        if (p.status !== "published") return false;
        if (pubPlatformFilter !== "all" && p.platform !== pubPlatformFilter) return false;
        return true;
      }),
    [initialPosts, pubPlatformFilter]
  );

  const pubStatsByPlatform = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of initialPosts) {
      if (p.status === "published") {
        counts[p.platform] = (counts[p.platform] || 0) + 1;
      }
    }
    return counts;
  }, [initialPosts]);

  const draftCount = useMemo(
    () => initialPosts.filter((p) => p.status === "draft").length,
    [initialPosts]
  );

  // -----------------------------------------------------------------------
  // API helpers
  // -----------------------------------------------------------------------

  async function handleGenerate() {
    if (genPlatforms.length === 0) {
      setError("Select at least one platform.");
      return;
    }
    setGenerating(true);
    setError("");
    setSuccess("");
    setGeneratedPosts([]);

    try {
      const res = await fetch("/api/super-admin/social-posts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms: genPlatforms,
          topic: genTopic || undefined,
          tone: genTone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Generation failed.");
        return;
      }

      const posts = (data.data || []).map(
        (d: { platform: string; post: { id: string }; generated: { content: string; hashtags: string[]; imagePrompt: string } }) => ({
          platform: d.platform,
          content: d.generated.content,
          hashtags: d.generated.hashtags,
          imagePrompt: d.generated.imagePrompt,
          postId: d.post?.id,
        })
      );

      setGeneratedPosts(posts);

      if (data.errors?.length > 0) {
        setError(
          `${data.errors.length} platform(s) failed: ${data.errors.map((e: { platform: string }) => e.platform).join(", ")}`
        );
      } else {
        setSuccess(data.message || "Posts generated!");
      }

      router.refresh();
    } catch {
      setError("Network error during generation.");
    } finally {
      setGenerating(false);
    }
  }

  async function handlePublishNow(postId: string) {
    setPublishing(postId);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(
        `/api/super-admin/social-posts/${postId}/publish`,
        { method: "POST" }
      );
      const data = await res.json();

      if (data.success) {
        setSuccess("Post published successfully!");
      } else {
        setError(data.error || "Publish failed.");
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setPublishing(null);
    }
  }

  async function handleDelete(postId: string) {
    if (!confirm("Delete this post?")) return;
    setDeleting(postId);
    setError("");

    try {
      const res = await fetch(`/api/super-admin/social-posts/${postId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Delete failed.");
      } else {
        setSuccess("Post deleted.");
        router.refresh();
      }
    } catch {
      setError("Network error.");
    } finally {
      setDeleting(null);
    }
  }

  async function handleEditSave() {
    if (!editingPost) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch(
        `/api/super-admin/social-posts/${editingPost.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: editContent,
            hashtags: editHashtags
              .split(",")
              .map((h) => h.trim())
              .filter(Boolean),
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Update failed.");
      } else {
        setSuccess("Post updated.");
        setEditingPost(null);
        router.refresh();
      }
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSchedulePost(postId: string) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setUTCHours(9, 0, 0, 0);

    setError("");
    try {
      const res = await fetch(`/api/super-admin/social-posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "scheduled",
          scheduled_at: tomorrow.toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Schedule failed.");
      } else {
        setSuccess("Post scheduled for tomorrow 9:00 AM UTC.");
        router.refresh();
      }
    } catch {
      setError("Network error.");
    }
  }

  async function handleBulkSchedule() {
    setBulkScheduling(true);
    setError("");

    const drafts = initialPosts.filter((p) => p.status === "draft");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setUTCHours(9, 0, 0, 0);

    let count = 0;
    for (const draft of drafts) {
      try {
        const res = await fetch(`/api/super-admin/social-posts/${draft.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "scheduled",
            scheduled_at: tomorrow.toISOString(),
          }),
        });
        if (res.ok) count++;
      } catch {
        // continue
      }
    }

    setSuccess(`Scheduled ${count} draft(s) for tomorrow 9:00 AM UTC.`);
    setBulkScheduling(false);
    router.refresh();
  }

  // -----------------------------------------------------------------------
  // Connections helpers
  // -----------------------------------------------------------------------

  async function loadConnections() {
    if (connLoaded) return;
    try {
      const res = await fetch("/api/super-admin/social-posts/connections");
      if (!res.ok) return;
      const data = await res.json();
      const s = data.settings || {};

      if (s.social_twitter_api_key) setTwitterApiKey(s.social_twitter_api_key);
      if (s.social_twitter_api_secret) setTwitterApiSecret(s.social_twitter_api_secret);
      if (s.social_twitter_access_token) setTwitterAccessToken(s.social_twitter_access_token);
      if (s.social_twitter_access_token_secret) setTwitterAccessSecret(s.social_twitter_access_token_secret);
      if (s.social_linkedin_access_token) setLinkedinToken(s.social_linkedin_access_token);
      if (s.social_facebook_access_token) setFacebookToken(s.social_facebook_access_token);
      if (s.social_facebook_page_id) setFacebookPageId(s.social_facebook_page_id);
      if (s.social_ai_provider) setAiProvider(s.social_ai_provider);
      if (s.social_ai_api_key) setAiApiKey(s.social_ai_api_key);
      if (s.social_ai_model) setAiModel(s.social_ai_model);

      // Automation
      if (s.social_auto_enabled === "true") setAutoEnabled(true);
      if (s.social_auto_hour) setAutoHour(parseInt(s.social_auto_hour, 10));
      if (s.social_auto_topics) setAutoTopics(s.social_auto_topics);
      try {
        if (s.social_auto_platforms) setAutoPlatforms(JSON.parse(s.social_auto_platforms));
      } catch { /* ignore */ }

      setConnStatus(data.connections || {});
      setConnLoaded(true);
      setAutoLoaded(true);
    } catch {
      // ignore
    }
  }

  async function handleSaveConnections() {
    setConnSaving(true);
    setError("");
    setSuccess("");

    try {
      const body: Record<string, string> = {};

      if (twitterApiKey && !twitterApiKey.startsWith("••••")) body.social_twitter_api_key = twitterApiKey;
      if (twitterApiSecret && !twitterApiSecret.startsWith("••••")) body.social_twitter_api_secret = twitterApiSecret;
      if (twitterAccessToken && !twitterAccessToken.startsWith("••••")) body.social_twitter_access_token = twitterAccessToken;
      if (twitterAccessSecret && !twitterAccessSecret.startsWith("••••")) body.social_twitter_access_token_secret = twitterAccessSecret;
      if (linkedinToken && !linkedinToken.startsWith("••••")) body.social_linkedin_access_token = linkedinToken;
      if (facebookToken && !facebookToken.startsWith("••••")) body.social_facebook_access_token = facebookToken;
      if (facebookPageId) body.social_facebook_page_id = facebookPageId;
      if (aiProvider) body.social_ai_provider = aiProvider;
      if (aiApiKey && !aiApiKey.startsWith("••••")) body.social_ai_api_key = aiApiKey;
      if (aiModel) body.social_ai_model = aiModel;

      const res = await fetch("/api/super-admin/social-posts/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Save failed.");
      } else {
        setSuccess("Connections saved.");
        setConnLoaded(false); // reload to refresh masked values
        loadConnections();
      }
    } catch {
      setError("Network error.");
    } finally {
      setConnSaving(false);
    }
  }

  async function handleTestConnection(platform: string) {
    setConnTesting(platform);
    setConnTestResult((prev) => ({ ...prev, [platform]: { success: false, message: "Testing..." } }));

    try {
      const res = await fetch("/api/super-admin/social-posts/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _action: "test", platform }),
      });
      const data = await res.json();
      setConnTestResult((prev) => ({
        ...prev,
        [platform]: {
          success: data.success,
          message: data.success
            ? `Connected as ${data.externalPostId || "verified"}`
            : data.error || "Connection failed",
        },
      }));
    } catch {
      setConnTestResult((prev) => ({
        ...prev,
        [platform]: { success: false, message: "Network error" },
      }));
    } finally {
      setConnTesting(null);
    }
  }

  async function handleSaveAutomation() {
    setAutoSaving(true);
    setError("");
    setSuccess("");

    try {
      const body: Record<string, string> = {
        social_auto_enabled: autoEnabled ? "true" : "false",
        social_auto_platforms: JSON.stringify(autoPlatforms),
        social_auto_topics: autoTopics,
        social_auto_hour: String(autoHour),
      };

      const res = await fetch("/api/super-admin/social-posts/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Save failed.");
      } else {
        setSuccess("Automation settings saved.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setAutoSaving(false);
    }
  }

  // Load connections/automation when those tabs are first opened
  if ((activeTab === "connections" || activeTab === "automation") && !connLoaded) {
    loadConnections();
  }

  // -----------------------------------------------------------------------
  // Copy to clipboard
  // -----------------------------------------------------------------------
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setSuccess("Copied to clipboard!");
    setTimeout(() => setSuccess(""), 2000);
  }

  // -----------------------------------------------------------------------
  // Toggle password visibility
  // -----------------------------------------------------------------------
  function toggleShow(field: string) {
    setShowFields((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <>
      {/* Header */}
      <div className="admin-header">
        <div>
          <h2>Social Posts</h2>
          <p className="admin-header-sub">
            Generate, schedule, and publish social media content with AI
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="sa-kpi-grid">
        <div className="sa-kpi-card">
          <div className="sa-kpi-label">Total Posts</div>
          <div className="sa-kpi-value">{stats.total}</div>
        </div>
        <div className="sa-kpi-card">
          <div className="sa-kpi-label">Drafts</div>
          <div className="sa-kpi-value">{stats.drafts}</div>
        </div>
        <div className="sa-kpi-card">
          <div className="sa-kpi-label">Scheduled</div>
          <div className="sa-kpi-value">{stats.scheduled}</div>
        </div>
        <div className="sa-kpi-card">
          <div className="sa-kpi-label">Published</div>
          <div className="sa-kpi-value">{stats.published}</div>
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="sa-card" style={{ background: "var(--color-red-light)", color: "var(--color-red)", padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={16} /> {error}
          <button onClick={() => setError("")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit" }}><X size={14} /></button>
        </div>
      )}
      {success && (
        <div className="sa-card" style={{ background: "var(--color-green-light)", color: "var(--color-green)", padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle size={16} /> {success}
          <button onClick={() => setSuccess("")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit" }}><X size={14} /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="settings-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`settings-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon size={14} style={{ marginRight: 6 }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="settings-tab-panel">
        {/* ============================================================ */}
        {/* TAB 1: GENERATOR */}
        {/* ============================================================ */}
        {activeTab === "generator" && (
          <div>
            {/* Platform selector */}
            <label style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: 8, display: "block" }}>
              Platforms
            </label>
            <div className="sa-social-platform-selector">
              {PLATFORMS.map((p) => (
                <button
                  key={p.key}
                  className={`sa-social-platform-btn ${genPlatforms.includes(p.key) ? "active" : ""}`}
                  onClick={() =>
                    setGenPlatforms((prev) =>
                      prev.includes(p.key)
                        ? prev.filter((x) => x !== p.key)
                        : [...prev, p.key]
                    )
                  }
                >
                  <span style={{ fontWeight: 700 }}>{p.icon}</span> {p.label}
                </button>
              ))}
            </div>

            {/* Topic */}
            <label style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: 6, display: "block", marginTop: 16 }}>
              Topic / Theme
            </label>
            <textarea
              value={genTopic}
              onChange={(e) => setGenTopic(e.target.value)}
              placeholder="e.g., Benefits of construction ERP software for mid-size contractors"
              rows={3}
              className="ticket-form-input"
              style={{ width: "100%", resize: "vertical" }}
            />

            {/* Tone */}
            <label style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: 6, display: "block", marginTop: 16 }}>
              Tone
            </label>
            <select
              value={genTone}
              onChange={(e) => setGenTone(e.target.value)}
              className="ticket-form-input"
              style={{ width: "auto", minWidth: 200 }}
            >
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>

            {/* Generate button */}
            <div style={{ marginTop: 20 }}>
              <button
                className="sa-action-btn primary"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? (
                  <><Loader2 size={14} className="spin" /> Generating...</>
                ) : (
                  <><Sparkles size={14} /> Generate All</>
                )}
              </button>
            </div>

            {/* Generated results */}
            {generatedPosts.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 12 }}>Generated Posts</h3>
                <div style={{ display: "grid", gap: 16 }}>
                  {generatedPosts.map((gp, idx) => {
                    const limit = PLATFORM_LIMITS[gp.platform] || 500;
                    return (
                      <div key={idx} className="sa-social-preview">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: "1.1rem" }}>{platformIcon(gp.platform)}</span>
                            {platformLabel(gp.platform)}
                          </span>
                          <CharCounter current={gp.content.length} max={limit} />
                        </div>
                        <div style={{ fontSize: "0.9rem", lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 10 }}>
                          {gp.content}
                        </div>
                        {gp.hashtags.length > 0 && (
                          <div style={{ marginBottom: 10 }}>
                            {gp.hashtags.map((h, i) => (
                              <span key={i} className="sa-social-hashtag">#{h}</span>
                            ))}
                          </div>
                        )}
                        {gp.imagePrompt && (
                          <details style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                            <summary style={{ cursor: "pointer" }}>Image Prompt</summary>
                            <p style={{ marginTop: 4 }}>{gp.imagePrompt}</p>
                          </details>
                        )}
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          <button
                            className="sa-action-btn"
                            onClick={() => copyToClipboard(gp.content)}
                            title="Copy to clipboard"
                          >
                            <Copy size={13} /> Copy
                          </button>
                          {gp.postId && (
                            <button
                              className="sa-action-btn primary"
                              onClick={() => handleSchedulePost(gp.postId!)}
                            >
                              <Calendar size={13} /> Schedule
                            </button>
                          )}
                          {gp.postId && (
                            <button
                              className="sa-action-btn"
                              onClick={() => handlePublishNow(gp.postId!)}
                              disabled={publishing === gp.postId}
                              style={{ background: "var(--color-green-light)", color: "var(--color-green)" }}
                            >
                              {publishing === gp.postId ? <Loader2 size={13} className="spin" /> : <Send size={13} />} Publish Now
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: QUEUE */}
        {/* ============================================================ */}
        {activeTab === "queue" && (
          <div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
              <select
                value={queueFilter}
                onChange={(e) => setQueueFilter(e.target.value)}
                className="ticket-form-input"
                style={{ width: "auto" }}
              >
                <option value="all">All Statuses</option>
                <option value="draft">Drafts</option>
                <option value="scheduled">Scheduled</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={queuePlatformFilter}
                onChange={(e) => setQueuePlatformFilter(e.target.value)}
                className="ticket-form-input"
                style={{ width: "auto" }}
              >
                <option value="all">All Platforms</option>
                {PLATFORMS.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>

              {draftCount > 0 && (
                <button
                  className="sa-action-btn primary"
                  onClick={handleBulkSchedule}
                  disabled={bulkScheduling}
                  style={{ marginLeft: "auto" }}
                >
                  {bulkScheduling ? (
                    <><Loader2 size={14} className="spin" /> Scheduling...</>
                  ) : (
                    <><Zap size={14} /> Schedule all {draftCount} draft(s)</>
                  )}
                </button>
              )}
            </div>

            {queuePosts.length === 0 ? (
              <div className="sa-empty">No posts in queue.</div>
            ) : (
              <div className="sa-table-wrap">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Platform</th>
                      <th>Content</th>
                      <th>Status</th>
                      <th>Scheduled</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queuePosts.map((post) => (
                      <tr key={post.id}>
                        <td>
                          <span style={{ fontWeight: 700, marginRight: 6 }}>{platformIcon(post.platform)}</span>
                          {platformLabel(post.platform)}
                        </td>
                        <td style={{ maxWidth: 300 }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {post.content.slice(0, 100)}{post.content.length > 100 ? "..." : ""}
                          </div>
                          {post.error_message && (
                            <div style={{ fontSize: "0.75rem", color: "var(--color-red)", marginTop: 2 }}>
                              {post.error_message}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={statusBadgeClass(post.status)}>{post.status}</span>
                        </td>
                        <td style={{ fontSize: "0.85rem" }}>{formatDate(post.scheduled_at)}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              className="sa-action-btn"
                              onClick={() => {
                                setEditingPost(post);
                                setEditContent(post.content);
                                setEditHashtags(post.hashtags.join(", "));
                              }}
                              title="Edit"
                            >
                              <Edit3 size={13} />
                            </button>
                            {(post.status === "draft" || post.status === "scheduled") && (
                              <button
                                className="sa-action-btn primary"
                                onClick={() => handlePublishNow(post.id)}
                                disabled={publishing === post.id}
                                title="Publish Now"
                              >
                                {publishing === post.id ? <Loader2 size={13} className="spin" /> : <Send size={13} />}
                              </button>
                            )}
                            {post.status === "draft" && (
                              <button
                                className="sa-action-btn"
                                onClick={() => handleSchedulePost(post.id)}
                                title="Schedule"
                              >
                                <Calendar size={13} />
                              </button>
                            )}
                            <button
                              className="sa-action-btn danger"
                              onClick={() => handleDelete(post.id)}
                              disabled={deleting === post.id}
                              title="Delete"
                            >
                              {deleting === post.id ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Edit modal */}
            {editingPost && (
              <div className="ticket-modal-overlay" onClick={() => setEditingPost(null)}>
                <div className="ticket-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
                  <div className="ticket-modal-header">
                    <h3>Edit Post</h3>
                    <button onClick={() => setEditingPost(null)} className="ticket-modal-close"><X size={18} /></button>
                  </div>
                  <div className="ticket-modal-body">
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: 4 }}>Content</label>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={6}
                        className="ticket-form-input"
                        style={{ width: "100%", resize: "vertical" }}
                      />
                      <CharCounter
                        current={editContent.length}
                        max={PLATFORM_LIMITS[editingPost.platform] || 500}
                      />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: 4 }}>
                        Hashtags (comma-separated)
                      </label>
                      <input
                        value={editHashtags}
                        onChange={(e) => setEditHashtags(e.target.value)}
                        className="ticket-form-input"
                        style={{ width: "100%" }}
                        placeholder="buildwrk, construction, erp"
                      />
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button className="sa-action-btn" onClick={() => setEditingPost(null)}>Cancel</button>
                      <button className="sa-action-btn primary" onClick={handleEditSave} disabled={saving}>
                        {saving ? <Loader2 size={14} className="spin" /> : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: PUBLISHED */}
        {/* ============================================================ */}
        {activeTab === "published" && (
          <div>
            {/* Stats row */}
            <div className="sa-kpi-grid" style={{ marginBottom: 20 }}>
              {PLATFORMS.map((p) => (
                <div key={p.key} className="sa-kpi-card">
                  <div className="sa-kpi-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 700 }}>{p.icon}</span> {p.label}
                  </div>
                  <div className="sa-kpi-value">{pubStatsByPlatform[p.key] || 0}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <select
                value={pubPlatformFilter}
                onChange={(e) => setPubPlatformFilter(e.target.value)}
                className="ticket-form-input"
                style={{ width: "auto" }}
              >
                <option value="all">All Platforms</option>
                {PLATFORMS.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </div>

            {publishedPosts.length === 0 ? (
              <div className="sa-empty">No published posts yet.</div>
            ) : (
              <div className="sa-table-wrap">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Platform</th>
                      <th>Content</th>
                      <th>Published</th>
                    </tr>
                  </thead>
                  <tbody>
                    {publishedPosts.map((post) => (
                      <tr key={post.id}>
                        <td>
                          <span style={{ fontWeight: 700, marginRight: 6 }}>{platformIcon(post.platform)}</span>
                          {platformLabel(post.platform)}
                        </td>
                        <td style={{ maxWidth: 400 }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {post.content.slice(0, 120)}{post.content.length > 120 ? "..." : ""}
                          </div>
                        </td>
                        <td style={{ fontSize: "0.85rem" }}>{formatDate(post.published_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: AUTOMATION */}
        {/* ============================================================ */}
        {activeTab === "automation" && (
          <div>
            {!autoLoaded ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <Loader2 size={24} className="spin" />
              </div>
            ) : (
              <>
                {/* Enable/disable toggle */}
                <div className="sa-social-connection-card" style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Daily Auto-Generation</div>
                      <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                        Automatically generate social media posts daily using AI
                      </div>
                    </div>
                    <label className="sa-social-toggle">
                      <input
                        type="checkbox"
                        checked={autoEnabled}
                        onChange={(e) => setAutoEnabled(e.target.checked)}
                      />
                      <span className="sa-social-toggle-slider" />
                    </label>
                  </div>
                </div>

                {autoEnabled && (
                  <>
                    {/* Platforms */}
                    <label style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: 8 }}>
                      Platforms to auto-generate for
                    </label>
                    <div className="sa-social-platform-selector" style={{ marginBottom: 16 }}>
                      {PLATFORMS.map((p) => (
                        <button
                          key={p.key}
                          className={`sa-social-platform-btn ${autoPlatforms.includes(p.key) ? "active" : ""}`}
                          onClick={() =>
                            setAutoPlatforms((prev) =>
                              prev.includes(p.key)
                                ? prev.filter((x) => x !== p.key)
                                : [...prev, p.key]
                            )
                          }
                        >
                          <span style={{ fontWeight: 700 }}>{p.icon}</span> {p.label}
                        </button>
                      ))}
                    </div>

                    {/* Hour */}
                    <label style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: 6 }}>
                      Generation hour (UTC): {autoHour}:00
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={23}
                      value={autoHour}
                      onChange={(e) => setAutoHour(parseInt(e.target.value, 10))}
                      style={{ width: "100%", maxWidth: 400, marginBottom: 16 }}
                    />

                    {/* Topics */}
                    <label style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: 6 }}>
                      Topic Rotation Pool
                    </label>
                    <textarea
                      value={autoTopics}
                      onChange={(e) => setAutoTopics(e.target.value)}
                      placeholder="Enter topics separated by newlines, e.g.:\nconstruction project management\nsite safety best practices\nequipment tracking ROI"
                      rows={5}
                      className="ticket-form-input"
                      style={{ width: "100%", resize: "vertical", marginBottom: 16 }}
                    />
                  </>
                )}

                <button
                  className="sa-action-btn primary"
                  onClick={handleSaveAutomation}
                  disabled={autoSaving}
                >
                  {autoSaving ? <><Loader2 size={14} className="spin" /> Saving...</> : "Save Automation Settings"}
                </button>
              </>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: CONNECTIONS */}
        {/* ============================================================ */}
        {activeTab === "connections" && (
          <div>
            {!connLoaded ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <Loader2 size={24} className="spin" />
              </div>
            ) : (
              <div style={{ display: "grid", gap: 16 }}>
                {/* AI Provider */}
                <div className="sa-social-connection-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Sparkles size={18} />
                    <span style={{ fontWeight: 600, fontSize: "1rem" }}>AI Provider</span>
                    <span className={connStatus.ai ? "sa-social-connected" : "sa-social-disconnected"} style={{ marginLeft: "auto", fontSize: "0.8rem", fontWeight: 600 }}>
                      {connStatus.ai ? "Configured" : "Not configured"}
                    </span>
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 500 }}>Provider</label>
                      <select
                        value={aiProvider}
                        onChange={(e) => setAiProvider(e.target.value)}
                        className="ticket-form-input"
                        style={{ width: "100%" }}
                      >
                        {["openai", "anthropic", "google", "deepseek", "groq", "mistral", "cohere", "xai"].map((p) => (
                          <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 500 }}>API Key</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          type={showFields.aiKey ? "text" : "password"}
                          value={aiApiKey}
                          onChange={(e) => setAiApiKey(e.target.value)}
                          className="ticket-form-input"
                          style={{ flex: 1 }}
                          placeholder="sk-..."
                        />
                        <button className="sa-action-btn" onClick={() => toggleShow("aiKey")}>
                          {showFields.aiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 500 }}>Model ID</label>
                      <input
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                        className="ticket-form-input"
                        style={{ width: "100%" }}
                        placeholder="e.g., gpt-4o, claude-sonnet-4-6, deepseek-chat"
                      />
                    </div>
                  </div>
                </div>

                {/* Twitter */}
                <div className="sa-social-connection-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>𝕏</span>
                    <span style={{ fontWeight: 600, fontSize: "1rem" }}>Twitter / X</span>
                    <span className={connStatus.twitter ? "sa-social-connected" : "sa-social-disconnected"} style={{ marginLeft: "auto", fontSize: "0.8rem", fontWeight: 600 }}>
                      {connStatus.twitter ? "Connected" : "Not connected"}
                    </span>
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {[
                      { label: "API Key", value: twitterApiKey, set: setTwitterApiKey, field: "twKey" },
                      { label: "API Secret", value: twitterApiSecret, set: setTwitterApiSecret, field: "twSecret" },
                      { label: "Access Token", value: twitterAccessToken, set: setTwitterAccessToken, field: "twAccess" },
                      { label: "Access Token Secret", value: twitterAccessSecret, set: setTwitterAccessSecret, field: "twAccessSecret" },
                    ].map((f) => (
                      <div key={f.field}>
                        <label style={{ fontSize: "0.8rem", fontWeight: 500 }}>{f.label}</label>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            type={showFields[f.field] ? "text" : "password"}
                            value={f.value}
                            onChange={(e) => f.set(e.target.value)}
                            className="ticket-form-input"
                            style={{ flex: 1 }}
                          />
                          <button className="sa-action-btn" onClick={() => toggleShow(f.field)}>
                            {showFields[f.field] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="sa-action-btn"
                    style={{ marginTop: 10 }}
                    onClick={() => handleTestConnection("twitter")}
                    disabled={connTesting === "twitter"}
                  >
                    {connTesting === "twitter" ? <Loader2 size={13} className="spin" /> : <Zap size={13} />}{" "}
                    Test Connection
                  </button>
                  {connTestResult.twitter && (
                    <div style={{ fontSize: "0.8rem", marginTop: 6, color: connTestResult.twitter.success ? "var(--color-green)" : "var(--color-red)" }}>
                      {connTestResult.twitter.message}
                    </div>
                  )}
                </div>

                {/* LinkedIn */}
                <div className="sa-social-connection-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: "1rem", color: "#0A66C2" }}>in</span>
                    <span style={{ fontWeight: 600, fontSize: "1rem" }}>LinkedIn</span>
                    <span className={connStatus.linkedin ? "sa-social-connected" : "sa-social-disconnected"} style={{ marginLeft: "auto", fontSize: "0.8rem", fontWeight: 600 }}>
                      {connStatus.linkedin ? "Connected" : "Not connected"}
                    </span>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: 500 }}>Access Token (OAuth 2.0)</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type={showFields.liToken ? "text" : "password"}
                        value={linkedinToken}
                        onChange={(e) => setLinkedinToken(e.target.value)}
                        className="ticket-form-input"
                        style={{ flex: 1 }}
                      />
                      <button className="sa-action-btn" onClick={() => toggleShow("liToken")}>
                        {showFields.liToken ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <button
                    className="sa-action-btn"
                    style={{ marginTop: 10 }}
                    onClick={() => handleTestConnection("linkedin")}
                    disabled={connTesting === "linkedin"}
                  >
                    {connTesting === "linkedin" ? <Loader2 size={13} className="spin" /> : <Zap size={13} />}{" "}
                    Test Connection
                  </button>
                  {connTestResult.linkedin && (
                    <div style={{ fontSize: "0.8rem", marginTop: 6, color: connTestResult.linkedin.success ? "var(--color-green)" : "var(--color-red)" }}>
                      {connTestResult.linkedin.message}
                    </div>
                  )}
                </div>

                {/* Facebook */}
                <div className="sa-social-connection-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: "1rem", color: "#1877F2" }}>f</span>
                    <span style={{ fontWeight: 600, fontSize: "1rem" }}>Facebook</span>
                    <span className={connStatus.facebook ? "sa-social-connected" : "sa-social-disconnected"} style={{ marginLeft: "auto", fontSize: "0.8rem", fontWeight: 600 }}>
                      {connStatus.facebook ? "Connected" : "Not connected"}
                    </span>
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 500 }}>Page Access Token</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          type={showFields.fbToken ? "text" : "password"}
                          value={facebookToken}
                          onChange={(e) => setFacebookToken(e.target.value)}
                          className="ticket-form-input"
                          style={{ flex: 1 }}
                        />
                        <button className="sa-action-btn" onClick={() => toggleShow("fbToken")}>
                          {showFields.fbToken ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.8rem", fontWeight: 500 }}>Page ID</label>
                      <input
                        value={facebookPageId}
                        onChange={(e) => setFacebookPageId(e.target.value)}
                        className="ticket-form-input"
                        style={{ width: "100%" }}
                        placeholder="e.g., 123456789012345"
                      />
                    </div>
                  </div>
                  <button
                    className="sa-action-btn"
                    style={{ marginTop: 10 }}
                    onClick={() => handleTestConnection("facebook")}
                    disabled={connTesting === "facebook"}
                  >
                    {connTesting === "facebook" ? <Loader2 size={13} className="spin" /> : <Zap size={13} />}{" "}
                    Test Connection
                  </button>
                  {connTestResult.facebook && (
                    <div style={{ fontSize: "0.8rem", marginTop: 6, color: connTestResult.facebook.success ? "var(--color-green)" : "var(--color-red)" }}>
                      {connTestResult.facebook.message}
                    </div>
                  )}
                </div>

                {/* Instagram (not supported) */}
                <div className="sa-social-connection-card" style={{ opacity: 0.6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "1.1rem" }}>📷</span>
                    <span style={{ fontWeight: 600, fontSize: "1rem" }}>Instagram</span>
                    <span className="sa-social-disconnected" style={{ marginLeft: "auto", fontSize: "0.8rem", fontWeight: 600 }}>
                      Text-only not supported
                    </span>
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 8 }}>
                    Instagram does not support text-only posts via API. Image posts require Meta Business Suite integration.
                  </p>
                </div>

                {/* TikTok (coming soon) */}
                <div className="sa-social-connection-card" style={{ opacity: 0.6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>♪</span>
                    <span style={{ fontWeight: 600, fontSize: "1rem" }}>TikTok</span>
                    <span className="sa-social-disconnected" style={{ marginLeft: "auto", fontSize: "0.8rem", fontWeight: 600 }}>
                      Coming soon
                    </span>
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 8 }}>
                    TikTok Content Posting API integration is planned for a future release.
                  </p>
                </div>

                {/* Save all connections */}
                <button
                  className="sa-action-btn primary"
                  onClick={handleSaveConnections}
                  disabled={connSaving}
                  style={{ justifySelf: "start" }}
                >
                  {connSaving ? <><Loader2 size={14} className="spin" /> Saving...</> : "Save All Connections"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
