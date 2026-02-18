import { SupabaseClient } from "@supabase/supabase-js";

/* ==================================================================
   Types
   ================================================================== */

export interface PayrollTaxConfig {
  id: string;
  company_id: string;
  tax_year: number;
  social_security_rate: number;
  social_security_wage_base: number;
  medicare_rate: number;
  additional_medicare_rate: number;
  additional_medicare_threshold: number;
  futa_rate: number;
  futa_wage_base: number;
  state_unemployment_rate: number;
  state_unemployment_wage_base: number;
  state_code: string;
}

export interface EmployeePayRate {
  id: string;
  company_id: string;
  user_id: string;
  pay_type: "hourly" | "salary";
  hourly_rate: number | null;
  overtime_rate: number | null;
  salary_amount: number | null;
  filing_status: string;
  federal_allowances: number;
  state_code: string;
  effective_date: string;
  end_date: string | null;
  // Joined from user_profiles
  employee_name?: string;
  employee_email?: string;
}

export interface PayrollDeduction {
  id: string;
  company_id: string;
  user_id: string;
  deduction_type: string;
  label: string;
  amount: number;
  is_percentage: boolean;
  is_pretax: boolean;
  effective_date: string;
  end_date: string | null;
  // Joined from user_profiles
  employee_name?: string;
}

export interface PayrollRun {
  id: string;
  company_id: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  status: "draft" | "approved" | "paid" | "voided";
  total_gross: number;
  total_employee_taxes: number;
  total_employer_taxes: number;
  total_deductions: number;
  total_net: number;
  employee_count: number;
  journal_entry_id: string | null;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  // Joined fields
  journal_entry_number?: string;
  approved_by_name?: string;
  created_by_name?: string;
}

export interface PayrollItem {
  id: string;
  company_id: string;
  payroll_run_id: string;
  user_id: string;
  regular_hours: number;
  overtime_hours: number;
  hourly_rate: number;
  overtime_rate: number;
  gross_pay: number;
  federal_income_tax: number;
  state_income_tax: number;
  social_security_employee: number;
  medicare_employee: number;
  social_security_employer: number;
  medicare_employer: number;
  futa_employer: number;
  suta_employer: number;
  pretax_deductions: number;
  posttax_deductions: number;
  total_employee_deductions: number;
  total_employer_taxes: number;
  net_pay: number;
  ytd_gross: number;
  deduction_details: Record<string, unknown>[] | null;
  time_entry_ids: string[] | null;
  // Joined from user_profiles
  employee_name?: string;
  employee_email?: string;
}

export interface PayrollRunDetail extends PayrollRun {
  items: PayrollItem[];
}

export interface TimeEntryGroup {
  user_id: string;
  employee_name: string;
  employee_email: string;
  regular_hours: number;
  overtime_hours: number;
  total_hours: number;
  entry_ids: string[];
  time_entry_ids: string[];
}

/* ==================================================================
   Tax Config
   ================================================================== */

export async function getPayrollTaxConfig(
  supabase: SupabaseClient,
  companyId: string,
  taxYear?: number
): Promise<PayrollTaxConfig | null> {
  const year = taxYear ?? new Date().getFullYear();

  const { data, error } = await supabase
    .from("payroll_tax_config")
    .select("*")
    .eq("company_id", companyId)
    .eq("tax_year", year)
    .single();

  if (error || !data) {
    if (error && error.code !== "PGRST116") {
      console.error("Error fetching payroll tax config:", error);
    }
    return null;
  }

  return data as PayrollTaxConfig;
}

export async function upsertPayrollTaxConfig(
  supabase: SupabaseClient,
  companyId: string,
  config: Omit<PayrollTaxConfig, "id" | "company_id">
): Promise<void> {
  const { error } = await supabase
    .from("payroll_tax_config")
    .upsert(
      {
        company_id: companyId,
        tax_year: config.tax_year,
        social_security_rate: config.social_security_rate,
        social_security_wage_base: config.social_security_wage_base,
        medicare_rate: config.medicare_rate,
        additional_medicare_rate: config.additional_medicare_rate,
        additional_medicare_threshold: config.additional_medicare_threshold,
        futa_rate: config.futa_rate,
        futa_wage_base: config.futa_wage_base,
        state_unemployment_rate: config.state_unemployment_rate,
        state_unemployment_wage_base: config.state_unemployment_wage_base,
        state_code: config.state_code,
      },
      { onConflict: "company_id,tax_year" }
    );

  if (error) {
    console.error("Error upserting payroll tax config:", error);
    throw new Error(`Failed to save tax config: ${error.message}`);
  }
}

