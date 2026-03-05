import type { LanguageModel } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getProviderForTask,
  getLanguageModel,
  buildProviderConfig,
} from "./provider-router";
import type { ProviderConfig, AITaskType } from "./provider-router";
import { decrypt } from "./encryption";

/**
 * Resolve an AI provider — either user-selected or the default for the task.
 * Falls back to default routing if the selected provider is unavailable.
 */
export async function resolveProvider(
  supabase: SupabaseClient,
  companyId: string,
  taskType: AITaskType,
  selectedProviderId?: string
): Promise<{ model: LanguageModel; config: ProviderConfig } | null> {
  if (selectedProviderId) {
    try {
      const { data: row } = await supabase
        .from("ai_provider_configs")
        .select("*")
        .eq("id", selectedProviderId)
        .eq("company_id", companyId)
        .eq("is_active", true)
        .single();

      if (row) {
        const config = buildProviderConfig(row);
        const model = getLanguageModel(config);
        return { model, config };
      }
    } catch {
      // Fall through to default
    }
  }

  // Default: try task-specific, then fall back to chat
  let result = await getProviderForTask(supabase, companyId, taskType);
  if (!result && taskType !== "chat") {
    result = await getProviderForTask(supabase, companyId, "chat");
  }
  return result;
}
