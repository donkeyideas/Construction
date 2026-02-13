import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IntegrationRow {
  id: string;
  company_id: string;
  provider_key: string;
  provider_name: string;
  description: string;
  category: "accounting" | "project_management" | "communication" | "payment";
  auth_type: "oauth2" | "api_key" | "webhook";
  status: "connected" | "disconnected" | "error";
  is_connected: boolean;
  config: Record<string, unknown> | null;
  connected_at: string | null;
  connected_by: string | null;
  last_sync_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationStats {
  connected: number;
  disconnected: number;
  error: number;
}

export interface CreateIntegrationData {
  provider_key: string;
  provider_name: string;
  description: string;
  category: "accounting" | "project_management" | "communication" | "payment";
  auth_type: "oauth2" | "api_key" | "webhook";
  config?: Record<string, unknown>;
}

export interface UpdateIntegrationData {
  config?: Record<string, unknown>;
  error_message?: string | null;
}

// ---------------------------------------------------------------------------
// getIntegrations
// ---------------------------------------------------------------------------

export async function getIntegrations(
  supabase: SupabaseClient,
  companyId: string
): Promise<IntegrationRow[]> {
  const { data, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getIntegrations error:", error);
    return [];
  }

  return (data ?? []) as IntegrationRow[];
}

// ---------------------------------------------------------------------------
// getIntegrationStats
// ---------------------------------------------------------------------------

export async function getIntegrationStats(
  supabase: SupabaseClient,
  companyId: string
): Promise<IntegrationStats> {
  const { data, error } = await supabase
    .from("integrations")
    .select("status")
    .eq("company_id", companyId);

  if (error) {
    console.error("getIntegrationStats error:", error);
    return { connected: 0, disconnected: 0, error: 0 };
  }

  const rows = data ?? [];
  return {
    connected: rows.filter((r) => r.status === "connected").length,
    disconnected: rows.filter((r) => r.status === "disconnected").length,
    error: rows.filter((r) => r.status === "error").length,
  };
}

// ---------------------------------------------------------------------------
// createIntegration
// ---------------------------------------------------------------------------

export async function createIntegration(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  data: CreateIntegrationData
): Promise<{ integration: IntegrationRow | null; error: string | null }> {
  const { data: row, error } = await supabase
    .from("integrations")
    .insert({
      company_id: companyId,
      provider_key: data.provider_key,
      provider_name: data.provider_name,
      description: data.description,
      category: data.category,
      auth_type: data.auth_type,
      config: data.config ?? {},
      status: "disconnected",
      is_connected: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("createIntegration error:", error);
    return { integration: null, error: error.message };
  }

  return { integration: row as IntegrationRow, error: null };
}

// ---------------------------------------------------------------------------
// updateIntegration
// ---------------------------------------------------------------------------

export async function updateIntegration(
  supabase: SupabaseClient,
  integrationId: string,
  data: UpdateIntegrationData
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("integrations")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", integrationId);

  if (error) {
    console.error("updateIntegration error:", error);
    return { error: error.message };
  }

  return { error: null };
}

// ---------------------------------------------------------------------------
// connectIntegration
// ---------------------------------------------------------------------------

export async function connectIntegration(
  supabase: SupabaseClient,
  integrationId: string,
  userId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("integrations")
    .update({
      is_connected: true,
      connected_at: new Date().toISOString(),
      connected_by: userId,
      status: "connected",
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", integrationId);

  if (error) {
    console.error("connectIntegration error:", error);
    return { error: error.message };
  }

  return { error: null };
}

// ---------------------------------------------------------------------------
// disconnectIntegration
// ---------------------------------------------------------------------------

export async function disconnectIntegration(
  supabase: SupabaseClient,
  integrationId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("integrations")
    .update({
      is_connected: false,
      status: "disconnected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", integrationId);

  if (error) {
    console.error("disconnectIntegration error:", error);
    return { error: error.message };
  }

  return { error: null };
}
