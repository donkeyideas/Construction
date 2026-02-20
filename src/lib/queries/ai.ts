import type { SupabaseClient } from "@supabase/supabase-js";
import { encrypt, decrypt } from "@/lib/ai/encryption";
import type { AITaskType, ProviderName } from "@/lib/ai/provider-router";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AIProviderRow {
  id: string;
  company_id: string;
  provider_name: ProviderName;
  api_key_encrypted: string; // encrypted in database
  model_id: string;
  is_active: boolean;
  use_for_chat: boolean;
  use_for_documents: boolean;
  use_for_predictions: boolean;
  is_default: boolean;
  monthly_budget_limit: number | null;
  current_month_usage: number | null;
  created_at: string;
  updated_at: string;
}

export interface AIUsageLogRow {
  id: string;
  company_id: string;
  user_id: string;
  provider_name: string;
  model_id: string;
  task_type: string | null;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
  created_at: string;
}

export interface AIUsageSummary {
  provider_name: string;
  model_id: string;
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_estimated_cost: number;
}

export interface CreateAIProviderData {
  provider_name: ProviderName;
  api_key: string; // plaintext - will be encrypted before storing
  model_id: string;
  is_active?: boolean;
  use_for_chat?: boolean;
  use_for_documents?: boolean;
  use_for_predictions?: boolean;
  is_default?: boolean;
  monthly_budget_limit?: number | null;
}

export interface UpdateAIProviderData {
  provider_name?: ProviderName;
  api_key?: string; // plaintext - will be encrypted if provided
  model_id?: string;
  is_active?: boolean;
  use_for_chat?: boolean;
  use_for_documents?: boolean;
  use_for_predictions?: boolean;
  is_default?: boolean;
  monthly_budget_limit?: number | null;
}

export interface LogAIUsageData {
  company_id: string;
  provider_name: string;
  user_id: string;
  task_type: string;
  model_id: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
}

// ---------------------------------------------------------------------------
// getAIProviders - list all configured providers for a company
// ---------------------------------------------------------------------------

export async function getAIProviders(
  supabase: SupabaseClient,
  companyId: string
): Promise<AIProviderRow[]> {
  const { data, error } = await supabase
    .from("ai_provider_configs")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getAIProviders error:", error);
    return [];
  }

  return (data ?? []) as AIProviderRow[];
}

// ---------------------------------------------------------------------------
// getAIProviderById - single provider record
// ---------------------------------------------------------------------------

export async function getAIProviderById(
  supabase: SupabaseClient,
  id: string
): Promise<AIProviderRow | null> {
  const { data, error } = await supabase
    .from("ai_provider_configs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("getAIProviderById error:", error);
    return null;
  }

  return data as AIProviderRow;
}

// ---------------------------------------------------------------------------
// createAIProvider - add a new provider (encrypts API key before storing)
// ---------------------------------------------------------------------------

export async function createAIProvider(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateAIProviderData
): Promise<{ provider: AIProviderRow | null; error: string | null }> {
  const encryptedKey = encrypt(input.api_key);

  // If this provider is set as default, unset other defaults for the company
  if (input.is_default) {
    await supabase
      .from("ai_provider_configs")
      .update({ is_default: false })
      .eq("company_id", companyId)
      .eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("ai_provider_configs")
    .insert({
      company_id: companyId,
      provider_name: input.provider_name,
      api_key_encrypted: encryptedKey,
      model_id: input.model_id,
      is_active: input.is_active ?? true,
      use_for_chat: input.use_for_chat ?? false,
      use_for_documents: input.use_for_documents ?? false,
      use_for_predictions: input.use_for_predictions ?? false,
      is_default: input.is_default ?? false,
      monthly_budget_limit: input.monthly_budget_limit ?? null,
      current_month_usage: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("createAIProvider error:", error);
    return { provider: null, error: error.message };
  }

  return { provider: data as AIProviderRow, error: null };
}

// ---------------------------------------------------------------------------
// updateAIProvider - update an existing provider
// ---------------------------------------------------------------------------

export async function updateAIProvider(
  supabase: SupabaseClient,
  id: string,
  input: UpdateAIProviderData
): Promise<{ provider: AIProviderRow | null; error: string | null }> {
  // Build the update payload
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.provider_name !== undefined) {
    updatePayload.provider_name = input.provider_name;
  }
  if (input.api_key !== undefined) {
    updatePayload.api_key_encrypted = encrypt(input.api_key);
  }
  if (input.model_id !== undefined) {
    updatePayload.model_id = input.model_id;
  }
  if (input.is_active !== undefined) {
    updatePayload.is_active = input.is_active;
  }
  if (input.use_for_chat !== undefined) {
    updatePayload.use_for_chat = input.use_for_chat;
  }
  if (input.use_for_documents !== undefined) {
    updatePayload.use_for_documents = input.use_for_documents;
  }
  if (input.use_for_predictions !== undefined) {
    updatePayload.use_for_predictions = input.use_for_predictions;
  }
  if (input.is_default !== undefined) {
    updatePayload.is_default = input.is_default;

    // If setting as default, unset other defaults first
    if (input.is_default) {
      const { data: existing } = await supabase
        .from("ai_provider_configs")
        .select("company_id")
        .eq("id", id)
        .single();

      if (existing) {
        await supabase
          .from("ai_provider_configs")
          .update({ is_default: false })
          .eq("company_id", existing.company_id)
          .eq("is_default", true)
          .neq("id", id);
      }
    }
  }
  if (input.monthly_budget_limit !== undefined) {
    updatePayload.monthly_budget_limit = input.monthly_budget_limit;
  }

  const { data, error } = await supabase
    .from("ai_provider_configs")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("updateAIProvider error:", error);
    return { provider: null, error: error.message };
  }

  return { provider: data as AIProviderRow, error: null };
}

