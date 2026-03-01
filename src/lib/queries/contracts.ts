import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContractStatus =
  | "draft"
  | "pending_approval"
  | "active"
  | "expired"
  | "terminated"
  | "completed";

export type ContractType = "subcontractor" | "vendor" | "client" | "lease";

export interface ContractRow {
  id: string;
  company_id: string;
  contract_number: string;
  title: string;
  description: string | null;
  status: ContractStatus;
  contract_type: ContractType;
  party_name: string | null;
  party_email: string | null;
  contract_amount: number | null;
  retention_pct: number | null;
  start_date: string | null;
  end_date: string | null;
  payment_terms: string | null;
  scope_of_work: string | null;
  insurance_required: boolean;
  bond_required: boolean;
  project_id: string | null;
  property_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
  // Joined fields
  project?: { id: string; name: string } | null;
  property?: { id: string; name: string } | null;
  creator?: { id: string; full_name: string; email: string } | null;
}

export interface ContractStats {
  total: number;
  draft: number;
  active: number;
  expired: number;
  terminated: number;
  total_value: number;
}

export interface MilestoneRow {
  id: string;
  company_id: string;
  contract_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  amount: number | null;
  status: string;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractFilters {
  status?: ContractStatus;
  contract_type?: ContractType;
  search?: string;
}

export interface CreateContractData {
  title: string;
  description?: string;
  contract_type?: ContractType;
  party_name?: string;
  party_email?: string;
  contract_amount?: number;
  retention_pct?: number;
  start_date?: string;
  end_date?: string;
  payment_terms?: string;
  scope_of_work?: string;
  insurance_required?: boolean;
  bond_required?: boolean;
  project_id?: string;
  property_id?: string;
}

export interface UpdateContractData {
  title?: string;
  description?: string;
  status?: ContractStatus;
  contract_type?: ContractType;
  party_name?: string;
  party_email?: string;
  contract_amount?: number;
  retention_pct?: number;
  start_date?: string;
  end_date?: string;
  payment_terms?: string;
  scope_of_work?: string;
  insurance_required?: boolean;
  bond_required?: boolean;
  project_id?: string | null;
  property_id?: string | null;
}

export interface CreateMilestoneData {
  title: string;
  description?: string;
  due_date?: string;
  amount?: number;
  sort_order?: number;
}

export interface CompanyMember {
  user_id: string;
  role: string;
  user: { id: string; full_name: string; email: string } | null;
}

// ---------------------------------------------------------------------------
// getContracts — list all contracts for a company with project/creator joins
// ---------------------------------------------------------------------------

export async function getContracts(
  supabase: SupabaseClient,
  companyId: string,
  filters?: ContractFilters
) {
  let query = supabase
    .from("contracts")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.contract_type) {
    query = query.eq("contract_type", filters.contract_type);
  }

