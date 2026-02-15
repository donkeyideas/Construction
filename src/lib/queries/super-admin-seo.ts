import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlatformSeoOverview {
  totalPages: number;
  publishedPages: number;
  keywordsTracked: number;
  avgPosition: number;
  seoScore: number; // 0-100
  criticalIssues: number;
  warningIssues: number;
}

export interface CmsPageAudit {
  id: string;
  title: string;
  slug: string;
  status: string;
  metaTitleLength: number;
  metaDescLength: number;
  hasOgImage: boolean;
  issueCount: number;
  updatedAt: string;
}

export interface TechnicalCheck {
  check: string;
  status: "pass" | "fail" | "warning";
  count: number;
  total: number;
  severity: "critical" | "warning" | "info";
  description: string;
}

export interface ContentAnalysisItem {
  id: string;
  title: string;
  slug: string;
  sectionCount: number;
  estimatedWordCount: number;
  emptyOrHiddenSections: number;
  contentFreshness: string; // "fresh" | "aging" | "stale"
  daysSinceUpdate: number;
}

export interface IntentGroup {
  intent: string;
  count: number;
}

export interface PositionBucket {
  bucket: string;
  count: number;
}

export interface GeoLocation {
  city: string;
  state: string;
  projectCount: number;
  propertyCount: number;
  totalValue: number;
}

export interface PlatformGeoPresence {
  locations: GeoLocation[];
  totalCities: number;
  totalStates: number;
  totalProjects: number;
  totalProperties: number;
  stateDistribution: { state: string; count: number }[];
}

export interface SeoRecommendation {
  id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  description: string;
  actionText: string;
}

// ---------------------------------------------------------------------------
// Internal row types
// ---------------------------------------------------------------------------

interface CmsPageRow {
  id: string;
  page_slug: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  status: string;
  published_at: string | null;
  sections: SectionItem[] | null;
  version: number | null;
  created_at: string;
  updated_at: string;
}

interface SectionItem {
  type?: string;
  content?: string;
  order?: number;
  visible?: boolean;
}

interface KeywordRow {
  id: string;
  keyword: string;
  search_volume: number | null;
  current_position: number | null;
  previous_position: number | null;
  difficulty: number | null;
  intent: string | null;
  target_url: string | null;
  tracked_since: string | null;
  last_checked: string | null;
}

