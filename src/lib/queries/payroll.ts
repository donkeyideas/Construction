import { SupabaseClient } from "@supabase/supabase-js";

/* ==================================================================
   Types
   ================================================================== */

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

/* ==================================================================
   Employee Pay Rates
   ================================================================== */

export async function getEmployeePayRates(
  supabase: SupabaseClient,
  companyId: string
): Promise<EmployeePayRate[]> {
  const { data, error } = await supabase
    .from("employee_pay_rates")
    .select("*")
    .eq("company_id", companyId)
    .is("end_date", null)
    .order("effective_date", { ascending: false });

  if (error) {
    console.error("Error fetching employee pay rates:", error);
    return [];
  }

  // Fetch user profiles separately (no FK between employee_pay_rates and user_profiles)
  const userIds = [...new Set((data ?? []).map((r: Record<string, unknown>) => r.user_id as string))];
  const profileMap: Record<string, { full_name: string | null; email: string | null }> = {};

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      profileMap[p.id] = { full_name: p.full_name, email: p.email };
    }
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const profile = profileMap[row.user_id as string];
    return {
      ...row,
      employee_name: profile?.full_name ?? "Unknown",
      employee_email: profile?.email ?? "",
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
    // Use upsert to handle both insert and duplicate-key scenarios atomically
    const { error } = await supabase
      .from("employee_pay_rates")
      .upsert(
        {
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
          end_date: null,
        },
        { onConflict: "company_id,user_id,effective_date" }
      );

    if (error) {
      console.error("Error upserting employee pay rate:", error);
      throw new Error(`Failed to save pay rate: ${error.message}`);
    }
  }
}
