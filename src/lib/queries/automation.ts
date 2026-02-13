import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AutomationCondition {
  field: string;
  operator: string;
  value: string | string[];
}

export interface AutomationAction {
  type: string;
  config: Record<string, unknown>;
}

export interface AutomationRuleRow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_entity: string;
  trigger_config: Record<string, unknown> | null;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  is_enabled: boolean;
  last_run_at: string | null;
  run_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationLogRow {
  id: string;
  company_id: string;
  rule_id: string;
  rule_name: string;
  trigger_entity: string;
  entity_id: string | null;
  status: "success" | "failed" | "skipped";
  actions_executed: AutomationAction[];
  error_message: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface AutomationStats {
  total: number;
  enabled: number;
  disabled: number;
  executionsToday: number;
}

export interface CreateRuleData {
  name: string;
  description?: string;
  trigger_type: string;
  trigger_entity: string;
  trigger_config?: Record<string, unknown>;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}

export interface UpdateRuleData {
  name?: string;
  description?: string;
  trigger_type?: string;
  trigger_entity?: string;
  trigger_config?: Record<string, unknown>;
  conditions?: AutomationCondition[];
  actions?: AutomationAction[];
}

// ---------------------------------------------------------------------------
// getAutomationRules
// ---------------------------------------------------------------------------

export async function getAutomationRules(
  supabase: SupabaseClient,
  companyId: string
): Promise<AutomationRuleRow[]> {
  const { data, error } = await supabase
    .from("automation_rules")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAutomationRules error:", error);
    return [];
  }

  return (data ?? []) as AutomationRuleRow[];
}

// ---------------------------------------------------------------------------
// getAutomationStats
// ---------------------------------------------------------------------------

export async function getAutomationStats(
  supabase: SupabaseClient,
  companyId: string
): Promise<AutomationStats> {
  const { data: rules, error: rulesError } = await supabase
    .from("automation_rules")
    .select("is_enabled")
    .eq("company_id", companyId);

  if (rulesError) {
    console.error("getAutomationStats rules error:", rulesError);
    return { total: 0, enabled: 0, disabled: 0, executionsToday: 0 };
  }

  const allRules = rules ?? [];
  const total = allRules.length;
  const enabled = allRules.filter((r) => r.is_enabled).length;
  const disabled = total - enabled;

  // Count executions today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count, error: logError } = await supabase
    .from("automation_logs")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .gte("created_at", todayStart.toISOString());

  if (logError) {
    console.error("getAutomationStats logs error:", logError);
  }

  return {
    total,
    enabled,
    disabled,
    executionsToday: count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// createRule
// ---------------------------------------------------------------------------

export async function createRule(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  data: CreateRuleData
): Promise<{ rule: AutomationRuleRow | null; error: string | null }> {
  const { data: row, error } = await supabase
    .from("automation_rules")
    .insert({
      company_id: companyId,
      created_by: userId,
      name: data.name,
      description: data.description || null,
      trigger_type: data.trigger_type,
      trigger_entity: data.trigger_entity,
      trigger_config: data.trigger_config || {},
      conditions: data.conditions,
      actions: data.actions,
      is_enabled: true,
      run_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("createRule error:", error);
    return { rule: null, error: error.message };
  }

  return { rule: row as AutomationRuleRow, error: null };
}

// ---------------------------------------------------------------------------
// updateRule
// ---------------------------------------------------------------------------

export async function updateRule(
  supabase: SupabaseClient,
  ruleId: string,
  data: UpdateRuleData
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("automation_rules")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", ruleId);

  if (error) {
    console.error("updateRule error:", error);
    return { error: error.message };
  }

  return { error: null };
}

// ---------------------------------------------------------------------------
// toggleRule
// ---------------------------------------------------------------------------

export async function toggleRule(
  supabase: SupabaseClient,
  ruleId: string,
  enabled: boolean
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("automation_rules")
    .update({
      is_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ruleId);

  if (error) {
    console.error("toggleRule error:", error);
    return { error: error.message };
  }

  return { error: null };
}

// ---------------------------------------------------------------------------
// getAutomationLogs
// ---------------------------------------------------------------------------

export async function getAutomationLogs(
  supabase: SupabaseClient,
  companyId: string,
  filters?: { status?: string; startDate?: string; endDate?: string; limit?: number; offset?: number }
): Promise<AutomationLogRow[]> {
  let query = supabase
    .from("automation_logs")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.startDate) {
    query = query.gte("created_at", filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit ?? 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getAutomationLogs error:", error);
    return [];
  }

  return (data ?? []) as AutomationLogRow[];
}
