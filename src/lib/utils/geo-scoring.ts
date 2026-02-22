// ---------------------------------------------------------------------------
// GEO (Generative Engine Optimization) Scoring Utility
//
// Analyzes CMS page content for generative AI citability across 6 dimensions:
//   1. Citability — quotable statements, data points, clear facts
//   2. Topical Authority — content depth, comprehensiveness
//   3. Source Credibility — statistics, specifics, expert language
//   4. Content Freshness — recency, update frequency
//   5. Semantic Clarity — clear structure, simple language
//   6. AI Discoverability — structured data, meta optimization
// ---------------------------------------------------------------------------

export interface GeoDimensionScore {
  dimension: string;
  score: number; // 0–100
  details: string;
}

export interface GeoPageScore {
  pageId: string;
  title: string;
  slug: string;
  overallScore: number;
  dimensions: GeoDimensionScore[];
}

export interface GeoScoresOverview {
  overallScore: number;
  dimensionAverages: GeoDimensionScore[];
  pageScores: GeoPageScore[];
}

interface Section {
  type?: string;
  content?: unknown;
  visible?: boolean;
  order?: number;
}

interface PageData {
  id: string;
  title: string;
  page_slug: string;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  sections: Section[] | null;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(extractText).join(" ");
  if (value && typeof value === "object") {
    return Object.values(value).map(extractText).join(" ");
  }
  return "";
}

function clamp(val: number): number {
  return Math.max(0, Math.min(100, Math.round(val)));
}

function getVisibleSections(sections: Section[] | null): Section[] {
  if (!sections || !Array.isArray(sections)) return [];
  return sections.filter((s) => s.visible !== false);
}

function getSectionTypes(sections: Section[]): string[] {
  return sections.map((s) => (s.type ?? "").toLowerCase()).filter(Boolean);
}

function getSectionText(section: Section): string {
  return extractText(section.content);
}

function getAllText(sections: Section[]): string {
  return sections.map(getSectionText).join(" ");
}

function daysSince(dateStr: string): number {
  const then = new Date(dateStr).getTime();
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// 1. Citability — Can generative engines quote this content?
// ---------------------------------------------------------------------------

function analyzeCitability(sections: Section[]): GeoDimensionScore {
  const fullText = getAllText(sections);
  const words = fullText.split(/\s+/).filter(Boolean);
  let score = 0;

  if (words.length === 0) {
    return { dimension: "Citability", score: 0, details: "No content to analyze" };
  }

  // Definitive factual statements ("is", "provides", "enables")
  const definitivePatterns = /\b(is|are|provides|offers|enables|helps|allows|delivers|includes|features|supports)\b/gi;
  const defMatches = fullText.match(definitivePatterns) ?? [];
  if (defMatches.length >= 8) score += 20;
  else if (defMatches.length >= 4) score += 12;
  else if (defMatches.length >= 1) score += 6;

  // Statistics and numbers (AI loves citing specific data)
  const statsPatterns = /\d+(\.\d+)?%|\$[\d,]+\.?\d*|\d{2,}[\s-]?(year|month|day|hour|user|project|compan)/gi;
  const statsMatches = fullText.match(statsPatterns) ?? [];
  if (statsMatches.length >= 3) score += 20;
  else if (statsMatches.length >= 1) score += 10;

  // Short, extractable sentences (< 30 words, good for quoting)
  const sentences = fullText.split(/[.!?]+/).filter((s) => s.trim().length > 15);
  const quotable = sentences.filter((s) => s.trim().split(/\s+/).length <= 30 && s.trim().split(/\s+/).length >= 5);
  const quotableRatio = sentences.length > 0 ? quotable.length / sentences.length : 0;
  score += Math.round(quotableRatio * 25);

  // Named entities (capitalized terms)
  const entities = fullText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) ?? [];
  const uniqueEntities = new Set(entities);
  if (uniqueEntities.size >= 5) score += 15;
  else if (uniqueEntities.size >= 2) score += 8;

  // Content has enough volume to be a credible source
  if (words.length >= 300) score += 10;
  else if (words.length >= 100) score += 5;

  // Comparison language (great for being cited in comparisons)
  const compPatterns = /\b(compared to|unlike|better|faster|easier|more than|less than|best|leading|top)\b/gi;
  const compMatches = fullText.match(compPatterns) ?? [];
  if (compMatches.length >= 2) score += 10;
  else if (compMatches.length >= 1) score += 5;

  const details =
    score >= 70 ? "Highly citable content with clear facts and data"
    : score >= 40 ? "Add more specific data points and definitive statements"
    : "Needs concrete facts, statistics, and quotable sentences";

  return { dimension: "Citability", score: clamp(score), details };
}