/* ==================================================================
   Employee Pay Rates
   ================================================================== */

export async function getEmployeePayRates(
  supabase: SupabaseClient,
  companyId: string
): Promise<EmployeePayRate[]> {
  const { data, error } = await supabase
    .from("employee_pay_rates")
    .select("*, user_profiles(full_name, email)")
    .eq("company_id", companyId)
    .is("end_date", null)
    .order("effective_date", { ascending: false });

  if (error) {
    console.error("Error fetching employee pay rates:", error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const profile = row.user_profiles as { full_name: string | null; email: string | null } | null;
    return {
      ...row,
      employee_name: profile?.full_name ?? "Unknown",
      employee_email: profile?.email ?? "",
      user_profiles: undefined,
    };
  }) as unknown as EmployeePayRate[];
}

export async function upsertEmployeePayRate(
  supabase: SupabaseClient,
  companyId: string,
  data: {
    id?: string;
    user_id: string;
    pay_type: "hourly" | "salary";
    hourly_rate?: number | null;
    overtime_rate?: number | null;
    salary_amount?: number | null;
    filing_status: string;
    federal_allowances: number;
    state_code: string;
    effective_date: string;
    end_date?: string | null;
  }
): Promise<void> {
  if (data.id) {
    // Update existing record
    const { error } = await supabase
      .from("employee_pay_rates")
      .update({
        pay_type: data.pay_type,
        hourly_rate: data.hourly_rate ?? null,
        overtime_rate: data.overtime_rate ?? null,
        salary_amount: data.salary_amount ?? null,
        filing_status: data.filing_status,
        federal_allowances: data.federal_allowances,
        state_code: data.state_code,
        effective_date: data.effective_date,
        end_date: data.end_date ?? null,
      })
      .eq("id", data.id)
      .eq("company_id", companyId);

    if (error) {
      console.error("Error updating employee pay rate:", error);
      throw new Error(`Failed to update pay rate: ${error.message}`);
    }
  } else {
    // End any current active rate for this employee, then insert new
    await supabase
      .from("employee_pay_rates")
      .update({ end_date: data.effective_date })
      .eq("company_id", companyId)
      .eq("user_id", data.user_id)
      .is("end_date", null);

    const { error } = await supabase
      .from("employee_pay_rates")
      .insert({
        company_id: companyId,
        user_id: data.user_id,
        pay_type: data.pay_type,
        hourly_rate: data.hourly_rate ?? null,
        overtime_rate: data.overtime_rate ?? null,
        salary_amount: data.salary_amount ?? null,
        filing_status: data.filing_status,
        federal_allowances: data.federal_allowances,
        state_code: data.state_code,
        effective_date: data.effective_date,
        end_date: data.end_date ?? null,
      });

    if (error) {
      console.error("Error creating employee pay rate:", error);
      throw new Error(`Failed to create pay rate: ${error.message}`);
    }
  }
}

/* ==================================================================
   Payroll Deductions
   ================================================================== */

export async function getPayrollDeductions(
  supabase: SupabaseClient,
  companyId: string,
  userId?: string
): Promise<PayrollDeduction[]> {
  let query = supabase
    .from("payroll_deductions")
    .select("*, user_profiles(full_name)")
    .eq("company_id", companyId)
    .is("end_date", null)
    .order("label", { ascending: true });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching payroll deductions:", error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const profile = row.user_profiles as { full_name: string | null } | null;
    return {
      ...row,
      employee_name: profile?.full_name ?? "Unknown",
      user_profiles: undefined,
    };
  }) as unknown as PayrollDeduction[];
}

