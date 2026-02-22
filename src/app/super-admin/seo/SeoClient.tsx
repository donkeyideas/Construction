"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Search,
  FileText,
  Settings,
  Type,
  TrendingUp,
  Globe,
  BarChart3,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  Plus,
  X,
  ExternalLink,
  Eye,
  Clock,
  MapPin,
  MousePointer,
  ArrowUp,
  ArrowDown,
  Minus as MinusIcon,
  Bot,
  Target,
  FlaskConical,
} from "lucide-react";
import type {
  PlatformSeoOverview,
  CmsPageAudit,
  TechnicalCheck,
  ContentAnalysisItem,
  IntentGroup,
  PositionBucket,
  PlatformGeoPresence,
  SeoRecommendation,
  AeoOverview,
  CroOverview,
  AeoScoresOverview,
  GeoScoresOverview,
} from "@/lib/queries/super-admin-seo";
import "@/styles/seo.css";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface Keyword {
  id: string;
  keyword: string;
  search_volume: number | null;
  current_position: number | null;
  previous_position: number | null;
  difficulty: number | null;
  intent: string | null;
  target_url: string | null;
  tracked_since: string | null;
}

interface Props {
  overview: PlatformSeoOverview;
  pages: CmsPageAudit[];
  technical: TechnicalCheck[];
  content: ContentAnalysisItem[];
  intentData: IntentGroup[];
  positionData: PositionBucket[];
  geo: PlatformGeoPresence;
  recommendations: SeoRecommendation[];
  keywords: Keyword[];
  aeoOverview: AeoOverview;
  croOverview: CroOverview;
  aeoScores: AeoScoresOverview;
  geoScores: GeoScoresOverview;
}

/* ──────────────────────────────────────────────
   Constants
   ────────────────────────────────────────────── */

const TABS = [
  { key: "overview", icon: BarChart3, label: "seoTabOverview" },
  { key: "pages", icon: FileText, label: "seoTabPages" },
  { key: "technical", icon: Settings, label: "seoTabTechnical" },
  { key: "content", icon: Type, label: "seoTabContent" },
  { key: "traffic", icon: TrendingUp, label: "seoTabTraffic" },
  { key: "geo", icon: Globe, label: "seoTabGeo" },
  { key: "searchConsole", icon: Search, label: "seoTabSearchConsole" },
  { key: "aeo", icon: Bot, label: "seoTabAeo" },
  { key: "cro", icon: Target, label: "seoTabCro" },
  { key: "recommendations", icon: Lightbulb, label: "seoTabRecommendations" },
] as const;

const CHART_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];
const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6"];

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

function getPositionTrend(
  current: number | null,
  previous: number | null
): "up" | "down" | "neutral" | null {
  if (current === null || previous === null) return null;
  if (current < previous) return "up";
  if (current > previous) return "down";
  return "neutral";
}

function getIntentBadgeClass(intent: string | null): string {
  switch (intent) {
    case "transactional":
      return "sa-badge-green";
    case "commercial":
      return "sa-badge-amber";
    case "informational":
      return "sa-badge-blue";
    case "navigational":
      return "sa-badge-red";
    default:
      return "";
  }
}

function getScoreColor(score: number): string {
  if (score > 80) return "var(--color-green)";
  if (score > 50) return "var(--color-amber)";
  return "var(--color-red)";
}

function getLengthColor(length: number, min: number, max: number): string {
  if (length === 0) return "var(--color-red)";
  if (length >= min && length <= max) return "var(--color-green)";
  if (length >= min * 0.6 && length <= max * 1.2) return "var(--color-amber)";
  return "var(--color-red)";
}

function getFreshnessColor(freshness: string): string {
  switch (freshness) {
    case "fresh":
      return "sa-badge-green";
    case "aging":
      return "sa-badge-amber";
    case "stale":
      return "sa-badge-red";
    default:
      return "";
  }
}