// ---------------------------------------------------------------------------
// 2. Topical Authority — Is the content comprehensive and deep?
// ---------------------------------------------------------------------------

function analyzeTopicalAuthority(sections: Section[]): GeoDimensionScore {
  const visibleSections = getVisibleSections(sections);
  const types = getSectionTypes(visibleSections);
  const fullText = getAllText(visibleSections);
  const words = fullText.split(/\s+/).filter(Boolean);
  let score = 0;

  if (words.length === 0) {
    return { dimension: "Topical Authority", score: 0, details: "No content" };
  }

  // Content depth (word count)
  if (words.length >= 500) score += 20;
  else if (words.length >= 200) score += 12;
  else if (words.length >= 100) score += 6;

  // Section diversity (covers multiple subtopics)
  const uniqueTypes = new Set(types);
  if (uniqueTypes.size >= 5) score += 20;
  else if (uniqueTypes.size >= 3) score += 12;
  else if (uniqueTypes.size >= 2) score += 6;

  // Multiple content sections
  if (visibleSections.length >= 6) score += 15;
  else if (visibleSections.length >= 4) score += 10;
  else if (visibleSections.length >= 2) score += 5;

  // Covers key topic areas
  if (types.includes("faq")) score += 10;
  if (types.includes("pricing")) score += 10;
  if (types.includes("steps") || types.includes("modules")) score += 10;

  // Industry terminology (construction/management domain)
  const domainTerms = /\b(project|construction|management|building|contractor|budget|schedule|compliance|safety|inspection|RFI|submittal|change order|bid|estimate)\b/gi;
  const domainMatches = fullText.match(domainTerms) ?? [];
  if (domainMatches.length >= 10) score += 15;
  else if (domainMatches.length >= 5) score += 10;
  else if (domainMatches.length >= 2) score += 5;

  const details =
    score >= 70 ? "Strong topical authority with comprehensive coverage"
    : score >= 40 ? "Add more subtopics and in-depth content sections"
    : "Content is too thin — expand with detailed sections";

  return { dimension: "Topical Authority", score: clamp(score), details };
}

// ---------------------------------------------------------------------------
// 3. Source Credibility — Does the content seem trustworthy?
// ---------------------------------------------------------------------------

function analyzeSourceCredibility(page: PageData, sections: Section[]): GeoDimensionScore {
  const fullText = getAllText(sections);
  let score = 0;

  if (fullText.trim().length === 0) {
    return { dimension: "Source Credibility", score: 0, details: "No content" };
  }

  // Specific numbers and data (not vague)
  const specificData = fullText.match(/\d+(\.\d+)?%|\$[\d,]+\.?\d*|\b\d{4}\b|\b\d+\+?\s?(years?|months?|projects?|users?|companies)\b/gi) ?? [];
  if (specificData.length >= 5) score += 25;
  else if (specificData.length >= 2) score += 15;
  else if (specificData.length >= 1) score += 8;

  // Expert/professional language
  const expertTerms = /\b(compliance|regulation|audit|certification|standard|methodology|framework|best practice|industry|enterprise|SaaS|API|integration|workflow|automation)\b/gi;
  const expertMatches = fullText.match(expertTerms) ?? [];
  if (expertMatches.length >= 5) score += 20;
  else if (expertMatches.length >= 2) score += 12;
  else if (expertMatches.length >= 1) score += 6;

  // Brand consistency (Buildwrk mentioned)
  const brandMentions = fullText.match(/\bBuildwrk\b/gi) ?? [];
  if (brandMentions.length >= 2) score += 15;
  else if (brandMentions.length >= 1) score += 8;

  // Complete meta data (signals professionalism)
  if (page.meta_title && page.meta_title.trim().length >= 30) score += 10;
  if (page.meta_description && page.meta_description.trim().length >= 70) score += 10;
  if (page.og_image_url) score += 5;

  // Content isn't too short (credible sources have substance)
  const words = fullText.split(/\s+/).filter(Boolean);
  if (words.length >= 200) score += 15;
  else if (words.length >= 100) score += 8;

  const details =
    score >= 70 ? "Strong credibility signals with data and expert language"
    : score >= 40 ? "Add specific data, statistics, and professional terminology"
    : "Needs more credibility markers — add data points and expert content";

  return { dimension: "Source Credibility", score: clamp(score), details };
}

