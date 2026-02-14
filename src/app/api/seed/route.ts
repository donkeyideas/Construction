import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// ============================================================
// Seed API - Creates test accounts and realistic demo data
// POST /api/seed?key=construction-erp-seed-2026
// ============================================================

const SEED_KEY = "construction-erp-seed-2026";
const DEFAULT_PASSWORD = "Demo1234!";

interface UserSeed {
  email: string;
  full_name: string;
  role: string;
  job_title: string;
  phone: string;
}

const TEST_USERS: UserSeed[] = [
  { email: "owner@demo.com", full_name: "Marcus Johnson", role: "owner", job_title: "CEO / Owner", phone: "(512) 555-0101" },
  { email: "pm@demo.com", full_name: "Sarah Chen", role: "project_manager", job_title: "Senior Project Manager", phone: "(512) 555-0102" },
  { email: "super@demo.com", full_name: "James Rodriguez", role: "superintendent", job_title: "Field Superintendent", phone: "(512) 555-0103" },
  { email: "accountant@demo.com", full_name: "Emily Watson", role: "accountant", job_title: "Controller", phone: "(512) 555-0104" },
  { email: "field@demo.com", full_name: "David Kim", role: "field_worker", job_title: "Foreman", phone: "(512) 555-0105" },
  { email: "viewer@demo.com", full_name: "Lisa Martinez", role: "viewer", job_title: "Client Rep", phone: "(512) 555-0106" },
];

// Tenant portal users (not company members — they access the tenant portal)
interface TenantUserSeed {
  email: string;
  full_name: string;
  phone: string;
  tenant_name: string; // matches tenantNames in leases
}