const CMS_FIELDS =
  "id, page_slug, title, meta_title, meta_description, og_image_url, status, published_at, sections, version, created_at, updated_at";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysBetween(dateStr: string): number {
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

function freshness(daysSinceUpdate: number): "fresh" | "aging" | "stale" {
  if (daysSinceUpdate <= 90) return "fresh";
  if (daysSinceUpdate <= 180) return "aging";
  return "stale";
}

function estimateWordCount(sections: SectionItem[] | null): number {
  if (!sections || !Array.isArray(sections)) return 0;
  let totalChars = 0;
  for (const section of sections) {
    if (section.content && typeof section.content === "string") {
      totalChars += section.content.length;
    }
  }
  // Average word length ~5 characters
  return Math.round(totalChars / 5);
}

function countEmptyOrHidden(sections: SectionItem[] | null): number {
  if (!sections || !Array.isArray(sections)) return 0;
  let count = 0;
  for (const section of sections) {
    if (section.visible === false) {
      count++;
    } else if (!section.content || section.content.trim().length === 0) {
      count++;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// 1. getPlatformSeoOverview
// ---------------------------------------------------------------------------

export async function getPlatformSeoOverview(
  supabase: SupabaseClient
): Promise<PlatformSeoOverview> {
  const [pagesResult, keywordsResult] = await Promise.all([
    supabase.from("cms_pages").select(CMS_FIELDS),
    supabase.from("seo_keywords").select("id, current_position"),
  ]);

  const pages = (pagesResult.data ?? []) as CmsPageRow[];
  const keywords = (keywordsResult.data ?? []) as Pick<
    KeywordRow,
    "id" | "current_position"
  >[];

  const totalPages = pages.length;
  const publishedPages = pages.filter((p) => p.status === "published").length;
  const keywordsTracked = keywords.length;

  // Average position (only keywords with a current_position value)
  const withPosition = keywords.filter(
    (k) => k.current_position !== null && k.current_position !== undefined
  );
  const avgPosition =
    withPosition.length > 0
      ? Math.round(
          (withPosition.reduce(
            (s, k) => s + (k.current_position as number),
            0
          ) /
            withPosition.length) *
            10
        ) / 10
      : 0;

  // SEO Score - weighted coverage
  const hasMetaTitle = pages.filter(
    (p) => p.meta_title && p.meta_title.trim().length > 0
  ).length;
  const hasMetaDesc = pages.filter(
    (p) => p.meta_description && p.meta_description.trim().length > 0
  ).length;
  const hasOgImage = pages.filter(
    (p) => p.og_image_url && p.og_image_url.trim().length > 0
  ).length;

  const metaTitleCoverage = totalPages > 0 ? hasMetaTitle / totalPages : 1;
  const metaDescCoverage = totalPages > 0 ? hasMetaDesc / totalPages : 1;
  const ogImageCoverage = totalPages > 0 ? hasOgImage / totalPages : 1;

  const seoScore = Math.round(
    metaTitleCoverage * 40 + metaDescCoverage * 40 + ogImageCoverage * 20
  );

  // Critical issues: pages missing meta_title + pages missing meta_description
  const missingMetaTitle = totalPages - hasMetaTitle;
  const missingMetaDesc = totalPages - hasMetaDesc;
  const criticalIssues = missingMetaTitle + missingMetaDesc;

  // Warning issues: short/long meta titles and descriptions
  let warningIssues = 0;
  for (const page of pages) {
    const titleLen = page.meta_title?.trim().length ?? 0;
    const descLen = page.meta_description?.trim().length ?? 0;
    if (titleLen > 0 && (titleLen < 30 || titleLen > 60)) warningIssues++;
    if (descLen > 0 && (descLen < 70 || descLen > 160)) warningIssues++;
  }

  return {
    totalPages,
    publishedPages,
    keywordsTracked,
    avgPosition,
    seoScore,
    criticalIssues,
    warningIssues,
  };
}

// ---------------------------------------------------------------------------
// 2. getCmsPagesSeoAudit
// ---------------------------------------------------------------------------

export async function getCmsPagesSeoAudit(
  supabase: SupabaseClient
): Promise<CmsPageAudit[]> {
  const { data, error } = await supabase
    .from("cms_pages")
    .select(CMS_FIELDS)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getCmsPagesSeoAudit error:", error);
    return [];
  }

  const pages = (data ?? []) as CmsPageRow[];

  return pages.map((page) => {
    const metaTitleLength = page.meta_title?.trim().length ?? 0;
    const metaDescLength = page.meta_description?.trim().length ?? 0;
    const hasOgImage = !!(
      page.og_image_url && page.og_image_url.trim().length > 0
    );

    let issueCount = 0;
    if (metaTitleLength === 0) issueCount++;
    if (metaDescLength === 0) issueCount++;
    if (!hasOgImage) issueCount++;
    if (metaTitleLength > 0 && (metaTitleLength < 30 || metaTitleLength > 60))
      issueCount++;
    if (metaDescLength > 0 && (metaDescLength < 70 || metaDescLength > 160))
      issueCount++;

    return {
      id: page.id,
      title: page.title,
      slug: page.page_slug,
      status: page.status,
      metaTitleLength,
      metaDescLength,
      hasOgImage,
      issueCount,
      updatedAt: page.updated_at,
    };
  });
}

// ---------------------------------------------------------------------------
// 3. getTechnicalSeoChecks
// ---------------------------------------------------------------------------

export async function getTechnicalSeoChecks(
  supabase: SupabaseClient
): Promise<TechnicalCheck[]> {
  const { data, error } = await supabase.from("cms_pages").select(CMS_FIELDS);

  if (error) {
    console.error("getTechnicalSeoChecks error:", error);
    return [];
  }

  const pages = (data ?? []) as CmsPageRow[];
  const total = pages.length;
  if (total === 0) return [];

  const checks: TechnicalCheck[] = [];

  // 1. Meta Title Coverage
  const withMetaTitle = pages.filter(
    (p) => p.meta_title && p.meta_title.trim().length > 0
  ).length;
  const metaTitlePct = (withMetaTitle / total) * 100;
  checks.push({
    check: "Meta Title Coverage",
    status:
      metaTitlePct > 90 ? "pass" : metaTitlePct > 70 ? "warning" : "fail",
    count: withMetaTitle,
    total,
    severity:
      metaTitlePct > 90 ? "info" : metaTitlePct > 70 ? "warning" : "critical",
    description:
      metaTitlePct === 100
        ? "All pages have meta titles"
        : `${total - withMetaTitle} page(s) missing meta titles`,
  });

  // 2. Meta Description Coverage
  const withMetaDesc = pages.filter(
    (p) => p.meta_description && p.meta_description.trim().length > 0
  ).length;
  const metaDescPct = (withMetaDesc / total) * 100;
  checks.push({
    check: "Meta Description Coverage",
    status:
      metaDescPct > 90 ? "pass" : metaDescPct > 70 ? "warning" : "fail",
    count: withMetaDesc,
    total,
    severity:
      metaDescPct > 90 ? "info" : metaDescPct > 70 ? "warning" : "critical",
    description:
      metaDescPct === 100
        ? "All pages have meta descriptions"
        : `${total - withMetaDesc} page(s) missing meta descriptions`,
  });

  // 3. OG Image Coverage
  const withOgImage = pages.filter(
    (p) => p.og_image_url && p.og_image_url.trim().length > 0
  ).length;
  const ogPct = (withOgImage / total) * 100;
  checks.push({
    check: "OG Image Coverage",
    status: ogPct > 80 ? "pass" : ogPct > 50 ? "warning" : "fail",
    count: withOgImage,
    total,
    severity: ogPct > 80 ? "info" : ogPct > 50 ? "warning" : "critical",
    description:
      ogPct === 100
        ? "All pages have OG images"
        : `${total - withOgImage} page(s) missing OG images`,
  });

  // 4. No Duplicate Meta Titles
  const metaTitles = pages
    .map((p) => p.meta_title?.trim().toLowerCase())
    .filter(Boolean);
  const uniqueTitles = new Set(metaTitles);
  const duplicateTitleCount = metaTitles.length - uniqueTitles.size;
  checks.push({
    check: "No Duplicate Meta Titles",
    status: duplicateTitleCount === 0 ? "pass" : "fail",
    count: uniqueTitles.size,
    total: metaTitles.length,
    severity: duplicateTitleCount === 0 ? "info" : "warning",
    description:
      duplicateTitleCount === 0
        ? "No duplicate meta titles found"
        : `${duplicateTitleCount} duplicate meta title(s) detected`,
  });

  // 5. Meta Title Length (ideal 50-60 chars)
  const titleLengthPages = pages.filter(
    (p) => p.meta_title && p.meta_title.trim().length > 0
  );
  const goodTitleLen = titleLengthPages.filter((p) => {
    const len = p.meta_title!.trim().length;
    return len >= 50 && len <= 60;
  }).length;
  checks.push({
    check: "Meta Title Length",
    status:
      titleLengthPages.length > 0 && goodTitleLen === titleLengthPages.length
        ? "pass"
        : titleLengthPages.length > 0 && goodTitleLen > 0
          ? "warning"
          : "fail",
    count: goodTitleLen,
    total: titleLengthPages.length,
    severity:
      titleLengthPages.length > 0 && goodTitleLen === titleLengthPages.length
        ? "info"
        : "warning",
    description:
      goodTitleLen === titleLengthPages.length
        ? "All meta titles are 50-60 characters"
        : `${titleLengthPages.length - goodTitleLen} meta title(s) outside ideal 50-60 character range`,
  });

  // 6. Meta Description Length (ideal 120-160 chars)
  const descLengthPages = pages.filter(
    (p) => p.meta_description && p.meta_description.trim().length > 0
  );
  const goodDescLen = descLengthPages.filter((p) => {
    const len = p.meta_description!.trim().length;
    return len >= 120 && len <= 160;
  }).length;
  checks.push({
    check: "Meta Description Length",
    status:
      descLengthPages.length > 0 && goodDescLen === descLengthPages.length
        ? "pass"
        : descLengthPages.length > 0 && goodDescLen > 0
          ? "warning"
          : "fail",
    count: goodDescLen,
    total: descLengthPages.length,
    severity:
      descLengthPages.length > 0 && goodDescLen === descLengthPages.length
        ? "info"
        : "warning",
    description:
      goodDescLen === descLengthPages.length
        ? "All meta descriptions are 120-160 characters"
        : `${descLengthPages.length - goodDescLen} meta description(s) outside ideal 120-160 character range`,
  });

  // 7. Content Freshness (updated within 90 days)
  const freshPages = pages.filter(
    (p) => daysBetween(p.updated_at) <= 90
  ).length;
  const freshPct = (freshPages / total) * 100;
  checks.push({
    check: "Content Freshness",
    status: freshPct === 100 ? "pass" : freshPct > 50 ? "warning" : "fail",
    count: freshPages,
    total,
    severity:
      freshPct === 100 ? "info" : freshPct > 50 ? "warning" : "critical",
    description:
      freshPct === 100
        ? "All pages updated within the last 90 days"
        : `${total - freshPages} page(s) not updated in over 90 days`,
  });

  // 8. Published Pages (>80% published)
  const publishedCount = pages.filter(
    (p) => p.status === "published"
  ).length;
  const pubPct = (publishedCount / total) * 100;
  checks.push({
    check: "Published Pages",
    status: pubPct > 80 ? "pass" : pubPct > 50 ? "warning" : "fail",
    count: publishedCount,
    total,
    severity: pubPct > 80 ? "info" : pubPct > 50 ? "warning" : "critical",
    description:
      pubPct === 100
        ? "All pages are published"
        : `${total - publishedCount} page(s) are not published`,
  });

  return checks;
}

// ---------------------------------------------------------------------------
// 4. getContentAnalysis
// ---------------------------------------------------------------------------

export async function getContentAnalysis(
  supabase: SupabaseClient
): Promise<ContentAnalysisItem[]> {
  const { data, error } = await supabase
    .from("cms_pages")
    .select(CMS_FIELDS)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getContentAnalysis error:", error);
    return [];
  }

  const pages = (data ?? []) as CmsPageRow[];

  return pages.map((page) => {
    const sections = Array.isArray(page.sections) ? page.sections : [];
    const days = daysBetween(page.updated_at);

    return {
      id: page.id,
      title: page.title,
      slug: page.page_slug,
      sectionCount: sections.length,
      estimatedWordCount: estimateWordCount(page.sections),
      emptyOrHiddenSections: countEmptyOrHidden(page.sections),
      contentFreshness: freshness(days),
      daysSinceUpdate: days,
    };
  });
}

// ---------------------------------------------------------------------------
// 5. getKeywordsByIntent
// ---------------------------------------------------------------------------

export async function getKeywordsByIntent(
  supabase: SupabaseClient
): Promise<IntentGroup[]> {
  const { data, error } = await supabase
    .from("seo_keywords")
    .select("intent");

  if (error) {
    console.error("getKeywordsByIntent error:", error);
    return [];
  }

  const keywords = (data ?? []) as { intent: string | null }[];
  const groups: Record<string, number> = {};

  for (const k of keywords) {
    const intent = k.intent ?? "unknown";
    groups[intent] = (groups[intent] || 0) + 1;
  }

  return Object.entries(groups)
    .map(([intent, count]) => ({ intent, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// 6. getKeywordPositionDistribution
// ---------------------------------------------------------------------------

export async function getKeywordPositionDistribution(
  supabase: SupabaseClient
): Promise<PositionBucket[]> {
  const { data, error } = await supabase
    .from("seo_keywords")
    .select("current_position");

  if (error) {
    console.error("getKeywordPositionDistribution error:", error);
    return [];
  }

  const keywords = (data ?? []) as { current_position: number | null }[];

  const buckets: Record<string, number> = {
    "1-3": 0,
    "4-10": 0,
    "11-20": 0,
    "21-50": 0,
    "51+": 0,
  };

  for (const k of keywords) {
    const pos = k.current_position;
    if (pos === null || pos === undefined) continue;
    if (pos >= 1 && pos <= 3) buckets["1-3"]++;
    else if (pos <= 10) buckets["4-10"]++;
    else if (pos <= 20) buckets["11-20"]++;
    else if (pos <= 50) buckets["21-50"]++;
    else buckets["51+"]++;
  }

  return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
}

// ---------------------------------------------------------------------------
// 7. getPlatformGeoPresence
// ---------------------------------------------------------------------------

export async function getPlatformGeoPresence(
  supabase: SupabaseClient
): Promise<PlatformGeoPresence> {
  // Fetch across ALL companies (no company_id filter)
  const [projectsResult, propertiesResult] = await Promise.all([
    supabase.from("projects").select("city, state, contract_amount"),
    supabase.from("properties").select("city, state, current_value"),
  ]);

  const projects = (projectsResult.data ?? []) as {
    city: string | null;
    state: string | null;
    contract_amount: number | null;
  }[];

  const properties = (propertiesResult.data ?? []) as {
    city: string | null;
    state: string | null;
    current_value: number | null;
  }[];

  // Aggregate by city+state key
  const locationMap = new Map<
    string,
    {
      city: string;
      state: string;
      projectCount: number;
      propertyCount: number;
      totalValue: number;
    }
  >();

  for (const p of projects) {
    const city = p.city?.trim() || "Unknown";
    const state = p.state?.trim() || "Unknown";
    const key = `${city}|${state}`;
    const existing = locationMap.get(key) ?? {
      city,
      state,
      projectCount: 0,
      propertyCount: 0,
      totalValue: 0,
    };
    existing.projectCount++;
    existing.totalValue += p.contract_amount ?? 0;
    locationMap.set(key, existing);
  }

  for (const p of properties) {
    const city = p.city?.trim() || "Unknown";
    const state = p.state?.trim() || "Unknown";
    const key = `${city}|${state}`;
    const existing = locationMap.get(key) ?? {
      city,
      state,
      projectCount: 0,
      propertyCount: 0,
      totalValue: 0,
    };
    existing.propertyCount++;
    existing.totalValue += p.current_value ?? 0;
    locationMap.set(key, existing);
  }

  const locations = Array.from(locationMap.values()).sort(
    (a, b) => b.totalValue - a.totalValue
  );

  // State distribution
  const stateMap = new Map<string, number>();
  for (const loc of locations) {
    stateMap.set(
      loc.state,
      (stateMap.get(loc.state) ?? 0) +
        loc.projectCount +
        loc.propertyCount
    );
  }
  const stateDistribution = Array.from(stateMap.entries())
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count);

  const uniqueCities = new Set(locations.map((l) => l.city));
  const uniqueStates = new Set(locations.map((l) => l.state));

  return {
    locations,
    totalCities: uniqueCities.size,
    totalStates: uniqueStates.size,
    totalProjects: projects.length,
    totalProperties: properties.length,
    stateDistribution,
  };
}

// ---------------------------------------------------------------------------
// 8. generateSeoRecommendations
// ---------------------------------------------------------------------------

export async function generateSeoRecommendations(
  supabase: SupabaseClient
): Promise<SeoRecommendation[]> {
  const [pagesResult, keywordsResult, geoResult] = await Promise.all([
    supabase.from("cms_pages").select(CMS_FIELDS),
    supabase
      .from("seo_keywords")
      .select("id, keyword, current_position, intent"),
    getPlatformGeoPresence(supabase),
  ]);

  const pages = (pagesResult.data ?? []) as CmsPageRow[];
  const keywords = (keywordsResult.data ?? []) as Pick<
    KeywordRow,
    "id" | "keyword" | "current_position" | "intent"
  >[];

  const recommendations: SeoRecommendation[] = [];
  let idx = 0;

  // --- Meta recommendations ---

  // Pages missing meta title
  const missingTitlePages = pages.filter(
    (p) => !p.meta_title || p.meta_title.trim().length === 0
  );
  for (const page of missingTitlePages) {
    recommendations.push({
      id: String(idx++),
      severity: "critical",
      category: "meta",
      title: `Page "${page.title}" is missing a meta title`,
      description: `The page "${page.title}" (/${page.page_slug}) does not have a meta title set. This is critical for search engine indexing.`,
      actionText: `Add a meta title (50-60 characters) for the page "${page.title}" at /${page.page_slug}`,
    });
  }

  // Pages missing meta description
  const missingDescPages = pages.filter(
    (p) => !p.meta_description || p.meta_description.trim().length === 0
  );
  for (const page of missingDescPages) {
    recommendations.push({
      id: String(idx++),
      severity: "critical",
      category: "meta",
      title: `Page "${page.title}" is missing a meta description`,
      description: `The page "${page.title}" (/${page.page_slug}) does not have a meta description. Search engines use this in results snippets.`,
      actionText: `Add a meta description (120-160 characters) for the page "${page.title}" at /${page.page_slug}`,
    });
  }

  // Short meta titles
  const shortTitlePages = pages.filter((p) => {
    const len = p.meta_title?.trim().length ?? 0;
    return len > 0 && len < 30;
  });
  if (shortTitlePages.length > 0) {
    recommendations.push({
      id: String(idx++),
      severity: "warning",
      category: "meta",
      title: `${shortTitlePages.length} page(s) have meta titles shorter than 30 characters`,
      description: `Short meta titles may not fully describe page content and miss keyword opportunities. Aim for 50-60 characters.`,
      actionText: `Review and expand meta titles for: ${shortTitlePages.map((p) => p.title).join(", ")}`,
    });
  }

  // Long meta titles
  const longTitlePages = pages.filter((p) => {
    const len = p.meta_title?.trim().length ?? 0;
    return len > 60;
  });
  if (longTitlePages.length > 0) {
    recommendations.push({
      id: String(idx++),
      severity: "warning",
      category: "meta",
      title: `${longTitlePages.length} page(s) have meta titles longer than 60 characters`,
      description: `Long meta titles get truncated in search results. Aim for 50-60 characters for optimal display.`,
      actionText: `Shorten meta titles for: ${longTitlePages.map((p) => p.title).join(", ")}`,
    });
  }

  // Short meta descriptions
  const shortDescPages = pages.filter((p) => {
    const len = p.meta_description?.trim().length ?? 0;
    return len > 0 && len < 70;
  });
  if (shortDescPages.length > 0) {
    recommendations.push({
      id: String(idx++),
      severity: "warning",
      category: "meta",
      title: `${shortDescPages.length} page(s) have meta descriptions shorter than 70 characters`,
      description: `Short meta descriptions miss the opportunity to convince users to click. Aim for 120-160 characters.`,
      actionText: `Expand meta descriptions for: ${shortDescPages.map((p) => p.title).join(", ")}`,
    });
  }

  // Long meta descriptions
  const longDescPages = pages.filter((p) => {
    const len = p.meta_description?.trim().length ?? 0;
    return len > 160;
  });
  if (longDescPages.length > 0) {
    recommendations.push({
      id: String(idx++),
      severity: "warning",
      category: "meta",
      title: `${longDescPages.length} page(s) have meta descriptions longer than 160 characters`,
      description: `Long meta descriptions get truncated in search results. Aim for 120-160 characters.`,
      actionText: `Shorten meta descriptions for: ${longDescPages.map((p) => p.title).join(", ")}`,
    });
  }

  // --- Technical recommendations ---

  // Missing OG images
  const missingOgPages = pages.filter(
    (p) => !p.og_image_url || p.og_image_url.trim().length === 0
  );
  if (missingOgPages.length > 0) {
    recommendations.push({
      id: String(idx++),
      severity: "warning",
      category: "technical",
      title: `No OG images set for ${missingOgPages.length} page(s)`,
      description: `Open Graph images improve social media sharing appearance. Pages without OG images will use a default or no image when shared.`,
      actionText: `Add OG images for: ${missingOgPages.map((p) => p.title).join(", ")}`,
    });
  }

  // Duplicate meta titles
  const metaTitles = pages
    .filter((p) => p.meta_title && p.meta_title.trim().length > 0)
    .map((p) => p.meta_title!.trim().toLowerCase());
  const titleCounts = new Map<string, number>();
  for (const t of metaTitles) {
    titleCounts.set(t, (titleCounts.get(t) ?? 0) + 1);
  }
  const duplicates = Array.from(titleCounts.entries()).filter(
    ([, c]) => c > 1
  );
  if (duplicates.length > 0) {
    recommendations.push({
      id: String(idx++),
      severity: "warning",
      category: "technical",
      title: `${duplicates.length} duplicate meta title(s) found`,
      description: `Duplicate meta titles confuse search engines and dilute ranking potential. Each page should have a unique title.`,
      actionText: `Make meta titles unique. Duplicated titles: ${duplicates.map(([t]) => `"${t}"`).join(", ")}`,
    });
  }

  // --- Content recommendations ---

  // Stale content
  const stalePages = pages.filter((p) => daysBetween(p.updated_at) > 180);
  if (stalePages.length > 0) {
    recommendations.push({
      id: String(idx++),
      severity: "warning",
      category: "content",
      title: `${stalePages.length} page(s) have stale content (not updated in 180+ days)`,
      description: `Search engines favor fresh content. Consider reviewing and updating these pages.`,
      actionText: `Review and update content for: ${stalePages.map((p) => p.title).join(", ")}`,
    });
  }

  // Pages with empty/hidden sections
  const emptySecPages = pages.filter(
    (p) => countEmptyOrHidden(p.sections) > 0
  );
  if (emptySecPages.length > 0) {
    const totalEmpty = emptySecPages.reduce(
      (s, p) => s + countEmptyOrHidden(p.sections),
      0
    );
    recommendations.push({
      id: String(idx++),
      severity: "info",
      category: "content",
      title: `${totalEmpty} empty or hidden section(s) across ${emptySecPages.length} page(s)`,
      description: `Hidden or empty sections may indicate incomplete content. Review whether they should be populated or removed.`,
      actionText: `Review empty/hidden sections on: ${emptySecPages.map((p) => p.title).join(", ")}`,
    });
  }

  // Unpublished pages
  const unpublishedPages = pages.filter((p) => p.status !== "published");
  if (unpublishedPages.length > 0) {
    recommendations.push({
      id: String(idx++),
      severity: "info",
      category: "content",
      title: `${unpublishedPages.length} page(s) are not published`,
      description: `Unpublished pages are not indexed by search engines. Publish them when ready to gain visibility.`,
      actionText: `Consider publishing: ${unpublishedPages.map((p) => p.title).join(", ")}`,
    });
  }

  // --- Keyword recommendations ---

  // Keywords with no position data
  const noPositionKeywords = keywords.filter(
    (k) => k.current_position === null || k.current_position === undefined
  );
  if (noPositionKeywords.length > 0) {
    recommendations.push({
      id: String(idx++),
      severity: "info",
      category: "keywords",
      title: `${noPositionKeywords.length} keyword(s) have no position data`,
      description: `These keywords are tracked but have no ranking position recorded. Consider running a position check or waiting for the next crawl.`,
      actionText: `Update position data for: ${noPositionKeywords.map((k) => k.keyword).join(", ")}`,
    });
  }

  // Keywords without intent classification
  const noIntentKeywords = keywords.filter(
    (k) => !k.intent || k.intent === "unknown"
  );
  if (noIntentKeywords.length > 0) {
    recommendations.push({
      id: String(idx++),
      severity: "info",
      category: "keywords",
      title: `${noIntentKeywords.length} keyword(s) have no intent classification`,
      description: `Classifying keywords by intent (informational, commercial, transactional, navigational) helps prioritize content strategy.`,
      actionText: `Classify intent for: ${noIntentKeywords.map((k) => k.keyword).join(", ")}`,
    });
  }

  // --- GEO recommendations ---

  const geo = geoResult;
  if (geo.totalProjects === 0 && geo.totalProperties === 0) {
    recommendations.push({
      id: String(idx++),
      severity: "info",
      category: "geo",
      title: "No geographic presence data found",
      description:
        "There are no projects or properties with city/state data. Consider adding location data to improve local SEO.",
      actionText:
        "Add city and state information to projects and properties for local SEO coverage",
    });
  } else if (geo.totalStates <= 1) {
    recommendations.push({
      id: String(idx++),
      severity: "info",
      category: "geo",
      title: "Limited geographic diversity",
      description: `All projects and properties are concentrated in ${geo.totalStates} state(s). Consider expanding geographic presence for broader local SEO impact.`,
      actionText: `Current coverage: ${geo.stateDistribution.map((s) => s.state).join(", ")}. Consider creating location-specific landing pages.`,
    });
  }

  return recommendations;
}