// ---------------------------------------------------------------------------
// deleteAIProvider - remove a provider config
// ---------------------------------------------------------------------------

export async function deleteAIProvider(
  supabase: SupabaseClient,
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("ai_provider_configs")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteAIProvider error:", error);
    return { error: error.message };
  }

  return { error: null };
}

// ---------------------------------------------------------------------------
// getAIUsageSummary - monthly usage aggregated by provider
// ---------------------------------------------------------------------------

export async function getAIUsageSummary(
  supabase: SupabaseClient,
  companyId: string
): Promise<AIUsageSummary[]> {
  // Get the start of the current month
  const now = new Date();
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();

  const { data, error } = await supabase
    .from("ai_usage_log")
    .select(
      "provider_name, model_id, input_tokens, output_tokens, estimated_cost"
    )
    .eq("company_id", companyId)
    .gte("created_at", startOfMonth);

  if (error) {
    console.error("getAIUsageSummary error:", error);
    return [];
  }

  // Aggregate by provider_name
  const map = new Map<string, AIUsageSummary>();

  for (const row of data ?? []) {
    const key = row.provider_name as string;
    const existing = map.get(key);

    if (existing) {
      existing.total_requests += 1;
      existing.total_input_tokens += row.input_tokens ?? 0;
      existing.total_output_tokens += row.output_tokens ?? 0;
      existing.total_estimated_cost += Number(row.estimated_cost ?? 0);
    } else {
      map.set(key, {
        provider_name: key,
        model_id: row.model_id ?? "",
        total_requests: 1,
        total_input_tokens: row.input_tokens ?? 0,
        total_output_tokens: row.output_tokens ?? 0,
        total_estimated_cost: Number(row.estimated_cost ?? 0),
      });
    }
  }

  return Array.from(map.values());
}

// ---------------------------------------------------------------------------
// logAIUsage - insert a usage log entry
// ---------------------------------------------------------------------------

export async function logAIUsage(
  supabase: SupabaseClient,
  input: LogAIUsageData
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("ai_usage_log").insert({
    company_id: input.company_id,
    provider_name: input.provider_name,
    user_id: input.user_id,
    task_type: input.task_type,
    model_id: input.model_id,
    input_tokens: input.input_tokens,
    output_tokens: input.output_tokens,
    estimated_cost: input.estimated_cost,
  });

  if (error) {
    console.error("logAIUsage error:", error);
    return { error: error.message };
  }

  // Also update the current_month_usage on the provider config
  const { data: config } = await supabase
    .from("ai_provider_configs")
    .select("id, current_month_usage")
    .eq("company_id", input.company_id)
    .eq("provider_name", input.provider_name)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (config) {
    const newUsage =
      Number(config.current_month_usage ?? 0) + input.estimated_cost;

    await supabase
      .from("ai_provider_configs")
      .update({ current_month_usage: newUsage })
      .eq("id", config.id);
  }

  return { error: null };
}

// ---------------------------------------------------------------------------
// getDefaultProviderForTask - get the active default provider for a task type
// ---------------------------------------------------------------------------

const TASK_COLUMN_MAP: Record<AITaskType, string> = {
  chat: "use_for_chat",
  documents: "use_for_documents",
  predictions: "use_for_predictions",
};

export async function getDefaultProviderForTask(
  supabase: SupabaseClient,
  companyId: string,
  taskType: AITaskType
): Promise<AIProviderRow | null> {
  const taskColumn = TASK_COLUMN_MAP[taskType];

  const { data, error } = await supabase
    .from("ai_provider_configs")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .eq(taskColumn, true)
    .order("is_default", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error("getDefaultProviderForTask error:", error);
    return null;
  }

  return data as AIProviderRow;
}

// ---------------------------------------------------------------------------
// maskApiKey - show only last 4 characters of an API key
// ---------------------------------------------------------------------------

export function maskApiKey(encryptedKey: string): string {
  try {
    const decrypted = decrypt(encryptedKey);
    if (decrypted.length <= 4) {
      return "****";
    }
    return "*".repeat(decrypted.length - 4) + decrypted.slice(-4);
  } catch {
    return "****";
  }
}