export async function upsertPayrollDeduction(
  supabase: SupabaseClient,
  companyId: string,
  data: {
    id?: string;
    user_id: string;
    deduction_type: string;
    label: string;
    amount: number;
    is_percentage: boolean;
    is_pretax: boolean;
    effective_date: string;
    end_date?: string | null;
  }
): Promise<void> {
  const payload = {
    company_id: companyId,
    user_id: data.user_id,
    deduction_type: data.deduction_type,
    label: data.label,
    amount: data.amount,
    is_percentage: data.is_percentage,
    is_pretax: data.is_pretax,
    effective_date: data.effective_date,
    end_date: data.end_date ?? null,
  };

  if (data.id) {
    const { error } = await supabase
      .from("payroll_deductions")
      .update(payload)
      .eq("id", data.id)
      .eq("company_id", companyId);

    if (error) {
      console.error("Error updating payroll deduction:", error);
      throw new Error(`Failed to update deduction: ${error.message}`);
    }
  } else {
    const { error } = await supabase
      .from("payroll_deductions")
      .insert(payload);

    if (error) {
      console.error("Error creating payroll deduction:", error);
      throw new Error(`Failed to create deduction: ${error.message}`);
    }
  }
}

export async function deletePayrollDeduction(
  supabase: SupabaseClient,
  companyId: string,
  deductionId: string
): Promise<void> {
  const { error } = await supabase
    .from("payroll_deductions")
    .delete()
    .eq("id", deductionId)
    .eq("company_id", companyId);

  if (error) {
    console.error("Error deleting payroll deduction:", error);
    throw new Error(`Failed to delete deduction: ${error.message}`);
  }
}

/* ==================================================================
   Payroll Runs
   ================================================================== */

export async function getPayrollRuns(
  supabase: SupabaseClient,
  companyId: string,
  limit: number = 25,
  offset: number = 0
): Promise<PayrollRun[]> {
  const { data, error } = await supabase
    .from("payroll_runs")
    .select("*, journal_entries(entry_number)")
    .eq("company_id", companyId)
    .order("pay_date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching payroll runs:", error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const je = row.journal_entries as { entry_number: string } | null;
    return {
      ...row,
      journal_entry_number: je?.entry_number ?? null,
      journal_entries: undefined,
    };
  }) as unknown as PayrollRun[];
}

export async function getPayrollRunDetail(
  supabase: SupabaseClient,
  companyId: string,
  runId: string
): Promise<PayrollRunDetail | null> {
  // Fetch the payroll run header with JE join
  const { data: run, error: runError } = await supabase
    .from("payroll_runs")
    .select("*, journal_entries(entry_number)")
    .eq("id", runId)
    .eq("company_id", companyId)
    .single();

  if (runError || !run) {
    if (runError && runError.code !== "PGRST116") {
      console.error("Error fetching payroll run detail:", runError);
    }
    return null;
  }

  // Fetch payroll items with employee names
  const { data: items, error: itemsError } = await supabase
    .from("payroll_items")
    .select("*, user_profiles(full_name, email)")
    .eq("payroll_run_id", runId)
    .eq("company_id", companyId)
    .order("gross_pay", { ascending: false });

  if (itemsError) {
    console.error("Error fetching payroll items:", itemsError);
  }

  // Fetch display names for approved_by and created_by
  const userIds = [run.approved_by, run.created_by].filter(Boolean) as string[];
  let userNameMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name")
      .in("id", userIds);

    for (const p of profiles ?? []) {
      userNameMap.set(p.id, p.full_name ?? "Unknown");
    }
  }

  const je = run.journal_entries as { entry_number: string } | null;

  const mappedItems: PayrollItem[] = (items ?? []).map((row: Record<string, unknown>) => {
    const profile = row.user_profiles as { full_name: string | null; email: string | null } | null;
    return {
      ...row,
      employee_name: profile?.full_name ?? "Unknown",
      employee_email: profile?.email ?? "",
      user_profiles: undefined,
    };
  }) as unknown as PayrollItem[];

  return {
    ...(run as Record<string, unknown>),
    journal_entry_number: je?.entry_number ?? null,
    journal_entries: undefined,
    approved_by_name: run.approved_by ? userNameMap.get(run.approved_by) ?? null : null,
    created_by_name: run.created_by ? userNameMap.get(run.created_by) ?? null : null,
    items: mappedItems,
  } as unknown as PayrollRunDetail;
}

/* ==================================================================
   Time Entries for Payroll
   ================================================================== */

/**
 * Get approved time entries in a date range, grouped by user with
 * regular and overtime hours calculated.
 *
 * Overtime: any hours beyond 40 per week (Mon-Sun) within the period.
 * For simplicity, if the period is a standard bi-weekly or weekly pay period,
 * we compute per-week totals. Otherwise we use a flat 40hr/week threshold
 * prorated to the period length.
 */