  if (filters?.search) {
    const term = `%${filters.search}%`;
    query = query.or(
      `title.ilike.${term},contract_number.ilike.${term},party_name.ilike.${term}`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("getContracts error:", error);
    return [];
  }

  const contracts = (data ?? []) as ContractRow[];

  // Batch-fetch related projects and creator profiles
  const projectIds = new Set<string>();
  const creatorIds = new Set<string>();
  for (const c of contracts) {
    if (c.project_id) projectIds.add(c.project_id);
    if (c.created_by) creatorIds.add(c.created_by);
  }

  const [projRes, creatorRes] = await Promise.all([
    projectIds.size > 0
      ? supabase.from("projects").select("id, name").in("id", [...projectIds])
      : Promise.resolve({ data: null }),
    creatorIds.size > 0
      ? supabase.from("user_profiles").select("id, full_name, email").in("id", [...creatorIds])
      : Promise.resolve({ data: null }),
  ]);

  const projMap = new Map((projRes.data ?? []).map((p: { id: string; name: string }) => [p.id, p]));
  const creatorMap = new Map((creatorRes.data ?? []).map((p: { id: string; full_name: string; email: string }) => [p.id, p]));

  for (const c of contracts) {
    c.project = c.project_id ? projMap.get(c.project_id) ?? null : null;
    c.creator = c.created_by ? creatorMap.get(c.created_by) ?? null : null;
  }

  return contracts;
}

// ---------------------------------------------------------------------------
// getContractStats — counts by status + total value of active contracts
// ---------------------------------------------------------------------------

export async function getContractStats(
  supabase: SupabaseClient,
  companyId: string
): Promise<ContractStats> {
  const { data, error } = await supabase
    .from("contracts")
    .select("id, status, contract_amount")
    .eq("company_id", companyId);

  if (error) {
    console.error("getContractStats error:", error);
    return { total: 0, draft: 0, active: 0, expired: 0, terminated: 0, total_value: 0 };
  }

  const contracts = data ?? [];
  const stats: ContractStats = {
    total: contracts.length,
    draft: 0,
    active: 0,
    expired: 0,
    terminated: 0,
    total_value: 0,
  };

  for (const c of contracts) {
    const s = c.status as ContractStatus;
    if (s === "draft") stats.draft++;
    else if (s === "active") stats.active++;
    else if (s === "expired") stats.expired++;
    else if (s === "terminated") stats.terminated++;

    if (s === "active" && c.contract_amount) {
      stats.total_value += Number(c.contract_amount);
    }
  }

  return stats;
}

// ---------------------------------------------------------------------------
// getContractById — single contract with full joins
// ---------------------------------------------------------------------------

export async function getContractById(
  supabase: SupabaseClient,
  contractId: string
) {
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", contractId)
    .single();

  if (error) {
    console.error("getContractById error:", error);
    return null;
  }

  const contract = data as ContractRow;

  // Fetch related project and creator
  const [projRes, creatorRes] = await Promise.all([
    contract.project_id
      ? supabase.from("projects").select("id, name").eq("id", contract.project_id).maybeSingle()
      : Promise.resolve({ data: null }),
    contract.created_by
      ? supabase.from("user_profiles").select("id, full_name, email").eq("id", contract.created_by).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  contract.project = projRes.data ?? null;
  contract.creator = creatorRes.data ?? null;

  return contract;
}

// ---------------------------------------------------------------------------
// createContract — insert contract, auto-generate contract_number (CTR-001...)
// ---------------------------------------------------------------------------

export async function createContract(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  data: CreateContractData
) {
  // Get the next contract number for this company
  const { data: lastContract } = await supabase
    .from("contracts")
    .select("contract_number")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;
  if (lastContract?.contract_number) {
    const match = lastContract.contract_number.match(/CTR-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  const contractNumber = `CTR-${String(nextNumber).padStart(3, "0")}`;

  const { data: contract, error } = await supabase
    .from("contracts")
    .insert({
      company_id: companyId,
      created_by: userId,
      contract_number: contractNumber,
      title: data.title,
      description: data.description ?? null,
      status: "draft",
      contract_type: data.contract_type ?? "subcontractor",
      party_name: data.party_name ?? null,
      party_email: data.party_email ?? null,
      contract_amount: data.contract_amount ?? null,
      retention_pct: data.retention_pct ?? null,
      start_date: data.start_date ?? null,
      end_date: data.end_date ?? null,
      payment_terms: data.payment_terms ?? null,
      scope_of_work: data.scope_of_work ?? null,
      insurance_required: data.insurance_required ?? false,
      bond_required: data.bond_required ?? false,
      project_id: data.project_id ?? null,
      property_id: data.property_id ?? null,
      metadata: {},
    })
    .select()
    .single();

  if (error) {
    console.error("createContract error:", error);
    return { contract: null, error: error.message };
  }

  return { contract, error: null };
}

// ---------------------------------------------------------------------------
// updateContract — update fields on a contract
// ---------------------------------------------------------------------------

export async function updateContract(
  supabase: SupabaseClient,
  contractId: string,
  data: UpdateContractData
) {
  const updatePayload: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };

  const { data: contract, error } = await supabase
    .from("contracts")
    .update(updatePayload)
    .eq("id", contractId)
    .select()
    .single();

  if (error) {
    console.error("updateContract error:", error);
    return { contract: null, error: error.message };
  }

  return { contract, error: null };
}

// ---------------------------------------------------------------------------
// getContractMilestones — milestones for a contract ordered by sort_order
// ---------------------------------------------------------------------------

export async function getContractMilestones(
  supabase: SupabaseClient,
  contractId: string
) {
  const { data, error } = await supabase
    .from("contract_milestones")
    .select("*")
    .eq("contract_id", contractId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("getContractMilestones error:", error);
    return [];
  }

  return (data ?? []) as MilestoneRow[];
}

// ---------------------------------------------------------------------------
// createMilestone — insert a milestone for a contract
// ---------------------------------------------------------------------------

export async function createMilestone(
  supabase: SupabaseClient,
  companyId: string,
  contractId: string,
  data: CreateMilestoneData
) {
  const { data: milestone, error } = await supabase
    .from("contract_milestones")
    .insert({
      company_id: companyId,
      contract_id: contractId,
      title: data.title,
      description: data.description ?? null,
      due_date: data.due_date ?? null,
      amount: data.amount ?? null,
      status: "pending",
      sort_order: data.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error("createMilestone error:", error);
    return { milestone: null, error: error.message };
  }

  return { milestone, error: null };
}

// ---------------------------------------------------------------------------
// updateMilestone — update a milestone
// ---------------------------------------------------------------------------

export async function updateMilestone(
  supabase: SupabaseClient,
  milestoneId: string,
  data: Record<string, unknown>
) {
  const updatePayload: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };

  const { data: milestone, error } = await supabase
    .from("contract_milestones")
    .update(updatePayload)
    .eq("id", milestoneId)
    .select()
    .single();

  if (error) {
    console.error("updateMilestone error:", error);
    return { milestone: null, error: error.message };
  }

  return { milestone, error: null };
}

// ---------------------------------------------------------------------------
// getCompanyProjects — get projects for dropdown
// ---------------------------------------------------------------------------

export async function getCompanyProjects(
  supabase: SupabaseClient,
  companyId: string
): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (error) {
    console.error("getCompanyProjects error:", error);
    return [];
  }

  return (data ?? []) as { id: string; name: string }[];
}

// ---------------------------------------------------------------------------
// getCompanyMembers — get members for assignee dropdown
// ---------------------------------------------------------------------------

export async function getCompanyMembers(
  supabase: SupabaseClient,
  companyId: string
): Promise<CompanyMember[]> {
  const { data, error } = await supabase
    .from("company_members")
    .select("user_id, role")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("role", { ascending: true });

  if (error) {
    console.error("getCompanyMembers error:", error);
    return [];
  }

  const members = data ?? [];
  const memberUserIds = members.map((m) => m.user_id).filter(Boolean);
  let memberProfileMap = new Map<string, { id: string; full_name: string; email: string }>();
  if (memberUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .in("id", memberUserIds);
    memberProfileMap = new Map(
      (profiles ?? []).map((p: { id: string; full_name: string; email: string }) => [p.id, p])
    );
  }

  return members.map((m) => ({
    ...m,
    user: m.user_id ? memberProfileMap.get(m.user_id) ?? null : null,
  })) as unknown as CompanyMember[];
}
