import { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OpportunityStage =
  | "lead"
  | "qualification"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type BidStatus =
  | "in_progress"
  | "submitted"
  | "won"
  | "lost"
  | "no_bid";

export interface Opportunity {
  id: string;
  company_id: string;
  name: string;
  client_name: string | null;
  client_contact: string | null;
  client_email: string | null;
  client_phone: string | null;
  project_type: string | null;
  estimated_value: number | null;
  probability_pct: number | null;
  weighted_value: number | null;
  stage: OpportunityStage;
  source: string | null;
  assigned_to: string | null;
  expected_close_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  assigned_user?: { full_name: string | null; email: string | null } | null;
}

export interface Bid {
  id: string;
  company_id: string;
  opportunity_id: string | null;
  bid_number: string;
  project_name: string;
  client_name: string | null;
  bid_date: string | null;
  due_date: string | null;
  status: BidStatus;
  estimated_cost: number | null;
  bid_amount: number | null;
  margin_pct: number | null;
  scope_description: string | null;
  line_items: Record<string, unknown>[] | null;
  submitted_by: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineSummary {
  totalPipelineValue: number;
  weightedValue: number;
  winRate: number;
  avgDealSize: number;
  stageBreakdown: {
    stage: OpportunityStage;
    count: number;
    value: number;
  }[];
}

export interface OpportunityFilters {
  stage?: OpportunityStage;
  search?: string;
  assignedTo?: string;
}

export interface BidFilters {
  status?: BidStatus;
  search?: string;
}

// ---------------------------------------------------------------------------
// Opportunity Queries
// ---------------------------------------------------------------------------

export async function getOpportunities(
  supabase: SupabaseClient,
  companyId: string,
  filters?: OpportunityFilters
): Promise<Opportunity[]> {
  let query = supabase
    .from("opportunities")
    .select(
      "*, user_profiles!opportunities_assignee_profile_fkey(full_name, email)"
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (filters?.stage) {
    query = query.eq("stage", filters.stage);
  }

  if (filters?.assignedTo) {
    query = query.eq("assigned_to", filters.assignedTo);
  }

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("getOpportunities error:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    ...row,
    assigned_user: row.user_profiles as unknown as {
      full_name: string | null;
      email: string | null;
    } | null,
  }));
}

export async function getOpportunityById(
  supabase: SupabaseClient,
  id: string
): Promise<Opportunity | null> {
  const { data, error } = await supabase
    .from("opportunities")
    .select(
      "*, user_profiles!opportunities_assignee_profile_fkey(full_name, email)"
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    ...data,
    assigned_user: data.user_profiles as unknown as {
      full_name: string | null;
      email: string | null;
    } | null,
  };
}

export async function createOpportunity(
  supabase: SupabaseClient,
  companyId: string,
  data: Partial<Opportunity>
): Promise<{ opportunity: Opportunity | null; error: string | null }> {
  const { data: result, error } = await supabase
    .from("opportunities")
    .insert({
      company_id: companyId,
      name: data.name,
      client_name: data.client_name,
      client_contact: data.client_contact,
      client_email: data.client_email,
      client_phone: data.client_phone,
      project_type: data.project_type,
      estimated_value: data.estimated_value,
      probability_pct: data.probability_pct,
      stage: data.stage || "lead",
      source: data.source,
      assigned_to: data.assigned_to,
      expected_close_date: data.expected_close_date,
      notes: data.notes,
    })
    .select()
    .single();

  if (error) {
    return { opportunity: null, error: error.message };
  }

  return { opportunity: result, error: null };
}

export async function updateOpportunity(
  supabase: SupabaseClient,
  id: string,
  data: Partial<Opportunity>
): Promise<{ opportunity: Opportunity | null; error: string | null }> {
  const { data: result, error } = await supabase
    .from("opportunities")
    .update({
      name: data.name,
      client_name: data.client_name,
      client_contact: data.client_contact,
      client_email: data.client_email,
      client_phone: data.client_phone,
      project_type: data.project_type,
      estimated_value: data.estimated_value,
      probability_pct: data.probability_pct,
      stage: data.stage,
      source: data.source,
      assigned_to: data.assigned_to,
      expected_close_date: data.expected_close_date,
      notes: data.notes,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { opportunity: null, error: error.message };
  }

  return { opportunity: result, error: null };
}

// ---------------------------------------------------------------------------
// Bid Queries
// ---------------------------------------------------------------------------

export async function getBids(
  supabase: SupabaseClient,
  companyId: string,
  filters?: BidFilters
): Promise<Bid[]> {
  let query = supabase
    .from("bids")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.search) {
    query = query.or(
      `project_name.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%,bid_number.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("getBids error:", error);
    return [];
  }

  return data ?? [];
}

export async function createBid(
  supabase: SupabaseClient,
  companyId: string,
  data: Partial<Bid>
): Promise<{ bid: Bid | null; error: string | null }> {
  const { data: result, error } = await supabase
    .from("bids")
    .insert({
      company_id: companyId,
      opportunity_id: data.opportunity_id,
      bid_number: data.bid_number,
      project_name: data.project_name,
      client_name: data.client_name,
      bid_date: data.bid_date,
      due_date: data.due_date,
      status: data.status || "in_progress",
      estimated_cost: data.estimated_cost,
      bid_amount: data.bid_amount,
      scope_description: data.scope_description,
      line_items: data.line_items,
      submitted_by: data.submitted_by,
    })
    .select()
    .single();

  if (error) {
    return { bid: null, error: error.message };
  }

  return { bid: result, error: null };
}

// ---------------------------------------------------------------------------
// Pipeline Summary
// ---------------------------------------------------------------------------

export async function getPipelineSummary(
  supabase: SupabaseClient,
  companyId: string
): Promise<PipelineSummary> {
  const { data } = await supabase
    .from("opportunities")
    .select("stage, estimated_value, probability_pct, weighted_value")
    .eq("company_id", companyId);

  const opportunities = data ?? [];

  const stages: OpportunityStage[] = [
    "lead",
    "qualification",
    "proposal",
    "negotiation",
    "won",
    "lost",
  ];

  const stageBreakdown = stages.map((stage) => {
    const stageOpps = opportunities.filter((o) => o.stage === stage);
    const value = stageOpps.reduce(
      (sum, o) => sum + (Number(o.estimated_value) || 0),
      0
    );
    return { stage, count: stageOpps.length, value };
  });

  // Active stages (not won or lost)
  const activeOpps = opportunities.filter(
    (o) => o.stage !== "won" && o.stage !== "lost"
  );

  const totalPipelineValue = activeOpps.reduce(
    (sum, o) => sum + (Number(o.estimated_value) || 0),
    0
  );

  const weightedValue = activeOpps.reduce(
    (sum, o) => sum + (Number(o.weighted_value) || 0),
    0
  );

  // Win rate: won / (won + lost)
  const wonCount = opportunities.filter((o) => o.stage === "won").length;
  const lostCount = opportunities.filter((o) => o.stage === "lost").length;
  const decidedCount = wonCount + lostCount;
  const winRate = decidedCount > 0 ? (wonCount / decidedCount) * 100 : 0;

  // Average deal size across all opportunities with a value
  const withValue = opportunities.filter(
    (o) => Number(o.estimated_value) > 0
  );
  const avgDealSize =
    withValue.length > 0
      ? withValue.reduce(
          (sum, o) => sum + (Number(o.estimated_value) || 0),
          0
        ) / withValue.length
      : 0;

  return {
    totalPipelineValue,
    weightedValue,
    winRate,
    avgDealSize,
    stageBreakdown,
  };
}
