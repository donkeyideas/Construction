// ---------------------------------------------------------------------------
// AEO (Answer Engine Optimization) Scoring Utility
//
// Analyzes CMS page sections for AI-readiness across 6 dimensions:
//   1. Schema Richness — structured sections, meta data, OG images
//   2. FAQ Coverage — FAQ items quantity and answer quality
//   3. Direct Answer Readiness — concise, front-loaded answers
//   4. Entity Markup — named entities, locations, numbers
//   5. Speakable Content — paragraph lengths, headers, structure
//   6. AI Snippet Compatibility — lists, steps, Q&A, definitions
// ---------------------------------------------------------------------------

export interface AeoDimensionScore {
  dimension: string;
  score: number; // 0–100
  details: string;
}

export interface AeoPageScore {
  pageId: string;
  title: string;
  slug: string;
  overallScore: number;
  dimensions: AeoDimensionScore[];
}

export interface AeoScoresOverview {
  overallScore: number;
  dimensionAverages: AeoDimensionScore[];
  pageScores: AeoPageScore[];
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

// Extract FAQ items from FAQ-type sections
function extractFaqItems(sections: Section[]): { question: string; answer: string }[] {
  const items: { question: string; answer: string }[] = [];
  for (const section of sections) {
    if ((section.type ?? "").toLowerCase() !== "faq") continue;
    const content = section.content;
    if (!content || typeof content !== "object") continue;

    // Support both {items: [{question, answer}]} and {faqs: [{q, a}]} formats
    const contentObj = content as Record<string, unknown>;
    const faqArray =
      (contentObj.items as unknown[]) ??
      (contentObj.faqs as unknown[]) ??
      (contentObj.questions as unknown[]) ??
      [];

    if (Array.isArray(faqArray)) {
      for (const item of faqArray) {
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          const q =
            (obj.question as string) ?? (obj.q as string) ?? (obj.title as string) ?? "";
          const a =
            (obj.answer as string) ?? (obj.a as string) ?? (obj.content as string) ?? "";
          if (q) items.push({ question: q, answer: typeof a === "string" ? a : extractText(a) });
        }
      }
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// 1. Schema Richness
// ---------------------------------------------------------------------------

function analyzeSchemaRichness(page: PageData, sections: Section[]): AeoDimensionScore {
  let score = 0;
  const types = getSectionTypes(sections);

  // Structured section types
  if (types.includes("faq")) score += 20;
  if (types.includes("pricing")) score += 15;
  if (types.includes("about") || types.includes("hero")) score += 10;
  if (types.includes("steps") || types.includes("modules")) score += 10;

  // Meta data completeness
  if (page.meta_title && page.meta_title.trim().length >= 30) score += 15;
  if (page.meta_description && page.meta_description.trim().length >= 70) score += 15;
  if (page.og_image_url && page.og_image_url.trim().length > 0) score += 5;

  // Section count (structured content)
  if (sections.length >= 3) score += 5;
  if (sections.length >= 5) score += 5;

  const details =
    score >= 80
      ? "Rich structured content with meta data"
      : score >= 50
        ? "Moderate structure; add FAQ or pricing sections"
        : "Needs more structured sections and meta data";

  return { dimension: "Schema Richness", score: clamp(score), details };
}

// ---------------------------------------------------------------------------
// 2. FAQ Coverage
// ---------------------------------------------------------------------------

function analyzeFaqCoverage(sections: Section[]): AeoDimensionScore {
  const faqItems = extractFaqItems(sections);
  let score = 0;

  if (faqItems.length === 0) {
    return {
      dimension: "FAQ Coverage",
      score: 0,
      details: "No FAQ section found. Add structured Q&A content.",
    };
  }

  // Has FAQ section
  score += 25;

  // Number of items (up to 35 points)
  score += Math.min(faqItems.length * 5, 35);

  // Answer quality — answers > 50 chars
  const qualityAnswers = faqItems.filter((f) => f.answer.length > 50).length;
  const qualityRatio = faqItems.length > 0 ? qualityAnswers / faqItems.length : 0;
  score += Math.round(qualityRatio * 25);

  // Answer depth — answers > 150 chars
  const deepAnswers = faqItems.filter((f) => f.answer.length > 150).length;
  const depthRatio = faqItems.length > 0 ? deepAnswers / faqItems.length : 0;
  score += Math.round(depthRatio * 15);

  const details =
    score >= 80
      ? `${faqItems.length} well-crafted FAQ items`
      : score >= 50
        ? `${faqItems.length} FAQ items; expand answers for better AI pickup`
        : `${faqItems.length} FAQ items; needs more questions with detailed answers`;

  return { dimension: "FAQ Coverage", score: clamp(score), details };
}

// ---------------------------------------------------------------------------
// 3. Direct Answer Readiness
// ---------------------------------------------------------------------------

function analyzeDirectAnswerReadiness(sections: Section[]): AeoDimensionScore {
  const fullText = getAllText(sections);
  const words = fullText.split(/\s+/).filter(Boolean);
  let score = 0;

  if (words.length === 0) {
    return {
      dimension: "Direct Answer Readiness",
      score: 0,
      details: "No text content found",
    };
  }

  // Sufficient content volume
  if (words.length > 100) score += 15;
  if (words.length > 300) score += 10;

  // Check for concise paragraphs
  const paragraphs = fullText
    .split(/\n{2,}|\.\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 10);

  const conciseParagraphs = paragraphs.filter((p) => p.length < 300).length;
  const conciseRatio = paragraphs.length > 0 ? conciseParagraphs / paragraphs.length : 0;
  score += Math.round(conciseRatio * 25);

  // First section has concise content (< 200 chars for direct answer)
  const firstSectionText = sections.length > 0 ? getSectionText(sections[0]) : "";
  const firstSentence = firstSectionText.split(/[.!?]/)[0]?.trim() ?? "";
  if (firstSentence.length > 10 && firstSentence.length < 200) score += 20;

  // Has definitive statements (contains "is", "are", "provides", "offers")
  const definitivePatterns = /\b(is|are|provides|offers|enables|helps|allows|delivers|includes)\b/gi;
  const definitiveMatches = fullText.match(definitivePatterns) ?? [];
  if (definitiveMatches.length >= 3) score += 15;
  else if (definitiveMatches.length >= 1) score += 8;

  // Contains numbers/statistics (AI engines love concrete data)
  const numberMatches = fullText.match(/\d+(\.\d+)?%|\$[\d,]+|\d{2,}/g) ?? [];
  if (numberMatches.length >= 2) score += 15;
  else if (numberMatches.length >= 1) score += 8;

  const details =
    score >= 80
      ? "Content is well-structured for direct AI answers"
      : score >= 50
        ? "Add concise lead paragraphs and definitive statements"
        : "Content needs restructuring for AI answer extraction";

  return { dimension: "Direct Answer Readiness", score: clamp(score), details };
}

// ---------------------------------------------------------------------------
// 4. Entity Markup
// ---------------------------------------------------------------------------

function analyzeEntityMarkup(page: PageData, sections: Section[]): AeoDimensionScore {
  const fullText = getAllText(sections);
  let score = 0;

  if (fullText.trim().length === 0) {
    return {
      dimension: "Entity Markup",
      score: 0,
      details: "No text content found",
    };
  }

  // Brand/product name references
  const brandPatterns = /\b(Buildwrk|construction|management|software|platform|ERP)\b/gi;
  const brandMatches = fullText.match(brandPatterns) ?? [];
  if (brandMatches.length >= 5) score += 25;
  else if (brandMatches.length >= 2) score += 15;
  else if (brandMatches.length >= 1) score += 8;

  // Capitalized proper nouns (approximation for entities)
  const properNouns = fullText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) ?? [];
  const uniqueNouns = new Set(properNouns);
  if (uniqueNouns.size >= 5) score += 20;
  else if (uniqueNouns.size >= 2) score += 10;

  // Numeric data (prices, percentages, quantities)
  const numbers = fullText.match(/\$[\d,]+\.?\d*|\d+%|\d{3,}/g) ?? [];
  if (numbers.length >= 3) score += 20;
  else if (numbers.length >= 1) score += 10;

  // Location references
  const locationPatterns = /\b(city|state|location|region|area|nationwide|global|local)\b/gi;
  const locationMatches = fullText.match(locationPatterns) ?? [];
  if (locationMatches.length >= 2) score += 15;
  else if (locationMatches.length >= 1) score += 8;

  // Page title and meta contribute to entity clarity
  if (page.meta_title && page.meta_title.length > 20) score += 10;
  if (page.meta_description && page.meta_description.length > 50) score += 10;

  const details =
    score >= 80
      ? "Strong entity markup with brands, numbers, and locations"
      : score >= 50
        ? "Add more specific entities, data points, and location references"
        : "Needs more identifiable entities and structured data";

  return { dimension: "Entity Markup", score: clamp(score), details };
}

// ---------------------------------------------------------------------------
// 5. Speakable Content
// ---------------------------------------------------------------------------

function analyzeSpeakableContent(sections: Section[]): AeoDimensionScore {
  const visibleSections = getVisibleSections(sections);
  let score = 0;

  if (visibleSections.length === 0) {
    return {
      dimension: "Speakable Content",
      score: 0,
      details: "No visible content sections",
    };
  }

  // Multiple sections = good structure for voice
  if (visibleSections.length >= 3) score += 15;
  else if (visibleSections.length >= 2) score += 8;

  // Section types indicate headers/structure
  const types = getSectionTypes(visibleSections);
  const structuredTypes = ["hero", "about", "steps", "faq", "pricing", "modules", "cta"];
  const hasStructure = types.filter((t) => structuredTypes.includes(t)).length;
  if (hasStructure >= 3) score += 20;
  else if (hasStructure >= 2) score += 12;
  else if (hasStructure >= 1) score += 6;

  // Average content length per section (for speakability, 50-300 words is ideal)
  const sectionTexts = visibleSections.map(getSectionText);
  const wordCounts = sectionTexts.map((t) => t.split(/\s+/).filter(Boolean).length);
  const avgWords = wordCounts.length > 0 ? wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length : 0;

  if (avgWords >= 30 && avgWords <= 300) score += 25;
  else if (avgWords >= 10 && avgWords <= 500) score += 15;
  else if (avgWords > 0) score += 5;

  // Short sentences (good for voice/AI reading)
  const fullText = sectionTexts.join(" ");
  const sentences = fullText.split(/[.!?]+/).filter((s) => s.trim().length > 5);
  const shortSentences = sentences.filter((s) => s.trim().split(/\s+/).length <= 25).length;
  const shortRatio = sentences.length > 0 ? shortSentences / sentences.length : 0;
  score += Math.round(shortRatio * 20);

  // Has clear step-by-step or list content (highly speakable)
  if (types.includes("steps")) score += 10;
  if (types.includes("faq")) score += 10;

  const details =
    score >= 80
      ? "Content is well-structured and speakable for AI assistants"
      : score >= 50
        ? "Shorten sentences and add more structured sections"
        : "Restructure content with shorter sections and clearer headers";

  return { dimension: "Speakable Content", score: clamp(score), details };
}

// ---------------------------------------------------------------------------
// 6. AI Snippet Compatibility
// ---------------------------------------------------------------------------

function analyzeAiSnippetCompatibility(sections: Section[]): AeoDimensionScore {
  const types = getSectionTypes(sections);
  const fullText = getAllText(sections);
  let score = 0;

  if (fullText.trim().length === 0) {
    return {
      dimension: "AI Snippet Compatibility",
      score: 0,
      details: "No content to analyze",
    };
  }

  // Has list/bullet content (steps, modules, value_props)
  if (types.includes("steps") || types.includes("modules") || types.includes("value_props") || types.includes("modules_grid")) {
    score += 20;
  }

  // Has Q&A format (FAQ section)
  if (types.includes("faq")) score += 20;

  // Has definition-style content ("is a", "refers to", "means")
  const definitionPatterns = /\b(is a|refers to|means|defined as|known as|described as)\b/gi;
  const defMatches = fullText.match(definitionPatterns) ?? [];
  if (defMatches.length >= 2) score += 20;
  else if (defMatches.length >= 1) score += 12;

  // Has numbered or structured lists in text
  const listPatterns = /\b(\d+\.|•|→|step \d|phase \d)/gi;
  const listMatches = fullText.match(listPatterns) ?? [];
  if (listMatches.length >= 3) score += 15;
  else if (listMatches.length >= 1) score += 8;

  // Has comparison or "vs" content (great for AI snippets)
  const comparisonPatterns = /\b(vs\.?|versus|compared to|better than|unlike)\b/gi;
  const compMatches = fullText.match(comparisonPatterns) ?? [];
  if (compMatches.length >= 1) score += 10;

  // Content hierarchy (multiple section types = good hierarchy)
  const uniqueTypes = new Set(types);
  if (uniqueTypes.size >= 4) score += 15;
  else if (uniqueTypes.size >= 2) score += 8;

  const details =
    score >= 80
      ? "Content is highly compatible with AI snippet extraction"
      : score >= 50
        ? "Add more lists, definitions, and structured Q&A"
        : "Structure content with lists, FAQs, and clear definitions";

  return { dimension: "AI Snippet Compatibility", score: clamp(score), details };
}

// ---------------------------------------------------------------------------
// Main Scoring Function
// ---------------------------------------------------------------------------

export function scorePageAeo(page: PageData): AeoPageScore {
  const sections = getVisibleSections(page.sections);

  const dimensions: AeoDimensionScore[] = [
    analyzeSchemaRichness(page, sections),
    analyzeFaqCoverage(sections),
    analyzeDirectAnswerReadiness(sections),
    analyzeEntityMarkup(page, sections),
    analyzeSpeakableContent(sections),
    analyzeAiSnippetCompatibility(sections),
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

export function computeAeoOverview(pages: PageData[]): AeoScoresOverview {
  const pageScores = pages.map(scorePageAeo);

  const overallScore =
    pageScores.length > 0
      ? Math.round(
          pageScores.reduce((sum, p) => sum + p.overallScore, 0) / pageScores.length
        )
      : 0;

  // Average each dimension across all pages
  const dimensionNames = [
    "Schema Richness",
    "FAQ Coverage",
    "Direct Answer Readiness",
    "Entity Markup",
    "Speakable Content",
    "AI Snippet Compatibility",
  ];

  const dimensionAverages: AeoDimensionScore[] = dimensionNames.map((name) => {
    const scores = pageScores
      .map((p) => p.dimensions.find((d) => d.dimension === name)?.score ?? 0);
    const avg =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
    return {
      dimension: name,
      score: avg,
      details:
        avg >= 80
          ? "Excellent"
          : avg >= 60
            ? "Good"
            : avg >= 40
              ? "Needs Improvement"
              : "Poor",
    };
  });

  return { overallScore, dimensionAverages, pageScores };
}