const TENANT_USERS: TenantUserSeed[] = [
  { email: "tenant@demo.com", full_name: "Maria Gonzalez", phone: "(512) 555-3005", tenant_name: "Maria Gonzalez" },
  { email: "tenant2@demo.com", full_name: "Chris Anderson", phone: "(512) 555-3006", tenant_name: "Chris Anderson" },
];

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    if (key !== SEED_KEY) {
      return NextResponse.json({ error: "Invalid seed key" }, { status: 403 });
    }

    const supabase = createAdminClient();

    // ============================================================
    // 1. CREATE OR REUSE TEST USERS
    // ============================================================
    const userIds: Record<string, string> = {};

    // Fetch all existing auth users once (with high page size to avoid pagination issues)
    const { data: allExistingUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existingUserMap = new Map(
      (allExistingUsers?.users ?? []).map((u) => [u.email, u])
    );

    for (const user of TEST_USERS) {
      const existing = existingUserMap.get(user.email);

      if (existing) {
        // Reuse existing auth user - just grab their ID
        userIds[user.role] = existing.id;
      } else {
        // Create new auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: DEFAULT_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: user.full_name },
        });

        if (authError) {
          console.error(`Failed to create user ${user.email}:`, authError.message);
          return NextResponse.json({ error: `Failed to create user ${user.email}: ${authError.message}` }, { status: 500 });
        }

        userIds[user.role] = authData.user.id;
      }

      // Upsert profile (works for both new and existing users)
      await supabase.from("user_profiles").upsert({
        id: userIds[user.role],
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        job_title: user.job_title,
        is_platform_admin: user.role === "owner",
      });
    }

    // ============================================================
    // 2. CREATE DEMO COMPANY
    // ============================================================

    // Delete existing demo company and all related data
    const { data: existingCo } = await supabase.from("companies").select("id").eq("slug", "summit-builders").single();
    if (existingCo) {
      const cid = existingCo.id;
      // Clean up child tables that reference company_id (in case CASCADE is not set)
      // Delete child tables first (journal_entry_lines depends on journal_entries, etc.)
      await Promise.all([
        supabase.from("journal_entry_lines").delete().eq("company_id", cid),
        supabase.from("automation_logs").delete().eq("company_id", cid),
        supabase.from("contract_milestones").delete().eq("company_id", cid),
        supabase.from("equipment_maintenance_logs").delete().eq("company_id", cid),
        supabase.from("equipment_assignments").delete().eq("company_id", cid),
        supabase.from("bank_transactions").delete().eq("company_id", cid),
      ]);
      await Promise.all([
        supabase.from("daily_logs").delete().eq("company_id", cid),
        supabase.from("time_entries").delete().eq("company_id", cid),
        supabase.from("change_orders").delete().eq("company_id", cid),
        supabase.from("rfis").delete().eq("company_id", cid),
        supabase.from("submittals").delete().eq("company_id", cid),
        supabase.from("punch_list_items").delete().eq("company_id", cid),
        supabase.from("safety_inspections").delete().eq("company_id", cid),
        supabase.from("safety_incidents").delete().eq("company_id", cid),
        supabase.from("toolbox_talks").delete().eq("company_id", cid),
        supabase.from("invoices").delete().eq("company_id", cid),
        supabase.from("payments").delete().eq("company_id", cid),
        supabase.from("journal_entries").delete().eq("company_id", cid),
        supabase.from("bank_accounts").delete().eq("company_id", cid),
        supabase.from("chart_of_accounts").delete().eq("company_id", cid),
        supabase.from("tenant_documents").delete().eq("company_id", cid),
        supabase.from("tenant_announcements").delete().eq("company_id", cid),
        supabase.from("documents").delete().eq("company_id", cid),
        supabase.from("contacts").delete().eq("company_id", cid),
        supabase.from("certifications").delete().eq("company_id", cid),
        supabase.from("equipment").delete().eq("company_id", cid),
        supabase.from("contracts").delete().eq("company_id", cid),
        supabase.from("automation_rules").delete().eq("company_id", cid),
        supabase.from("opportunities").delete().eq("company_id", cid),
        supabase.from("bids").delete().eq("company_id", cid),
        supabase.from("tickets").delete().eq("company_id", cid),
        supabase.from("messages").delete().eq("company_id", cid),
        supabase.from("notifications").delete().eq("company_id", cid),
        supabase.from("audit_log").delete().eq("company_id", cid),
        supabase.from("subscription_events").delete().eq("company_id", cid),
      ]);
      // Delete projects, properties, units, leases, maintenance (which depend on projects/properties)
      await supabase.from("rent_payments").delete().eq("company_id", cid);
      await supabase.from("property_units").delete().eq("company_id", cid);
      await supabase.from("leases").delete().eq("company_id", cid);
      await supabase.from("maintenance_requests").delete().eq("company_id", cid);
      await supabase.from("vendor_contracts").delete().eq("company_id", cid);
      await supabase.from("projects").delete().eq("company_id", cid);
      await supabase.from("properties").delete().eq("company_id", cid);
      await supabase.from("company_members").delete().eq("company_id", cid);
      await supabase.from("companies").delete().eq("id", cid);
    }

    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: "Summit Builders Group",
        slug: "summit-builders",
        address_line1: "4200 Congress Avenue",
        city: "Austin",
        state: "TX",
        zip: "78701",
        phone: "(512) 555-0100",
        website: "https://summitbuilders.com",
        industry_type: "General Contractor",
        subscription_plan: "professional",
        subscription_status: "active",
        fiscal_year_start: 1,
        currency: "USD",
        timezone: "America/Chicago",
        created_by: userIds.owner,
      })
      .select("id")
      .single();

    if (companyError) {
      return NextResponse.json({ error: `Failed to create company: ${companyError.message}` }, { status: 500 });
    }

    const companyId = companyData.id;

    // ============================================================
    // 3. ADD COMPANY MEMBERS
    // ============================================================
    for (const user of TEST_USERS) {
      await supabase.from("company_members").insert({
        company_id: companyId,
        user_id: userIds[user.role],
        role: user.role,
        is_active: true,
      });
    }

    // ============================================================
    // 3b. CREATE TENANT PORTAL USERS
    // ============================================================
    const tenantUserIds: Record<string, string> = {};

    for (const tenant of TENANT_USERS) {
      const existing = existingUserMap.get(tenant.email);

      if (existing) {
        tenantUserIds[tenant.tenant_name] = existing.id;
      } else {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: tenant.email,
          password: DEFAULT_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: tenant.full_name },
        });

        if (authError) {
          console.error(`Failed to create tenant user ${tenant.email}:`, authError.message);
          return NextResponse.json({ error: `Failed to create tenant user ${tenant.email}: ${authError.message}` }, { status: 500 });
        }

        tenantUserIds[tenant.tenant_name] = authData.user.id;
      }

      // Upsert tenant profile with portal_type='tenant'
      await supabase.from("user_profiles").upsert({
        id: tenantUserIds[tenant.tenant_name],
        email: tenant.email,
        full_name: tenant.full_name,
        phone: tenant.phone,
        portal_type: "tenant",
      });
    }

    // ============================================================
    // 4. SEED CHART OF ACCOUNTS
    // ============================================================
    await supabase.rpc("seed_company_chart_of_accounts", { p_company_id: companyId });

    // ============================================================
    // 5. BANK ACCOUNTS
    // ============================================================
    const { data: bankAccounts } = await supabase
      .from("bank_accounts")
      .insert([
        { company_id: companyId, name: "Operating Account", bank_name: "Chase Bank", account_number_last4: "4521", routing_number_last4: "0021", account_type: "checking", current_balance: 847250.00, is_default: true },
        { company_id: companyId, name: "Payroll Account", bank_name: "Chase Bank", account_number_last4: "4522", routing_number_last4: "0021", account_type: "checking", current_balance: 215000.00, is_default: false },
        { company_id: companyId, name: "Reserve Savings", bank_name: "Wells Fargo", account_number_last4: "8871", routing_number_last4: "1122", account_type: "savings", current_balance: 500000.00, is_default: false },
      ])
      .select("id");

    // ============================================================
    // 6. PROJECTS
    // ============================================================
    const projectSeeds = [
      {
        name: "Riverside Medical Center",
        code: "RMC-001",
        description: "New 120,000 sq ft medical office building with underground parking. 4-story concrete frame with curtain wall facade.",
        status: "active",
        project_type: "commercial",
        address_line1: "1200 Riverside Drive",
        city: "Austin",
        state: "TX",
        zip: "78704",
        client_name: "Riverside Health Systems",
        client_contact: "Dr. Patricia Holmes",
        client_email: "pholmes@riversidehealth.com",
        client_phone: "(512) 555-2001",
        contract_amount: 28500000.00,
        estimated_cost: 24200000.00,
        actual_cost: 16850000.00,
        start_date: "2025-06-15",
        estimated_end_date: "2026-11-30",
        completion_pct: 62.5,
        project_manager_id: userIds.project_manager,
        superintendent_id: userIds.superintendent,
      },
      {
        name: "Mueller Town Center Phase II",
        code: "MTC-002",
        description: "Mixed-use development with 45,000 sq ft retail ground floor and 180 residential units above. Steel and concrete post-tension structure.",
        status: "active",
        project_type: "commercial",
        address_line1: "2500 Mueller Boulevard",
        city: "Austin",
        state: "TX",
        zip: "78723",
        client_name: "Catellus Development",
        client_contact: "Robert Langford",
        client_email: "rlangford@catellus.com",
        client_phone: "(512) 555-2002",
        contract_amount: 42000000.00,
        estimated_cost: 36500000.00,
        actual_cost: 8750000.00,
        start_date: "2025-11-01",
        estimated_end_date: "2027-06-30",
        completion_pct: 18.3,
        project_manager_id: userIds.project_manager,
        superintendent_id: userIds.superintendent,
      },
      {
        name: "Westlake Hills Custom Residence",
        code: "WHR-003",
        description: "8,500 sq ft luxury custom home with infinity pool, outdoor kitchen, and 4-car garage. Hill country contemporary design.",
        status: "active",
        project_type: "residential",
        address_line1: "3800 Westlake Drive",
        city: "Austin",
        state: "TX",
        zip: "78746",
        client_name: "Thomas & Rebecca Sterling",
        client_contact: "Thomas Sterling",
        client_email: "tsterling@sterlinginvestments.com",
        client_phone: "(512) 555-2003",
        contract_amount: 4200000.00,
        estimated_cost: 3650000.00,
        actual_cost: 3100000.00,
        start_date: "2025-03-01",
        estimated_end_date: "2026-04-15",
        completion_pct: 85.0,
        project_manager_id: userIds.project_manager,
        superintendent_id: userIds.superintendent,
      },
      {
        name: "East Austin Warehouse Conversion",
        code: "EAW-004",
        description: "Adaptive reuse of 30,000 sq ft historic warehouse into creative office space. Structural steel reinforcement with exposed brick.",
        status: "pre_construction",
        project_type: "renovation",
        address_line1: "800 East 5th Street",
        city: "Austin",
        state: "TX",
        zip: "78702",
        client_name: "East Side Holdings LLC",
        client_contact: "Amanda Foster",
        client_email: "afoster@eastsideholdings.com",
        client_phone: "(512) 555-2004",
        contract_amount: 8750000.00,
        estimated_cost: 7600000.00,
        actual_cost: 125000.00,
        start_date: "2026-04-01",
        estimated_end_date: "2027-01-31",
        completion_pct: 0,
        project_manager_id: userIds.project_manager,
        superintendent_id: userIds.superintendent,
      },
      {
        name: "Pflugerville Community Park",
        code: "PCP-005",
        description: "15-acre community park with splash pad, playground, athletic fields, walking trails, and covered pavilion.",
        status: "completed",
        project_type: "infrastructure",
        address_line1: "1600 Pecan Street",
        city: "Pflugerville",
        state: "TX",
        zip: "78660",
        client_name: "City of Pflugerville",
        client_contact: "Mike Nguyen",
        client_email: "mnguyen@pflugervilletx.gov",
        client_phone: "(512) 555-2005",
        contract_amount: 6200000.00,
        estimated_cost: 5800000.00,
        actual_cost: 5950000.00,
        start_date: "2024-09-01",
        estimated_end_date: "2025-12-31",
        actual_end_date: "2026-01-15",
        completion_pct: 100.0,
        project_manager_id: userIds.project_manager,
        superintendent_id: userIds.superintendent,
      },
      {
        name: "South Congress Hotel Renovation",
        code: "SCH-006",
        description: "Full interior renovation of 85-room boutique hotel. Updated guest rooms, lobby, restaurant, and rooftop bar.",
        status: "on_hold",
        project_type: "renovation",
        address_line1: "1600 South Congress Avenue",
        city: "Austin",
        state: "TX",
        zip: "78704",
        client_name: "SoCo Hospitality Group",
        client_contact: "Jennifer Wells",
        client_email: "jwells@socohospitality.com",
        client_phone: "(512) 555-2006",
        contract_amount: 12000000.00,
        estimated_cost: 10400000.00,
        actual_cost: 2800000.00,
        start_date: "2025-08-01",
        estimated_end_date: "2026-08-31",
        completion_pct: 22.0,
        project_manager_id: userIds.project_manager,
        superintendent_id: userIds.superintendent,
      },
    ];

    const { data: projects } = await supabase
      .from("projects")
      .insert(projectSeeds.map((p) => ({ company_id: companyId, ...p })))
      .select("id, code, name");

    const projectMap: Record<string, string> = {};
    for (const p of projects ?? []) {
      projectMap[p.code] = p.id;
    }

    // ============================================================
    // 7. PROJECT PHASES & TASKS (for RMC-001)
    // ============================================================
    const rmcId = projectMap["RMC-001"];
    if (rmcId) {
      const { data: phases } = await supabase
        .from("project_phases")
        .insert([
          { company_id: companyId, project_id: rmcId, name: "Site Work & Foundations", sort_order: 1, color: "#ef4444", start_date: "2025-06-15", end_date: "2025-10-30" },
          { company_id: companyId, project_id: rmcId, name: "Structural Frame", sort_order: 2, color: "#f97316", start_date: "2025-09-01", end_date: "2026-02-28" },
          { company_id: companyId, project_id: rmcId, name: "Building Envelope", sort_order: 3, color: "#3b82f6", start_date: "2025-12-01", end_date: "2026-05-31" },
          { company_id: companyId, project_id: rmcId, name: "MEP Rough-In", sort_order: 4, color: "#8b5cf6", start_date: "2026-01-15", end_date: "2026-07-31" },
          { company_id: companyId, project_id: rmcId, name: "Interior Finishes", sort_order: 5, color: "#10b981", start_date: "2026-05-01", end_date: "2026-10-31" },
          { company_id: companyId, project_id: rmcId, name: "Commissioning & Closeout", sort_order: 6, color: "#06b6d4", start_date: "2026-10-01", end_date: "2026-11-30" },
        ])
        .select("id, name");

      const phaseMap: Record<string, string> = {};
      for (const ph of phases ?? []) {
        phaseMap[ph.name] = ph.id;
      }

      await supabase.from("project_tasks").insert([
        { company_id: companyId, project_id: rmcId, phase_id: phaseMap["Site Work & Foundations"], name: "Demolition & Site Clearing", status: "completed", priority: "high", assigned_to: userIds.superintendent, start_date: "2025-06-15", end_date: "2025-07-15", completion_pct: 100, is_milestone: false, sort_order: 1 },
        { company_id: companyId, project_id: rmcId, phase_id: phaseMap["Site Work & Foundations"], name: "Underground Utilities", status: "completed", priority: "high", assigned_to: userIds.superintendent, start_date: "2025-07-15", end_date: "2025-08-30", completion_pct: 100, sort_order: 2 },
        { company_id: companyId, project_id: rmcId, phase_id: phaseMap["Site Work & Foundations"], name: "Foundation Pours Complete", status: "completed", priority: "critical", assigned_to: userIds.superintendent, start_date: "2025-08-30", end_date: "2025-10-30", completion_pct: 100, is_milestone: true, sort_order: 3 },
        { company_id: companyId, project_id: rmcId, phase_id: phaseMap["Structural Frame"], name: "Steel Erection - Levels 1-2", status: "completed", priority: "high", assigned_to: userIds.superintendent, start_date: "2025-09-15", end_date: "2025-12-15", completion_pct: 100, sort_order: 4 },
        { company_id: companyId, project_id: rmcId, phase_id: phaseMap["Structural Frame"], name: "Steel Erection - Levels 3-4", status: "in_progress", priority: "high", assigned_to: userIds.superintendent, start_date: "2025-12-15", end_date: "2026-02-28", completion_pct: 75, is_critical_path: true, sort_order: 5 },
        { company_id: companyId, project_id: rmcId, phase_id: phaseMap["Structural Frame"], name: "Concrete Decks All Levels", status: "in_progress", priority: "high", assigned_to: userIds.field_worker, start_date: "2025-10-01", end_date: "2026-02-15", completion_pct: 80, sort_order: 6 },
        { company_id: companyId, project_id: rmcId, phase_id: phaseMap["Building Envelope"], name: "Curtain Wall Installation", status: "in_progress", priority: "medium", assigned_to: userIds.superintendent, start_date: "2026-01-01", end_date: "2026-05-31", completion_pct: 25, is_critical_path: true, sort_order: 7 },
        { company_id: companyId, project_id: rmcId, phase_id: phaseMap["Building Envelope"], name: "Roofing System", status: "not_started", priority: "medium", assigned_to: userIds.superintendent, start_date: "2026-03-01", end_date: "2026-04-30", completion_pct: 0, sort_order: 8 },
        { company_id: companyId, project_id: rmcId, phase_id: phaseMap["MEP Rough-In"], name: "Mechanical Rough-In", status: "not_started", priority: "medium", assigned_to: userIds.field_worker, start_date: "2026-02-01", end_date: "2026-06-30", completion_pct: 0, sort_order: 9 },
        { company_id: companyId, project_id: rmcId, phase_id: phaseMap["MEP Rough-In"], name: "Electrical Rough-In", status: "not_started", priority: "medium", assigned_to: userIds.field_worker, start_date: "2026-02-15", end_date: "2026-07-15", completion_pct: 0, sort_order: 10 },
        { company_id: companyId, project_id: rmcId, phase_id: phaseMap["MEP Rough-In"], name: "Plumbing Rough-In", status: "not_started", priority: "medium", assigned_to: userIds.field_worker, start_date: "2026-01-15", end_date: "2026-06-15", completion_pct: 0, sort_order: 11 },
        { company_id: companyId, project_id: rmcId, phase_id: phaseMap["Interior Finishes"], name: "Drywall & Framing", status: "not_started", priority: "medium", start_date: "2026-05-01", end_date: "2026-08-15", completion_pct: 0, sort_order: 12 },
        { company_id: companyId, project_id: rmcId, phase_id: phaseMap["Interior Finishes"], name: "Flooring & Tile", status: "not_started", priority: "low", start_date: "2026-07-01", end_date: "2026-09-30", completion_pct: 0, sort_order: 13 },
        { company_id: companyId, project_id: rmcId, phase_id: phaseMap["Commissioning & Closeout"], name: "Final Inspection & CO", status: "not_started", priority: "critical", start_date: "2026-11-01", end_date: "2026-11-30", completion_pct: 0, is_milestone: true, sort_order: 14 },
      ]);

      // Budget lines for RMC
      await supabase.from("project_budget_lines").insert([
        { company_id: companyId, project_id: rmcId, csi_code: "01", description: "General Requirements", budgeted_amount: 2420000, committed_amount: 2100000, actual_amount: 1850000 },
        { company_id: companyId, project_id: rmcId, csi_code: "02", description: "Site Construction", budgeted_amount: 1936000, committed_amount: 1850000, actual_amount: 1750000 },
        { company_id: companyId, project_id: rmcId, csi_code: "03", description: "Concrete", budgeted_amount: 3630000, committed_amount: 3400000, actual_amount: 3200000 },
        { company_id: companyId, project_id: rmcId, csi_code: "05", description: "Metals / Structural Steel", budgeted_amount: 4840000, committed_amount: 4600000, actual_amount: 3850000 },
        { company_id: companyId, project_id: rmcId, csi_code: "07", description: "Thermal & Moisture Protection", budgeted_amount: 1452000, committed_amount: 1200000, actual_amount: 450000 },
        { company_id: companyId, project_id: rmcId, csi_code: "08", description: "Doors & Windows / Curtain Wall", budgeted_amount: 2904000, committed_amount: 2800000, actual_amount: 1100000 },
        { company_id: companyId, project_id: rmcId, csi_code: "09", description: "Finishes", budgeted_amount: 1936000, committed_amount: 0, actual_amount: 0 },
        { company_id: companyId, project_id: rmcId, csi_code: "21-23", description: "Mechanical / HVAC / Plumbing", budgeted_amount: 3146000, committed_amount: 2900000, actual_amount: 850000 },
        { company_id: companyId, project_id: rmcId, csi_code: "26-28", description: "Electrical / Communications", budgeted_amount: 1936000, committed_amount: 1800000, actual_amount: 600000 },
      ]);
    }

    // ============================================================
    // 7b. PROJECT PHASES & TASKS (for MTC-002)
    // ============================================================
    const mtcId = projectMap["MTC-002"];
    if (mtcId) {
      const { data: mtcPhases } = await supabase
        .from("project_phases")
        .insert([
          { company_id: companyId, project_id: mtcId, name: "Pre-Construction & Permits", sort_order: 1, color: "#f59e0b", start_date: "2025-11-01", end_date: "2026-02-28" },
          { company_id: companyId, project_id: mtcId, name: "Foundation & Structure", sort_order: 2, color: "#ef4444", start_date: "2026-01-15", end_date: "2026-08-31" },
          { company_id: companyId, project_id: mtcId, name: "Building Envelope & MEP", sort_order: 3, color: "#3b82f6", start_date: "2026-06-01", end_date: "2027-01-31" },
          { company_id: companyId, project_id: mtcId, name: "Interior Build-Out & Finishes", sort_order: 4, color: "#10b981", start_date: "2026-10-01", end_date: "2027-06-30" },
        ])
        .select("id, name");

      const mtcPhaseMap: Record<string, string> = {};
      for (const ph of mtcPhases ?? []) {
        mtcPhaseMap[ph.name] = ph.id;
      }

      await supabase.from("project_tasks").insert([
        { company_id: companyId, project_id: mtcId, phase_id: mtcPhaseMap["Pre-Construction & Permits"], name: "Site Survey & Geotechnical", status: "completed", priority: "high", assigned_to: userIds.superintendent, start_date: "2025-11-01", end_date: "2025-12-15", completion_pct: 100, sort_order: 1 },
        { company_id: companyId, project_id: mtcId, phase_id: mtcPhaseMap["Pre-Construction & Permits"], name: "Permit Applications", status: "completed", priority: "medium", assigned_to: userIds.project_manager, start_date: "2025-11-15", end_date: "2026-01-31", completion_pct: 100, sort_order: 2 },
        { company_id: companyId, project_id: mtcId, phase_id: mtcPhaseMap["Pre-Construction & Permits"], name: "Demolition Plan", status: "in_progress", priority: "high", assigned_to: userIds.superintendent, start_date: "2026-01-15", end_date: "2026-02-28", completion_pct: 55, sort_order: 3 },
        { company_id: companyId, project_id: mtcId, phase_id: mtcPhaseMap["Foundation & Structure"], name: "Excavation & Shoring", status: "in_progress", priority: "critical", assigned_to: userIds.superintendent, start_date: "2026-01-20", end_date: "2026-04-15", completion_pct: 30, is_critical_path: true, sort_order: 4 },
        { company_id: companyId, project_id: mtcId, phase_id: mtcPhaseMap["Foundation & Structure"], name: "Foundation Piling", status: "not_started", priority: "high", assigned_to: userIds.field_worker, start_date: "2026-03-01", end_date: "2026-05-31", completion_pct: 0, sort_order: 5 },
        { company_id: companyId, project_id: mtcId, phase_id: mtcPhaseMap["Foundation & Structure"], name: "Grade Beams & Slab", status: "not_started", priority: "high", assigned_to: userIds.field_worker, start_date: "2026-05-01", end_date: "2026-08-31", completion_pct: 0, sort_order: 6 },
        { company_id: companyId, project_id: mtcId, phase_id: mtcPhaseMap["Building Envelope & MEP"], name: "Structural Steel Erection", status: "not_started", priority: "critical", assigned_to: userIds.superintendent, start_date: "2026-06-01", end_date: "2026-10-31", completion_pct: 0, is_critical_path: true, sort_order: 7 },
        { company_id: companyId, project_id: mtcId, phase_id: mtcPhaseMap["Building Envelope & MEP"], name: "Curtain Wall & Glazing", status: "not_started", priority: "medium", assigned_to: userIds.field_worker, start_date: "2026-09-01", end_date: "2027-01-31", completion_pct: 0, sort_order: 8 },
        { company_id: companyId, project_id: mtcId, phase_id: mtcPhaseMap["Interior Build-Out & Finishes"], name: "MEP Rough-In", status: "not_started", priority: "medium", assigned_to: userIds.field_worker, start_date: "2026-10-01", end_date: "2027-03-31", completion_pct: 0, sort_order: 9 },
        { company_id: companyId, project_id: mtcId, phase_id: mtcPhaseMap["Interior Build-Out & Finishes"], name: "Tenant Improvement Spaces", status: "not_started", priority: "low", assigned_to: userIds.field_worker, start_date: "2027-02-01", end_date: "2027-06-30", completion_pct: 0, sort_order: 10 },
      ]);
    }

    // ============================================================
    // 7c. PROJECT PHASES & TASKS (for WHR-003)
    // ============================================================
    const whrId = projectMap["WHR-003"];
    if (whrId) {
      const { data: whrPhases } = await supabase
        .from("project_phases")
        .insert([
          { company_id: companyId, project_id: whrId, name: "Site Prep & Foundation", sort_order: 1, color: "#ef4444", start_date: "2025-03-01", end_date: "2025-06-30" },
          { company_id: companyId, project_id: whrId, name: "Framing & Roofing", sort_order: 2, color: "#f97316", start_date: "2025-05-15", end_date: "2025-09-30" },
          { company_id: companyId, project_id: whrId, name: "MEP & Insulation", sort_order: 3, color: "#8b5cf6", start_date: "2025-08-01", end_date: "2025-12-31" },
          { company_id: companyId, project_id: whrId, name: "Interior Finishes", sort_order: 4, color: "#10b981", start_date: "2025-11-01", end_date: "2026-03-15" },
          { company_id: companyId, project_id: whrId, name: "Exterior & Landscaping", sort_order: 5, color: "#06b6d4", start_date: "2026-01-15", end_date: "2026-04-15" },
        ])
        .select("id, name");

      const whrPhaseMap: Record<string, string> = {};
      for (const ph of whrPhases ?? []) {
        whrPhaseMap[ph.name] = ph.id;
      }

      await supabase.from("project_tasks").insert([
        { company_id: companyId, project_id: whrId, phase_id: whrPhaseMap["Site Prep & Foundation"], name: "Clear & Grade Lot", status: "completed", priority: "high", assigned_to: userIds.superintendent, start_date: "2025-03-01", end_date: "2025-04-15", completion_pct: 100, sort_order: 1 },
        { company_id: companyId, project_id: whrId, phase_id: whrPhaseMap["Site Prep & Foundation"], name: "Foundation Pour", status: "completed", priority: "critical", assigned_to: userIds.superintendent, start_date: "2025-04-15", end_date: "2025-06-30", completion_pct: 100, is_milestone: true, sort_order: 2 },
        { company_id: companyId, project_id: whrId, phase_id: whrPhaseMap["Framing & Roofing"], name: "Structural Framing", status: "completed", priority: "high", assigned_to: userIds.superintendent, start_date: "2025-05-15", end_date: "2025-08-15", completion_pct: 100, sort_order: 3 },
        { company_id: companyId, project_id: whrId, phase_id: whrPhaseMap["Framing & Roofing"], name: "Roof Trusses & Sheathing", status: "completed", priority: "high", assigned_to: userIds.field_worker, start_date: "2025-08-01", end_date: "2025-09-30", completion_pct: 100, sort_order: 4 },
        { company_id: companyId, project_id: whrId, phase_id: whrPhaseMap["MEP & Insulation"], name: "Electrical Rough-In", status: "completed", priority: "medium", assigned_to: userIds.field_worker, start_date: "2025-08-01", end_date: "2025-10-15", completion_pct: 100, sort_order: 5 },
        { company_id: companyId, project_id: whrId, phase_id: whrPhaseMap["MEP & Insulation"], name: "Plumbing Rough-In", status: "completed", priority: "medium", assigned_to: userIds.field_worker, start_date: "2025-08-15", end_date: "2025-10-31", completion_pct: 100, sort_order: 6 },
        { company_id: companyId, project_id: whrId, phase_id: whrPhaseMap["MEP & Insulation"], name: "HVAC Installation", status: "completed", priority: "medium", assigned_to: userIds.field_worker, start_date: "2025-09-01", end_date: "2025-12-31", completion_pct: 100, sort_order: 7 },
        { company_id: companyId, project_id: whrId, phase_id: whrPhaseMap["Interior Finishes"], name: "Drywall & Paint", status: "completed", priority: "medium", assigned_to: userIds.field_worker, start_date: "2025-11-01", end_date: "2026-01-15", completion_pct: 100, sort_order: 8 },
        { company_id: companyId, project_id: whrId, phase_id: whrPhaseMap["Interior Finishes"], name: "Flooring & Tile", status: "in_progress", priority: "medium", assigned_to: userIds.field_worker, start_date: "2026-01-01", end_date: "2026-02-28", completion_pct: 65, sort_order: 9 },
        { company_id: companyId, project_id: whrId, phase_id: whrPhaseMap["Interior Finishes"], name: "Cabinetry & Countertops", status: "in_progress", priority: "high", assigned_to: userIds.superintendent, start_date: "2026-01-15", end_date: "2026-03-15", completion_pct: 40, sort_order: 10 },
        { company_id: companyId, project_id: whrId, phase_id: whrPhaseMap["Exterior & Landscaping"], name: "Pool Construction", status: "in_progress", priority: "high", assigned_to: userIds.superintendent, start_date: "2026-01-15", end_date: "2026-03-31", completion_pct: 30, sort_order: 11 },
        { company_id: companyId, project_id: whrId, phase_id: whrPhaseMap["Exterior & Landscaping"], name: "Landscaping & Hardscape", status: "not_started", priority: "medium", assigned_to: userIds.field_worker, start_date: "2026-03-01", end_date: "2026-04-15", completion_pct: 0, sort_order: 12 },
      ]);
    }

    // ============================================================
    // 7d. PROJECT PHASES & TASKS (for EAW-004)
    // ============================================================
    const eawId = projectMap["EAW-004"];
    if (eawId) {
      const { data: eawPhases } = await supabase
        .from("project_phases")
        .insert([
          { company_id: companyId, project_id: eawId, name: "Design Development", sort_order: 1, color: "#8b5cf6", start_date: "2026-01-01", end_date: "2026-03-31" },
          { company_id: companyId, project_id: eawId, name: "Permitting & Pre-Con", sort_order: 2, color: "#f59e0b", start_date: "2026-03-01", end_date: "2026-05-31" },
          { company_id: companyId, project_id: eawId, name: "Structural Assessment", sort_order: 3, color: "#ef4444", start_date: "2026-04-01", end_date: "2026-06-30" },
        ])
        .select("id, name");

      const eawPhaseMap: Record<string, string> = {};
      for (const ph of eawPhases ?? []) {
        eawPhaseMap[ph.name] = ph.id;
      }

      await supabase.from("project_tasks").insert([
        { company_id: companyId, project_id: eawId, phase_id: eawPhaseMap["Design Development"], name: "Architectural Design Documents", status: "in_progress", priority: "high", assigned_to: userIds.project_manager, start_date: "2026-01-01", end_date: "2026-02-28", completion_pct: 45, sort_order: 1 },
        { company_id: companyId, project_id: eawId, phase_id: eawPhaseMap["Design Development"], name: "MEP Engineering Coordination", status: "not_started", priority: "medium", assigned_to: userIds.project_manager, start_date: "2026-02-01", end_date: "2026-03-31", completion_pct: 0, sort_order: 2 },
        { company_id: companyId, project_id: eawId, phase_id: eawPhaseMap["Permitting & Pre-Con"], name: "Historic Preservation Review", status: "not_started", priority: "high", assigned_to: userIds.project_manager, start_date: "2026-03-01", end_date: "2026-04-30", completion_pct: 0, sort_order: 3 },
        { company_id: companyId, project_id: eawId, phase_id: eawPhaseMap["Permitting & Pre-Con"], name: "Building Permit Submission", status: "not_started", priority: "medium", assigned_to: userIds.project_manager, start_date: "2026-04-01", end_date: "2026-05-31", completion_pct: 0, sort_order: 4 },
        { company_id: companyId, project_id: eawId, phase_id: eawPhaseMap["Structural Assessment"], name: "Load-Bearing Wall Analysis", status: "not_started", priority: "critical", assigned_to: userIds.superintendent, start_date: "2026-04-01", end_date: "2026-06-30", completion_pct: 0, sort_order: 5 },
      ]);
    }

    // ============================================================
    // 7e. PROJECT PHASES & TASKS (for PCP-005)
    // ============================================================
    const pcpIdForPhases = projectMap["PCP-005"];
    if (pcpIdForPhases) {
      const { data: pcpPhases } = await supabase
        .from("project_phases")
        .insert([
          { company_id: companyId, project_id: pcpIdForPhases, name: "Site Work & Earthmoving", sort_order: 1, color: "#ef4444", start_date: "2024-09-01", end_date: "2025-01-31" },
          { company_id: companyId, project_id: pcpIdForPhases, name: "Infrastructure & Utilities", sort_order: 2, color: "#f97316", start_date: "2024-12-01", end_date: "2025-05-31" },
          { company_id: companyId, project_id: pcpIdForPhases, name: "Structures & Amenities", sort_order: 3, color: "#3b82f6", start_date: "2025-04-01", end_date: "2025-09-30" },
          { company_id: companyId, project_id: pcpIdForPhases, name: "Final Grading & Landscaping", sort_order: 4, color: "#10b981", start_date: "2025-08-01", end_date: "2026-01-15" },
        ])
        .select("id, name");

      const pcpPhaseMap: Record<string, string> = {};
      for (const ph of pcpPhases ?? []) {
        pcpPhaseMap[ph.name] = ph.id;
      }

      await supabase.from("project_tasks").insert([
        { company_id: companyId, project_id: pcpIdForPhases, phase_id: pcpPhaseMap["Site Work & Earthmoving"], name: "Mass Grading & Excavation", status: "completed", priority: "high", assigned_to: userIds.superintendent, start_date: "2024-09-01", end_date: "2024-11-15", completion_pct: 100, sort_order: 1 },
        { company_id: companyId, project_id: pcpIdForPhases, phase_id: pcpPhaseMap["Site Work & Earthmoving"], name: "Erosion Control & Drainage", status: "completed", priority: "medium", assigned_to: userIds.field_worker, start_date: "2024-10-01", end_date: "2025-01-31", completion_pct: 100, sort_order: 2 },
        { company_id: companyId, project_id: pcpIdForPhases, phase_id: pcpPhaseMap["Infrastructure & Utilities"], name: "Water & Sewer Lines", status: "completed", priority: "high", assigned_to: userIds.superintendent, start_date: "2024-12-01", end_date: "2025-03-15", completion_pct: 100, sort_order: 3 },
        { company_id: companyId, project_id: pcpIdForPhases, phase_id: pcpPhaseMap["Infrastructure & Utilities"], name: "Electrical & Lighting", status: "completed", priority: "medium", assigned_to: userIds.field_worker, start_date: "2025-01-15", end_date: "2025-05-31", completion_pct: 100, sort_order: 4 },
        { company_id: companyId, project_id: pcpIdForPhases, phase_id: pcpPhaseMap["Structures & Amenities"], name: "Pavilion & Restroom Building", status: "completed", priority: "high", assigned_to: userIds.superintendent, start_date: "2025-04-01", end_date: "2025-07-31", completion_pct: 100, sort_order: 5 },
        { company_id: companyId, project_id: pcpIdForPhases, phase_id: pcpPhaseMap["Structures & Amenities"], name: "Splash Pad Operational", status: "completed", priority: "critical", assigned_to: userIds.superintendent, start_date: "2025-06-01", end_date: "2025-09-30", completion_pct: 100, is_milestone: true, sort_order: 6 },
        { company_id: companyId, project_id: pcpIdForPhases, phase_id: pcpPhaseMap["Final Grading & Landscaping"], name: "Athletic Fields & Walking Trails", status: "completed", priority: "medium", assigned_to: userIds.field_worker, start_date: "2025-08-01", end_date: "2025-11-30", completion_pct: 100, sort_order: 7 },
        { company_id: companyId, project_id: pcpIdForPhases, phase_id: pcpPhaseMap["Final Grading & Landscaping"], name: "Final Walkthrough", status: "completed", priority: "critical", assigned_to: userIds.project_manager, start_date: "2025-12-15", end_date: "2026-01-15", completion_pct: 100, is_milestone: true, sort_order: 8 },
      ]);
    }

    // ============================================================
    // 7f. PROJECT PHASES & TASKS (for SCH-006)
    // ============================================================
    const schId = projectMap["SCH-006"];
    if (schId) {
      const { data: schPhases } = await supabase
        .from("project_phases")
        .insert([
          { company_id: companyId, project_id: schId, name: "Demolition & Abatement", sort_order: 1, color: "#ef4444", start_date: "2025-08-01", end_date: "2025-11-30" },
          { company_id: companyId, project_id: schId, name: "Structural Modifications", sort_order: 2, color: "#f97316", start_date: "2025-10-01", end_date: "2026-03-31" },
          { company_id: companyId, project_id: schId, name: "Guest Room Renovation", sort_order: 3, color: "#10b981", start_date: "2026-01-01", end_date: "2026-08-31" },
        ])
        .select("id, name");

      const schPhaseMap: Record<string, string> = {};
      for (const ph of schPhases ?? []) {
        schPhaseMap[ph.name] = ph.id;
      }

      await supabase.from("project_tasks").insert([
        { company_id: companyId, project_id: schId, phase_id: schPhaseMap["Demolition & Abatement"], name: "Asbestos Abatement - Floors 1-3", status: "completed", priority: "critical", assigned_to: userIds.superintendent, start_date: "2025-08-01", end_date: "2025-09-30", completion_pct: 100, sort_order: 1 },
        { company_id: companyId, project_id: schId, phase_id: schPhaseMap["Demolition & Abatement"], name: "Interior Demolition - Guest Rooms", status: "completed", priority: "high", assigned_to: userIds.superintendent, start_date: "2025-09-15", end_date: "2025-11-30", completion_pct: 100, sort_order: 2 },
        { company_id: companyId, project_id: schId, phase_id: schPhaseMap["Structural Modifications"], name: "Load-Bearing Wall Reinforcement", status: "in_progress", priority: "critical", assigned_to: userIds.superintendent, start_date: "2025-10-01", end_date: "2026-01-31", completion_pct: 60, is_critical_path: true, notes: "Project on hold due to financing. Work paused mid-January 2026.", sort_order: 3 },
        { company_id: companyId, project_id: schId, phase_id: schPhaseMap["Structural Modifications"], name: "Elevator Shaft Modifications", status: "not_started", priority: "high", assigned_to: userIds.field_worker, start_date: "2026-01-15", end_date: "2026-03-31", completion_pct: 0, notes: "On hold pending financing resolution.", sort_order: 4 },
        { company_id: companyId, project_id: schId, phase_id: schPhaseMap["Guest Room Renovation"], name: "Guest Room Framing & MEP", status: "not_started", priority: "medium", assigned_to: userIds.field_worker, start_date: "2026-03-01", end_date: "2026-06-30", completion_pct: 0, sort_order: 5 },
        { company_id: companyId, project_id: schId, phase_id: schPhaseMap["Guest Room Renovation"], name: "Guest Room Finishes & FF&E", status: "not_started", priority: "medium", assigned_to: userIds.field_worker, start_date: "2026-05-01", end_date: "2026-08-31", completion_pct: 0, sort_order: 6 },
      ]);
    }

    // ============================================================
    // 8. PROPERTIES
    // ============================================================
    const { data: propertiesData } = await supabase
      .from("properties")
      .insert([
        {
          company_id: companyId, name: "Barton Creek Office Park", property_type: "commercial",
          address_line1: "3500 Barton Creek Blvd", city: "Austin", state: "TX", zip: "78735",
          year_built: 2018, total_sqft: 85000, total_units: 12, occupied_units: 10,
          purchase_price: 18500000, current_value: 22000000, monthly_revenue: 142500, monthly_expenses: 48500,
          manager_id: userIds.project_manager,
        },
        {
          company_id: companyId, name: "Domain Residential Tower", property_type: "residential",
          address_line1: "11500 Domain Drive", city: "Austin", state: "TX", zip: "78758",
          year_built: 2020, total_sqft: 210000, total_units: 180, occupied_units: 168,
          purchase_price: 62000000, current_value: 71000000, monthly_revenue: 396000, monthly_expenses: 145000,
          manager_id: userIds.project_manager,
        },
        {
          company_id: companyId, name: "South Lamar Retail Center", property_type: "commercial",
          address_line1: "2200 South Lamar Blvd", city: "Austin", state: "TX", zip: "78704",
          year_built: 2015, total_sqft: 32000, total_units: 8, occupied_units: 7,
          purchase_price: 9200000, current_value: 11500000, monthly_revenue: 68000, monthly_expenses: 22000,
          manager_id: userIds.project_manager,
        },
        {
          company_id: companyId, name: "East Riverside Apartments", property_type: "residential",
          address_line1: "1800 East Riverside Drive", city: "Austin", state: "TX", zip: "78741",
          year_built: 2012, total_sqft: 95000, total_units: 96, occupied_units: 88,
          purchase_price: 24000000, current_value: 28500000, monthly_revenue: 172800, monthly_expenses: 62000,
          manager_id: userIds.project_manager,
        },
      ])
      .select("id, name");

    const propertyMap: Record<string, string> = {};
    for (const p of propertiesData ?? []) {
      propertyMap[p.name] = p.id;
    }

    // ============================================================
    // 9. UNITS (for Domain Residential - sample)
    // ============================================================
    const domainId = propertyMap["Domain Residential Tower"];
    const unitInserts = [];
    const unitTypes = ["studio", "1br", "1br", "2br", "2br", "3br"];
    const rents = [1650, 2100, 2100, 2800, 2800, 3500];
    for (let floor = 1; floor <= 6; floor++) {
      for (let unit = 1; unit <= 4; unit++) {
        const idx = (floor - 1) % unitTypes.length;
        const unitNum = `${floor}0${unit}`;
        unitInserts.push({
          company_id: companyId,
          property_id: domainId,
          unit_number: unitNum,
          unit_type: unitTypes[idx],
          sqft: 600 + idx * 200,
          bedrooms: idx <= 0 ? 0 : idx <= 2 ? 1 : idx <= 4 ? 2 : 3,
          bathrooms: idx <= 0 ? 1 : idx <= 2 ? 1 : 2,
          floor_number: floor,
          market_rent: rents[idx],
          status: Math.random() > 0.1 ? "occupied" : "vacant",
        });
      }
    }

    const { data: unitsData } = await supabase.from("units").insert(unitInserts).select("id, unit_number, status, property_id");

    // Barton Creek units (offices)
    const bartonId = propertyMap["Barton Creek Office Park"];
    const officeUnits = [];
    for (let i = 1; i <= 12; i++) {
      officeUnits.push({
        company_id: companyId,
        property_id: bartonId,
        unit_number: `Suite ${100 + i * 10}`,
        unit_type: "office",
        sqft: 4000 + Math.floor(Math.random() * 4000),
        floor_number: Math.ceil(i / 4),
        market_rent: 8000 + Math.floor(Math.random() * 6000),
        status: i <= 10 ? "occupied" : "vacant",
      });
    }
    const { data: officeUnitsData } = await supabase.from("units").insert(officeUnits).select("id, unit_number, status, property_id");

    // ============================================================
    // 10. LEASES
    // ============================================================
    const allUnits = [...(unitsData ?? []), ...(officeUnitsData ?? [])];
    const occupiedUnits = allUnits.filter((u) => u.status === "occupied");

    const tenantNames = [
      "TechStar Solutions", "Austin Digital Agency", "Hill Country Physical Therapy", "Lone Star Legal Group",
      "Maria Gonzalez", "Chris Anderson", "Samantha Liu", "Derek Johnson", "Priya Patel", "Tyler Brooks",
      "Harmony Wellness Center", "CapCity Accounting", "Bluebonnet Insurance", "Quantum Analytics",
      "Amy Richardson", "Jake Morrison", "Fatima Al-Hassan", "Brandon Lee", "Nicole Torres", "Wei Zhang",
      "StartUp Nexus", "Green Valley Dental", "Peak Performance Gym", "Artisan Coffee Collective",
    ];

    const leaseInserts = occupiedUnits.slice(0, 24).map((unit, i) => {
      const startMonth = Math.floor(Math.random() * 12);
      const startDate = new Date(2025, startMonth, 1);
      const endDate = new Date(2026, startMonth + 12, 0);
      const rent = 1500 + Math.floor(Math.random() * 3000);
      const name = tenantNames[i % tenantNames.length];
      // Link tenant auth user if this tenant has a portal account
      const tenantUserId = tenantUserIds[name] || null;
      return {
        company_id: companyId,
        property_id: unit.property_id,
        unit_id: unit.id,
        tenant_name: name,
        tenant_email: tenantUserId
          ? TENANT_USERS.find((t) => t.tenant_name === name)?.email ?? `tenant${i + 1}@example.com`
          : `tenant${i + 1}@example.com`,
        tenant_phone: `(512) 555-${3000 + i}`,
        tenant_user_id: tenantUserId,
        lease_start: startDate.toISOString().slice(0, 10),
        lease_end: endDate.toISOString().slice(0, 10),
        monthly_rent: rent,
        security_deposit: rent * 2,
        status: "active",
        auto_renew: Math.random() > 0.5,
      };
    });

    const { data: leasesData } = await supabase.from("leases").insert(leaseInserts).select("id, tenant_user_id");

    // ============================================================
    // 11. RENT PAYMENTS (last 3 months)
    // ============================================================
    const rentPayments = [];
    for (const lease of leasesData?.slice(0, 15) ?? []) {
      for (let monthOffset = 2; monthOffset >= 0; monthOffset--) {
        const d = new Date(2026, 1 - monthOffset, 1);
        rentPayments.push({
          company_id: companyId,
          lease_id: lease.id,
          amount: 1500 + Math.floor(Math.random() * 3000),
          payment_date: d.toISOString().slice(0, 10),
          due_date: d.toISOString().slice(0, 10),
          method: ["ach", "check", "credit_card"][Math.floor(Math.random() * 3)],
          status: monthOffset === 0 && Math.random() > 0.8 ? "pending" : "paid",
        });
      }
    }
    if (rentPayments.length > 0) {
      await supabase.from("rent_payments").insert(rentPayments);
    }

    // ============================================================
    // 12. MAINTENANCE REQUESTS
    // ============================================================
    const maintCategories = ["plumbing", "electrical", "hvac", "appliance", "structural", "general"];
    const maintStatuses = ["submitted", "assigned", "in_progress", "completed", "closed"];
    const maintDescriptions = [
      "Leaking faucet in kitchen sink",
      "HVAC unit making loud noise on startup",
      "Ceiling light fixture flickering in hallway",
      "Dishwasher not draining properly",
      "Bathroom exhaust fan stopped working",
      "Crack in drywall near window frame",
      "Hot water heater leaking from bottom",
      "Garbage disposal jammed",
      "Thermostat not responding to temperature changes",
      "Front door lock mechanism sticking",
      "Toilet running continuously",
      "Elevator service button not illuminating",
    ];

    // Get tenant user IDs for assigning maintenance requests
    const tenantId1 = tenantUserIds["Maria Gonzalez"] || null;
    const tenantId2 = tenantUserIds["Chris Anderson"] || null;

    const maintInserts = maintDescriptions.map((desc, i) => {
      // First 4 requests are from tenant1 (Maria), next 2 from tenant2 (Chris), rest from field_worker
      let requestedBy = userIds.field_worker;
      if (i < 4 && tenantId1) requestedBy = tenantId1;
      else if (i >= 4 && i < 6 && tenantId2) requestedBy = tenantId2;

      return {
        company_id: companyId,
        property_id: i < 6 ? domainId : bartonId,
        title: desc,
        description: `${desc}. Tenant reported the issue on ${new Date(2026, 0, 15 + i).toLocaleDateString()}.`,
        category: maintCategories[i % maintCategories.length],
        priority: i < 2 ? "emergency" : i < 5 ? "high" : "medium",
        status: maintStatuses[i % maintStatuses.length],
        requested_by: requestedBy,
        assigned_to: i % 3 === 0 ? userIds.superintendent : userIds.field_worker,
        estimated_cost: 150 + Math.floor(Math.random() * 800),
        actual_cost: i % 2 === 0 ? 200 + Math.floor(Math.random() * 600) : null,
        scheduled_date: new Date(2026, 1, 1 + i * 2).toISOString().slice(0, 10),
        completed_at: maintStatuses[i % maintStatuses.length] === "completed" ? new Date(2026, 1, 5 + i).toISOString() : null,
      };
    });

    await supabase.from("maintenance_requests").insert(maintInserts);

    // ============================================================
    // 13. CONTACTS (Subs, Vendors, Clients)
    // ============================================================
    const contactSeeds = [
      { contact_type: "subcontractor", first_name: "Robert", last_name: "Miller", company_name: "Miller Steel Erectors", job_title: "Owner", email: "rmiller@millersteel.com", phone: "(512) 555-4001" },
      { contact_type: "subcontractor", first_name: "Carlos", last_name: "Hernandez", company_name: "Hernandez Concrete Works", job_title: "President", email: "carlos@hernandezconc.com", phone: "(512) 555-4002" },
      { contact_type: "subcontractor", first_name: "Mike", last_name: "Thompson", company_name: "Thompson Electric", job_title: "Estimator", email: "mthompson@thompe.com", phone: "(512) 555-4003" },
      { contact_type: "subcontractor", first_name: "Angela", last_name: "Davis", company_name: "Davis Mechanical Systems", job_title: "VP Operations", email: "adavis@davismech.com", phone: "(512) 555-4004" },
      { contact_type: "subcontractor", first_name: "Kevin", last_name: "O'Brien", company_name: "Premier Plumbing", job_title: "Foreman", email: "kobrien@premierplumb.com", phone: "(512) 555-4005" },
      { contact_type: "subcontractor", first_name: "Diana", last_name: "Patel", company_name: "Patel Drywall & Finishes", job_title: "Project Manager", email: "dpatel@patelfinishes.com", phone: "(512) 555-4006" },
      { contact_type: "vendor", first_name: "John", last_name: "Carpenter", company_name: "Texas Building Supply", job_title: "Account Manager", email: "jcarpenter@txbuild.com", phone: "(512) 555-4007" },
      { contact_type: "vendor", first_name: "Susan", last_name: "Wright", company_name: "Lone Star Lumber", job_title: "Sales Rep", email: "swright@lslumber.com", phone: "(512) 555-4008" },
      { contact_type: "vendor", first_name: "Daniel", last_name: "Park", company_name: "Atlas Equipment Rental", job_title: "Branch Manager", email: "dpark@atlasequip.com", phone: "(512) 555-4009" },
      { contact_type: "client", first_name: "Patricia", last_name: "Holmes", company_name: "Riverside Health Systems", job_title: "VP Facilities", email: "pholmes@riversidehealth.com", phone: "(512) 555-2001" },
      { contact_type: "client", first_name: "Robert", last_name: "Langford", company_name: "Catellus Development", job_title: "Development Director", email: "rlangford@catellus.com", phone: "(512) 555-2002" },
      { contact_type: "client", first_name: "Thomas", last_name: "Sterling", company_name: "Sterling Investments", job_title: "Principal", email: "tsterling@sterlinginvestments.com", phone: "(512) 555-2003" },
      { contact_type: "employee", first_name: "Marcus", last_name: "Johnson", company_name: "Summit Builders Group", job_title: "CEO", email: "owner@demo.com", phone: "(512) 555-0101", user_id: userIds.owner },
      { contact_type: "employee", first_name: "Sarah", last_name: "Chen", company_name: "Summit Builders Group", job_title: "Senior PM", email: "pm@demo.com", phone: "(512) 555-0102", user_id: userIds.project_manager },
      { contact_type: "employee", first_name: "James", last_name: "Rodriguez", company_name: "Summit Builders Group", job_title: "Superintendent", email: "super@demo.com", phone: "(512) 555-0103", user_id: userIds.superintendent },
    ];

    const { data: contactsData } = await supabase
      .from("contacts")
      .insert(contactSeeds.map((c) => ({ company_id: companyId, ...c })))
      .select("id, first_name, last_name, contact_type, company_name");

    const subContacts = (contactsData ?? []).filter((c) => c.contact_type === "subcontractor");

    // ============================================================
    // 14. VENDOR CONTRACTS
    // ============================================================
    if (rmcId && subContacts.length >= 4) {
      await supabase.from("vendor_contracts").insert([
        { company_id: companyId, vendor_id: subContacts[0].id, project_id: rmcId, contract_number: "SC-2025-001", title: "Structural Steel Package", contract_type: "subcontract", amount: 4600000, status: "active", start_date: "2025-08-01", end_date: "2026-03-31", retention_pct: 10, insurance_required: true, insurance_expiry: "2026-12-31" },
        { company_id: companyId, vendor_id: subContacts[1].id, project_id: rmcId, contract_number: "SC-2025-002", title: "Concrete Foundation & Decks", contract_type: "subcontract", amount: 3400000, status: "active", start_date: "2025-06-15", end_date: "2026-02-28", retention_pct: 10, insurance_required: true, insurance_expiry: "2026-12-31" },
        { company_id: companyId, vendor_id: subContacts[2].id, project_id: rmcId, contract_number: "SC-2025-003", title: "Electrical Systems", contract_type: "subcontract", amount: 1800000, status: "active", start_date: "2026-01-15", end_date: "2026-09-30", retention_pct: 10, insurance_required: true, insurance_expiry: "2026-12-31" },
        { company_id: companyId, vendor_id: subContacts[3].id, project_id: rmcId, contract_number: "SC-2025-004", title: "HVAC & Mechanical", contract_type: "subcontract", amount: 2900000, status: "active", start_date: "2026-02-01", end_date: "2026-08-31", retention_pct: 10, insurance_required: true, insurance_expiry: "2027-06-30" },
      ]);
    }

    // ============================================================
    // 15. INVOICES (AP & AR across last 8 months)
    // ============================================================
    const invoiceInserts = [];
    let invNum = 1;

    // AR Invoices (from clients to us)
    const arClients = ["Riverside Health Systems", "Catellus Development", "Thomas Sterling", "City of Pflugerville", "SoCo Hospitality"];
    const arProjects = [rmcId, projectMap["MTC-002"], projectMap["WHR-003"], projectMap["PCP-005"], projectMap["SCH-006"]];

    for (let monthBack = 11; monthBack >= 0; monthBack--) {
      const invDate = new Date(2025, 2 + (11 - monthBack), 1);
      const dueDate = new Date(invDate);
      dueDate.setDate(dueDate.getDate() + 30);

      for (let j = 0; j < 3; j++) {
        const clientIdx = (monthBack + j) % arClients.length;
        const amount = 150000 + Math.floor(Math.random() * 350000);
        const tax = Math.round(amount * 0.0825);
        const total = amount + tax;
        const isPaid = monthBack > 1;

        invoiceInserts.push({
          company_id: companyId,
          invoice_number: `INV-${String(invNum++).padStart(4, "0")}`,
          invoice_type: "receivable",
          client_name: arClients[clientIdx],
          project_id: arProjects[clientIdx] || null,
          invoice_date: invDate.toISOString().slice(0, 10),
          due_date: dueDate.toISOString().slice(0, 10),
          subtotal: amount,
          tax_amount: tax,
          total_amount: total,
          amount_paid: isPaid ? total : monthBack === 1 ? Math.round(total * 0.5) : 0,
          status: isPaid ? "paid" : monthBack === 0 ? "pending" : "overdue",
          line_items: [
            { description: "Progress billing - General Conditions", quantity: 1, unit_price: Math.round(amount * 0.3), amount: Math.round(amount * 0.3) },
            { description: "Progress billing - Trade Work", quantity: 1, unit_price: Math.round(amount * 0.7), amount: Math.round(amount * 0.7) },
          ],
        });
      }
    }

    // AP Invoices (from subs/vendors to us)
    const apVendors = ["Miller Steel Erectors", "Hernandez Concrete Works", "Thompson Electric", "Davis Mechanical", "Texas Building Supply", "Atlas Equipment Rental"];

    for (let monthBack = 11; monthBack >= 0; monthBack--) {
      const invDate = new Date(2025, 2 + (11 - monthBack), 15);
      const dueDate = new Date(invDate);
      dueDate.setDate(dueDate.getDate() + 30);

      for (let j = 0; j < 2; j++) {
        const vendorIdx = (monthBack + j) % apVendors.length;
        const amount = 45000 + Math.floor(Math.random() * 180000);
        const tax = Math.round(amount * 0.0825);
        const total = amount + tax;
        const isPaid = monthBack > 2;

        invoiceInserts.push({
          company_id: companyId,
          invoice_number: `AP-${String(invNum++).padStart(4, "0")}`,
          invoice_type: "payable",
          vendor_name: apVendors[vendorIdx],
          project_id: rmcId,
          invoice_date: invDate.toISOString().slice(0, 10),
          due_date: dueDate.toISOString().slice(0, 10),
          subtotal: amount,
          tax_amount: tax,
          total_amount: total,
          amount_paid: isPaid ? total : 0,
          status: isPaid ? "paid" : monthBack <= 1 ? "pending" : "overdue",
          line_items: [
            { description: `${apVendors[vendorIdx]} - Progress Payment`, quantity: 1, unit_price: amount, amount },
          ],
        });
      }
    }

    await supabase.from("invoices").insert(invoiceInserts);

    // ============================================================
    // 15b. PAYMENTS (construction payments for paid invoices)
    // ============================================================
    const { data: paidInvoices } = await supabase
      .from("invoices")
      .select("id, total_amount, invoice_date")
      .eq("company_id", companyId)
      .eq("status", "paid")
      .order("invoice_date", { ascending: false })
      .limit(6);

    if (paidInvoices && paidInvoices.length > 0) {
      const bankAccountId = bankAccounts?.[0]?.id || null;
      await supabase.from("payments").insert(
        paidInvoices.map((inv, i) => ({
          company_id: companyId,
          invoice_id: inv.id,
          payment_date: inv.invoice_date,
          amount: Number(inv.total_amount),
          method: ["ach", "check", "wire"][i % 3],
          reference_number: `PAY-${String(i + 1).padStart(4, "0")}`,
          bank_account_id: bankAccountId,
        }))
      );
    }

    // ============================================================
    // 16. CHANGE ORDERS
    // ============================================================
    if (rmcId) {
      await supabase.from("change_orders").insert([
        {
          company_id: companyId, project_id: rmcId, co_number: "CO-001", title: "Additional Structural Steel for Canopy",
          description: "Owner requested an extended entry canopy requiring additional steel framing and columns.", status: "approved",
          reason: "owner_request", amount: 185000, schedule_impact_days: 12, requested_by: userIds.project_manager,
          approved_by: userIds.owner, approved_at: "2025-11-15T10:00:00Z",
          line_items: [{ description: "Structural steel (additional 15 tons)", quantity: 15, unit: "ton", unit_cost: 8500, total: 127500 }, { description: "Labor - Erection", quantity: 240, unit: "hr", unit_cost: 240, total: 57600 }],
        },
        {
          company_id: companyId, project_id: rmcId, co_number: "CO-002", title: "Underground Utility Relocation",
          description: "Unforeseen existing utilities conflict discovered during excavation requiring rerouting.", status: "approved",
          reason: "unforeseen_condition", amount: 92000, schedule_impact_days: 8, requested_by: userIds.superintendent,
          approved_by: userIds.owner, approved_at: "2025-09-20T14:00:00Z",
          line_items: [{ description: "Utility relocation", quantity: 1, unit: "ls", unit_cost: 92000, total: 92000 }],
        },
        {
          company_id: companyId, project_id: rmcId, co_number: "CO-003", title: "Upgraded HVAC Controls System",
          description: "Design change to smart building controls with DDC integration per owner request.", status: "submitted",
          reason: "design_change", amount: 245000, schedule_impact_days: 5, requested_by: userIds.project_manager,
          line_items: [{ description: "DDC Controls package", quantity: 1, unit: "ls", unit_cost: 185000, total: 185000 }, { description: "Integration & commissioning", quantity: 1, unit: "ls", unit_cost: 60000, total: 60000 }],
        },
        {
          company_id: companyId, project_id: rmcId, co_number: "CO-004", title: "Value Engineering - Alternate Roofing",
          description: "Switch from standing seam to TPO membrane roofing system, reducing cost while maintaining warranty.", status: "draft",
          reason: "value_engineering", amount: -65000, schedule_impact_days: 0, requested_by: userIds.project_manager,
          line_items: [{ description: "Credit - Standing seam deletion", quantity: 1, unit: "ls", unit_cost: -185000, total: -185000 }, { description: "TPO membrane installation", quantity: 1, unit: "ls", unit_cost: 120000, total: 120000 }],
        },
      ]);
    }

    // Change Orders for MTC-002
    if (mtcId) {
      await supabase.from("change_orders").insert([
        {
          company_id: companyId, project_id: mtcId, co_number: "CO-001", title: "Additional Soil Remediation",
          description: "Unexpected contaminated soil discovered during excavation requiring environmental remediation before foundation work can proceed.", status: "approved",
          reason: "unforeseen_condition", amount: 145000, schedule_impact_days: 10, requested_by: userIds.superintendent,
          approved_by: userIds.owner, approved_at: "2026-02-01T11:00:00Z",
          line_items: [{ description: "Soil remediation & disposal", quantity: 1, unit: "ls", unit_cost: 110000, total: 110000 }, { description: "Environmental testing & monitoring", quantity: 1, unit: "ls", unit_cost: 35000, total: 35000 }],
        },
        {
          company_id: companyId, project_id: mtcId, co_number: "CO-002", title: "Enhanced Lobby Finishes",
          description: "Owner requested upgraded lobby finishes including premium stone flooring, custom lighting fixtures, and architectural metalwork.", status: "submitted",
          reason: "owner_request", amount: 78000, schedule_impact_days: 0, requested_by: userIds.project_manager,
          line_items: [{ description: "Premium stone flooring", quantity: 1, unit: "ls", unit_cost: 42000, total: 42000 }, { description: "Custom lighting & metalwork", quantity: 1, unit: "ls", unit_cost: 36000, total: 36000 }],
        },
      ]);
    }

    // Change Orders for WHR-003
    if (whrId) {
      await supabase.from("change_orders").insert([
        {
          company_id: companyId, project_id: whrId, co_number: "CO-001", title: "Upgraded Kitchen Appliance Package",
          description: "Owners upgraded from standard to professional-grade kitchen appliance suite including Sub-Zero, Wolf, and Cove.", status: "approved",
          reason: "owner_request", amount: 42000, schedule_impact_days: 0, requested_by: userIds.project_manager,
          approved_by: userIds.owner, approved_at: "2025-10-15T09:00:00Z",
          line_items: [{ description: "Credit - Standard appliance package", quantity: 1, unit: "ls", unit_cost: -28000, total: -28000 }, { description: "Professional-grade appliance suite", quantity: 1, unit: "ls", unit_cost: 70000, total: 70000 }],
        },
        {
          company_id: companyId, project_id: whrId, co_number: "CO-002", title: "Extended Outdoor Kitchen with Pizza Oven",
          description: "Owner added outdoor kitchen extension with built-in pizza oven, additional counter space, and covered pergola.", status: "approved",
          reason: "owner_request", amount: 68000, schedule_impact_days: 14, requested_by: userIds.project_manager,
          approved_by: userIds.owner, approved_at: "2025-12-01T10:00:00Z",
          line_items: [{ description: "Outdoor kitchen structure & countertops", quantity: 1, unit: "ls", unit_cost: 35000, total: 35000 }, { description: "Pizza oven (Mugnaini Medio)", quantity: 1, unit: "ea", unit_cost: 18000, total: 18000 }, { description: "Covered pergola", quantity: 1, unit: "ls", unit_cost: 15000, total: 15000 }],
        },
      ]);
    }

    // ============================================================
    // 17. RFIs
    // ============================================================
    if (rmcId) {
      await supabase.from("rfis").insert([
        { company_id: companyId, project_id: rmcId, rfi_number: "RFI-001", subject: "Foundation Reinforcement Detail at Grid B-4", question: "Structural drawings show #8 rebar at 12\" OC but detail section calls for #6 at 8\" OC. Please clarify.", answer: "Use #8 rebar at 12\" OC per structural plan. Detail section will be revised.", status: "closed", priority: "high", submitted_by: userIds.superintendent, assigned_to: userIds.project_manager, due_date: "2025-08-15", answered_at: "2025-08-12T09:00:00Z", answered_by: userIds.project_manager, cost_impact: 0, schedule_impact_days: 0 },
        { company_id: companyId, project_id: rmcId, rfi_number: "RFI-002", subject: "Curtain Wall Anchor Spacing at Level 3", question: "Anchor spacing shown as 24\" OC but wind load calcs suggest 18\" OC may be required. Awaiting structural confirmation.", answer: "Revised to 18\" OC per updated wind load analysis. See SK-015.", status: "closed", priority: "medium", submitted_by: userIds.superintendent, assigned_to: userIds.project_manager, due_date: "2026-01-20", answered_at: "2026-01-18T14:00:00Z", answered_by: userIds.project_manager, cost_impact: 12000, schedule_impact_days: 0 },
        { company_id: companyId, project_id: rmcId, rfi_number: "RFI-003", subject: "Mechanical Room Access Door Size", question: "Door schedule shows 3'-0\" x 7'-0\" but the largest equipment piece measures 38\" wide. Can we increase to 3'-6\" x 7'-0\"?", status: "open", priority: "medium", submitted_by: userIds.field_worker, assigned_to: userIds.project_manager, due_date: "2026-02-20" },
        { company_id: companyId, project_id: rmcId, rfi_number: "RFI-004", subject: "Exterior Stone Veneer Color Selection", question: "Owner to confirm final stone color selection. Three samples submitted for approval.", status: "open", priority: "low", submitted_by: userIds.project_manager, assigned_to: userIds.owner, due_date: "2026-03-01" },
        { company_id: companyId, project_id: rmcId, rfi_number: "RFI-005", subject: "Fire Sprinkler Head Layout - Level 2 Lobby", question: "Ceiling design creates decorative coffers that may obstruct sprinkler coverage. Need architect and MEP to coordinate revised layout.", status: "open", priority: "high", submitted_by: userIds.superintendent, assigned_to: userIds.project_manager, due_date: "2026-02-28", cost_impact: 8500, schedule_impact_days: 3 },
      ]);
    }

    // RFIs for MTC-002
    if (mtcId) {
      await supabase.from("rfis").insert([
        { company_id: companyId, project_id: mtcId, rfi_number: "RFI-001", subject: "Soil Bearing Capacity at Grid A-1", question: "Geotechnical report indicates soil bearing capacity of 2,500 PSF at Grid A-1 but structural design assumes 3,000 PSF. Please confirm foundation design is adequate or if additional piling is required.", answer: "Additional micro-piles required at Grid A-1 through A-4. Revised foundation plan issued as SK-MTC-003.", status: "closed", priority: "high", submitted_by: userIds.superintendent, assigned_to: userIds.project_manager, due_date: "2026-01-15", answered_at: "2026-01-12T10:00:00Z", answered_by: userIds.project_manager, cost_impact: 45000, schedule_impact_days: 5 },
        { company_id: companyId, project_id: mtcId, rfi_number: "RFI-002", subject: "Parking Garage Ramp Slope Clarification", question: "Parking garage ramp shown at 8% slope on architectural drawings but ADA requires max 5% slope for accessible route. Confirm if separate accessible ramp is planned or if main ramp slope needs revision.", status: "open", priority: "medium", submitted_by: userIds.field_worker, assigned_to: userIds.project_manager, due_date: "2026-02-25" },
        { company_id: companyId, project_id: mtcId, rfi_number: "RFI-003", subject: "Mixed-Use Zoning Compliance - Retail Signage", question: "Zoning overlay district has specific signage restrictions for mixed-use developments. Need clarification on maximum signage area allowed for ground-floor retail tenants.", status: "open", priority: "low", submitted_by: userIds.project_manager, assigned_to: userIds.owner, due_date: "2026-03-15" },
      ]);
    }

    // RFIs for WHR-003
    if (whrId) {
      await supabase.from("rfis").insert([
        { company_id: companyId, project_id: whrId, rfi_number: "RFI-001", subject: "Custom Wine Cellar Refrigeration Unit Specs", question: "Wine cellar design calls for dual-zone cooling but specified unit is single-zone. Please confirm if owner wants to upgrade to dual-zone unit or modify cellar layout for single zone.", answer: "Owner confirmed dual-zone unit. Upgraded to CellarPro 6200VSx. See revised MEP drawing M-12.", status: "closed", priority: "medium", submitted_by: userIds.superintendent, assigned_to: userIds.project_manager, due_date: "2025-11-15", answered_at: "2025-11-10T15:00:00Z", answered_by: userIds.project_manager, cost_impact: 3500, schedule_impact_days: 0 },
        { company_id: companyId, project_id: whrId, rfi_number: "RFI-002", subject: "Pool Tile Selection - Owner Approval", question: "Three pool tile samples submitted for owner review: Option A (glass mosaic), Option B (porcelain), Option C (natural stone). Awaiting selection to proceed with pool interior finishing.", status: "open", priority: "low", submitted_by: userIds.superintendent, assigned_to: userIds.owner, due_date: "2026-02-28" },
      ]);
    }

    // ============================================================
    // 18. SUBMITTALS
    // ============================================================
    if (rmcId) {
      await supabase.from("submittals").insert([
        { company_id: companyId, project_id: rmcId, submittal_number: "SUB-001", title: "Structural Steel Shop Drawings", spec_section: "05 12 00", status: "approved", submitted_by: userIds.project_manager, reviewer_id: userIds.owner, due_date: "2025-09-01", reviewed_at: "2025-08-28T10:00:00Z", review_comments: "Approved as noted. Verify connection details at grid lines C and D." },
        { company_id: companyId, project_id: rmcId, submittal_number: "SUB-002", title: "Curtain Wall System - Material & Finish", spec_section: "08 44 00", status: "approved", submitted_by: userIds.project_manager, reviewer_id: userIds.owner, due_date: "2025-11-15", reviewed_at: "2025-11-10T14:00:00Z", review_comments: "Approved. Confirm thermal break detail matches energy model." },
        { company_id: companyId, project_id: rmcId, submittal_number: "SUB-003", title: "HVAC Equipment - Air Handling Units", spec_section: "23 73 00", status: "under_review", submitted_by: userIds.project_manager, reviewer_id: userIds.owner, due_date: "2026-02-28" },
        { company_id: companyId, project_id: rmcId, submittal_number: "SUB-004", title: "Interior Flooring - Porcelain Tile", spec_section: "09 30 00", status: "pending", submitted_by: userIds.project_manager, due_date: "2026-03-15" },
        { company_id: companyId, project_id: rmcId, submittal_number: "SUB-005", title: "Elevator Cab Finishes", spec_section: "14 20 00", status: "pending", submitted_by: userIds.project_manager, due_date: "2026-04-01" },
      ]);
    }

    // ============================================================
    // 19. DAILY LOGS (last 5 working days)
    // ============================================================
    if (rmcId) {
      const dailyLogInserts = [];
      for (let d = 4; d >= 0; d--) {
        const logDate = new Date(2026, 1, 12 - d);
        // Skip weekends
        if (logDate.getDay() === 0 || logDate.getDay() === 6) continue;

        dailyLogInserts.push({
          company_id: companyId,
          project_id: rmcId,
          log_date: logDate.toISOString().slice(0, 10),
          created_by: userIds.superintendent,
          weather_temp_high: 52 + Math.floor(Math.random() * 15),
          weather_temp_low: 35 + Math.floor(Math.random() * 10),
          weather_conditions: ["clear", "cloudy", "clear", "rain", "cloudy"][d],
          weather_wind_mph: 5 + Math.floor(Math.random() * 15),
          weather_humidity_pct: 40 + Math.floor(Math.random() * 30),
          workforce: [
            { trade: "Iron Workers", company: "Miller Steel", headcount: 12, hours: 8 },
            { trade: "Concrete Finishers", company: "Hernandez Concrete", headcount: 8, hours: 8 },
            { trade: "Laborers", company: "Summit Builders", headcount: 6, hours: 8 },
            { trade: "Operating Engineers", company: "Summit Builders", headcount: 3, hours: 8 },
          ],
          equipment: [
            { name: "Tower Crane #1", hours: 8, status: "active" },
            { name: "Concrete Pump", hours: 4, status: "active" },
            { name: "Forklift", hours: 6, status: "active" },
          ],
          work_performed: [
            "Continued steel erection at Level 4. Completed 6 of 12 column connections.",
            "Poured concrete deck at Level 3 east wing - 4,200 SF. 28-day break test samples taken.",
            "Installed curtain wall anchors at Level 2 south elevation.",
            "Continued MEP rough-in coordination meetings.",
            "Received and staged materials for Level 4 deck pour.",
          ][d] ?? "General construction activities continued on schedule.",
          materials_received: d === 0 ? "8 truckloads of structural steel delivered. 120 CY ready-mix concrete." : d === 2 ? "Curtain wall panels delivered (partial shipment 3 of 5)." : null,
          safety_incidents: d === 3 ? "Near-miss reported: falling object from Level 3. Barricade area expanded. Toolbox talk conducted." : null,
          delays: d === 3 ? "Rain delay: 2 hours lost in afternoon due to thunderstorm. Concrete pour rescheduled." : null,
          status: d > 0 ? "approved" : "submitted",
          approved_by: d > 0 ? userIds.project_manager : null,
          approved_at: d > 0 ? new Date(2026, 1, 12 - d + 1).toISOString() : null,
        });
      }
      await supabase.from("daily_logs").insert(dailyLogInserts);
    }

    // Daily Logs for MTC-002 (last 3 working days)
    if (mtcId) {
      const mtcDailyLogs = [];
      const mtcWorkPerformed = [
        "Continued excavation at southeast quadrant. Shoring installation 80% complete on east wall.",
        "Geotechnical engineer on-site for soil testing at Grid A-1. Demolition debris hauled off-site (12 loads).",
        "Completed shoring on east wall. Began excavation at northeast quadrant. Survey crew verified grades.",
      ];
      for (let d = 2; d >= 0; d--) {
        const logDate = new Date(2026, 1, 12 - d);
        if (logDate.getDay() === 0 || logDate.getDay() === 6) continue;
        mtcDailyLogs.push({
          company_id: companyId,
          project_id: mtcId,
          log_date: logDate.toISOString().slice(0, 10),
          created_by: userIds.superintendent,
          weather_temp_high: 55 + Math.floor(Math.random() * 12),
          weather_temp_low: 38 + Math.floor(Math.random() * 8),
          weather_conditions: ["clear", "cloudy", "clear"][d],
          weather_wind_mph: 8 + Math.floor(Math.random() * 10),
          weather_humidity_pct: 45 + Math.floor(Math.random() * 25),
          workforce: [
            { trade: "Operating Engineers", company: "Summit Builders", headcount: 4, hours: 8 },
            { trade: "Laborers", company: "Summit Builders", headcount: 8, hours: 8 },
            { trade: "Pile Drivers", company: "Deep South Piling", headcount: 6, hours: 8 },
          ],
          equipment: [
            { name: "CAT 320 Excavator", hours: 8, status: "active" },
            { name: "Dump Trucks (3)", hours: 6, status: "active" },
            { name: "Vibratory Hammer", hours: 4, status: "active" },
          ],
          work_performed: mtcWorkPerformed[d] ?? "General excavation and site work continued.",
          materials_received: d === 0 ? "Steel sheet piling delivered (24 sections). Shoring timber delivered." : null,
          safety_incidents: null,
          delays: d === 1 ? "1-hour delay waiting for utility locate confirmation from city." : null,
          status: d > 0 ? "approved" : "submitted",
          approved_by: d > 0 ? userIds.project_manager : null,
          approved_at: d > 0 ? new Date(2026, 1, 12 - d + 1).toISOString() : null,
        });
      }
      if (mtcDailyLogs.length > 0) {
        await supabase.from("daily_logs").insert(mtcDailyLogs);
      }
    }

    // Daily Logs for WHR-003 (last 3 working days)
    if (whrId) {
      const whrDailyLogs = [];
      const whrWorkPerformed = [
        "Continued tile installation in master bath. Cabinetry installation in kitchen - upper cabinets complete.",
        "Pool gunite shell poured. Flooring crew working on great room hardwood installation.",
        "Kitchen countertop template completed. Tile work continues in guest bathrooms. Pool plumbing pressure test passed.",
      ];
      for (let d = 2; d >= 0; d--) {
        const logDate = new Date(2026, 1, 12 - d);
        if (logDate.getDay() === 0 || logDate.getDay() === 6) continue;
        whrDailyLogs.push({
          company_id: companyId,
          project_id: whrId,
          log_date: logDate.toISOString().slice(0, 10),
          created_by: userIds.superintendent,
          weather_temp_high: 58 + Math.floor(Math.random() * 10),
          weather_temp_low: 40 + Math.floor(Math.random() * 8),
          weather_conditions: ["clear", "clear", "cloudy"][d],
          weather_wind_mph: 3 + Math.floor(Math.random() * 8),
          weather_humidity_pct: 35 + Math.floor(Math.random() * 20),
          workforce: [
            { trade: "Tile Setters", company: "Austin Tile Works", headcount: 3, hours: 8 },
            { trade: "Cabinet Installers", company: "Hill Country Cabinets", headcount: 2, hours: 8 },
            { trade: "Flooring Crew", company: "Texas Floor Pro", headcount: 4, hours: 8 },
            { trade: "Pool Contractor", company: "Aqua Blue Pools", headcount: 3, hours: 6 },
          ],
          equipment: [
            { name: "Tile Saw", hours: 8, status: "active" },
            { name: "Floor Sander", hours: 6, status: "active" },
          ],
          work_performed: whrWorkPerformed[d] ?? "Interior finish work continued across multiple areas.",
          materials_received: d === 1 ? "Hardwood flooring (1,200 SF white oak). Pool tile samples delivered." : null,
          safety_incidents: null,
          delays: null,
          status: d > 0 ? "approved" : "submitted",
          approved_by: d > 0 ? userIds.project_manager : null,
          approved_at: d > 0 ? new Date(2026, 1, 12 - d + 1).toISOString() : null,
        });
      }
      if (whrDailyLogs.length > 0) {
        await supabase.from("daily_logs").insert(whrDailyLogs);
      }
    }

    // Daily Logs for SCH-006 (2 logs before hold date - early January)
    if (schId) {
      await supabase.from("daily_logs").insert([
        {
          company_id: companyId,
          project_id: schId,
          log_date: "2026-01-09",
          created_by: userIds.superintendent,
          weather_temp_high: 48,
          weather_temp_low: 32,
          weather_conditions: "cloudy",
          weather_wind_mph: 12,
          weather_humidity_pct: 55,
          workforce: [
            { trade: "Structural Workers", company: "Summit Builders", headcount: 6, hours: 8 },
            { trade: "Laborers", company: "Summit Builders", headcount: 4, hours: 8 },
          ],
          equipment: [
            { name: "Concrete Saw", hours: 4, status: "active" },
            { name: "Scaffolding", hours: 8, status: "active" },
          ],
          work_performed: "Continued load-bearing wall reinforcement on floors 2-3. Steel plate installation at column connections. Structural engineer on-site for inspection.",
          materials_received: "Steel reinforcement plates delivered (24 pieces).",
          safety_incidents: null,
          delays: null,
          status: "approved",
          approved_by: userIds.project_manager,
          approved_at: "2026-01-10T08:30:00Z",
        },
        {
          company_id: companyId,
          project_id: schId,
          log_date: "2026-01-12",
          created_by: userIds.superintendent,
          weather_temp_high: 45,
          weather_temp_low: 30,
          weather_conditions: "clear",
          weather_wind_mph: 8,
          weather_humidity_pct: 40,
          workforce: [
            { trade: "Structural Workers", company: "Summit Builders", headcount: 6, hours: 8 },
            { trade: "Laborers", company: "Summit Builders", headcount: 3, hours: 8 },
          ],
          equipment: [
            { name: "Scaffolding", hours: 8, status: "active" },
          ],
          work_performed: "Final day of active work before project hold. Completed structural reinforcement on floor 2 east wing. Secured site and equipment for standby period. Owner notified of financing hold - all work paused effective COB today.",
          materials_received: null,
          safety_incidents: null,
          delays: "Project placed on hold effective end of day due to owner financing issues. All subcontractors notified.",
          status: "approved",
          approved_by: userIds.project_manager,
          approved_at: "2026-01-13T09:00:00Z",
        },
      ]);
    }

    // ============================================================
    // 20. TIME ENTRIES (last 2 weeks)
    // ============================================================
    const timeEntries = [];
    const workers = [
      { id: userIds.superintendent, type: "regular" },
      { id: userIds.field_worker, type: "regular" },
    ];

    for (const worker of workers) {
      for (let dayBack = 13; dayBack >= 0; dayBack--) {
        const entryDate = new Date(2026, 1, 12 - dayBack);
        if (entryDate.getDay() === 0 || entryDate.getDay() === 6) continue;

        const clockIn = new Date(entryDate);
        clockIn.setHours(6, 30, 0);
        const clockOut = new Date(entryDate);
        clockOut.setHours(15, 0, 0);
        const hours = 8 + (dayBack % 3 === 0 ? 2 : 0);

        timeEntries.push({
          company_id: companyId,
          user_id: worker.id,
          project_id: rmcId || null,
          entry_date: entryDate.toISOString().slice(0, 10),
          clock_in: clockIn.toISOString(),
          clock_out: clockOut.toISOString(),
          hours,
          break_minutes: 30,
          work_type: hours > 8 ? "overtime" : "regular",
          cost_code: "01",
          notes: hours > 8 ? "Extended day - concrete pour" : null,
          status: dayBack > 2 ? "approved" : "pending",
          approved_by: dayBack > 2 ? userIds.project_manager : null,
          approved_at: dayBack > 2 ? new Date(2026, 1, 12 - dayBack + 1).toISOString() : null,
        });
      }
    }
    await supabase.from("time_entries").insert(timeEntries);

    // ============================================================
    // 21. CRM OPPORTUNITIES
    // ============================================================
    await supabase.from("opportunities").insert([
      { company_id: companyId, name: "Downtown Austin Office Tower", client_name: "Urban Core Partners", client_contact: "Richard Blake", client_email: "rblake@urbancore.com", client_phone: "(512) 555-5001", project_type: "commercial", estimated_value: 55000000, probability_pct: 35, stage: "proposal", source: "referral", assigned_to: userIds.owner, expected_close_date: "2026-06-30", notes: "RFP response submitted. Shortlisted to final 3 bidders." },
      { company_id: companyId, name: "Cedar Park Elementary Renovation", client_name: "Leander ISD", client_contact: "Sandra Williams", client_email: "swilliams@leanderisd.org", client_phone: "(512) 555-5002", project_type: "renovation", estimated_value: 12500000, probability_pct: 60, stage: "negotiation", source: "repeat_client", assigned_to: userIds.project_manager, expected_close_date: "2026-04-15", notes: "Previous work with LISD. Budget discussions ongoing." },
      { company_id: companyId, name: "Tech Ridge Data Center", client_name: "DataVault Inc", client_contact: "Alan Zhao", client_email: "azhao@datavault.io", client_phone: "(512) 555-5003", project_type: "industrial", estimated_value: 38000000, probability_pct: 20, stage: "qualification", source: "website", assigned_to: userIds.owner, expected_close_date: "2026-09-01", notes: "Initial discovery call completed. NDA signed." },
      { company_id: companyId, name: "Lakeway Luxury Condos (24 Units)", client_name: "Lakeway Development LLC", client_contact: "Jennifer Adams", client_email: "jadams@lakewaydev.com", client_phone: "(512) 555-5004", project_type: "residential", estimated_value: 18000000, probability_pct: 75, stage: "negotiation", source: "referral", assigned_to: userIds.project_manager, expected_close_date: "2026-03-31", notes: "Contract review in progress. Favorable terms expected." },
      { company_id: companyId, name: "Round Rock Sports Complex", client_name: "City of Round Rock", client_contact: "David Ortiz", client_email: "dortiz@roundrocktexas.gov", client_phone: "(512) 555-5005", project_type: "infrastructure", estimated_value: 22000000, probability_pct: 45, stage: "proposal", source: "cold_call", assigned_to: userIds.owner, expected_close_date: "2026-07-15", notes: "Pre-qualification submitted. Waiting for bid documents." },
      { company_id: companyId, name: "Manor Townhome Community", client_name: "Greenfield Homes", client_contact: "Kyle Barrett", client_email: "kbarrett@greenfieldhomes.com", client_phone: "(512) 555-5006", project_type: "residential", estimated_value: 9500000, probability_pct: 10, stage: "lead", source: "website", assigned_to: userIds.project_manager, expected_close_date: "2026-12-31", notes: "Inbound inquiry. Initial meeting scheduled." },
      { company_id: companyId, name: "FM 1431 Retail Pad Sites", client_name: "CapTex Commercial", client_contact: "Monica Chen", client_email: "mchen@captexcommercial.com", client_phone: "(512) 555-5007", project_type: "commercial", estimated_value: 7200000, probability_pct: 85, stage: "won", source: "repeat_client", assigned_to: userIds.project_manager, expected_close_date: "2026-02-01", notes: "Contract signed. Mobilization in March." },
    ]);

    // ============================================================
    // 22. BIDS
    // ============================================================
    await supabase.from("bids").insert([
      { company_id: companyId, bid_number: "BID-2026-001", project_name: "Downtown Austin Office Tower", client_name: "Urban Core Partners", bid_date: "2026-01-15", due_date: "2026-02-28", status: "submitted", estimated_cost: 47500000, bid_amount: 55000000, scope_description: "Full GC scope for 22-story Class A office tower including below-grade parking, core & shell, and tenant improvements.", submitted_by: userIds.owner, submitted_at: "2026-01-20T16:00:00Z" },
      { company_id: companyId, bid_number: "BID-2026-002", project_name: "Cedar Park Elementary Renovation", client_name: "Leander ISD", bid_date: "2026-01-20", due_date: "2026-03-15", status: "submitted", estimated_cost: 10800000, bid_amount: 12500000, scope_description: "Complete interior renovation of existing elementary school including MEP upgrades, ADA compliance, technology infrastructure, and exterior hardscape.", submitted_by: userIds.project_manager, submitted_at: "2026-01-25T14:00:00Z" },
      { company_id: companyId, bid_number: "BID-2026-003", project_name: "Tech Ridge Data Center", client_name: "DataVault Inc", bid_date: "2026-02-01", due_date: "2026-04-30", status: "in_progress", estimated_cost: 33000000, bid_amount: 0, scope_description: "Design-build 50,000 SF data center with redundant power, cooling, and fire suppression systems." },
      { company_id: companyId, bid_number: "BID-2025-010", project_name: "FM 1431 Retail Pad Sites", client_name: "CapTex Commercial", bid_date: "2025-11-01", due_date: "2025-12-15", status: "won", estimated_cost: 6100000, bid_amount: 7200000, scope_description: "Site development and vertical construction of three retail pad sites totaling 18,000 SF.", submitted_by: userIds.project_manager, submitted_at: "2025-11-10T10:00:00Z" },
      { company_id: companyId, bid_number: "BID-2025-008", project_name: "San Marcos Apartment Complex", client_name: "Hays County Development", bid_date: "2025-09-15", due_date: "2025-10-31", status: "lost", estimated_cost: 15200000, bid_amount: 17800000, scope_description: "120-unit garden-style apartment complex with clubhouse, pool, and fitness center." },
    ]);

    // ============================================================
    // 23. DOCUMENTS
    // ============================================================
    const docInserts = [
      { name: "RMC Structural Drawings - Rev C", file_path: "/documents/rmc/structural-rev-c.pdf", file_type: "pdf", file_size: 15200000, folder_path: "/RMC-001/Drawings", category: "plan", version: 3, uploaded_by: userIds.project_manager, project_id: rmcId, tags: ["structural", "drawings", "current"] },
      { name: "RMC Architectural Plans", file_path: "/documents/rmc/architectural-plans.pdf", file_type: "pdf", file_size: 22500000, folder_path: "/RMC-001/Drawings", category: "plan", version: 2, uploaded_by: userIds.project_manager, project_id: rmcId, tags: ["architectural", "plans"] },
      { name: "RMC Project Specifications", file_path: "/documents/rmc/specifications.pdf", file_type: "pdf", file_size: 8900000, folder_path: "/RMC-001/Specs", category: "spec", version: 1, uploaded_by: userIds.project_manager, project_id: rmcId, tags: ["specifications"] },
      { name: "Miller Steel Subcontract", file_path: "/documents/rmc/contracts/miller-steel.pdf", file_type: "pdf", file_size: 2400000, folder_path: "/RMC-001/Contracts", category: "contract", version: 1, uploaded_by: userIds.owner, project_id: rmcId, tags: ["contract", "steel"] },
      { name: "Monthly Progress Photos - Jan 2026", file_path: "/documents/rmc/photos/jan-2026.zip", file_type: "jpg", file_size: 45000000, folder_path: "/RMC-001/Photos", category: "photo", version: 1, uploaded_by: userIds.superintendent, project_id: rmcId, tags: ["photos", "progress"] },
      { name: "MTC Phase II Site Plan", file_path: "/documents/mtc/site-plan.pdf", file_type: "pdf", file_size: 5600000, folder_path: "/MTC-002/Drawings", category: "plan", version: 1, uploaded_by: userIds.project_manager, project_id: projectMap["MTC-002"], tags: ["site plan"] },
      { name: "Summit Builders Insurance Certificate", file_path: "/documents/corporate/insurance-cert.pdf", file_type: "pdf", file_size: 850000, folder_path: "/Corporate", category: "contract", version: 1, uploaded_by: userIds.owner, tags: ["insurance", "corporate"] },
      { name: "Safety Manual 2026", file_path: "/documents/corporate/safety-manual-2026.pdf", file_type: "pdf", file_size: 3200000, folder_path: "/Corporate/Safety", category: "report", version: 1, uploaded_by: userIds.owner, tags: ["safety", "manual"] },
    ];

    await supabase.from("documents").insert(docInserts.map((d) => ({ company_id: companyId, ...d })));

    // ============================================================
    // 24. CERTIFICATIONS
    // ============================================================
    const employeeContacts = (contactsData ?? []).filter((c) => c.contact_type === "employee");
    if (employeeContacts.length > 0) {
      await supabase.from("certifications").insert([
        { company_id: companyId, contact_id: employeeContacts[0].id, cert_type: "license", cert_name: "Texas General Contractor License", issuing_authority: "TDLR", cert_number: "GC-TX-2024-11582", issued_date: "2024-01-15", expiry_date: "2026-01-14", status: "expired" },
        { company_id: companyId, contact_id: employeeContacts[0].id, cert_type: "osha_30", cert_name: "OSHA 30-Hour Construction", issuing_authority: "OSHA", cert_number: "30H-2023-98741", issued_date: "2023-06-01", expiry_date: "2028-06-01", status: "valid" },
        ...(employeeContacts.length > 1 ? [
          { company_id: companyId, contact_id: employeeContacts[1].id, cert_type: "osha_30", cert_name: "OSHA 30-Hour Construction", issuing_authority: "OSHA", cert_number: "30H-2024-45123", issued_date: "2024-03-15", expiry_date: "2029-03-15", status: "valid" },
          { company_id: companyId, contact_id: employeeContacts[1].id, cert_type: "first_aid", cert_name: "First Aid / CPR / AED", issuing_authority: "American Red Cross", cert_number: "FA-2025-78932", issued_date: "2025-06-01", expiry_date: "2027-06-01", status: "valid" },
        ] : []),
        ...(employeeContacts.length > 2 ? [
          { company_id: companyId, contact_id: employeeContacts[2].id, cert_type: "osha_10", cert_name: "OSHA 10-Hour Construction", issuing_authority: "OSHA", cert_number: "10H-2024-67832", issued_date: "2024-09-01", expiry_date: "2029-09-01", status: "valid" },
          { company_id: companyId, contact_id: employeeContacts[2].id, cert_type: "license", cert_name: "Texas Journeyman Electrician", issuing_authority: "TDLR", cert_number: "JE-TX-2023-33201", issued_date: "2023-04-01", expiry_date: "2026-04-01", status: "valid" },
        ] : []),
      ]);
    }

    // ============================================================
    // 25. EQUIPMENT
    // ============================================================
    await supabase.from("equipment").insert([
      { company_id: companyId, name: "Tower Crane #1 - Liebherr 280 EC-H", equipment_type: "Crane", make: "Liebherr", model: "280 EC-H 12", serial_number: "LB-280-2021-4532", status: "in_use", current_project_id: rmcId, assigned_to: userIds.superintendent, purchase_date: "2021-03-15", purchase_cost: 1250000, hourly_rate: 350, total_hours: 4200, last_maintenance_date: "2026-01-15", next_maintenance_date: "2026-04-15" },
      { company_id: companyId, name: "Concrete Pump - Putzmeister 52Z", equipment_type: "Pump", make: "Putzmeister", model: "52Z-Meter", serial_number: "PM-52Z-2022-1187", status: "in_use", current_project_id: rmcId, purchase_date: "2022-06-01", purchase_cost: 850000, hourly_rate: 225, total_hours: 2800, last_maintenance_date: "2026-02-01", next_maintenance_date: "2026-05-01" },
      { company_id: companyId, name: "CAT 320 Excavator", equipment_type: "Excavator", make: "Caterpillar", model: "320 GC", serial_number: "CAT-320-2020-8891", status: "available", purchase_date: "2020-01-10", purchase_cost: 320000, hourly_rate: 175, total_hours: 6500, last_maintenance_date: "2025-12-01", next_maintenance_date: "2026-03-01" },
      { company_id: companyId, name: "Ford F-350 Crew Cab #1", equipment_type: "Vehicle", make: "Ford", model: "F-350 Super Duty", serial_number: "1FT8W3BT-2023-44521", status: "in_use", assigned_to: userIds.superintendent, purchase_date: "2023-08-01", purchase_cost: 72000, hourly_rate: 45, total_hours: 8200, last_maintenance_date: "2026-01-20", next_maintenance_date: "2026-04-20" },
      { company_id: companyId, name: "Ford F-350 Crew Cab #2", equipment_type: "Vehicle", make: "Ford", model: "F-350 Super Duty", serial_number: "1FT8W3BT-2023-44522", status: "in_use", assigned_to: userIds.field_worker, purchase_date: "2023-08-01", purchase_cost: 72000, hourly_rate: 45, total_hours: 7800 },
      { company_id: companyId, name: "Skid Steer - Bobcat S650", equipment_type: "Loader", make: "Bobcat", model: "S650", serial_number: "BOB-S650-2019-6632", status: "maintenance", purchase_date: "2019-05-15", purchase_cost: 55000, hourly_rate: 85, total_hours: 5600, last_maintenance_date: "2026-02-05", next_maintenance_date: "2026-02-20" },
    ]);

    // ============================================================
    // 26. SAFETY INSPECTIONS
    // ============================================================
    if (rmcId) {
      await supabase.from("safety_inspections").insert([
        {
          company_id: companyId, project_id: rmcId, inspection_date: "2026-02-10", inspector_id: userIds.superintendent,
          inspection_type: "weekly", score: 92,
          checklist: [
            { item: "PPE Compliance", passed: true, notes: "All workers observed wearing proper PPE" },
            { item: "Fall Protection", passed: true, notes: "Guardrails in place at all open edges" },
            { item: "Housekeeping", passed: false, notes: "Debris accumulation at Level 3 stairwell" },
            { item: "Electrical Safety", passed: true, notes: "GFCIs tested and functional" },
            { item: "Fire Extinguishers", passed: true, notes: "All extinguishers inspected and current" },
            { item: "Crane Operations", passed: true, notes: "Daily crane inspection log current" },
          ],
          findings: "Overall good safety conditions. Minor housekeeping issue at Level 3 stairwell needs attention.",
          corrective_actions: "Assigned cleanup crew to Level 3 stairwell. Toolbox talk on housekeeping scheduled for tomorrow morning.",
          status: "completed",
        },
        {
          company_id: companyId, project_id: rmcId, inspection_date: "2026-02-03", inspector_id: userIds.superintendent,
          inspection_type: "weekly", score: 88,
          checklist: [
            { item: "PPE Compliance", passed: true, notes: "" },
            { item: "Fall Protection", passed: false, notes: "Missing guardrail at Level 4 east side" },
            { item: "Housekeeping", passed: true, notes: "" },
            { item: "Electrical Safety", passed: true, notes: "" },
            { item: "Scaffolding", passed: true, notes: "Scaffold tags current" },
          ],
          findings: "Missing guardrail discovered at Level 4 east elevation. Immediate action taken.",
          corrective_actions: "Guardrail installed same day. Area was barricaded during installation. Subcontractor issued warning notice.",
          status: "completed",
        },
      ]);
    }

    // ============================================================
    // 27. PUNCH LIST ITEMS
    // ============================================================
    const pcpId = projectMap["PCP-005"];
    if (pcpId) {
      await supabase.from("punch_list_items").insert([
        { company_id: companyId, project_id: pcpId, description: "Touch-up paint on pavilion columns (3 locations)", location: "Pavilion", trade: "Painting", status: "completed", priority: "low", assigned_to: userIds.field_worker, due_date: "2026-01-10", completed_at: "2026-01-08T14:00:00Z", verified_by: userIds.project_manager, verified_at: "2026-01-09T09:00:00Z" },
        { company_id: companyId, project_id: pcpId, description: "Adjust splash pad nozzle #7 - spray pattern misaligned", location: "Splash Pad", trade: "Plumbing", status: "completed", priority: "medium", assigned_to: userIds.field_worker, due_date: "2026-01-12", completed_at: "2026-01-11T16:00:00Z", verified_by: userIds.project_manager, verified_at: "2026-01-12T10:00:00Z" },
        { company_id: companyId, project_id: pcpId, description: "Replace cracked concrete paver at main entrance", location: "Main Entrance", trade: "Concrete", status: "open", priority: "medium", assigned_to: userIds.field_worker, due_date: "2026-02-15" },
        { company_id: companyId, project_id: pcpId, description: "Install missing bollard at parking lot entrance", location: "Parking Lot", trade: "Site Work", status: "in_progress", priority: "high", assigned_to: userIds.superintendent, due_date: "2026-02-10" },
      ]);
    }

    // ============================================================
    // 28. NOTIFICATIONS
    // ============================================================
    await supabase.from("notifications").insert([
      { company_id: companyId, user_id: userIds.owner, title: "Change Order CO-003 Pending Approval", message: "Upgraded HVAC Controls System - $245,000. Submitted by Sarah Chen.", notification_type: "approval", entity_type: "change_order", is_read: false },
      { company_id: companyId, user_id: userIds.owner, title: "Invoice INV-0022 Overdue", message: "Invoice from Catellus Development is 15 days past due. Amount: $287,450.", notification_type: "alert", entity_type: "invoice", is_read: false },
      { company_id: companyId, user_id: userIds.project_manager, title: "RFI-005 Due in 2 Weeks", message: "Fire Sprinkler Head Layout - Level 2 Lobby. Due Feb 28, 2026.", notification_type: "deadline", entity_type: "rfi", is_read: false },
      { company_id: companyId, user_id: userIds.project_manager, title: "Daily Log Submitted for Review", message: "James Rodriguez submitted daily log for Feb 12, 2026 on Riverside Medical Center.", notification_type: "approval", entity_type: "daily_log", is_read: false },
      { company_id: companyId, user_id: userIds.superintendent, title: "Safety Inspection Score: 92%", message: "Weekly inspection completed. Minor housekeeping issue noted at Level 3.", notification_type: "alert", entity_type: "safety_inspection", is_read: true, read_at: "2026-02-10T17:00:00Z" },
      { company_id: companyId, user_id: userIds.accountant, title: "3 Time Entries Pending Approval", message: "Time entries from Feb 10-12 awaiting your review.", notification_type: "approval", entity_type: "time_entry", is_read: false },
      { company_id: companyId, user_id: userIds.owner, title: "Bid BID-2025-010 Won!", message: "FM 1431 Retail Pad Sites - $7.2M contract awarded to Summit Builders.", notification_type: "system", entity_type: "bid", is_read: true, read_at: "2026-02-01T10:00:00Z" },
    ]);

    // ============================================================
    // 29. AUDIT LOG
    // ============================================================
    const auditEntries = [
      { action: "create_project", entity_type: "project", details: { name: "East Austin Warehouse Conversion" }, user_id: userIds.owner, created_at: "2026-02-11T09:15:00Z" },
      { action: "submit_change_order", entity_type: "change_order", details: { title: "Upgraded HVAC Controls System", ref: "CO-003" }, user_id: userIds.project_manager, created_at: "2026-02-10T16:30:00Z" },
      { action: "approve_daily_log", entity_type: "daily_log", details: { name: "Daily Log - Feb 10, 2026", ref: "RMC-001" }, user_id: userIds.project_manager, created_at: "2026-02-11T08:00:00Z" },
      { action: "create_invoice", entity_type: "invoice", details: { ref: "INV-0024", name: "Progress Billing - Jan 2026" }, user_id: userIds.accountant, created_at: "2026-02-09T14:00:00Z" },
      { action: "upload_document", entity_type: "document", details: { name: "Monthly Progress Photos - Jan 2026" }, user_id: userIds.superintendent, created_at: "2026-02-08T17:00:00Z" },
      { action: "submit_rfi", entity_type: "rfi", details: { ref: "RFI-005", title: "Fire Sprinkler Head Layout" }, user_id: userIds.superintendent, created_at: "2026-02-07T11:00:00Z" },
      { action: "answer_rfi", entity_type: "rfi", details: { ref: "RFI-002", title: "Curtain Wall Anchor Spacing" }, user_id: userIds.project_manager, created_at: "2026-01-18T14:00:00Z" },
      { action: "approve_change_order", entity_type: "change_order", details: { title: "Additional Structural Steel", ref: "CO-001" }, user_id: userIds.owner, created_at: "2025-11-15T10:00:00Z" },
      { action: "submit_bid", entity_type: "bid", details: { name: "Downtown Austin Office Tower", ref: "BID-2026-001" }, user_id: userIds.owner, created_at: "2026-01-20T16:00:00Z" },
      { action: "create_opportunity", entity_type: "opportunity", details: { name: "Tech Ridge Data Center" }, user_id: userIds.owner, created_at: "2026-02-01T09:00:00Z" },
      { action: "update_project", entity_type: "project", details: { name: "Riverside Medical Center", ref: "RMC-001" }, user_id: userIds.project_manager, created_at: "2026-02-12T08:30:00Z" },
      { action: "submit_daily_log", entity_type: "daily_log", details: { name: "Daily Log - Feb 12, 2026", ref: "RMC-001" }, user_id: userIds.superintendent, created_at: "2026-02-12T16:00:00Z" },
    ];

    await supabase.from("audit_log").insert(
      auditEntries.map((e) => ({ company_id: companyId, ...e }))
    );

    // ============================================================
    // 30. JOURNAL ENTRIES & LINES (critical for financial statements)
    // ============================================================
    // First, fetch chart of accounts to get account IDs by account_number
    const { data: coaData } = await supabase
      .from("chart_of_accounts")
      .select("id, account_number")
      .eq("company_id", companyId);

    const acctMap: Record<string, string> = {};
    for (const a of coaData ?? []) {
      acctMap[a.account_number] = a.id;
    }

    // Only seed journal entries if we have accounts
    if (Object.keys(acctMap).length > 0) {
      const journalSeeds = [
        // Monthly revenue recognition entries (Jul 2025 - Feb 2026)
        { entry_number: "JE-0001", entry_date: "2025-07-31", description: "Revenue recognition - July 2025", reference: "Monthly Close", status: "posted", posted_by: userIds.accountant, posted_at: "2025-08-02T10:00:00Z", created_by: userIds.accountant },
        { entry_number: "JE-0002", entry_date: "2025-08-31", description: "Revenue recognition - August 2025", reference: "Monthly Close", status: "posted", posted_by: userIds.accountant, posted_at: "2025-09-02T10:00:00Z", created_by: userIds.accountant },
        { entry_number: "JE-0003", entry_date: "2025-09-30", description: "Revenue recognition - September 2025", reference: "Monthly Close", status: "posted", posted_by: userIds.accountant, posted_at: "2025-10-02T10:00:00Z", created_by: userIds.accountant },
        { entry_number: "JE-0004", entry_date: "2025-10-31", description: "Revenue recognition - October 2025", reference: "Monthly Close", status: "posted", posted_by: userIds.accountant, posted_at: "2025-11-03T10:00:00Z", created_by: userIds.accountant },
        { entry_number: "JE-0005", entry_date: "2025-11-30", description: "Revenue recognition - November 2025", reference: "Monthly Close", status: "posted", posted_by: userIds.accountant, posted_at: "2025-12-02T10:00:00Z", created_by: userIds.accountant },
        { entry_number: "JE-0006", entry_date: "2025-12-31", description: "Revenue recognition - December 2025", reference: "Monthly Close", status: "posted", posted_by: userIds.accountant, posted_at: "2026-01-03T10:00:00Z", created_by: userIds.accountant },
        { entry_number: "JE-0007", entry_date: "2026-01-31", description: "Revenue recognition - January 2026", reference: "Monthly Close", status: "posted", posted_by: userIds.accountant, posted_at: "2026-02-03T10:00:00Z", created_by: userIds.accountant },
        { entry_number: "JE-0008", entry_date: "2026-02-12", description: "Revenue recognition - February 2026 (partial)", reference: "MTD Accrual", status: "draft", created_by: userIds.accountant },
        // Cost of construction entries
        { entry_number: "JE-0009", entry_date: "2025-07-31", description: "Construction costs - July 2025", reference: "Monthly Close", status: "posted", posted_by: userIds.accountant, posted_at: "2025-08-02T10:30:00Z", created_by: userIds.accountant },
        { entry_number: "JE-0010", entry_date: "2025-08-31", description: "Construction costs - August 2025", reference: "Monthly Close", status: "posted", posted_by: userIds.accountant, posted_at: "2025-09-02T10:30:00Z", created_by: userIds.accountant },
        { entry_number: "JE-0011", entry_date: "2025-09-30", description: "Construction costs - September 2025", reference: "Monthly Close", status: "posted", posted_by: userIds.accountant, posted_at: "2025-10-02T10:30:00Z", created_by: userIds.accountant },
        { entry_number: "JE-0012", entry_date: "2025-10-31", description: "Construction costs - October 2025", reference: "Monthly Close", status: "posted", posted_by: userIds.accountant, posted_at: "2025-11-03T10:30:00Z", created_by: userIds.accountant },
        { entry_number: "JE-0013", entry_date: "2025-11-30", description: "Construction costs - November 2025", reference: "Monthly Close", status: "posted", posted_by: userIds.accountant, posted_at: "2025-12-02T10:30:00Z", created_by: userIds.accountant },
        { entry_number: "JE-0014", entry_date: "2025-12-31", description: "Construction costs - December 2025", reference: "Monthly Close", status: "posted", posted_by: userIds.accountant, posted_at: "2026-01-03T10:30:00Z", created_by: userIds.accountant },
        { entry_number: "JE-0015", entry_date: "2026-01-31", description: "Construction costs - January 2026", reference: "Monthly Close", status: "posted", posted_by: userIds.accountant, posted_at: "2026-02-03T10:30:00Z", created_by: userIds.accountant },
        // Operating expense entries
        { entry_number: "JE-0016", entry_date: "2025-12-31", description: "Office rent & utilities - Q4 2025", reference: "Quarterly", status: "posted", posted_by: userIds.accountant, posted_at: "2026-01-05T09:00:00Z", created_by: userIds.accountant },
        { entry_number: "JE-0017", entry_date: "2026-01-31", description: "Office rent & utilities - January 2026", reference: "Monthly Close", status: "posted", posted_by: userIds.accountant, posted_at: "2026-02-03T11:00:00Z", created_by: userIds.accountant },
        // Payroll entries
        { entry_number: "JE-0018", entry_date: "2025-12-31", description: "Payroll accrual - December 2025", reference: "PR-DEC-2025", status: "posted", posted_by: userIds.accountant, posted_at: "2026-01-05T10:00:00Z", created_by: userIds.accountant },
        { entry_number: "JE-0019", entry_date: "2026-01-31", description: "Payroll accrual - January 2026", reference: "PR-JAN-2026", status: "posted", posted_by: userIds.accountant, posted_at: "2026-02-03T10:00:00Z", created_by: userIds.accountant },
        // Insurance & bonding
        { entry_number: "JE-0020", entry_date: "2025-12-31", description: "Annual insurance premium amortization", reference: "INS-2025", status: "posted", posted_by: userIds.accountant, posted_at: "2026-01-05T11:00:00Z", created_by: userIds.accountant },
        // Cash receipts
        { entry_number: "JE-0021", entry_date: "2026-01-15", description: "Cash receipt - Riverside Health Systems", reference: "INV-0019", status: "posted", posted_by: userIds.accountant, posted_at: "2026-01-16T09:00:00Z", created_by: userIds.accountant },
        { entry_number: "JE-0022", entry_date: "2026-01-20", description: "Cash receipt - Thomas Sterling", reference: "INV-0021", status: "posted", posted_by: userIds.accountant, posted_at: "2026-01-21T09:00:00Z", created_by: userIds.accountant },
        // AP payment entries
        { entry_number: "JE-0023", entry_date: "2026-01-10", description: "AP payment - Miller Steel Erectors", reference: "AP-0033", status: "posted", posted_by: userIds.accountant, posted_at: "2026-01-11T09:00:00Z", created_by: userIds.accountant },
        { entry_number: "JE-0024", entry_date: "2026-01-25", description: "AP payment - Hernandez Concrete Works", reference: "AP-0034", status: "posted", posted_by: userIds.accountant, posted_at: "2026-01-26T09:00:00Z", created_by: userIds.accountant },
        // Depreciation
        { entry_number: "JE-0025", entry_date: "2026-01-31", description: "Monthly depreciation - equipment & vehicles", reference: "DEP-JAN-2026", status: "posted", posted_by: userIds.accountant, posted_at: "2026-02-03T11:30:00Z", created_by: userIds.accountant },
      ];

      const { data: journalData } = await supabase
        .from("journal_entries")
        .insert(journalSeeds.map((j) => ({ company_id: companyId, project_id: rmcId, ...j })))
        .select("id, entry_number");

      const jeMap: Record<string, string> = {};
      for (const je of journalData ?? []) {
        jeMap[je.entry_number] = je.id;
      }

      // Account numbers: 1000=Cash, 1100=AR, 1200=Inventory, 1300=Prepaid, 1400=Fixed Assets, 1500=Accum Depreciation
      // 2000=AP, 2100=Accrued Expenses, 2200=Current Portion Debt, 2300=Long-Term Debt, 2400=Retention Payable
      // 3000=Owner Equity, 3100=Retained Earnings, 3200=Current Year Earnings
      // 4000=Contract Revenue, 4100=Service Revenue, 4200=Change Order Revenue, 4300=Rental Income
      // 5000-5900=CSI Construction Costs, 6000-6900=Operating Expenses
      const jeLines = [
        // Revenue entries (monthly) - Dr: AR, Cr: Contract Revenue
        ...[["JE-0001", 850000], ["JE-0002", 920000], ["JE-0003", 1050000], ["JE-0004", 980000], ["JE-0005", 1100000], ["JE-0006", 1250000], ["JE-0007", 1150000], ["JE-0008", 480000]].flatMap(([je, amt]) => [
          { journal_entry_id: jeMap[je as string], account_id: acctMap["1100"], debit: amt as number, credit: 0, description: "Accounts Receivable" },
          { journal_entry_id: jeMap[je as string], account_id: acctMap["4000"], debit: 0, credit: amt as number, description: "Contract Revenue" },
        ]),
        // Construction costs (monthly) - Dr: Construction Costs, Cr: AP
        ...[["JE-0009", 620000], ["JE-0010", 680000], ["JE-0011", 750000], ["JE-0012", 710000], ["JE-0013", 820000], ["JE-0014", 900000], ["JE-0015", 850000]].flatMap(([je, amt]) => [
          { journal_entry_id: jeMap[je as string], account_id: acctMap["5000"], debit: amt as number, credit: 0, description: "Direct Construction Costs" },
          { journal_entry_id: jeMap[je as string], account_id: acctMap["2000"], debit: 0, credit: amt as number, description: "Accounts Payable" },
        ]),
        // Operating expenses - Dr: Rent/Utilities, Cr: Cash
        { journal_entry_id: jeMap["JE-0016"], account_id: acctMap["6100"], debit: 45000, credit: 0, description: "Office Rent - Q4" },
        { journal_entry_id: jeMap["JE-0016"], account_id: acctMap["6200"], debit: 12000, credit: 0, description: "Utilities - Q4" },
        { journal_entry_id: jeMap["JE-0016"], account_id: acctMap["1000"], debit: 0, credit: 57000, description: "Cash" },
        { journal_entry_id: jeMap["JE-0017"], account_id: acctMap["6100"], debit: 15000, credit: 0, description: "Office Rent - Jan" },
        { journal_entry_id: jeMap["JE-0017"], account_id: acctMap["6200"], debit: 4200, credit: 0, description: "Utilities - Jan" },
        { journal_entry_id: jeMap["JE-0017"], account_id: acctMap["1000"], debit: 0, credit: 19200, description: "Cash" },
        // Payroll - Dr: Salaries, Cr: Cash
        { journal_entry_id: jeMap["JE-0018"], account_id: acctMap["6000"], debit: 185000, credit: 0, description: "Salaries & Wages - Dec" },
        { journal_entry_id: jeMap["JE-0018"], account_id: acctMap["2100"], debit: 0, credit: 185000, description: "Accrued Payroll" },
        { journal_entry_id: jeMap["JE-0019"], account_id: acctMap["6000"], debit: 185000, credit: 0, description: "Salaries & Wages - Jan" },
        { journal_entry_id: jeMap["JE-0019"], account_id: acctMap["2100"], debit: 0, credit: 185000, description: "Accrued Payroll" },
        // Insurance - Dr: Insurance Expense, Cr: Prepaid Insurance
        { journal_entry_id: jeMap["JE-0020"], account_id: acctMap["6300"], debit: 96000, credit: 0, description: "Annual Insurance Expense" },
        { journal_entry_id: jeMap["JE-0020"], account_id: acctMap["1300"], debit: 0, credit: 96000, description: "Prepaid Insurance" },
        // Cash receipts - Dr: Cash, Cr: AR
        { journal_entry_id: jeMap["JE-0021"], account_id: acctMap["1000"], debit: 425000, credit: 0, description: "Cash Received" },
        { journal_entry_id: jeMap["JE-0021"], account_id: acctMap["1100"], debit: 0, credit: 425000, description: "AR - Riverside" },
        { journal_entry_id: jeMap["JE-0022"], account_id: acctMap["1000"], debit: 310000, credit: 0, description: "Cash Received" },
        { journal_entry_id: jeMap["JE-0022"], account_id: acctMap["1100"], debit: 0, credit: 310000, description: "AR - Sterling" },
        // AP payments - Dr: AP, Cr: Cash
        { journal_entry_id: jeMap["JE-0023"], account_id: acctMap["2000"], debit: 195000, credit: 0, description: "AP - Miller Steel" },
        { journal_entry_id: jeMap["JE-0023"], account_id: acctMap["1000"], debit: 0, credit: 195000, description: "Cash" },
        { journal_entry_id: jeMap["JE-0024"], account_id: acctMap["2000"], debit: 168000, credit: 0, description: "AP - Hernandez Concrete" },
        { journal_entry_id: jeMap["JE-0024"], account_id: acctMap["1000"], debit: 0, credit: 168000, description: "Cash" },
        // Depreciation - Dr: Depreciation Expense, Cr: Accumulated Depreciation
        { journal_entry_id: jeMap["JE-0025"], account_id: acctMap["6400"], debit: 18500, credit: 0, description: "Depreciation Expense" },
        { journal_entry_id: jeMap["JE-0025"], account_id: acctMap["1500"], debit: 0, credit: 18500, description: "Accumulated Depreciation" },
      ].filter((line) => line.journal_entry_id && line.account_id);

      if (jeLines.length > 0) {
        await supabase.from("journal_entry_lines").insert(
          jeLines.map((l) => ({ company_id: companyId, ...l }))
        );
      }
    }

    // ============================================================
    // 31. SAFETY INCIDENTS
    // ============================================================
    await supabase.from("safety_incidents").insert([
      { company_id: companyId, project_id: rmcId, incident_number: "INC-001", title: "Near-miss: Falling Object from Level 3", description: "A loose bolt fell from Level 3 steel erection area, landing within the barricaded zone. No injuries. Barricade area expanded immediately.", incident_type: "near_miss", severity: "medium", status: "closed", incident_date: "2026-01-28T14:30:00Z", location: "Level 3 - East Side", reported_by: userIds.superintendent, assigned_to: userIds.superintendent, root_cause: "Inadequate bolt storage on elevated work platform", corrective_actions: "Installed tool lanyards on all elevated platforms. Added bolt storage containers at each work station.", preventive_actions: "Updated elevated work procedures. Toolbox talk conducted on falling object prevention.", osha_recordable: false, closed_at: "2026-01-30T16:00:00Z", closed_by: userIds.owner },
      { company_id: companyId, project_id: rmcId, incident_number: "INC-002", title: "First Aid: Minor Laceration from Sheet Metal", description: "Worker received a small cut on left forearm while handling sheet metal ductwork. First aid administered on-site. Worker returned to duty after treatment.", incident_type: "first_aid", severity: "low", status: "closed", incident_date: "2026-02-03T10:15:00Z", location: "Level 2 - Mechanical Room", reported_by: userIds.field_worker, assigned_to: userIds.superintendent, injured_party_name: "Carlos Mendez", injured_party_type: "subcontractor", body_part_affected: "Left forearm", treatment_provided: "Cleaned wound, applied antiseptic and bandage", root_cause: "Worker removed gloves to handle small fittings", corrective_actions: "Reminded all workers of mandatory cut-resistant glove policy when handling sheet metal.", osha_recordable: false, closed_at: "2026-02-04T09:00:00Z", closed_by: userIds.superintendent },
      { company_id: companyId, project_id: rmcId, incident_number: "INC-003", title: "Recordable: Sprained Ankle on Uneven Surface", description: "Worker stepped on unstable debris pile near south stairwell, resulting in a twisted right ankle. Worker was sent for medical evaluation.", incident_type: "recordable", severity: "high", status: "investigating", incident_date: "2026-02-07T08:45:00Z", location: "Level 1 - South Stairwell Area", reported_by: userIds.superintendent, assigned_to: userIds.superintendent, injured_party_name: "Mike Torres", injured_party_type: "employee", body_part_affected: "Right ankle", treatment_provided: "Ice pack applied, sent to urgent care", witness_names: ["David Kim", "Robert Miller"], root_cause: "Housekeeping deficiency - debris accumulation near walkway", osha_recordable: true, days_away: 3, days_restricted: 5 },
      { company_id: companyId, project_id: rmcId, incident_number: "INC-004", title: "Near-miss: Crane Load Swing in High Wind", description: "During steel beam lift, unexpected wind gust caused load to swing. Crane operator safely set load down. No injuries or damage.", incident_type: "near_miss", severity: "high", status: "closed", incident_date: "2026-02-10T11:30:00Z", location: "Tower Crane Radius - Level 4", reported_by: userIds.superintendent, assigned_to: userIds.owner, root_cause: "Wind speed exceeded safe operating threshold for load configuration", corrective_actions: "Lowered wind speed threshold for Level 4 lifts from 25mph to 20mph. Added real-time anemometer at boom tip.", preventive_actions: "Updated lift plan with revised wind criteria. Required pre-lift weather check.", osha_recordable: false, closed_at: "2026-02-11T15:00:00Z", closed_by: userIds.owner },
      { company_id: companyId, project_id: projectMap["MTC-002"], incident_number: "INC-005", title: "Near-miss: Excavation Wall Slump", description: "Minor soil slump observed on east excavation wall during morning inspection. Area cleared and shoring reinforced same day.", incident_type: "near_miss", severity: "medium", status: "closed", incident_date: "2026-02-05T07:30:00Z", location: "East Excavation - Grid A1-A4", reported_by: userIds.superintendent, assigned_to: userIds.superintendent, root_cause: "Heavy overnight rain saturated soil behind shoring", corrective_actions: "Reinforced shoring with additional steel beams. Installed dewatering pumps.", preventive_actions: "Added daily soil monitoring protocol during wet weather.", osha_recordable: false, closed_at: "2026-02-06T17:00:00Z", closed_by: userIds.superintendent },
      { company_id: companyId, project_id: projectMap["WHR-003"], incident_number: "INC-006", title: "First Aid: Eye Irritation from Dust", description: "Tile cutter generated excess dust that caused eye irritation for nearby painter. Eyes flushed with water. Worker returned to work after 15 minutes.", incident_type: "first_aid", severity: "low", status: "closed", incident_date: "2026-02-09T13:00:00Z", location: "Master Bathroom", reported_by: userIds.field_worker, assigned_to: userIds.superintendent, injured_party_name: "Luis Sanchez", injured_party_type: "subcontractor", body_part_affected: "Eyes", treatment_provided: "Eye wash station flush - 15 minutes", root_cause: "Tile saw dust extraction hose disconnected", corrective_actions: "Reconnected dust extraction. Verified all cutting tools have functional dust collection.", osha_recordable: false, closed_at: "2026-02-09T16:00:00Z", closed_by: userIds.superintendent },
    ]);

    // ============================================================
    // 32. TOOLBOX TALKS
    // ============================================================
    await supabase.from("toolbox_talks").insert([
      { company_id: companyId, project_id: rmcId, talk_number: "TBT-001", title: "Fall Protection at Elevated Work Areas", topic: "fall_protection", description: "Review of fall protection requirements for work above 6 feet. Covered harness inspection, anchor points, and rescue procedures.", conducted_by: userIds.superintendent, conducted_date: "2026-02-03", duration_minutes: 20, attendee_count: 18, attendees: [{ name: "All iron workers", trade: "Iron Workers" }, { name: "All laborers", trade: "Laborers" }], notes: "Emphasized 100% tie-off policy. Demonstrated proper harness inspection procedure.", status: "completed" },
      { company_id: companyId, project_id: rmcId, talk_number: "TBT-002", title: "Falling Object Prevention", topic: "falling_objects", description: "Following recent near-miss incident, reviewed procedures for securing tools and materials at elevation.", conducted_by: userIds.superintendent, conducted_date: "2026-01-29", duration_minutes: 15, attendee_count: 22, attendees: [{ name: "All trades", trade: "General" }], notes: "Distributed tool lanyards to all elevated workers. New bolt storage bins installed.", status: "completed" },
      { company_id: companyId, project_id: rmcId, talk_number: "TBT-003", title: "Crane Safety & Signal Communication", topic: "crane_safety", description: "Updated crane safety protocols including revised wind speed thresholds and signal person procedures.", conducted_by: userIds.superintendent, conducted_date: "2026-02-11", duration_minutes: 25, attendee_count: 15, attendees: [{ name: "Crane operators", trade: "Operating Engineers" }, { name: "Iron workers", trade: "Iron Workers" }, { name: "Signal persons", trade: "Laborers" }], notes: "New anemometer readings required before each lift. Updated hand signal chart distributed.", status: "completed" },
      { company_id: companyId, project_id: rmcId, talk_number: "TBT-004", title: "Housekeeping & Slip/Trip Hazards", topic: "housekeeping", description: "Emphasis on maintaining clean work areas to prevent slips, trips, and falls. Related to recent sprained ankle incident.", conducted_by: userIds.superintendent, conducted_date: "2026-02-10", duration_minutes: 15, attendee_count: 28, attendees: [{ name: "All site personnel", trade: "General" }], notes: "Assigned housekeeping monitors for each floor. End-of-shift cleanup now mandatory.", status: "completed" },
      { company_id: companyId, project_id: projectMap["MTC-002"], talk_number: "TBT-005", title: "Excavation & Trenching Safety", topic: "excavation", description: "Reviewed OSHA excavation requirements, soil classification, and protective system requirements for deep excavation work.", conducted_by: userIds.superintendent, conducted_date: "2026-02-06", duration_minutes: 20, attendee_count: 14, attendees: [{ name: "Operating engineers", trade: "Operating Engineers" }, { name: "Laborers", trade: "Laborers" }], notes: "Reviewed shoring inspection checklist. Daily soil monitoring added to morning routine.", status: "completed" },
      { company_id: companyId, project_id: projectMap["WHR-003"], talk_number: "TBT-006", title: "Silica Dust Exposure Prevention", topic: "dust_control", description: "Reviewed silica dust hazards from tile cutting and concrete grinding. Proper dust control measures and respiratory protection.", conducted_by: userIds.field_worker, conducted_date: "2026-02-12", duration_minutes: 15, attendee_count: 8, attendees: [{ name: "Tile setters", trade: "Tile" }, { name: "Painters", trade: "Painters" }], notes: "Verified all cutting tools have functional dust extraction. N95 masks distributed.", status: "completed" },
    ]);

    // ============================================================
    // 33. TICKETS
    // ============================================================
    let ticketNum = 1;
    await supabase.from("tickets").insert([
      { company_id: companyId, ticket_number: `TK-${String(ticketNum++).padStart(4, "0")}`, title: "Printer not working in main office", description: "HP LaserJet on 2nd floor is showing paper jam error but no paper is jammed. Tried power cycling.", status: "resolved", priority: "medium", category: "IT", created_by: userIds.accountant, assigned_to: userIds.field_worker, resolved_by: userIds.field_worker, resolved_at: "2026-02-04T14:00:00Z", tags: ["hardware", "printer"] },
      { company_id: companyId, ticket_number: `TK-${String(ticketNum++).padStart(4, "0")}`, title: "Request new safety vests - RMC site", description: "Need 15 new high-visibility safety vests for new subcontractor crew arriving next week at Riverside Medical Center.", status: "closed", priority: "high", category: "Safety", created_by: userIds.superintendent, assigned_to: userIds.project_manager, resolved_by: userIds.project_manager, resolved_at: "2026-02-06T16:00:00Z", closed_at: "2026-02-07T09:00:00Z", tags: ["ppe", "procurement"] },
      { company_id: companyId, ticket_number: `TK-${String(ticketNum++).padStart(4, "0")}`, title: "QuickBooks integration sync error", description: "Invoice sync between ConstructionERP and QuickBooks failed last night. 5 invoices from Feb 10 not showing in QB.", status: "open", priority: "high", category: "IT", created_by: userIds.accountant, assigned_to: userIds.owner, tags: ["integration", "quickbooks", "invoices"] },
      { company_id: companyId, ticket_number: `TK-${String(ticketNum++).padStart(4, "0")}`, title: "Update company insurance certificate", description: "Annual insurance renewal completed. Need to update the certificate on file and distribute to all active project owners.", status: "in_progress", priority: "medium", category: "Operations", created_by: userIds.owner, assigned_to: userIds.project_manager, tags: ["insurance", "compliance"] },
      { company_id: companyId, ticket_number: `TK-${String(ticketNum++).padStart(4, "0")}`, title: "Ford F-350 #2 check engine light", description: "Check engine light came on during drive to WHR-003 site. Vehicle still running but should be inspected.", status: "in_progress", priority: "high", category: "Equipment", created_by: userIds.field_worker, assigned_to: userIds.superintendent, tags: ["vehicle", "maintenance"] },
      { company_id: companyId, ticket_number: `TK-${String(ticketNum++).padStart(4, "0")}`, title: "New employee onboarding - Jake Sullivan", description: "New project engineer starting Feb 24. Need account setup, safety orientation, PPE issue, and project access.", status: "open", priority: "medium", category: "HR", created_by: userIds.project_manager, assigned_to: userIds.owner, tags: ["onboarding", "new-hire"] },
      { company_id: companyId, ticket_number: `TK-${String(ticketNum++).padStart(4, "0")}`, title: "Monthly billing discrepancy - MTC project", description: "Client reports $12,500 discrepancy between our progress billing and their approved pay application for January.", status: "open", priority: "urgent", category: "Finance", created_by: userIds.accountant, assigned_to: userIds.project_manager, tags: ["billing", "client"] },
      { company_id: companyId, ticket_number: `TK-${String(ticketNum++).padStart(4, "0")}`, title: "Subcontractor certificate of insurance expired", description: "Thompson Electric COI expired Jan 31. Need updated certificate before they can continue work on RMC.", status: "in_progress", priority: "urgent", category: "Operations", created_by: userIds.project_manager, assigned_to: userIds.project_manager, tags: ["compliance", "subcontractor"] },
    ]);

    // ============================================================
    // 34. EQUIPMENT MAINTENANCE LOGS
    // ============================================================
    const { data: equipData } = await supabase
      .from("equipment")
      .select("id, name")
      .eq("company_id", companyId);

    const equipMap: Record<string, string> = {};
    for (const eq of equipData ?? []) {
      equipMap[eq.name.split(" - ")[0].split(" #")[0]] = eq.id;
    }

    const eqTowerCrane = equipMap["Tower Crane"] || (equipData ?? [])[0]?.id;
    const eqPump = equipMap["Concrete Pump"] || (equipData ?? [])[1]?.id;
    const eqExcavator = equipMap["CAT 320 Excavator"] || (equipData ?? [])[2]?.id;
    const eqTruck1 = (equipData ?? [])[3]?.id;
    const eqSkidSteer = equipMap["Skid Steer"] || (equipData ?? [])[5]?.id;

    if (equipData && equipData.length > 0) {
      await supabase.from("equipment_maintenance_logs").insert([
        { company_id: companyId, equipment_id: eqTowerCrane, maintenance_type: "preventive", description: "Quarterly crane inspection - structural, wire rope, sheaves, brakes, and electrical systems", performed_by: userIds.superintendent, performed_date: "2026-01-15", cost: 4500, hours_at_service: 4100, parts_replaced: "Wire rope lubricant, brake pads", next_maintenance_date: "2026-04-15", notes: "All systems within spec. Wire rope at 85% capacity - plan replacement by July.", status: "completed" },
        { company_id: companyId, equipment_id: eqPump, maintenance_type: "preventive", description: "Monthly pump maintenance - hydraulic system check, boom inspection, pipe wear measurement", performed_by: userIds.field_worker, performed_date: "2026-02-01", cost: 1200, hours_at_service: 2750, parts_replaced: "Hydraulic filters, O-rings", next_maintenance_date: "2026-03-01", notes: "Pipe wear at 60% on boom section 3 - monitor closely.", status: "completed" },
        { company_id: companyId, equipment_id: eqExcavator, maintenance_type: "preventive", description: "500-hour service - engine oil, filters, hydraulic fluid top-off, track tension", performed_by: userIds.field_worker, performed_date: "2025-12-01", cost: 850, hours_at_service: 6500, parts_replaced: "Engine oil, oil filter, fuel filter, air filter", next_maintenance_date: "2026-03-01", notes: "Track shoes at 40% remaining. Plan replacement at next major service.", status: "completed" },
        { company_id: companyId, equipment_id: eqTruck1, maintenance_type: "preventive", description: "Regular service - oil change, tire rotation, brake inspection", performed_by: userIds.field_worker, performed_date: "2026-01-20", cost: 380, hours_at_service: 8100, parts_replaced: "Engine oil, oil filter", next_maintenance_date: "2026-04-20", notes: "Brake pads at 50% - replace at next service.", status: "completed" },
        { company_id: companyId, equipment_id: eqSkidSteer, maintenance_type: "repair", description: "Hydraulic leak repair - left tilt cylinder seal failure. Replaced seal kit and recharged hydraulic system.", performed_by: userIds.field_worker, performed_date: "2026-02-05", cost: 1800, hours_at_service: 5600, parts_replaced: "Tilt cylinder seal kit, hydraulic fluid (5 gal)", next_maintenance_date: "2026-02-20", notes: "Machine back in service pending final test under load.", status: "in_progress" },
      ]);

      // ============================================================
      // 35. EQUIPMENT ASSIGNMENTS
      // ============================================================
      await supabase.from("equipment_assignments").insert([
        { company_id: companyId, equipment_id: eqTowerCrane, project_id: rmcId, assigned_to: userIds.superintendent, assigned_date: "2025-06-15", expected_return_date: "2026-11-30", daily_rate: 2800, notes: "Tower crane dedicated to RMC project for duration", status: "active" },
        { company_id: companyId, equipment_id: eqPump, project_id: rmcId, assigned_to: userIds.field_worker, assigned_date: "2025-08-01", expected_return_date: "2026-06-30", daily_rate: 1800, notes: "Concrete pump for deck pours", status: "active" },
        { company_id: companyId, equipment_id: eqExcavator, project_id: projectMap["MTC-002"], assigned_to: userIds.superintendent, assigned_date: "2026-01-15", expected_return_date: "2026-06-30", daily_rate: 1400, notes: "Excavation work - Mueller Town Center", status: "active" },
        { company_id: companyId, equipment_id: eqTruck1, assigned_to: userIds.superintendent, assigned_date: "2023-08-01", notes: "Permanent assignment - superintendent vehicle", status: "active" },
        { company_id: companyId, equipment_id: eqSkidSteer, project_id: rmcId, assigned_to: userIds.field_worker, assigned_date: "2025-09-01", expected_return_date: "2026-02-20", daily_rate: 680, notes: "Material handling on-site. Currently in maintenance.", status: "active" },
      ]);
    }

    // ============================================================
    // 36. BANK TRANSACTIONS
    // ============================================================
    const operatingAcctId = bankAccounts?.[0]?.id;
    const payrollAcctId = bankAccounts?.[1]?.id;

    if (operatingAcctId) {
      const bankTxns = [];
      let runningBal = 847250;

      // Last 30 days of transactions for operating account
      const txnTemplates = [
        { days: 28, desc: "Client Payment - Riverside Health Systems", ref: "INV-0019", type: "credit", amount: 425000, cat: "client_payment" },
        { days: 27, desc: "AP - Miller Steel Erectors", ref: "AP-0033", type: "debit", amount: 195000, cat: "vendor_payment" },
        { days: 25, desc: "Client Payment - Sterling Investments", ref: "INV-0021", type: "credit", amount: 310000, cat: "client_payment" },
        { days: 24, desc: "AP - Hernandez Concrete Works", ref: "AP-0034", type: "debit", amount: 168000, cat: "vendor_payment" },
        { days: 22, desc: "Office Rent - January", ref: "RENT-JAN", type: "debit", amount: 15000, cat: "operating_expense" },
        { days: 20, desc: "Insurance Premium - Monthly", ref: "INS-JAN", type: "debit", amount: 8000, cat: "insurance" },
        { days: 18, desc: "Client Payment - Catellus Development", ref: "INV-0020", type: "credit", amount: 287450, cat: "client_payment" },
        { days: 16, desc: "Fuel Cards - Fleet", ref: "FUEL-0126", type: "debit", amount: 3200, cat: "operating_expense" },
        { days: 14, desc: "AP - Thompson Electric", ref: "AP-0035", type: "debit", amount: 85000, cat: "vendor_payment" },
        { days: 12, desc: "AP - Texas Building Supply", ref: "PO-4521", type: "debit", amount: 42000, cat: "materials" },
        { days: 10, desc: "Client Payment - City of Pflugerville (Retention)", ref: "RET-PCP", type: "credit", amount: 155000, cat: "client_payment" },
        { days: 8, desc: "Utilities - Office & Yard", ref: "UTIL-JAN", type: "debit", amount: 4200, cat: "operating_expense" },
        { days: 6, desc: "Equipment Repair - Bobcat S650", ref: "WO-5600", type: "debit", amount: 1800, cat: "equipment" },
        { days: 5, desc: "AP - Davis Mechanical Systems", ref: "AP-0036", type: "debit", amount: 125000, cat: "vendor_payment" },
        { days: 4, desc: "Client Payment - Riverside Health Systems", ref: "INV-0022", type: "credit", amount: 475000, cat: "client_payment" },
        { days: 3, desc: "AP - Atlas Equipment Rental", ref: "RENT-0226", type: "debit", amount: 18500, cat: "equipment_rental" },
        { days: 2, desc: "Office Supplies & IT", ref: "MISC-0212", type: "debit", amount: 2850, cat: "operating_expense" },
        { days: 1, desc: "Transfer to Payroll Account", ref: "XFER-PR", type: "debit", amount: 215000, cat: "transfer" },
      ];

      for (const txn of txnTemplates) {
        const txnDate = new Date(2026, 1, 12 - txn.days);
        if (txn.type === "credit") runningBal += txn.amount;
        else runningBal -= txn.amount;
        bankTxns.push({
          company_id: companyId,
          bank_account_id: operatingAcctId,
          transaction_date: txnDate.toISOString().slice(0, 10),
          posted_date: txnDate.toISOString().slice(0, 10),
          description: txn.desc,
          reference: txn.ref,
          transaction_type: txn.type,
          amount: txn.amount,
          running_balance: runningBal,
          category: txn.cat,
          is_reconciled: txn.days > 15,
        });
      }

      await supabase.from("bank_transactions").insert(bankTxns);
    }

    // Payroll account transactions
    if (payrollAcctId) {
      await supabase.from("bank_transactions").insert([
        { company_id: companyId, bank_account_id: payrollAcctId, transaction_date: "2026-01-15", posted_date: "2026-01-15", description: "Payroll Run - Jan 1-15", reference: "PR-0115", transaction_type: "debit", amount: 92500, running_balance: 122500, category: "payroll", is_reconciled: true },
        { company_id: companyId, bank_account_id: payrollAcctId, transaction_date: "2026-01-31", posted_date: "2026-01-31", description: "Payroll Run - Jan 16-31", reference: "PR-0131", transaction_type: "debit", amount: 92500, running_balance: 30000, category: "payroll", is_reconciled: true },
        { company_id: companyId, bank_account_id: payrollAcctId, transaction_date: "2026-02-01", posted_date: "2026-02-01", description: "Transfer from Operating Account", reference: "XFER-PR", transaction_type: "credit", amount: 215000, running_balance: 245000, category: "transfer", is_reconciled: false },
        { company_id: companyId, bank_account_id: payrollAcctId, transaction_date: "2026-02-14", posted_date: "2026-02-14", description: "Payroll Run - Feb 1-14", reference: "PR-0214", transaction_type: "debit", amount: 95000, running_balance: 150000, category: "payroll", is_reconciled: false },
      ]);
    }

    // ============================================================
    // 37. CONTRACTS (from migration 008 contracts table)
    // ============================================================
    const { data: contractsData } = await supabase.from("contracts").insert([
      { company_id: companyId, contract_number: "GC-2025-001", title: "Riverside Medical Center - General Contract", description: "General construction contract for new 120,000 SF medical office building", contract_type: "prime", status: "active", party_name: "Riverside Health Systems", party_email: "pholmes@riversidehealth.com", party_phone: "(512) 555-2001", contract_amount: 28500000, retention_pct: 10, payment_terms: "Net 30 from approved pay application", start_date: "2025-06-15", end_date: "2026-11-30", signed_date: "2025-06-01", project_id: rmcId, scope_of_work: "Complete general construction including site work, structural, envelope, MEP, and interior finishes.", insurance_required: true, insurance_expiry: "2026-12-31", bond_required: true, bond_amount: 28500000, created_by: userIds.owner, approved_by: userIds.owner, approved_at: "2025-06-01T10:00:00Z", tags: ["medical", "commercial", "prime-contract"] },
      { company_id: companyId, contract_number: "GC-2025-002", title: "Mueller Town Center Phase II - General Contract", description: "Mixed-use development - 45,000 SF retail + 180 residential units", contract_type: "prime", status: "active", party_name: "Catellus Development", party_email: "rlangford@catellus.com", contract_amount: 42000000, retention_pct: 10, payment_terms: "Net 30", start_date: "2025-11-01", end_date: "2027-06-30", signed_date: "2025-10-15", project_id: projectMap["MTC-002"], scope_of_work: "Full GC scope for mixed-use development.", insurance_required: true, insurance_expiry: "2027-06-30", bond_required: true, bond_amount: 42000000, created_by: userIds.owner, approved_by: userIds.owner, approved_at: "2025-10-15T10:00:00Z", tags: ["mixed-use", "prime-contract"] },
      { company_id: companyId, contract_number: "SC-2025-005", title: "Premier Plumbing - MEP Rough-In", description: "Plumbing rough-in and fixtures for Riverside Medical Center", contract_type: "subcontractor", status: "active", party_name: "Premier Plumbing", party_email: "kobrien@premierplumb.com", party_phone: "(512) 555-4005", contract_amount: 1450000, retention_pct: 10, payment_terms: "Net 30 from approved pay app", start_date: "2026-01-15", end_date: "2026-07-31", signed_date: "2025-12-20", project_id: rmcId, insurance_required: true, insurance_expiry: "2027-01-31", created_by: userIds.project_manager, tags: ["plumbing", "subcontract"] },
      { company_id: companyId, contract_number: "PO-2026-001", title: "Texas Building Supply - Structural Materials", description: "Supply contract for structural steel and concrete materials", contract_type: "purchase_order", status: "active", party_name: "Texas Building Supply", party_email: "jcarpenter@txbuild.com", party_phone: "(512) 555-4007", contract_amount: 2800000, payment_terms: "Net 45", start_date: "2025-07-01", end_date: "2026-06-30", project_id: rmcId, created_by: userIds.project_manager, tags: ["materials", "supply"] },
      { company_id: companyId, contract_number: "GC-2024-003", title: "Pflugerville Community Park - General Contract", description: "15-acre community park construction - COMPLETED", contract_type: "prime", status: "completed", party_name: "City of Pflugerville", party_email: "mnguyen@pflugervilletx.gov", contract_amount: 6200000, retention_pct: 5, start_date: "2024-09-01", end_date: "2026-01-15", signed_date: "2024-08-15", project_id: projectMap["PCP-005"], created_by: userIds.owner, approved_by: userIds.owner, approved_at: "2024-08-15T10:00:00Z", tags: ["infrastructure", "completed"] },
    ]).select("id, contract_number");

    // Contract milestones
    const contractMap: Record<string, string> = {};
    for (const c of contractsData ?? []) {
      contractMap[c.contract_number] = c.id;
    }

    const gcRmcId = contractMap["GC-2025-001"];
    if (gcRmcId) {
      await supabase.from("contract_milestones").insert([
        { company_id: companyId, contract_id: gcRmcId, title: "Foundation Complete", description: "All foundation work including piers and grade beams", due_date: "2025-10-30", amount: 4275000, status: "completed", completed_at: "2025-10-28T16:00:00Z", completed_by: userIds.superintendent, sort_order: 1 },
        { company_id: companyId, contract_id: gcRmcId, title: "Structure Topped Out", description: "Structural steel and concrete decks complete for all 4 levels", due_date: "2026-02-28", amount: 8550000, status: "in_progress", sort_order: 2 },
        { company_id: companyId, contract_id: gcRmcId, title: "Building Enclosed", description: "Curtain wall and roofing complete - building weathertight", due_date: "2026-05-31", amount: 5700000, status: "pending", sort_order: 3 },
        { company_id: companyId, contract_id: gcRmcId, title: "MEP Rough-In Complete", description: "All mechanical, electrical, and plumbing rough-in inspected and approved", due_date: "2026-07-31", amount: 4275000, status: "pending", sort_order: 4 },
        { company_id: companyId, contract_id: gcRmcId, title: "Substantial Completion", description: "Certificate of occupancy received, punch list issued", due_date: "2026-11-15", amount: 4275000, status: "pending", sort_order: 5 },
        { company_id: companyId, contract_id: gcRmcId, title: "Final Completion & Closeout", description: "Punch list complete, all closeout documents submitted, final retention release", due_date: "2026-11-30", amount: 1425000, status: "pending", sort_order: 6 },
      ]);
    }

    // ============================================================
    // 38. MESSAGES (Inbox)
    // ============================================================
    await supabase.from("messages").insert([
      { company_id: companyId, sender_id: userIds.project_manager, recipient_id: userIds.owner, subject: "RMC - Change Order CO-003 Review", body: "Marcus, I've submitted CO-003 for the upgraded HVAC controls system. The total is $245K but will significantly improve building performance and reduce long-term operating costs. The client is pushing for it. Can you review and approve when you get a chance?", is_read: false, entity_type: "change_order" },
      { company_id: companyId, sender_id: userIds.superintendent, recipient_id: userIds.project_manager, subject: "Steel delivery delay - Level 4", body: "Sarah, just got word from Miller Steel that the Level 4 column pieces are delayed 3 days due to shop fabrication backup. New ETA is Feb 18. I've adjusted the crane schedule but we may need to pull the Level 3 deck pour forward to keep the crew productive.", is_read: true, read_at: "2026-02-11T08:30:00Z" },
      { company_id: companyId, sender_id: userIds.owner, recipient_id: userIds.project_manager, subject: "SCH-006 Hold Status Update", body: "Sarah, I spoke with Jennifer Wells from SoCo Hospitality this morning. They expect financing to be resolved by mid-March. Let's prepare a remobilization plan so we're ready to restart quickly. Please draft a revised schedule assuming April 1 restart.", is_read: true, read_at: "2026-02-10T14:00:00Z" },
      { company_id: companyId, sender_id: userIds.accountant, recipient_id: userIds.project_manager, subject: "MTC Billing Discrepancy - Urgent", body: "Sarah, Catellus is disputing $12,500 on the January progress billing. It appears to be a duplicate line item for temporary fencing. Can you verify against the pay application? I need to resolve this before the Feb billing cycle.", is_read: false, entity_type: "invoice" },
      { company_id: companyId, sender_id: userIds.project_manager, recipient_id: userIds.superintendent, subject: "Weekly Safety Meeting - Agenda Items", body: "James, for this week's safety meeting, let's cover: 1) Follow-up on the crane near-miss investigation, 2) Excavation safety review for MTC, 3) New silica dust monitoring results. Can you prepare the near-miss review presentation?", is_read: true, read_at: "2026-02-12T07:00:00Z" },
      { company_id: companyId, sender_id: userIds.field_worker, recipient_id: userIds.superintendent, subject: "Bobcat S650 - Repair Status", body: "James, the hydraulic seal replacement is done. I'm running it through load tests this afternoon. Should be cleared for return to service by end of day tomorrow if everything checks out.", is_read: true, read_at: "2026-02-12T11:30:00Z" },
      { company_id: companyId, sender_id: userIds.owner, recipient_id: userIds.accountant, subject: "Q4 Financial Review", body: "Emily, let's schedule the Q4 2025 financial review for next week. Please have the income statement, balance sheet, and project profitability reports ready. Also want to discuss cash flow projections for the next 6 months given the new MTC project.", is_read: false },
      { company_id: companyId, sender_id: userIds.project_manager, recipient_id: userIds.owner, subject: "New Opportunity - Lakeway Condos", body: "Marcus, great news on the Lakeway Luxury Condos opportunity. Jennifer Adams from Lakeway Development is very interested. Contract terms look favorable - $18M for 24 units. I think we should push for a signed LOI by end of March. Want to discuss our approach?", is_read: true, read_at: "2026-02-09T16:00:00Z", entity_type: "opportunity" },
    ]);

    // ============================================================
    // 39. SUBSCRIPTION EVENTS (for Super Admin dashboard)
    // ============================================================
    await supabase.from("subscription_events").insert([
      { company_id: companyId, event_type: "created", plan_to: "starter", amount: 0, created_at: "2025-05-01T10:00:00Z" },
      { company_id: companyId, event_type: "upgraded", plan_from: "starter", plan_to: "professional", amount: 299, created_at: "2025-06-15T14:00:00Z" },
      { company_id: companyId, event_type: "renewed", plan_from: "professional", plan_to: "professional", amount: 299, created_at: "2025-07-15T00:00:00Z" },
      { company_id: companyId, event_type: "renewed", plan_from: "professional", plan_to: "professional", amount: 299, created_at: "2025-08-15T00:00:00Z" },
      { company_id: companyId, event_type: "renewed", plan_from: "professional", plan_to: "professional", amount: 299, created_at: "2025-09-15T00:00:00Z" },
    ]);

    // ============================================================
    // 40. TENANT ANNOUNCEMENTS
    // ============================================================
    await supabase.from("tenant_announcements").insert([
      {
        company_id: companyId,
        property_id: domainId,
        title: "Scheduled Water Shut-Off — February 20",
        content: "The building water supply will be shut off on Thursday, February 20 from 9:00 AM to 1:00 PM for maintenance to the main water line. Please plan accordingly and store water for the morning. We apologize for the inconvenience.",
        category: "maintenance",
        is_active: true,
        published_at: "2026-02-10T09:00:00Z",
        created_by: userIds.owner,
      },
      {
        company_id: companyId,
        property_id: domainId,
        title: "Community BBQ & Meet Your Neighbors Event",
        content: "Join us for our quarterly Community BBQ on Saturday, March 1st from 12:00 PM to 4:00 PM at the rooftop terrace. Food and drinks will be provided. Bring your family and meet your neighbors! RSVP at the front desk.",
        category: "event",
        is_active: true,
        published_at: "2026-02-08T14:00:00Z",
        created_by: userIds.owner,
      },
      {
        company_id: companyId,
        property_id: bartonId,
        title: "Elevator Maintenance Notice",
        content: "Elevator #2 will undergo routine maintenance on February 25-26. Please use Elevator #1 or the stairwell during this period. We anticipate full service will be restored by February 27.",
        category: "maintenance",
        is_active: true,
        published_at: "2026-02-12T10:00:00Z",
        created_by: userIds.owner,
      },
      {
        company_id: companyId,
        property_id: null,
        title: "Updated Parking Policy",
        content: "Effective March 1, 2026, all residents must display a valid parking permit on their vehicle dashboard. Visitor parking passes are available at the front desk. Unauthorized vehicles may be towed at the owner's expense.",
        category: "general",
        is_active: true,
        published_at: "2026-02-05T11:00:00Z",
        created_by: userIds.owner,
      },
      {
        company_id: companyId,
        property_id: domainId,
        title: "Emergency: Gas Leak Reported — Resolved",
        content: "A gas leak was reported on Floor 3 on January 28. The fire department and gas company responded immediately. The leak has been repaired and the building has been cleared for re-entry. If you smell gas, evacuate immediately and call 911.",
        category: "emergency",
        is_active: false,
        published_at: "2026-01-28T16:00:00Z",
        expires_at: "2026-01-29T12:00:00Z",
        created_by: userIds.owner,
      },
    ]);

    // ============================================================
    // 41. TENANT DOCUMENTS (share some documents with tenant users)
    // ============================================================
    const tenantLeases = (leasesData ?? []).filter((l) => l.tenant_user_id != null);

    if (tenantLeases.length > 0) {
      // Get document IDs to share
      const { data: docsForTenant } = await supabase
        .from("documents")
        .select("id, name")
        .eq("company_id", companyId)
        .in("name", ["Summit Builders Insurance Certificate", "Safety Manual 2026"])
        .limit(2);

      const tenantDocInserts = [];
      for (const lease of tenantLeases) {
        for (const doc of docsForTenant ?? []) {
          tenantDocInserts.push({
            company_id: companyId,
            lease_id: lease.id,
            document_id: doc.id,
            shared_with_tenant_user_id: lease.tenant_user_id,
          });
        }
      }

      if (tenantDocInserts.length > 0) {
        await supabase.from("tenant_documents").insert(tenantDocInserts);
      }
    }

    // ============================================================
    // DONE
    // ============================================================
    return NextResponse.json({
      success: true,
      message: "Demo data seeded successfully!",
      company: {
        name: "Summit Builders Group",
        id: companyId,
      },
      accounts: [
        ...TEST_USERS.map((u) => ({
          email: u.email,
          password: DEFAULT_PASSWORD,
          role: u.role,
          name: u.full_name,
        })),
        ...TENANT_USERS.map((t) => ({
          email: t.email,
          password: DEFAULT_PASSWORD,
          role: "tenant",
          name: t.full_name,
        })),
      ],
      super_admin_note: "The owner account (owner@demo.com) has been granted platform admin access. Use it to access /super-admin.",
      tenant_note: "Tenant accounts (tenant@demo.com, tenant2@demo.com) access the tenant portal at /login/tenant.",
      stats: {
        users: TEST_USERS.length,
        tenant_users: TENANT_USERS.length,
        projects: projectSeeds.length,
        properties: 4,
        invoices: invoiceInserts.length,
        contacts: contactSeeds.length,
        opportunities: 7,
        bids: 5,
      },
    });
  } catch (err) {
    console.error("Seed error:", err);
    return NextResponse.json(
      { error: `Seed failed: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