// ---------------------------------------------------------------------------
// 4. Content Freshness — Is the content recent and up-to-date?
// ---------------------------------------------------------------------------

function analyzeContentFreshness(page: PageData): GeoDimensionScore {
  const days = daysSince(page.updated_at);
  let score = 0;

  // Recency scoring
  if (days <= 7) score += 40;
  else if (days <= 30) score += 30;
  else if (days <= 90) score += 20;
  else if (days <= 180) score += 10;

  // Having meta data that's current
  if (page.meta_title && page.meta_title.trim().length > 0) score += 15;
  if (page.meta_description && page.meta_description.trim().length > 0) score += 15;

  // Published content (active, not stale draft)
  score += 15;

  // OG image (regularly maintained pages have these)
  if (page.og_image_url) score += 15;

  const details =
    days <= 30 ? `Updated ${days} day(s) ago — very fresh`
    : days <= 90 ? `Updated ${days} days ago — reasonably fresh`
    : days <= 180 ? `Updated ${days} days ago — consider refreshing`
    : `Updated ${days} days ago — content is stale`;

  return { dimension: "Content Freshness", score: clamp(score), details };
}

// ---------------------------------------------------------------------------
// 5. Semantic Clarity — Is the content clear and well-structured?
// ---------------------------------------------------------------------------

function analyzeSemanticClarity(sections: Section[]): GeoDimensionScore {
  const visibleSections = getVisibleSections(sections);
  const types = getSectionTypes(visibleSections);
  const fullText = getAllText(visibleSections);
  let score = 0;

  if (fullText.trim().length === 0) {
    return { dimension: "Semantic Clarity", score: 0, details: "No content" };
  }

  // Clear section structure (multiple typed sections)
  const structuredTypes = ["hero", "about", "steps", "faq", "pricing", "modules", "value_props", "cta"];
  const hasStructure = types.filter((t) => structuredTypes.includes(t)).length;
  if (hasStructure >= 4) score += 25;
  else if (hasStructure >= 2) score += 15;
  else if (hasStructure >= 1) score += 8;

  // Short, clear sentences
  const sentences = fullText.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  const shortSentences = sentences.filter((s) => s.trim().split(/\s+/).length <= 20);
  const shortRatio = sentences.length > 0 ? shortSentences.length / sentences.length : 0;
  score += Math.round(shortRatio * 25);

  // Uses simple/direct language (fewer complex words)
  const complexWords = fullText.match(/\b\w{12,}\b/g) ?? [];
  const totalWords = fullText.split(/\s+/).filter(Boolean).length;
  const complexRatio = totalWords > 0 ? complexWords.length / totalWords : 0;
  if (complexRatio < 0.05) score += 20;
  else if (complexRatio < 0.1) score += 12;
  else if (complexRatio < 0.15) score += 6;

  // Logical content flow (sections ordered meaningfully)
  if (visibleSections.length >= 3) score += 10;

  // Unambiguous language (definitive vs hedging)
  const hedging = /\b(maybe|perhaps|might|could be|possibly|somewhat|sort of|kind of)\b/gi;
  const hedgeMatches = fullText.match(hedging) ?? [];
  if (hedgeMatches.length === 0) score += 20;
  else if (hedgeMatches.length <= 2) score += 10;

  const details =
    score >= 70 ? "Clear, well-structured content with semantic clarity"
    : score >= 40 ? "Simplify language and improve section structure"
    : "Content needs clearer structure and simpler language";

  return { dimension: "Semantic Clarity", score: clamp(score), details };
}