export async function getApprovedTimeEntries(
  supabase: SupabaseClient,
  companyId: string,
  periodStart: string,
  periodEnd: string
): Promise<TimeEntryGroup[]> {
  const { data, error } = await supabase
    .from("time_entries")
    .select("id, user_id, entry_date, hours, user_profiles(full_name, email)")
    .eq("company_id", companyId)
    .eq("status", "approved")
    .gte("entry_date", periodStart)
    .lte("entry_date", periodEnd)
    .order("entry_date", { ascending: true });

  if (error) {
    console.error("Error fetching approved time entries:", error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Group entries by user_id
  const userMap = new Map<
    string,
    {
      employee_name: string;
      employee_email: string;
      entries: { id: string; entry_date: string; hours: number }[];
    }
  >();

  for (const row of data) {
    const profile = (row as Record<string, unknown>).user_profiles as {
      full_name: string | null;
      email: string | null;
    } | null;

    if (!userMap.has(row.user_id)) {
      userMap.set(row.user_id, {
        employee_name: profile?.full_name ?? "Unknown",
        employee_email: profile?.email ?? "",
        entries: [],
      });
    }

    userMap.get(row.user_id)!.entries.push({
      id: row.id,
      entry_date: row.entry_date,
      hours: row.hours ?? 0,
    });
  }

  // Calculate regular vs overtime hours per user
  const results: TimeEntryGroup[] = [];

  for (const [userId, userData] of userMap) {
    // Group entries by ISO week (Mon-Sun)
    const weekMap = new Map<string, number>();

    for (const entry of userData.entries) {
      const date = new Date(entry.entry_date);
      const weekKey = getISOWeekKey(date);
      weekMap.set(weekKey, (weekMap.get(weekKey) ?? 0) + entry.hours);
    }

    // Calculate regular and overtime per week, then sum
    let totalRegular = 0;
    let totalOvertime = 0;

    for (const weekHours of weekMap.values()) {
      if (weekHours <= 40) {
        totalRegular += weekHours;
      } else {
        totalRegular += 40;
        totalOvertime += weekHours - 40;
      }
    }

    results.push({
      user_id: userId,
      employee_name: userData.employee_name,
      employee_email: userData.employee_email,
      regular_hours: Math.round(totalRegular * 100) / 100,
      overtime_hours: Math.round(totalOvertime * 100) / 100,
      total_hours: Math.round((totalRegular + totalOvertime) * 100) / 100,
      entry_ids: userData.entries.map((e) => e.id),
      time_entry_ids: userData.entries.map((e) => e.id),
    });
  }

  return results;
}

/**
 * Returns ISO week key for grouping (e.g., "2026-W08").
 */
function getISOWeekKey(date: Date): string {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  // Set to nearest Thursday (ISO week starts on Monday)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 4);
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7
  );
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/* ==================================================================
   YTD Gross
   ================================================================== */

/**
 * Get year-to-date gross pay for all employees, summed from paid payroll runs.
 * Returns a Map of user_id -> ytd_gross.
 */
export async function getYtdGross(
  supabase: SupabaseClient,
  companyId: string,
  year: number
): Promise<Map<string, number>> {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  // Get all paid payroll run IDs for the year
  const { data: runs, error: runsError } = await supabase
    .from("payroll_runs")
    .select("id")
    .eq("company_id", companyId)
    .eq("status", "paid")
    .gte("pay_date", yearStart)
    .lte("pay_date", yearEnd);

  if (runsError) {
    console.error("Error fetching payroll runs for YTD:", runsError);
    return new Map();
  }

  const runIds = (runs ?? []).map((r: { id: string }) => r.id);
  if (runIds.length === 0) return new Map();

  // Sum gross_pay per user from payroll_items
  const { data: items, error: itemsError } = await supabase
    .from("payroll_items")
    .select("user_id, gross_pay")
    .in("payroll_run_id", runIds);

  if (itemsError) {
    console.error("Error fetching payroll items for YTD:", itemsError);
    return new Map();
  }

  const ytdMap = new Map<string, number>();

  for (const item of items ?? []) {
    const current = ytdMap.get(item.user_id) ?? 0;
    ytdMap.set(item.user_id, current + (item.gross_pay ?? 0));
  }

  return ytdMap;
}