function getContentQuality(
  wordCount: number,
  emptyOrHiddenSections: number
): { label: string; badgeClass: string } {
  if (wordCount > 300 && emptyOrHiddenSections === 0)
    return { label: "good", badgeClass: "sa-badge-green" };
  if (wordCount > 100)
    return { label: "fair", badgeClass: "sa-badge-amber" };
  return { label: "poor", badgeClass: "sa-badge-red" };
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export default function SeoClient({
  overview,
  pages,
  technical,
  content,
  intentData,
  positionData,
  geo,
  recommendations,
  keywords,
  aeoOverview,
  croOverview,
  aeoScores,
  geoScores,
}: Props) {
  const t = useTranslations("superAdmin");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";
  const router = useRouter();

  /* ── state ── */
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAddKeyword, setShowAddKeyword] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");

  // Traffic tab (client-side fetch from GA4 API)
  const [trafficData, setTrafficData] = useState<any>(null);
  const [trafficLoading, setTrafficLoading] = useState(false);

  // Search Console tab (client-side fetch)
  const [gscData, setGscData] = useState<any>(null);
  const [gscLoading, setGscLoading] = useState(false);

  // Add keyword form
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [kwKeyword, setKwKeyword] = useState("");
  const [kwVolume, setKwVolume] = useState("");
  const [kwDifficulty, setKwDifficulty] = useState("");
  const [kwIntent, setKwIntent] = useState("informational");
  const [kwTargetUrl, setKwTargetUrl] = useState("");

  // CRO state
  const [croSubTab, setCroSubTab] = useState<"funnel" | "performance" | "abtests">("funnel");
  const [showAddAbTest, setShowAddAbTest] = useState(false);
  const [croSaving, setCroSaving] = useState(false);
  const [croFormError, setCroFormError] = useState("");
  const [croTestName, setCroTestName] = useState("");
  const [croPageUrl, setCroPageUrl] = useState("");
  const [croVariantA, setCroVariantA] = useState("Control");
  const [croVariantB, setCroVariantB] = useState("Variant B");
  const [croMetricName, setCroMetricName] = useState("Conversion Rate");

  // CRO funnel data from GA4 (lazy loaded)
  const [croGaData, setCroGaData] = useState<any>(null);
  const [croGaLoading, setCroGaLoading] = useState(false);

  /* ── traffic fetch ── */
  useEffect(() => {
    if (activeTab === "traffic" && !trafficData && !trafficLoading) {
      setTrafficLoading(true);
      fetch("/api/super-admin/analytics")
        .then((r) => r.json())
        .then((data) => setTrafficData(data))
        .catch(() => setTrafficData({ configured: false }))
        .finally(() => setTrafficLoading(false));
    }
  }, [activeTab, trafficData, trafficLoading]);

  /* ── search console fetch ── */
  useEffect(() => {
    if (activeTab === "searchConsole" && !gscData && !gscLoading) {
      setGscLoading(true);
      fetch("/api/super-admin/search-console")
        .then((r) => r.json())
        .then((data) => setGscData(data))
        .catch(() => setGscData({ configured: false }))
        .finally(() => setGscLoading(false));
    }
  }, [activeTab, gscData, gscLoading]);

  /* ── CRO GA4 data fetch (reuses analytics API) ── */
  useEffect(() => {
    if (activeTab === "cro" && !croGaData && !croGaLoading) {
      setCroGaLoading(true);
      fetch("/api/super-admin/analytics")
        .then((r) => r.json())
        .then((data) => setCroGaData(data))
        .catch(() => setCroGaData({ configured: false }))
        .finally(() => setCroGaLoading(false));
    }
  }, [activeTab, croGaData, croGaLoading]);

  /* ── copy handlers ── */
  const handleCopy = useCallback(async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const filteredRecs =
    filterCategory === "all"
      ? recommendations
      : recommendations.filter((r) => r.category === filterCategory);

  const handleCopyAll = useCallback(async () => {
    const allText = filteredRecs
      .map(
        (r) =>
          `[${r.severity.toUpperCase()}] ${r.title}\n${r.description}\n${r.actionText}`
      )
      .join("\n\n");
    await navigator.clipboard.writeText(allText);
    setCopiedId("all");
    setTimeout(() => setCopiedId(null), 2000);
  }, [filteredRecs]);

  /* ── add keyword handler ── */
  async function handleAddKeyword(e: React.FormEvent) {
    e.preventDefault();
    if (!kwKeyword.trim()) return;

    setSaving(true);
    setFormError("");

    try {
      const res = await fetch("/api/super-admin/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: kwKeyword.trim(),
          search_volume: kwVolume ? parseInt(kwVolume) : null,
          difficulty: kwDifficulty ? parseInt(kwDifficulty) : null,
          intent: kwIntent,
          target_url: kwTargetUrl.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || t("failedSave"));
        return;
      }

      setKwKeyword("");
      setKwVolume("");
      setKwDifficulty("");
      setKwIntent("informational");
      setKwTargetUrl("");
      setShowAddKeyword(false);
      router.refresh();
    } catch {
      setFormError(t("networkError"));
    } finally {
      setSaving(false);
    }
  }

  /* ── add A/B test handler ── */
  async function handleAddAbTest(e: React.FormEvent) {
    e.preventDefault();
    if (!croTestName.trim()) return;

    setCroSaving(true);
    setCroFormError("");

    try {
      const res = await fetch("/api/super-admin/cro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test_name: croTestName.trim(),
          page_url: croPageUrl.trim() || null,
          variant_a_name: croVariantA.trim() || "Control",
          variant_b_name: croVariantB.trim() || "Variant B",
          metric_name: croMetricName.trim() || "Conversion Rate",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setCroFormError(data.error || "Failed to save");
        return;
      }

      setCroTestName("");
      setCroPageUrl("");
      setCroVariantA("Control");
      setCroVariantB("Variant B");
      setCroMetricName("Conversion Rate");
      setShowAddAbTest(false);
      router.refresh();
    } catch {
      setCroFormError("Network error");
    } finally {
      setCroSaving(false);
    }
  }

  /* ── derived data ── */
  const sortedRecs = [...filteredRecs].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  const criticalCount = recommendations.filter(
    (r) => r.severity === "critical"
  ).length;
  const warningCount = recommendations.filter(
    (r) => r.severity === "warning"
  ).length;
  const infoCount = recommendations.filter(
    (r) => r.severity === "info"
  ).length;

  const recCategories = Array.from(
    new Set(recommendations.map((r) => r.category))
  );

  const technicalPassCount = technical.filter(
    (c) => c.status === "pass"
  ).length;
  const technicalTotalChecks = technical.length;

  /* ─────────────────────────────────────────
     RENDER
     ───────────────────────────────────────── */
  return (
    <>
      {/* Header */}
      <div className="admin-header">
        <div>
          <h2>{t("seoTitle")}</h2>
          <p className="admin-header-sub">{t("seoDesc")}</p>
        </div>
        <div className="admin-header-actions">
          <button
            className="sa-action-btn primary"
            onClick={() => setShowAddKeyword(true)}
          >
            <Plus size={14} /> {t("addKeyword")}
          </button>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="settings-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`settings-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon size={14} />
            {t(tab.label)}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="settings-tab-panel">
        {/* ════════════════════════════════════
           TAB 1 - OVERVIEW
           ════════════════════════════════════ */}
        {activeTab === "overview" && (
          <>
            {/* KPI cards */}
            <div className="sa-kpi-grid">
              <div className="sa-kpi-card">
                <div className="sa-kpi-info">
                  <span className="sa-kpi-label">{t("seoScore")}</span>
                  <span
                    className="sa-kpi-value"
                    style={{ color: getScoreColor(overview.seoScore) }}
                  >
                    {overview.seoScore}
                  </span>
                </div>
                <div className="sa-kpi-icon">
                  <BarChart3 size={20} />
                </div>
              </div>

              <div className="sa-kpi-card">
                <div className="sa-kpi-info">
                  <span className="sa-kpi-label">{t("seoPublishedPages")}</span>
                  <span className="sa-kpi-value">
                    {overview.publishedPages}{" "}
                    <small style={{ color: "var(--muted)", fontWeight: 400 }}>
                      / {overview.totalPages}
                    </small>
                  </span>
                </div>
                <div className="sa-kpi-icon">
                  <FileText size={20} />
                </div>
              </div>

              <div className="sa-kpi-card">
                <div className="sa-kpi-info">
                  <span className="sa-kpi-label">
                    {t("seoKeywordsTracked")}
                  </span>
                  <span className="sa-kpi-value">
                    {overview.keywordsTracked}
                  </span>
                </div>
                <div className="sa-kpi-icon">
                  <Search size={20} />
                </div>
              </div>

              <div className="sa-kpi-card">
                <div className="sa-kpi-info">
                  <span className="sa-kpi-label">{t("seoAvgPosition")}</span>
                  <span className="sa-kpi-value">
                    {overview.avgPosition > 0
                      ? overview.avgPosition.toFixed(1)
                      : "-"}
                  </span>
                </div>
                <div className="sa-kpi-icon">
                  <TrendingUp size={20} />
                </div>
              </div>

            </div>

            {/* Charts: position distribution + intent pie */}
            <div className="sa-two-col">
              <div className="sa-card">
                <div className="sa-card-title">
                  {t("seoPositionDistribution")}
                </div>
                {positionData.length > 0 ? (
                  <div className="seo-chart-wrap">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={positionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="bucket" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="sa-empty">
                    <div className="sa-empty-title">
                      {t("seoNoPositionData")}
                    </div>
                    <div className="sa-empty-desc">
                      {t("seoNoPositionDataDesc")}
                    </div>
                  </div>
                )}
              </div>

              <div className="sa-card">
                <div className="sa-card-title">
                  {t("seoKeywordsByIntent")}
                </div>
                {intentData.length > 0 ? (
                  <div className="seo-chart-wrap">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={intentData}
                          dataKey="count"
                          nameKey="intent"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                          label={((entry: any) => `${entry.name ?? ""} (${entry.value ?? 0})`) as any}
                        >
                          {intentData.map((_, i) => (
                            <Cell
                              key={i}
                              fill={PIE_COLORS[i % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="sa-empty">
                    <div className="sa-empty-title">
                      {t("seoNoIntentData")}
                    </div>
                    <div className="sa-empty-desc">
                      {t("seoNoIntentDataDesc")}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top keywords table */}
            <div className="sa-card">
              <div className="sa-card-title">{t("seoTopKeywords")}</div>
              <div className="sa-table-wrap">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>{t("keyword")}</th>
                      <th>{t("volume")}</th>
                      <th>{t("position")}</th>
                      <th>{t("trend")}</th>
                      <th>{t("difficulty")}</th>
                      <th>{t("intent")}</th>
                      <th>{t("targetUrl")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          style={{
                            textAlign: "center",
                            padding: "40px",
                            color: "var(--muted)",
                          }}
                        >
                          {t("noKeywordsYet")}
                        </td>
                      </tr>
                    ) : (
                      keywords.slice(0, 10).map((k) => {
                        const trend = getPositionTrend(
                          k.current_position,
                          k.previous_position
                        );
                        return (
                          <tr key={k.id}>
                            <td style={{ fontWeight: 500 }}>{k.keyword}</td>
                            <td>
                              {k.search_volume?.toLocaleString(dateLocale) ??
                                "-"}
                            </td>
                            <td style={{ fontWeight: 600 }}>
                              {k.current_position ?? "-"}
                            </td>
                            <td>
                              {trend === "up" && (
                                <span
                                  style={{
                                    color: "var(--color-green)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "3px",
                                  }}
                                >
                                  <ArrowUp size={14} /> +
                                  {(k.previous_position ?? 0) -
                                    (k.current_position ?? 0)}
                                </span>
                              )}
                              {trend === "down" && (
                                <span
                                  style={{
                                    color: "var(--color-red)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "3px",
                                  }}
                                >
                                  <ArrowDown size={14} /> -
                                  {(k.current_position ?? 0) -
                                    (k.previous_position ?? 0)}
                                </span>
                              )}
                              {trend === "neutral" && (
                                <span
                                  style={{
                                    color: "var(--muted)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "3px",
                                  }}
                                >
                                  <MinusIcon size={14} /> 0
                                </span>
                              )}
                              {trend === null && (
                                <span style={{ color: "var(--muted)" }}>-</span>
                              )}
                            </td>
                            <td>
                              {k.difficulty != null ? (
                                <span
                                  style={{
                                    color:
                                      k.difficulty > 70
                                        ? "var(--color-red)"
                                        : k.difficulty > 40
                                          ? "var(--color-amber)"
                                          : "var(--color-green)",
                                    fontWeight: 600,
                                  }}
                                >
                                  {k.difficulty}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td>
                              {k.intent ? (
                                <span
                                  className={`sa-badge ${getIntentBadgeClass(k.intent)}`}
                                  style={{ textTransform: "capitalize" }}
                                >
                                  {k.intent}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td
                              style={{
                                color: "var(--muted)",
                                fontSize: "0.8rem",
                                maxWidth: "200px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {k.target_url || "-"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Issues */}
            {recommendations.filter((r) => r.severity === "critical").length >
              0 && (
              <div className="sa-card">
                <div className="sa-card-title">{t("seoQuickIssues")}</div>
                {recommendations
                  .filter((r) => r.severity === "critical")
                  .slice(0, 5)
                  .map((rec) => (
                    <div
                      key={rec.id}
                      className="seo-rec-card"
                      data-severity="critical"
                    >
                      <div className="seo-rec-header">
                        <span className="seo-rec-severity critical">
                          <XCircle size={14} />
                          {rec.severity}
                        </span>
                        <span className="seo-rec-category">{rec.category}</span>
                      </div>
                      <div className="seo-rec-title">{rec.title}</div>
                      <div className="seo-rec-desc">{rec.description}</div>
                    </div>
                  ))}
                <button
                  className="sa-view-all"
                  onClick={() => setActiveTab("recommendations")}
                >
                  {t("seoViewAll")}
                </button>
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════
           TAB 2 - PAGES
           ════════════════════════════════════ */}
        {activeTab === "pages" && (
          <div className="sa-card">
            <div className="sa-card-title">{t("seoPagesAudit")}</div>
            {pages.length === 0 ? (
              <div className="sa-empty">
                <div className="sa-empty-title">{t("seoNoPages")}</div>
                <div className="sa-empty-desc">{t("seoNoPagesDesc")}</div>
              </div>
            ) : (
              <div className="sa-table-wrap">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>{t("seoPage")}</th>
                      <th>{t("seoSlug")}</th>
                      <th>{t("seoMetaTitle")}</th>
                      <th>{t("seoMetaDesc")}</th>
                      <th>{t("seoOgImage")}</th>
                      <th>{t("seoStatus")}</th>
                      <th>{t("seoIssues")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pages.map((page) => (
                      <tr key={page.id}>
                        <td style={{ fontWeight: 500 }}>{page.title}</td>
                        <td style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                          {page.slug}
                        </td>
                        <td>
                          <div className="seo-length-bar">
                            <div
                              className="seo-length-bar-fill"
                              style={{
                                width: `${Math.min((page.metaTitleLength / 70) * 100, 100)}%`,
                                backgroundColor: getLengthColor(
                                  page.metaTitleLength,
                                  50,
                                  60
                                ),
                              }}
                            />
                            <span className="seo-length-bar-label">
                              {page.metaTitleLength}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="seo-length-bar">
                            <div
                              className="seo-length-bar-fill"
                              style={{
                                width: `${Math.min((page.metaDescLength / 200) * 100, 100)}%`,
                                backgroundColor: getLengthColor(
                                  page.metaDescLength,
                                  120,
                                  160
                                ),
                              }}
                            />
                            <span className="seo-length-bar-label">
                              {page.metaDescLength}
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {page.hasOgImage ? (
                            <CheckCircle
                              size={16}
                              style={{ color: "var(--color-green)" }}
                            />
                          ) : (
                            <XCircle
                              size={16}
                              style={{ color: "var(--color-red)" }}
                            />
                          )}
                        </td>
                        <td>
                          <span
                            className={`sa-badge ${page.status === "published" ? "sa-badge-green" : "sa-badge-amber"}`}
                          >
                            {page.status}
                          </span>
                        </td>
                        <td>
                          {page.issueCount > 0 ? (
                            <span className="sa-badge sa-badge-red">
                              {page.issueCount}
                            </span>
                          ) : (
                            <span className="sa-badge sa-badge-green">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════
           TAB 3 - TECHNICAL
           ════════════════════════════════════ */}
        {activeTab === "technical" && (
          <>
            {/* Overall technical score */}
            <div className="sa-card">
              <div className="sa-card-title">{t("seoTechnicalScore")}</div>
              <div className="seo-tech-score-bar">
                <div className="seo-tech-score-label">
                  {technicalPassCount} / {technical.length}{" "}
                  {t("seoChecksPassed")}
                </div>
                <div className="seo-tech-score-track">
                  <div
                    className="seo-tech-score-fill"
                    style={{
                      width:
                        technical.length > 0
                          ? `${(technicalPassCount / technical.length) * 100}%`
                          : "0%",
                      backgroundColor:
                        technical.length > 0 &&
                        technicalPassCount / technical.length > 0.8
                          ? "var(--color-green)"
                          : technicalPassCount / technical.length > 0.5
                            ? "var(--color-amber)"
                            : "var(--color-red)",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Check cards grid */}
            {technical.length === 0 ? (
              <div className="sa-empty">
                <div className="sa-empty-title">{t("seoNoTechnicalChecks")}</div>
                <div className="sa-empty-desc">
                  {t("seoNoTechnicalChecksDesc")}
                </div>
              </div>
            ) : (
              <div className="seo-checks-grid">
                {technical.map((check, idx) => (
                  <div
                    key={idx}
                    className="seo-check-card"
                    data-status={check.status}
                  >
                    <div className="seo-check-header">
                      {check.status === "pass" ? (
                        <CheckCircle
                          size={18}
                          style={{ color: "var(--color-green)" }}
                        />
                      ) : check.status === "warning" ? (
                        <AlertTriangle
                          size={18}
                          style={{ color: "var(--color-amber)" }}
                        />
                      ) : (
                        <XCircle
                          size={18}
                          style={{ color: "var(--color-red)" }}
                        />
                      )}
                      <span className="seo-check-name">{check.check}</span>
                    </div>
                    <div className="seo-check-desc">{check.description}</div>
                    <div className="seo-check-progress">
                      <span className="seo-check-count">
                        {check.count} / {check.total}
                      </span>
                      <div className="seo-check-bar">
                        <div
                          className="seo-check-bar-fill"
                          style={{
                            width:
                              check.total > 0
                                ? `${(check.count / check.total) * 100}%`
                                : "0%",
                            backgroundColor:
                              check.status === "pass"
                                ? "var(--color-green)"
                                : check.status === "warning"
                                  ? "var(--color-amber)"
                                  : "var(--color-red)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════
           TAB 4 - CONTENT
           ════════════════════════════════════ */}
        {activeTab === "content" && (
          <div className="sa-card">
            <div className="sa-card-title">{t("seoContentAnalysis")}</div>
            {content.length === 0 ? (
              <div className="sa-empty">
                <div className="sa-empty-title">{t("seoNoContent")}</div>
                <div className="sa-empty-desc">{t("seoNoContentDesc")}</div>
              </div>
            ) : (
              <div className="sa-table-wrap">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>{t("seoPage")}</th>
                      <th>{t("seoSections")}</th>
                      <th>{t("seoWordCount")}</th>
                      <th>{t("seoFreshness")}</th>
                      <th>{t("seoEmptySections")}</th>
                      <th>{t("seoQuality")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.map((item) => {
                      const quality = getContentQuality(
                        item.estimatedWordCount,
                        item.emptyOrHiddenSections
                      );
                      return (
                        <tr key={item.id}>
                          <td>
                            <div style={{ fontWeight: 500 }}>
                              {item.title}
                            </div>
                            <div
                              style={{
                                fontSize: "0.8rem",
                                color: "var(--muted)",
                              }}
                            >
                              {item.slug}
                            </div>
                          </td>
                          <td>{item.sectionCount}</td>
                          <td>
                            <div className="seo-length-bar">
                              <div
                                className="seo-length-bar-fill"
                                style={{
                                  width: `${Math.min((item.estimatedWordCount / 1000) * 100, 100)}%`,
                                  backgroundColor:
                                    item.estimatedWordCount > 300
                                      ? "var(--color-green)"
                                      : item.estimatedWordCount > 100
                                        ? "var(--color-amber)"
                                        : "var(--color-red)",
                                }}
                              />
                              <span className="seo-length-bar-label">
                                {item.estimatedWordCount.toLocaleString(dateLocale)}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`sa-badge ${getFreshnessColor(item.contentFreshness)}`}
                            >
                              {t(`seoFreshness_${item.contentFreshness}`)}
                            </span>
                          </td>
                          <td>
                            {item.emptyOrHiddenSections > 0 ? (
                              <span className="sa-badge sa-badge-red">
                                {item.emptyOrHiddenSections}
                              </span>
                            ) : (
                              <span className="sa-badge sa-badge-green">0</span>
                            )}
                          </td>
                          <td>
                            <span
                              className={`sa-badge ${quality.badgeClass}`}
                            >
                              {t(`seoQuality_${quality.label}`)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════
           TAB 5 - TRAFFIC (GA4)
           ════════════════════════════════════ */}
        {activeTab === "traffic" && (
          <>
            {trafficLoading && (
              <div className="sa-empty">
                <div className="seo-spinner" />
                <div className="sa-empty-title">{t("seoLoadingTraffic")}</div>
              </div>
            )}

            {!trafficLoading && trafficData?.error && (
              <div className="sa-empty">
                <AlertTriangle size={40} style={{ color: "var(--color-amber)" }} />
                <div className="sa-empty-title">{t("seoAnalyticsError")}</div>
                <div className="sa-empty-desc">{trafficData.error}</div>
              </div>
            )}

            {!trafficLoading && !trafficData?.error && trafficData?.configured === false && (
              <div className="sa-empty">
                <TrendingUp size={40} style={{ color: "var(--muted)" }} />
                <div className="sa-empty-title">{t("seoConfigureGA")}</div>
                <div className="sa-empty-desc">
                  {t("seoConfigureGADesc")}
                  <br />
                  <code style={{ fontSize: "0.85rem" }}>G-0H7BPGBQD8</code>
                </div>
                <a
                  href="/super-admin/stripe-settings"
                  className="sa-action-btn primary"
                  style={{ marginTop: "12px", display: "inline-flex" }}
                >
                  <Settings size={14} /> {t("seoConfigureSettings")}
                </a>
              </div>
            )}

            {!trafficLoading &&
              trafficData &&
              !trafficData.error &&
              trafficData.configured !== false && (
                <>
                  {/* KPI cards */}
                  <div className="sa-kpi-grid">
                    <div className="sa-kpi-card">
                      <div className="sa-kpi-info">
                        <span className="sa-kpi-label">
                          {t("seoPageViews")}
                        </span>
                        <span className="sa-kpi-value">
                          {(trafficData.pageViews ?? 0).toLocaleString(
                            dateLocale
                          )}
                        </span>
                      </div>
                      <div className="sa-kpi-icon">
                        <Eye size={20} />
                      </div>
                    </div>

                    <div className="sa-kpi-card">
                      <div className="sa-kpi-info">
                        <span className="sa-kpi-label">
                          {t("seoSessions")}
                        </span>
                        <span className="sa-kpi-value">
                          {(trafficData.sessions ?? 0).toLocaleString(
                            dateLocale
                          )}
                        </span>
                      </div>
                      <div className="sa-kpi-icon">
                        <MousePointer size={20} />
                      </div>
                    </div>

                    <div className="sa-kpi-card">
                      <div className="sa-kpi-info">
                        <span className="sa-kpi-label">{t("seoUsers")}</span>
                        <span className="sa-kpi-value">
                          {(trafficData.users ?? 0).toLocaleString(dateLocale)}
                        </span>
                      </div>
                      <div className="sa-kpi-icon">
                        <Globe size={20} />
                      </div>
                    </div>

                    <div className="sa-kpi-card">
                      <div className="sa-kpi-info">
                        <span className="sa-kpi-label">
                          {t("seoAvgSessionDuration")}
                        </span>
                        <span className="sa-kpi-value">
                          {trafficData.avgSessionDuration ?? "-"}
                        </span>
                      </div>
                      <div className="sa-kpi-icon">
                        <Clock size={20} />
                      </div>
                    </div>
                  </div>

                  {/* Daily traffic line chart */}
                  <div className="sa-card">
                    <div className="sa-card-title">
                      {t("seoDailyTraffic")}
                    </div>
                    {trafficData.daily && trafficData.daily.length > 0 ? (
                      <div className="seo-chart-wrap">
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={trafficData.daily}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis
                              dataKey="date"
                              tick={{ fill: "var(--muted)", fontSize: 11 }}
                              tickFormatter={(v: string) => {
                                if (!v || v.length < 8) return v;
                                const y = v.slice(0, 4);
                                const m = v.slice(4, 6);
                                const d = v.slice(6, 8);
                                return new Date(`${y}-${m}-${d}`).toLocaleDateString(dateLocale, { month: "short", day: "numeric" });
                              }}
                            />
                            <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} />
                            <Tooltip
                              contentStyle={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "0.8rem" }}
                              labelFormatter={(v) => {
                                const s = String(v);
                                if (!s || s.length < 8) return s;
                                const y = s.slice(0, 4);
                                const m = s.slice(4, 6);
                                const d = s.slice(6, 8);
                                return new Date(`${y}-${m}-${d}`).toLocaleDateString(dateLocale, { month: "long", day: "numeric", year: "numeric" });
                              }}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="pageViews"
                              stroke={CHART_COLORS[0]}
                              name={t("seoPageViews")}
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="sessions"
                              stroke={CHART_COLORS[1]}
                              name={t("seoSessions")}
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="sa-empty" style={{ padding: "40px 0" }}>
                        <TrendingUp size={32} style={{ color: "var(--muted)" }} />
                        <div className="sa-empty-title">No traffic data yet</div>
                        <div className="sa-empty-desc">Daily page views and sessions will appear here as your site receives traffic.</div>
                      </div>
                    )}
                  </div>

                  <div className="sa-two-col">
                    {/* Top pages table */}
                    <div className="sa-card">
                      <div className="sa-card-title">
                        {t("seoTopPages")}
                      </div>
                      {trafficData.topPages && trafficData.topPages.length > 0 ? (
                        <div className="sa-table-wrap">
                          <table className="sa-table">
                            <thead>
                              <tr>
                                <th>{t("seoPath")}</th>
                                <th>{t("seoViews")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {trafficData.topPages.map(
                                (
                                  page: { path: string; views: number },
                                  i: number
                                ) => (
                                  <tr key={i}>
                                    <td
                                      style={{
                                        fontWeight: 500,
                                        fontSize: "0.85rem",
                                      }}
                                    >
                                      {page.path}
                                    </td>
                                    <td>
                                      {page.views.toLocaleString(dateLocale)}
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="sa-empty" style={{ padding: "32px 0" }}>
                          <FileText size={28} style={{ color: "var(--muted)" }} />
                          <div className="sa-empty-title">No page data yet</div>
                          <div className="sa-empty-desc">Top pages by views will appear here.</div>
                        </div>
                      )}
                    </div>

                    {/* Traffic sources donut chart */}
                    <div className="sa-card">
                      <div className="sa-card-title">
                        {t("seoTrafficSources")}
                      </div>
                      {trafficData.sources && trafficData.sources.length > 0 ? (
                        <div className="seo-chart-wrap">
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={trafficData.sources}
                                dataKey="sessions"
                                nameKey="source"
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={2}
                                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                label={((entry: any) => `${entry.source ?? ""} ${((entry.percent ?? 0) * 100).toFixed(0)}%`) as any}
                                labelLine={false}
                              >
                                {trafficData.sources.map((_: unknown, i: number) => (
                                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "0.8rem" }}
                                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                formatter={(value: any) => [Number(value).toLocaleString(dateLocale), "Sessions"]}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="sa-empty" style={{ padding: "32px 0" }}>
                          <BarChart3 size={28} style={{ color: "var(--muted)" }} />
                          <div className="sa-empty-title">No source data yet</div>
                          <div className="sa-empty-desc">Traffic sources (organic, direct, referral) will appear here.</div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
          </>
        )}

        {/* ════════════════════════════════════
           TAB 6 - GEO
           ════════════════════════════════════ */}
        {activeTab === "geo" && (
          <>
            {geoScores.pageScores.length === 0 ? (
              <div className="sa-empty">
                <Globe size={40} style={{ color: "var(--muted)" }} />
                <div className="sa-empty-title">{t("geoNoData")}</div>
                <div className="sa-empty-desc">{t("geoNoDataDesc")}</div>
              </div>
            ) : (
              <>
                {/* Overall GEO Score + Radar Chart */}
                <div className="sa-two-col">
                  {/* Overall Score Card */}
                  <div className="sa-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                    <div className="sa-card-title" style={{ margin: 0 }}>
                      <Globe size={18} /> {t("geoOverallScore")}
                    </div>
                    <div
                      className="aeo-score-circle"
                      style={{
                        borderColor: geoScores.overallScore >= 70 ? "var(--color-green)" : geoScores.overallScore >= 40 ? "var(--color-amber)" : "var(--color-red)",
                      }}
                    >
                      <span className="aeo-score-number" style={{
                        color: geoScores.overallScore >= 70 ? "var(--color-green)" : geoScores.overallScore >= 40 ? "var(--color-amber)" : "var(--color-red)",
                      }}>
                        {geoScores.overallScore}
                      </span>
                      <span className="aeo-score-label">/100</span>
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--muted)", textAlign: "center" }}>
                      {geoScores.overallScore >= 70
                        ? t("geoScoreExcellent")
                        : geoScores.overallScore >= 40
                          ? t("geoScoreGood")
                          : t("geoScorePoor")}
                    </div>

                    {/* Dimension score bars */}
                    <div style={{ width: "100%", marginTop: 8 }}>
                      {geoScores.dimensionAverages.map((dim) => (
                        <div key={dim.dimension} className="aeo-dim-bar-row">
                          <span className="aeo-dim-bar-label">{dim.dimension}</span>
                          <div className="aeo-dim-bar-track">
                            <div
                              className="aeo-dim-bar-fill"
                              style={{
                                width: `${dim.score}%`,
                                background: dim.score >= 70 ? "var(--color-green)" : dim.score >= 40 ? "var(--color-amber)" : "var(--color-red)",
                              }}
                            />
                          </div>
                          <span className="aeo-dim-bar-value">{dim.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Radar Chart */}
                  <div className="sa-card">
                    <div className="sa-card-title">{t("geoRadarTitle")}</div>
                    <div className="seo-chart-wrap">
                      <ResponsiveContainer width="100%" height={320}>
                        <RadarChart
                          data={geoScores.dimensionAverages.map((d) => ({
                            dimension: d.dimension.replace("Topical Authority", "Authority").replace("Source Credibility", "Credibility").replace("Content Freshness", "Freshness").replace("Semantic Clarity", "Clarity").replace("AI Discoverability", "Discoverability"),
                            score: d.score,
                            fullMark: 100,
                          }))}
                        >
                          <PolarGrid stroke="var(--border)" />
                          <PolarAngleAxis
                            dataKey="dimension"
                            tick={{ fill: "var(--muted)", fontSize: 11 }}
                          />
                          <PolarRadiusAxis
                            angle={30}
                            domain={[0, 100]}
                            tick={{ fill: "var(--muted)", fontSize: 10 }}
                          />
                          <Radar
                            name="GEO Score"
                            dataKey="score"
                            stroke="#06b6d4"
                            fill="#06b6d4"
                            fillOpacity={0.2}
                            strokeWidth={2}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "var(--bg)",
                              border: "1px solid var(--border)",
                              borderRadius: "8px",
                              fontSize: "0.8rem",
                            }}
                            formatter={(value: any) => [`${value}/100`, "Score"]}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Page Scores Table */}
                <div className="sa-card">
                  <div className="sa-card-title">{t("geoPageScores")}</div>
                  <div className="sa-table-wrap">
                    <table className="sa-table">
                      <thead>
                        <tr>
                          <th>{t("seoPage")}</th>
                          <th style={{ textAlign: "center" }}>{t("geoScore")}</th>
                          <th style={{ textAlign: "center" }}>Citability</th>
                          <th style={{ textAlign: "center" }}>Authority</th>
                          <th style={{ textAlign: "center" }}>Credibility</th>
                          <th style={{ textAlign: "center" }}>Freshness</th>
                          <th style={{ textAlign: "center" }}>Clarity</th>
                          <th style={{ textAlign: "center" }}>Discoverability</th>
                        </tr>
                      </thead>
                      <tbody>
                        {geoScores.pageScores
                          .sort((a, b) => b.overallScore - a.overallScore)
                          .map((page) => (
                          <tr key={page.pageId}>
                            <td style={{ fontWeight: 500 }}>
                              <div>{page.title}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>/{page.slug}</div>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span
                                className={`sa-badge ${
                                  page.overallScore >= 70
                                    ? "sa-badge-green"
                                    : page.overallScore >= 40
                                      ? "sa-badge-amber"
                                      : "sa-badge-red"
                                }`}
                                style={{ fontWeight: 700, fontSize: "0.82rem" }}
                              >
                                {page.overallScore}
                              </span>
                            </td>
                            {page.dimensions.map((dim) => (
                              <td key={dim.dimension} style={{ textAlign: "center" }}>
                                <span
                                  style={{
                                    color: dim.score >= 70 ? "var(--color-green)" : dim.score >= 40 ? "var(--color-amber)" : "var(--color-red)",
                                    fontWeight: 600,
                                    fontSize: "0.82rem",
                                  }}
                                  title={dim.details}
                                >
                                  {dim.score}
                                </span>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ════════════════════════════════════
           TAB 7 - SEARCH CONSOLE
           ════════════════════════════════════ */}
        {activeTab === "searchConsole" && (
          <>
            {gscLoading && (
              <div className="sa-empty">
                <div className="seo-spinner" />
                <div className="sa-empty-title">{t("seoLoadingGSC")}</div>
              </div>
            )}

            {!gscLoading && gscData?.configured === false && (
              <div className="sa-empty">
                <Search size={40} style={{ color: "var(--muted)" }} />
                <div className="sa-empty-title">{t("seoConfigureGSC")}</div>
                <div className="sa-empty-desc">
                  {t("seoConfigureGSCDesc")}
                </div>
                <a
                  href="/super-admin/stripe-settings"
                  className="sa-action-btn primary"
                  style={{ marginTop: "12px", display: "inline-flex" }}
                >
                  <Settings size={14} /> {t("seoConfigureSettings")}
                </a>
              </div>
            )}

            {!gscLoading && gscData && gscData.configured !== false && (
              <>
                {/* KPI cards */}
                <div className="sa-kpi-grid">
                  <div className="sa-kpi-card">
                    <div className="sa-kpi-info">
                      <span className="sa-kpi-label">
                        {t("seoTotalClicks")}
                      </span>
                      <span className="sa-kpi-value">
                        {(gscData.totalClicks ?? 0).toLocaleString(dateLocale)}
                      </span>
                    </div>
                    <div className="sa-kpi-icon">
                      <MousePointer size={20} />
                    </div>
                  </div>

                  <div className="sa-kpi-card">
                    <div className="sa-kpi-info">
                      <span className="sa-kpi-label">
                        {t("seoImpressions")}
                      </span>
                      <span className="sa-kpi-value">
                        {(gscData.impressions ?? 0).toLocaleString(dateLocale)}
                      </span>
                    </div>
                    <div className="sa-kpi-icon">
                      <Eye size={20} />
                    </div>
                  </div>

                  <div className="sa-kpi-card">
                    <div className="sa-kpi-info">
                      <span className="sa-kpi-label">{t("seoAvgCTR")}</span>
                      <span className="sa-kpi-value">
                        {gscData.avgCtr != null
                          ? `${(gscData.avgCtr * 100).toFixed(1)}%`
                          : "-"}
                      </span>
                    </div>
                    <div className="sa-kpi-icon">
                      <TrendingUp size={20} />
                    </div>
                  </div>

                  <div className="sa-kpi-card">
                    <div className="sa-kpi-info">
                      <span className="sa-kpi-label">
                        {t("seoAvgPositionGSC")}
                      </span>
                      <span className="sa-kpi-value">
                        {gscData.avgPosition != null
                          ? gscData.avgPosition.toFixed(1)
                          : "-"}
                      </span>
                    </div>
                    <div className="sa-kpi-icon">
                      <BarChart3 size={20} />
                    </div>
                  </div>
                </div>

                {/* Daily clicks + impressions line chart */}
                <div className="sa-card">
                  <div className="sa-card-title">
                    {t("seoDailySearchPerformance")}
                  </div>
                  {gscData.daily && gscData.daily.length > 0 ? (
                    <div className="seo-chart-wrap">
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={gscData.daily}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="clicks"
                            stroke={CHART_COLORS[0]}
                            name={t("seoClicks")}
                            strokeWidth={2}
                            dot={false}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="impressions"
                            stroke={CHART_COLORS[1]}
                            name={t("seoImpressions")}
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="sa-empty" style={{ padding: "40px 0" }}>
                      <Search size={32} style={{ color: "var(--muted)" }} />
                      <div className="sa-empty-title">No search data yet</div>
                      <div className="sa-empty-desc">Daily clicks and impressions will appear here as Google indexes your site.</div>
                    </div>
                  )}
                </div>

                <div className="sa-two-col">
                  {/* Top queries table */}
                  <div className="sa-card">
                    <div className="sa-card-title">
                      {t("seoTopQueries")}
                    </div>
                    {gscData.topQueries && gscData.topQueries.length > 0 ? (
                      <div className="sa-table-wrap">
                        <table className="sa-table">
                          <thead>
                            <tr>
                              <th>{t("seoQuery")}</th>
                              <th>{t("seoClicks")}</th>
                              <th>{t("seoImpressions")}</th>
                              <th>{t("seoCTR")}</th>
                              <th>{t("seoPosition")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gscData.topQueries.map(
                              (
                                q: {
                                  query: string;
                                  clicks: number;
                                  impressions: number;
                                  ctr: number;
                                  position: number;
                                },
                                i: number
                              ) => (
                                <tr key={i}>
                                  <td style={{ fontWeight: 500 }}>
                                    {q.query}
                                  </td>
                                  <td>
                                    {q.clicks.toLocaleString(dateLocale)}
                                  </td>
                                  <td>
                                    {q.impressions.toLocaleString(dateLocale)}
                                  </td>
                                  <td>{(q.ctr * 100).toFixed(1)}%</td>
                                  <td>{q.position.toFixed(1)}</td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="sa-empty" style={{ padding: "32px 0" }}>
                        <Search size={28} style={{ color: "var(--muted)" }} />
                        <div className="sa-empty-title">No queries yet</div>
                        <div className="sa-empty-desc">Top search queries will appear as your site gets impressions.</div>
                      </div>
                    )}
                  </div>

                  {/* Top pages table */}
                  <div className="sa-card">
                    <div className="sa-card-title">
                      {t("seoTopPages")}
                    </div>
                    {gscData.topPages && gscData.topPages.length > 0 ? (
                      <div className="sa-table-wrap">
                        <table className="sa-table">
                          <thead>
                            <tr>
                              <th>{t("seoPageUrl")}</th>
                              <th>{t("seoClicks")}</th>
                              <th>{t("seoImpressions")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gscData.topPages.map(
                              (
                                p: {
                                  page: string;
                                  clicks: number;
                                  impressions: number;
                                },
                                i: number
                              ) => (
                                <tr key={i}>
                                  <td
                                    style={{
                                      fontWeight: 500,
                                      fontSize: "0.85rem",
                                      maxWidth: "300px",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {p.page}
                                  </td>
                                  <td>
                                    {p.clicks.toLocaleString(dateLocale)}
                                  </td>
                                  <td>
                                    {p.impressions.toLocaleString(dateLocale)}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="sa-empty" style={{ padding: "32px 0" }}>
                        <FileText size={28} style={{ color: "var(--muted)" }} />
                        <div className="sa-empty-title">No page data yet</div>
                        <div className="sa-empty-desc">Top pages from search will appear here.</div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ════════════════════════════════════
           TAB 8 - AEO (Answer Engine Optimization)
           ════════════════════════════════════ */}
        {activeTab === "aeo" && (
          <>
            {aeoScores.pageScores.length === 0 ? (
              <div className="sa-empty">
                <Bot size={40} style={{ color: "var(--muted)" }} />
                <div className="sa-empty-title">{t("aeoNoData")}</div>
                <div className="sa-empty-desc">{t("aeoNoDataDesc")}</div>
              </div>
            ) : (
              <>
                {/* Overall AEO Score + Radar Chart */}
                <div className="sa-two-col">
                  {/* Overall Score Card */}
                  <div className="sa-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                    <div className="sa-card-title" style={{ margin: 0 }}>
                      <Bot size={18} /> {t("aeoOverallScore")}
                    </div>
                    <div
                      className="aeo-score-circle"
                      style={{
                        borderColor: aeoScores.overallScore >= 70 ? "var(--color-green)" : aeoScores.overallScore >= 40 ? "var(--color-amber)" : "var(--color-red)",
                      }}
                    >
                      <span className="aeo-score-number" style={{
                        color: aeoScores.overallScore >= 70 ? "var(--color-green)" : aeoScores.overallScore >= 40 ? "var(--color-amber)" : "var(--color-red)",
                      }}>
                        {aeoScores.overallScore}
                      </span>
                      <span className="aeo-score-label">/100</span>
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--muted)", textAlign: "center" }}>
                      {aeoScores.overallScore >= 70
                        ? t("aeoScoreExcellent")
                        : aeoScores.overallScore >= 40
                          ? t("aeoScoreGood")
                          : t("aeoScorePoor")}
                    </div>

                    {/* Dimension score bars */}
                    <div style={{ width: "100%", marginTop: 8 }}>
                      {aeoScores.dimensionAverages.map((dim) => (
                        <div key={dim.dimension} className="aeo-dim-bar-row">
                          <span className="aeo-dim-bar-label">{dim.dimension}</span>
                          <div className="aeo-dim-bar-track">
                            <div
                              className="aeo-dim-bar-fill"
                              style={{
                                width: `${dim.score}%`,
                                background: dim.score >= 70 ? "var(--color-green)" : dim.score >= 40 ? "var(--color-amber)" : "var(--color-red)",
                              }}
                            />
                          </div>
                          <span className="aeo-dim-bar-value">{dim.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Radar Chart */}
                  <div className="sa-card">
                    <div className="sa-card-title">{t("aeoRadarTitle")}</div>
                    <div className="seo-chart-wrap">
                      <ResponsiveContainer width="100%" height={320}>
                        <RadarChart
                          data={aeoScores.dimensionAverages.map((d) => ({
                            dimension: d.dimension.replace("AI Snippet Compatibility", "AI Snippets").replace("Direct Answer Readiness", "Direct Answers"),
                            score: d.score,
                            fullMark: 100,
                          }))}
                        >
                          <PolarGrid stroke="var(--border)" />
                          <PolarAngleAxis
                            dataKey="dimension"
                            tick={{ fill: "var(--muted)", fontSize: 11 }}
                          />
                          <PolarRadiusAxis
                            angle={30}
                            domain={[0, 100]}
                            tick={{ fill: "var(--muted)", fontSize: 10 }}
                          />
                          <Radar
                            name="AEO Score"
                            dataKey="score"
                            stroke="#8b5cf6"
                            fill="#8b5cf6"
                            fillOpacity={0.2}
                            strokeWidth={2}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "var(--bg)",
                              border: "1px solid var(--border)",
                              borderRadius: "8px",
                              fontSize: "0.8rem",
                            }}
                            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                            formatter={(value: any) => [`${value}/100`, "Score"]}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Page Scores Table */}
                <div className="sa-card">
                  <div className="sa-card-title">{t("aeoPageScores")}</div>
                  <div className="sa-table-wrap">
                    <table className="sa-table">
                      <thead>
                        <tr>
                          <th>{t("seoPage")}</th>
                          <th style={{ textAlign: "center" }}>{t("aeoScore")}</th>
                          <th style={{ textAlign: "center" }}>Schema</th>
                          <th style={{ textAlign: "center" }}>FAQ</th>
                          <th style={{ textAlign: "center" }}>Direct Ans.</th>
                          <th style={{ textAlign: "center" }}>Entity</th>
                          <th style={{ textAlign: "center" }}>Speakable</th>
                          <th style={{ textAlign: "center" }}>AI Snippet</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aeoScores.pageScores
                          .sort((a, b) => b.overallScore - a.overallScore)
                          .map((page) => (
                          <tr key={page.pageId}>
                            <td style={{ fontWeight: 500 }}>
                              <div>{page.title}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>/{page.slug}</div>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span
                                className={`sa-badge ${
                                  page.overallScore >= 70
                                    ? "sa-badge-green"
                                    : page.overallScore >= 40
                                      ? "sa-badge-amber"
                                      : "sa-badge-red"
                                }`}
                                style={{ fontWeight: 700, fontSize: "0.82rem" }}
                              >
                                {page.overallScore}
                              </span>
                            </td>
                            {page.dimensions.map((dim) => (
                              <td key={dim.dimension} style={{ textAlign: "center" }}>
                                <span
                                  style={{
                                    color: dim.score >= 70 ? "var(--color-green)" : dim.score >= 40 ? "var(--color-amber)" : "var(--color-red)",
                                    fontWeight: 600,
                                    fontSize: "0.82rem",
                                  }}
                                  title={dim.details}
                                >
                                  {dim.score}
                                </span>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ════════════════════════════════════
           TAB 9 - CRO (Conversion Rate Optimization)
           ════════════════════════════════════ */}
        {activeTab === "cro" && (
          <>
            {/* Sub-tabs */}
            <div className="seo-cro-subtabs">
              <button
                className={`seo-cro-subtab ${croSubTab === "funnel" ? "active" : ""}`}
                onClick={() => setCroSubTab("funnel")}
              >
                {t("croFunnel")}
              </button>
              <button
                className={`seo-cro-subtab ${croSubTab === "performance" ? "active" : ""}`}
                onClick={() => setCroSubTab("performance")}
              >
                {t("croPerformance")}
              </button>
              <button
                className={`seo-cro-subtab ${croSubTab === "abtests" ? "active" : ""}`}
                onClick={() => setCroSubTab("abtests")}
              >
                {t("croAbTests")}
              </button>
            </div>

            {/* ── Conversion Funnel ── */}
            {croSubTab === "funnel" && (
              <div className="sa-card">
                <div className="sa-card-title">{t("croFunnel")}</div>
                {croGaLoading ? (
                  <div className="sa-empty" style={{ padding: "40px 0" }}>
                    <div className="seo-spinner" />
                  </div>
                ) : !croGaData || !croGaData.configured ? (
                  <div className="sa-empty">
                    <TrendingUp size={40} style={{ color: "var(--muted)" }} />
                    <div className="sa-empty-title">{t("croNoFunnelData")}</div>
                    <div className="sa-empty-desc">{t("croNoFunnelDataDesc")}</div>
                  </div>
                ) : (() => {
                  const visitors = croGaData.users || 0;
                  const sessions = croGaData.sessions || 0;
                  const pageViews = croGaData.pageViews || 0;
                  const stages = [
                    { label: t("croVisitors"), value: visitors, color: "#3b82f6" },
                    { label: "Sessions", value: sessions, color: "#8b5cf6" },
                    { label: "Page Views", value: pageViews, color: "#22c55e" },
                  ];
                  const maxVal = Math.max(...stages.map((s) => s.value), 1);

                  return (
                    <div className="cro-funnel">
                      {stages.map((stage, idx) => (
                        <div key={stage.label}>
                          <div className="cro-funnel-stage">
                            <div className="cro-funnel-label">{stage.label}</div>
                            <div className="cro-funnel-bar-wrap">
                              <div
                                className="cro-funnel-bar"
                                style={{
                                  width: `${Math.max((stage.value / maxVal) * 100, 10)}%`,
                                  background: stage.color,
                                }}
                              >
                                {stage.value.toLocaleString()}
                              </div>
                            </div>
                            {idx > 0 && (
                              <div className="cro-funnel-rate">
                                {stages[idx - 1].value > 0
                                  ? `${((stage.value / stages[idx - 1].value) * 100).toFixed(1)}%`
                                  : "—"}
                              </div>
                            )}
                          </div>
                          {idx < stages.length - 1 && (
                            <div className="cro-funnel-arrow">▼</div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── Page Performance ── */}
            {croSubTab === "performance" && (
              <div className="sa-card">
                <div className="sa-card-title">{t("croPerformance")}</div>
                {croGaLoading ? (
                  <div className="sa-empty" style={{ padding: "40px 0" }}>
                    <div className="seo-spinner" />
                  </div>
                ) : (() => {
                  const publicPages = (croGaData.topPages || []).filter((p: any) =>
                    !p.path.startsWith("/super-admin") &&
                    !p.path.startsWith("/admin") &&
                    !p.path.startsWith("/dashboard") &&
                    !p.path.startsWith("/api/") &&
                    !p.path.startsWith("/(")
                  );
                  return !croGaData.configured || publicPages.length === 0 ? (
                    <div className="sa-empty">
                      <BarChart3 size={40} style={{ color: "var(--muted)" }} />
                      <div className="sa-empty-title">{t("croNoPageData")}</div>
                      <div className="sa-empty-desc">{t("croNoPageDataDesc")}</div>
                    </div>
                  ) : (
                    <div className="sa-table-wrap">
                      <table className="sa-table">
                        <thead>
                          <tr>
                            <th>{t("croPagePath")}</th>
                            <th>{t("croViews")}</th>
                            <th>{t("croPerformanceScore")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {publicPages.slice(0, 15).map((page: any, idx: number) => {
                            const views = page.views || 0;
                            const maxViews = publicPages[0]?.views || 1;
                            const ratio = views / maxViews;
                            const score = ratio > 0.5 ? "good" : ratio > 0.2 ? "fair" : "poor";
                            const badgeClass =
                              score === "good"
                                ? "sa-badge-green"
                                : score === "fair"
                                ? "sa-badge-amber"
                                : "sa-badge-red";
                            return (
                              <tr key={idx}>
                                <td style={{ fontWeight: 500, fontSize: "0.82rem" }}>
                                  {page.path}
                                </td>
                                <td>{views.toLocaleString()}</td>
                                <td>
                                  <span className={`sa-badge ${badgeClass}`}>{score}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── A/B Tests ── */}
            {croSubTab === "abtests" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div className="cro-kpi-row" style={{ marginBottom: 0, flex: 1 }}>
                    <div className="cro-kpi-item">
                      <div className="cro-kpi-value" style={{ color: "#3b82f6" }}>
                        {croOverview.runningCount}
                      </div>
                      <div className="cro-kpi-label">{t("croRunningTests")}</div>
                    </div>
                    <div className="cro-kpi-item">
                      <div className="cro-kpi-value" style={{ color: "#22c55e" }}>
                        {croOverview.completedCount}
                      </div>
                      <div className="cro-kpi-label">{t("croCompletedTests")}</div>
                    </div>
                  </div>
                  <button
                    className="sa-action-btn primary"
                    style={{ marginLeft: 16 }}
                    onClick={() => setShowAddAbTest(true)}
                  >
                    <Plus size={14} /> {t("croNewTest")}
                  </button>
                </div>

                {croOverview.abTests.length === 0 ? (
                  <div className="sa-empty">
                    <FlaskConical size={40} style={{ color: "var(--muted)" }} />
                    <div className="sa-empty-title">{t("croNoTests")}</div>
                    <div className="sa-empty-desc">{t("croNoTestsDesc")}</div>
                  </div>
                ) : (
                  <div>
                    {croOverview.abTests.map((test) => {
                      const rateA =
                        test.variant_a_visitors > 0
                          ? ((test.variant_a_conversions / test.variant_a_visitors) * 100).toFixed(1)
                          : "0.0";
                      const rateB =
                        test.variant_b_visitors > 0
                          ? ((test.variant_b_conversions / test.variant_b_visitors) * 100).toFixed(1)
                          : "0.0";
                      const sig = test.statistical_significance ?? 0;
                      const sigColor =
                        sig >= 95
                          ? "#22c55e"
                          : sig >= 80
                          ? "#f59e0b"
                          : "#ef4444";

                      return (
                        <div key={test.id} className="cro-test-card">
                          <div className="cro-test-header">
                            <div className="cro-test-name">{test.test_name}</div>
                            <div className="cro-test-meta">
                              {test.page_url && (
                                <span>{test.page_url}</span>
                              )}
                              <span className={`cro-status-badge ${test.status}`}>
                                {test.status === "running"
                                  ? t("croRunning")
                                  : test.status === "completed"
                                  ? t("croCompleted")
                                  : t("croPaused")}
                              </span>
                              {test.winner && test.winner !== "inconclusive" && (
                                <span className="sa-badge sa-badge-green">
                                  {t("croWinner")}: {test.winner === "A" ? test.variant_a_name : test.variant_b_name}
                                </span>
                              )}
                              {test.winner === "inconclusive" && (
                                <span className="sa-badge sa-badge-amber">
                                  {t("croInconclusive")}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="cro-test-variants">
                            <div className={`cro-variant-box ${test.winner === "A" ? "winner" : ""}`}>
                              <div className="cro-variant-label">{test.variant_a_name}</div>
                              <div className="cro-variant-rate">{rateA}%</div>
                              <div className="cro-variant-sample">
                                {test.variant_a_conversions} / {test.variant_a_visitors} {t("croConversions").toLowerCase()}
                              </div>
                            </div>
                            <div className={`cro-variant-box ${test.winner === "B" ? "winner" : ""}`}>
                              <div className="cro-variant-label">{test.variant_b_name}</div>
                              <div className="cro-variant-rate">{rateB}%</div>
                              <div className="cro-variant-sample">
                                {test.variant_b_conversions} / {test.variant_b_visitors} {t("croConversions").toLowerCase()}
                              </div>
                            </div>
                          </div>
                          <div className="cro-significance-wrap">
                            <div className="cro-significance-label">
                              <span>{t("croSignificance")}</span>
                              <span>{sig}%</span>
                            </div>
                            <div className="cro-significance-bar">
                              <div
                                className="cro-significance-fill"
                                style={{
                                  width: `${Math.min(sig, 100)}%`,
                                  background: sigColor,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ════════════════════════════════════
           TAB 10 - RECOMMENDATIONS
           ════════════════════════════════════ */}
        {activeTab === "recommendations" && (
          <>
            {/* Filter bar */}
            <div className="seo-rec-toolbar">
              <div className="seo-rec-filters">
                <select
                  className="invite-form-select"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  style={{ width: "auto", minWidth: "160px" }}
                >
                  <option value="all">{t("seoAllCategories")}</option>
                  {recCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <div className="seo-rec-severity-counts">
                  <span className="sa-badge sa-badge-red">
                    {criticalCount} {t("seoCritical")}
                  </span>
                  <span className="sa-badge sa-badge-amber">
                    {warningCount} {t("seoWarning")}
                  </span>
                  <span className="sa-badge sa-badge-blue">
                    {infoCount} {t("seoInfo")}
                  </span>
                </div>
              </div>

              <button
                className="sa-action-btn"
                onClick={handleCopyAll}
              >
                {copiedId === "all" ? (
                  <Check size={14} />
                ) : (
                  <Copy size={14} />
                )}
                {copiedId === "all" ? t("seoCopied") : t("seoCopyAll")}
              </button>
            </div>

            {/* Recommendation cards */}
            {sortedRecs.length === 0 ? (
              <div className="sa-empty">
                <CheckCircle
                  size={40}
                  style={{ color: "var(--color-green)" }}
                />
                <div className="sa-empty-title">
                  {t("seoNoRecommendations")}
                </div>
                <div className="sa-empty-desc">
                  {t("seoNoRecommendationsDesc")}
                </div>
              </div>
            ) : (
              <div className="seo-rec-list">
                {sortedRecs.map((rec) => (
                  <div
                    key={rec.id}
                    className="seo-rec-card"
                    data-severity={rec.severity}
                  >
                    <div className="seo-rec-header">
                      <span className={`seo-rec-severity ${rec.severity}`}>
                        {rec.severity === "critical" ? (
                          <XCircle size={14} />
                        ) : rec.severity === "warning" ? (
                          <AlertTriangle size={14} />
                        ) : (
                          <CheckCircle size={14} />
                        )}
                        {rec.severity}
                      </span>
                      <span className="seo-rec-category">{rec.category}</span>
                      <button
                        className="seo-rec-copy"
                        onClick={() => handleCopy(rec.id, rec.actionText)}
                      >
                        {copiedId === rec.id ? (
                          <Check size={14} />
                        ) : (
                          <Copy size={14} />
                        )}
                        {copiedId === rec.id ? t("seoCopied") : t("seoCopy")}
                      </button>
                    </div>
                    <div className="seo-rec-title">{rec.title}</div>
                    <div className="seo-rec-desc">{rec.description}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ════════════════════════════════════
         ADD KEYWORD MODAL
         ════════════════════════════════════ */}
      {showAddKeyword && (
        <>
          <div
            className="invite-modal-overlay"
            onClick={() => setShowAddKeyword(false)}
          />
          <div className="invite-modal">
            <button
              className="invite-modal-close"
              onClick={() => setShowAddKeyword(false)}
            >
              <X size={18} />
            </button>
            <div className="invite-modal-title">{t("addKeyword")}</div>
            <div className="invite-modal-desc">{t("trackKeywordDesc")}</div>

            {formError && <div className="invite-error">{formError}</div>}

            <form onSubmit={handleAddKeyword}>
              <div className="invite-form-group">
                <label className="invite-form-label">{t("keyword")}</label>
                <input
                  type="text"
                  className="invite-form-input"
                  placeholder={t("keywordPlaceholder")}
                  value={kwKeyword}
                  onChange={(e) => setKwKeyword(e.target.value)}
                  required
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div className="invite-form-group">
                  <label className="invite-form-label">
                    {t("searchVolume")}
                  </label>
                  <input
                    type="number"
                    className="invite-form-input"
                    placeholder={t("volumePlaceholder")}
                    value={kwVolume}
                    onChange={(e) => setKwVolume(e.target.value)}
                  />
                </div>
                <div className="invite-form-group">
                  <label className="invite-form-label">
                    {t("difficultyLabel")}
                  </label>
                  <input
                    type="number"
                    className="invite-form-input"
                    placeholder={t("difficultyPlaceholder")}
                    min="0"
                    max="100"
                    value={kwDifficulty}
                    onChange={(e) => setKwDifficulty(e.target.value)}
                  />
                </div>
              </div>
              <div className="invite-form-group">
                <label className="invite-form-label">{t("intent")}</label>
                <select
                  className="invite-form-select"
                  value={kwIntent}
                  onChange={(e) => setKwIntent(e.target.value)}
                >
                  <option value="informational">{t("informational")}</option>
                  <option value="commercial">{t("commercial")}</option>
                  <option value="transactional">{t("transactional")}</option>
                  <option value="navigational">{t("navigational")}</option>
                </select>
              </div>
              <div className="invite-form-group">
                <label className="invite-form-label">{t("targetUrl")}</label>
                <input
                  type="text"
                  className="invite-form-input"
                  placeholder={t("targetUrlPlaceholder")}
                  value={kwTargetUrl}
                  onChange={(e) => setKwTargetUrl(e.target.value)}
                />
              </div>
              <div className="invite-modal-footer">
                <button
                  type="button"
                  className="sa-action-btn"
                  onClick={() => setShowAddKeyword(false)}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="sa-action-btn primary"
                  disabled={saving}
                >
                  {saving ? t("adding") : t("addKeyword")}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ════════════════════════════════════
         ADD A/B TEST MODAL
         ════════════════════════════════════ */}
      {showAddAbTest && (
        <>
          <div
            className="invite-modal-overlay"
            onClick={() => setShowAddAbTest(false)}
          />
          <div className="invite-modal">
            <button
              className="invite-modal-close"
              onClick={() => setShowAddAbTest(false)}
            >
              <X size={18} />
            </button>
            <div className="invite-modal-title">{t("croAddTestTitle")}</div>

            {croFormError && <div className="invite-error">{croFormError}</div>}

            <form onSubmit={handleAddAbTest}>
              <div className="invite-form-group">
                <label className="invite-form-label">{t("croTestName")}</label>
                <input
                  type="text"
                  className="invite-form-input"
                  placeholder="e.g., Homepage CTA button color test"
                  value={croTestName}
                  onChange={(e) => setCroTestName(e.target.value)}
                  required
                />
              </div>
              <div className="invite-form-group">
                <label className="invite-form-label">{t("croPageUrl")}</label>
                <input
                  type="text"
                  className="invite-form-input"
                  placeholder="e.g., /pricing"
                  value={croPageUrl}
                  onChange={(e) => setCroPageUrl(e.target.value)}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div className="invite-form-group">
                  <label className="invite-form-label">{t("croVariantA")}</label>
                  <input
                    type="text"
                    className="invite-form-input"
                    value={croVariantA}
                    onChange={(e) => setCroVariantA(e.target.value)}
                  />
                </div>
                <div className="invite-form-group">
                  <label className="invite-form-label">{t("croVariantB")}</label>
                  <input
                    type="text"
                    className="invite-form-input"
                    value={croVariantB}
                    onChange={(e) => setCroVariantB(e.target.value)}
                  />
                </div>
              </div>
              <div className="invite-form-group">
                <label className="invite-form-label">{t("croMetricName")}</label>
                <input
                  type="text"
                  className="invite-form-input"
                  placeholder="e.g., Conversion Rate"
                  value={croMetricName}
                  onChange={(e) => setCroMetricName(e.target.value)}
                />
              </div>
              <div className="invite-modal-footer">
                <button
                  type="button"
                  className="sa-action-btn"
                  onClick={() => setShowAddAbTest(false)}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="sa-action-btn primary"
                  disabled={croSaving}
                >
                  {croSaving ? t("adding") : t("croNewTest")}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
