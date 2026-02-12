import type { LanguageModel } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createCohere } from "@ai-sdk/cohere";
import { createXai } from "@ai-sdk/xai";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";

import { decrypt } from "./encryption";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AITaskType = "chat" | "documents" | "predictions";

export type ProviderName =
  | "openai"
  | "anthropic"
  | "google"
  | "groq"
  | "mistral"
  | "cohere"
  | "xai"
  | "bedrock";

export interface ProviderConfig {
  id: string;
  provider_name: ProviderName;
  api_key: string; // decrypted
  model_id: string;
  is_active: boolean;
  use_for_chat: boolean;
  use_for_documents: boolean;
  use_for_predictions: boolean;
  is_default: boolean;
  monthly_budget_limit: number | null;
  current_month_usage: number | null;
}

// ---------------------------------------------------------------------------
// Map task type to the corresponding database column
// ---------------------------------------------------------------------------

const TASK_COLUMN_MAP: Record<AITaskType, string> = {
  chat: "use_for_chat",
  documents: "use_for_documents",
  predictions: "use_for_predictions",
};

// ---------------------------------------------------------------------------
// getLanguageModel - instantiate a Vercel AI SDK model from a provider config
// ---------------------------------------------------------------------------

export function getLanguageModel(config: ProviderConfig): LanguageModel {
  switch (config.provider_name) {
    case "openai": {
      const provider = createOpenAI({ apiKey: config.api_key });
      return provider(config.model_id);
    }
    case "anthropic": {
      const provider = createAnthropic({ apiKey: config.api_key });
      return provider(config.model_id);
    }
    case "google": {
      const provider = createGoogleGenerativeAI({ apiKey: config.api_key });
      return provider(config.model_id);
    }
    case "groq": {
      const provider = createGroq({ apiKey: config.api_key });
      return provider(config.model_id);
    }
    case "mistral": {
      const provider = createMistral({ apiKey: config.api_key });
      return provider(config.model_id);
    }
    case "cohere": {
      const provider = createCohere({ apiKey: config.api_key });
      return provider(config.model_id);
    }
    case "xai": {
      const provider = createXai({ apiKey: config.api_key });
      return provider(config.model_id);
    }
    case "bedrock": {
      const provider = createAmazonBedrock({
        region: process.env.AWS_REGION ?? "us-east-1",
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      });
      return provider(config.model_id);
    }
    default:
      throw new Error(`Unsupported AI provider: ${config.provider_name}`);
  }
}

// ---------------------------------------------------------------------------
// getProviderForTask - fetch the best matching provider config for a company
// ---------------------------------------------------------------------------

export async function getProviderForTask(
  supabase: SupabaseClient,
  companyId: string,
  taskType: AITaskType
): Promise<{ model: LanguageModel; config: ProviderConfig } | null> {
  const taskColumn = TASK_COLUMN_MAP[taskType];

  // Query active providers for this company that support the requested task
  const { data: rows, error } = await supabase
    .from("ai_provider_configs")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .eq(taskColumn, true)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getProviderForTask error:", error);
    return null;
  }

  if (!rows || rows.length === 0) {
    return null;
  }

  // First row is preferred (is_default = true sorts first)
  const row = rows[0];

  // Check budget limits - skip providers that have exceeded their monthly budget
  if (
    row.monthly_budget_limit !== null &&
    row.current_month_usage !== null &&
    Number(row.current_month_usage) >= Number(row.monthly_budget_limit)
  ) {
    // Try next provider that hasn't exceeded budget
    const fallback = rows.find(
      (r: { monthly_budget_limit: number | null; current_month_usage: number | null }) =>
        r.monthly_budget_limit === null ||
        r.current_month_usage === null ||
        Number(r.current_month_usage) < Number(r.monthly_budget_limit)
    );

    if (!fallback) {
      return null; // All providers over budget
    }

    const config = buildProviderConfig(fallback);
    const model = getLanguageModel(config);
    return { model, config };
  }

  const config = buildProviderConfig(row);
  const model = getLanguageModel(config);
  return { model, config };
}

// ---------------------------------------------------------------------------
// Helper: build a ProviderConfig from a raw database row (decrypts API key)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildProviderConfig(row: any): ProviderConfig {
  return {
    id: row.id,
    provider_name: row.provider_name as ProviderName,
    api_key: decrypt(row.api_key),
    model_id: row.model_id,
    is_active: row.is_active,
    use_for_chat: row.use_for_chat,
    use_for_documents: row.use_for_documents,
    use_for_predictions: row.use_for_predictions,
    is_default: row.is_default,
    monthly_budget_limit: row.monthly_budget_limit,
    current_month_usage: row.current_month_usage,
  };
}
