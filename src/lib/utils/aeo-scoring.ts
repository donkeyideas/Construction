// ---------------------------------------------------------------------------
// AEO (Answer Engine Optimization) Scoring Utility
//
// Analyzes CMS page sections for AI-readiness across 6 dimensions:
//   1. Schema Richness — structured sections, meta data, OG images
//   2. FAQ Coverage — Q&A content (formal FAQ + implicit Q&A patterns)
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

function isLegalPage(page: PageData): boolean {
  const slug = page.page_slug.toLowerCase();
  const title = page.title.toLowerCase();
  const legalPatterns = /(privacy|gdpr|terms|tos|legal|cookie|disclaimer|compliance|policy|dmca|coppa)/;
  return legalPatterns.test(slug) || legalPatterns.test(title);
}

// Extract FAQ items from FAQ-type sections
function extractFaqItems(sections: Section[]): { question: string; answer: string }[] {
  const items: { question: string; answer: string }[] = [];
  for (const section of sections) {
    if ((section.type ?? "").toLowerCase() !== "faq") continue;
    const content = section.content;
    if (!content || typeof content !== "object") continue;

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

  // Base credit for published page with content
  score += 12;

  // Structured section types
  if (types.includes("faq")) score += 15;
  if (types.includes("pricing")) score += 12;
  if (types.includes("about") || types.includes("hero")) score += 10;
  if (types.includes("steps") || types.includes("modules")) score += 10;
  if (types.includes("value_props") || types.includes("modules_grid")) score += 8;
  if (types.includes("cta")) score += 5;

  // Meta data completeness
  if (page.meta_title && page.meta_title.trim().length > 0) score += 12;
  if (page.meta_description && page.meta_description.trim().length > 0) score += 12;
  if (page.og_image_url && page.og_image_url.trim().length > 0) score += 5;

  // Section count
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
// 2. FAQ Coverage — Generous scoring with implicit Q&A detection
// ---------------------------------------------------------------------------

function analyzeFaqCoverage(sections: Section[]): AeoDimensionScore {
  const faqItems = extractFaqItems(sections);
  const fullText = getAllText(sections);
  const types = getSectionTypes(sections);
  let score = 0;

  if (faqItems.length > 0) {
    // Has formal FAQ section — full scoring
    score += 25;
    score += Math.min(faqItems.length * 5, 35);

    const qualityAnswers = faqItems.filter((f) => f.answer.length > 50).length;
    const qualityRatio = faqItems.length > 0 ? qualityAnswers / faqItems.length : 0;
    score += Math.round(qualityRatio * 25);

    const deepAnswers = faqItems.filter((f) => f.answer.length > 150).length;
    const depthRatio = faqItems.length > 0 ? deepAnswers / faqItems.length : 0;
    score += Math.round(depthRatio * 15);

    return {
      dimension: "FAQ Coverage",
      score: clamp(score),
      details: score >= 80
        ? `${faqItems.length} well-crafted FAQ items`
        : `${faqItems.length} FAQ items; expand answers for better AI pickup`,
    };
  }

  // No formal FAQ — generous credit for implicit Q&A content

  // Base credit for having any content
  score += 15;

  // Question patterns in text
  const questionPatterns = fullText.match(/\b(what|how|why|when|where|who|can|does|is it|do I|should)\b[^.?!]*\?/gi) ?? [];
  if (questionPatterns.length >= 3) score += 22;
  else if (questionPatterns.length >= 1) score += 14;

  // Definition/answer patterns (these implicitly answer questions)
  const defPatterns = fullText.match(/\b(is a|refers to|means|helps you|allows you|enables|provides|designed to|built for|ensures|streamlines|simplifies|manages|tracks|automates|includes|features|covers|addresses|handles|processes|outlines|describes|explains|details)\b/gi) ?? [];
  if (defPatterns.length >= 6) score += 22;
  else if (defPatterns.length >= 3) score += 16;
  else if (defPatterns.length >= 1) score += 10;

  // Structured sections that serve as implicit Q&A
  if (types.includes("steps")) score += 12;
  if (types.includes("modules") || types.includes("modules_grid")) score += 10;
  if (types.includes("value_props")) score += 10;
  if (types.includes("about")) score += 8;
  if (types.includes("pricing")) score += 8;
  if (types.includes("hero")) score += 6;
  if (types.includes("cta")) score += 4;

  // Content with clear headings/titles in sections
  const sectionCount = sections.length;
  if (sectionCount >= 5) score += 10;
  else if (sectionCount >= 3) score += 6;
  else if (sectionCount >= 1) score += 3;

  // Content volume — longer content implicitly answers more questions
  const words = fullText.split(/\s+/).filter(Boolean);
  if (words.length >= 200) score += 10;
  else if (words.length >= 50) score += 5;

  const details =
    score >= 50
      ? "Good implicit Q&A content through structured sections"
      : score >= 25
        ? "Some Q&A patterns found; add a formal FAQ section for best results"
        : "No FAQ content found. Add structured Q&A or FAQ section.";

  return { dimension: "FAQ Coverage", score: clamp(score), details };
}

// ---------------------------------------------------------------------------
// 3. Direct Answer Readiness
// ---------------------------------------------------------------------------

function analyzeDirectAnswerReadiness(page: PageData, sections: Section[]): AeoDimensionScore {
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

  const legal = isLegalPage(page);
  const legalPenalty = legal ? 0.6 : 1.0;

  // Base credit
  score += 8;

  // Content volume
  if (words.length > 100) score += 12;
  if (words.length > 300) score += 8;

  // Concise paragraphs
  const paragraphs = fullText
    .split(/\n{2,}|\.\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 10);

  const conciseParagraphs = paragraphs.filter((p) => p.length < 300).length;
  const conciseRatio = paragraphs.length > 0 ? conciseParagraphs / paragraphs.length : 0;
  score += Math.round(conciseRatio * 22);

  // First section has concise content
  const firstSectionText = sections.length > 0 ? getSectionText(sections[0]) : "";
  const firstSentence = firstSectionText.split(/[.!?]/)[0]?.trim() ?? "";
  if (firstSentence.length > 10 && firstSentence.length < 250) score += 18;

  // Definitive statements
  const definitivePatterns = /\b(is|are|provides|offers|enables|helps|allows|delivers|includes|ensures|streamlines)\b/gi;
  const definitiveMatches = fullText.match(definitivePatterns) ?? [];
  if (definitiveMatches.length >= 5) score += 18;
  else if (definitiveMatches.length >= 2) score += 12;
  else if (definitiveMatches.length >= 1) score += 6;

  // Numbers/statistics
  const numberMatches = fullText.match(/\d+(\.\d+)?%|\$[\d,]+|\d{2,}/g) ?? [];
  if (numberMatches.length >= 2) score += 14;
  else if (numberMatches.length >= 1) score += 8;

  // Apply legal penalty
  score = Math.round(score * legalPenalty);

  const details = legal
    ? "Legal/policy content is poorly suited for AI direct answers"
    : score >= 70
      ? "Content is well-structured for direct AI answers"
      : score >= 40
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

  // Base credit
  score += 8;

  // Brand name references
  const brandMatches = fullText.match(/\bBuildwrk\b/gi) ?? [];
  if (brandMatches.length >= 3) score += 18;
  else if (brandMatches.length >= 1) score += 10;

  // Product/domain terms — slightly broader
  const domainTerms = /\b(construction management|project management|ERP|SaaS|budget tracking|scheduling|RFI|submittal|change order|safety compliance|document management|financial management|property management)\b/gi;
  const domainMatches = fullText.match(domainTerms) ?? [];
  if (domainMatches.length >= 3) score += 16;
  else if (domainMatches.length >= 1) score += 10;

  // General industry terms (lighter credit)
  const industryTerms = /\b(contractor|inspector|foreman|superintendent|vendor|subcontractor|architect|engineer)\b/gi;
  const industryMatches = fullText.match(industryTerms) ?? [];
  if (industryMatches.length >= 2) score += 8;
  else if (industryMatches.length >= 1) score += 4;

  // Capitalized proper nouns
  const properNouns = fullText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g) ?? [];
  const uniqueNouns = new Set(properNouns);
  if (uniqueNouns.size >= 3) score += 12;
  else if (uniqueNouns.size >= 1) score += 6;

  // Numeric data
  const numbers = fullText.match(/\$[\d,]+\.?\d*|\d+%|\d{3,}/g) ?? [];
  if (numbers.length >= 3) score += 12;
  else if (numbers.length >= 1) score += 6;

  // Meta data entity signals
  if (page.meta_title && page.meta_title.length > 15) score += 8;
  if (page.meta_description && page.meta_description.length > 40) score += 8;

  // Legal pages penalty (moderate — legal content still has entities)
  if (isLegalPage(page)) {
    score = Math.round(score * 0.65);
  }

  const details =
    score >= 70
      ? "Strong entity markup with brands, numbers, and domain terms"
      : score >= 40
        ? "Add more specific entities and domain terminology"
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

  // Base credit
  score += 10;

  // Multiple sections
  if (visibleSections.length >= 3) score += 12;
  else if (visibleSections.length >= 2) score += 8;

  // Section types indicate structure
  const types = getSectionTypes(visibleSections);
  const structuredTypes = ["hero", "about", "steps", "faq", "pricing", "modules", "cta", "value_props", "modules_grid"];
  const hasStructure = types.filter((t) => structuredTypes.includes(t)).length;
  if (hasStructure >= 3) score += 18;
  else if (hasStructure >= 2) score += 12;
  else if (hasStructure >= 1) score += 6;

  // Average content length per section
  const sectionTexts = visibleSections.map(getSectionText);
  const wordCounts = sectionTexts.map((t) => t.split(/\s+/).filter(Boolean).length);
  const avgWords = wordCounts.length > 0 ? wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length : 0;

  if (avgWords >= 20 && avgWords <= 300) score += 22;
  else if (avgWords >= 5 && avgWords <= 500) score += 14;
  else if (avgWords > 0) score += 6;

  // Short sentences
  const fullText = sectionTexts.join(" ");
  const sentences = fullText.split(/[.!?]+/).filter((s) => s.trim().length > 5);
  const shortSentences = sentences.filter((s) => s.trim().split(/\s+/).length <= 25).length;
  const shortRatio = sentences.length > 0 ? shortSentences / sentences.length : 0;
  score += Math.round(shortRatio * 18);

  // Step-by-step or list content
  if (types.includes("steps")) score += 10;
  if (types.includes("faq")) score += 10;

  const details =
    score >= 70
      ? "Content is well-structured and speakable for AI assistants"
      : score >= 40
        ? "Shorten sentences and add more structured sections"
        : "Restructure content with shorter sections and clearer headers";

  return { dimension: "Speakable Content", score: clamp(score), details };
}

// ---------------------------------------------------------------------------
// 6. AI Snippet Compatibility — Generous detection
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

  // Base credit for having content
  score += 12;

  // Has list/bullet content
  const listTypes = types.filter((t) =>
    ["steps", "modules", "value_props", "modules_grid"].includes(t)
  );
  if (listTypes.length >= 2) score += 20;
  else if (listTypes.length >= 1) score += 14;

  // Has FAQ
  if (types.includes("faq")) score += 12;

  // Has about/hero (introductory snippets)
  if (types.includes("about") || types.includes("hero")) score += 8;

  // Has pricing (comparison snippets)
  if (types.includes("pricing")) score += 6;

  // Has CTA (action snippets)
  if (types.includes("cta")) score += 4;

  // Definition-style content — very broad matching
  const definitionPatterns = /\b(is a|refers to|means|defined as|known as|is the|helps|enables|allows|provides|designed to|built for|ensures|streamlines|simplifies|manages|automates|tracks|supports|offers|includes|features|covers|handles|delivers|processes|outlines)\b/gi;
  const defMatches = fullText.match(definitionPatterns) ?? [];
  if (defMatches.length >= 5) score += 16;
  else if (defMatches.length >= 2) score += 10;
  else if (defMatches.length >= 1) score += 6;

  // Numbered or structured lists in text
  const listPatterns = /\b(\d+\.|•|→|step \d|phase \d)/gi;
  const listMatches = fullText.match(listPatterns) ?? [];
  if (listMatches.length >= 3) score += 10;
  else if (listMatches.length >= 1) score += 5;

  // Short extractable sentences
  const sentences = fullText.split(/[.!?]+/).filter((s) => s.trim().length > 15);
  const extractable = sentences.filter((s) => {
    const wc = s.trim().split(/\s+/).length;
    return wc >= 4 && wc <= 25;
  });
  const extractRatio = sentences.length > 0 ? extractable.length / sentences.length : 0;
  score += Math.round(extractRatio * 16);

  // Content hierarchy
  const uniqueTypes = new Set(types);
  if (uniqueTypes.size >= 4) score += 12;
  else if (uniqueTypes.size >= 3) score += 8;
  else if (uniqueTypes.size >= 2) score += 5;
  else if (uniqueTypes.size >= 1) score += 2;

  const details =
    score >= 70
      ? "Content is highly compatible with AI snippet extraction"
      : score >= 40
        ? "Add more lists, definitions, and structured content"
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
    analyzeDirectAnswerReadiness(page, sections),
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