// ---------------------------------------------------------------------------
// 6. AI Discoverability — Can AI engines find and parse this content?
// ---------------------------------------------------------------------------

function analyzeAiDiscoverability(page: PageData, sections: Section[]): GeoDimensionScore {
  const types = getSectionTypes(sections);
  const fullText = getAllText(sections);
  let score = 0;

  if (fullText.trim().length === 0) {
    return { dimension: "AI Discoverability", score: 0, details: "No content" };
  }

  // Has FAQ section (strongest signal for AI engines)
  if (types.includes("faq")) score += 20;

  // Has structured content sections
  if (types.includes("steps") || types.includes("modules") || types.includes("value_props")) score += 15;

  // Meta title optimized
  if (page.meta_title && page.meta_title.trim().length >= 30 && page.meta_title.trim().length <= 60) score += 15;

  // Meta description optimized
  if (page.meta_description && page.meta_description.trim().length >= 70 && page.meta_description.trim().length <= 160) score += 15;

  // OG image (helps with AI search cards)
  if (page.og_image_url) score += 5;

  // Has definition-style content
  const defPatterns = /\b(is a|refers to|means|defined as|known as)\b/gi;
  const defMatches = fullText.match(defPatterns) ?? [];
  if (defMatches.length >= 2) score += 15;
  else if (defMatches.length >= 1) score += 8;

  // List content in text
  const listPatterns = /\b(\d+\.|•|→|step \d|phase \d)/gi;
  const listMatches = fullText.match(listPatterns) ?? [];
  if (listMatches.length >= 3) score += 10;
  else if (listMatches.length >= 1) score += 5;

  // Multiple section types = good structured data
  const uniqueTypes = new Set(types);
  if (uniqueTypes.size >= 4) score += 5;

  const details =
    score >= 70 ? "Highly discoverable by AI search engines"
    : score >= 40 ? "Add FAQ sections and definition-style content"
    : "Needs structured sections, meta data, and AI-friendly formatting";

  return { dimension: "AI Discoverability", score: clamp(score), details };
}

// ---------------------------------------------------------------------------
// Main Scoring Function
// ---------------------------------------------------------------------------

export function scorePageGeo(page: PageData): GeoPageScore {
  const sections = getVisibleSections(page.sections);

  const dimensions: GeoDimensionScore[] = [
    analyzeCitability(sections),
    analyzeTopicalAuthority(sections),
    analyzeSourceCredibility(page, sections),
    analyzeContentFreshness(page),
    analyzeSemanticClarity(sections),
    analyzeAiDiscoverability(page, sections),
  ];

  const overallScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length
  );

  return {
    pageId: page.id,
    title: page.title,
    slug: page.page_slug,
    overallScore,
    dimensions,
  };
}

export function computeGeoOverview(pages: PageData[]): GeoScoresOverview {
  const pageScores = pages.map(scorePageGeo);

  const overallScore =
    pageScores.length > 0
      ? Math.round(pageScores.reduce((sum, p) => sum + p.overallScore, 0) / pageScores.length)
      : 0;

  const dimensionNames = [
    "Citability",
    "Topical Authority",
    "Source Credibility",
    "Content Freshness",
    "Semantic Clarity",
    "AI Discoverability",
  ];

  const dimensionAverages: GeoDimensionScore[] = dimensionNames.map((name) => {
    const scores = pageScores.map((p) => p.dimensions.find((d) => d.dimension === name)?.score ?? 0);
    const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return {
      dimension: name,
      score: avg,
      details: avg >= 70 ? "Strong" : avg >= 40 ? "Moderate" : "Needs Work",
    };
  });

  return { overallScore, dimensionAverages, pageScores };
}
