import { generateText } from "ai";
import {
  getLanguageModel,
  type ProviderConfig,
  type ProviderName,
} from "@/lib/ai/provider-router";
import { getPlatformSetting } from "@/lib/queries/platform-settings";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PLATFORM_LIMITS: Record<string, number> = {
  twitter: 280,
  tiktok: 300,
  facebook: 2000,
  instagram: 2200,
  linkedin: 3000,
};

export const TONE_OPTIONS = [
  "professional",
  "casual",
  "humorous",
  "authoritative",
  "inspiring",
  "educational",
  "promotional",
  "controversial",
] as const;

export type ToneOption = (typeof TONE_OPTIONS)[number];

export const PLATFORMS = [
  "twitter",
  "linkedin",
  "facebook",
  "instagram",
  "tiktok",
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeneratedPost {
  content: string;
  hashtags: string[];
  imagePrompt: string;
}

export interface GenerateOptions {
  platform: string;
  topic?: string;
  tone?: string;
  context?: string;
}

// ---------------------------------------------------------------------------
// Platform-specific prompt rules
// ---------------------------------------------------------------------------

const PLATFORM_RULES: Record<string, string> = {
  twitter: `- Maximum 280 characters (including hashtags)
- Punchy, attention-grabbing, concise
- Use 1-2 relevant hashtags only
- No fluff — every word counts`,

  linkedin: `- Professional tone, industry insights
- Up to 3000 characters but aim for 200-500 for engagement
- Use 3-5 relevant hashtags at the end
- Include a clear call to action
- Share value-driven content, thought leadership`,

  facebook: `- Conversational, engaging, relatable
- Up to 2000 characters, aim for 100-300
- Use 2-3 hashtags
- Ask a question or tell a story to drive engagement
- Encourage comments and shares`,

  instagram: `- Visual-first platform — describe the image in imagePrompt
- Up to 2200 characters for caption
- Use 5-10 relevant hashtags
- Emoji-friendly, warm tone
- Include a call to action`,

  tiktok: `- Maximum 300 characters
- Very casual, trend-aware, Gen-Z friendly
- Use 3-5 trending hashtags
- Hook in the first line
- Reference trends or challenges when possible`,
};

// ---------------------------------------------------------------------------
// AI Generation
// ---------------------------------------------------------------------------

async function getAIModel() {
  const provider = await getPlatformSetting("social_ai_provider");
  const apiKey = await getPlatformSetting("social_ai_api_key");
  const modelId = await getPlatformSetting("social_ai_model");

  if (!provider || !apiKey || !modelId) {
    throw new Error(
      "AI provider not configured. Go to Connections tab to set up an AI provider."
    );
  }

  const config: ProviderConfig = {
    id: "social-ai",
    provider_name: provider as ProviderName,
    api_key: apiKey,
    model_id: modelId,
    is_active: true,
    use_for_chat: true,
    use_for_documents: false,
    use_for_predictions: false,
    is_default: true,
    monthly_budget_limit: null,
    current_month_usage: null,
  };

  return getLanguageModel(config);
}

export async function generateSocialPost(
  opts: GenerateOptions
): Promise<GeneratedPost> {
  const model = await getAIModel();
  const limit = PLATFORM_LIMITS[opts.platform] || 500;
  const rules = PLATFORM_RULES[opts.platform] || "";

  const systemPrompt = `You are a social media content specialist for Buildwrk, a modern construction ERP and project management SaaS platform. Buildwrk helps construction companies manage projects, finances, safety, equipment, and teams.

Generate a ${opts.platform} post.
Topic: ${opts.topic || "construction technology and project management"}
Tone: ${opts.tone || "professional"}
Character limit: ${limit}

Platform-specific rules:
${rules}

${opts.context ? `Additional context: ${opts.context}` : ""}

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{"content": "your post text here", "hashtags": ["hashtag1", "hashtag2"], "imagePrompt": "description of an ideal image to pair with this post"}

Rules:
- content MUST be under ${limit} characters (not including hashtags that will be appended)
- hashtags should NOT include the # symbol
- imagePrompt should describe a professional, construction-industry relevant image
- Do NOT wrap the JSON in markdown code fences`;

  const maxTokens = limit <= 300 ? 200 : 600;

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: `Generate a ${opts.tone || "professional"} ${opts.platform} post about: ${opts.topic || "construction technology"}`,
    maxOutputTokens: maxTokens,
    temperature: 0.8,
  });

  return parseAIResponse(text);
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

function parseAIResponse(raw: string): GeneratedPost {
  // Strip potential markdown fences
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const parsed = JSON.parse(cleaned);
    return {
      content: String(parsed.content || "").trim(),
      hashtags: Array.isArray(parsed.hashtags)
        ? parsed.hashtags.map((h: string) => String(h).replace(/^#/, ""))
        : [],
      imagePrompt: String(parsed.imagePrompt || "").trim(),
    };
  } catch {
    // Fallback: treat the whole response as content
    return {
      content: cleaned.slice(0, 500),
      hashtags: [],
      imagePrompt: "",
    };
  }
}
