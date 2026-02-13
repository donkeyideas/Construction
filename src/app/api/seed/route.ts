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
      await Promise.all([
        supabase.from("daily_logs").delete().eq("company_id", cid),
        supabase.from("time_entries").delete().eq("company_id", cid),
        supabase.from("change_orders").delete().eq("company_id", cid),
        supabase.from("rfis").delete().eq("company_id", cid),
        supabase.from("submittals").delete().eq("company_id", cid),
        supabase.from("punch_list_items").delete().eq("company_id", cid),
        supabase.from("safety_inspections").delete().eq("company_id", cid),
        supabase.from("invoices").delete().eq("company_id", cid),
        supabase.from("payments").delete().eq("company_id", cid),
        supabase.from("bank_accounts").delete().eq("company_id", cid),
        supabase.from("chart_of_accounts").delete().eq("company_id", cid),
        supabase.from("documents").delete().eq("company_id", cid),
        supabase.from("contacts").delete().eq("company_id", cid),
        supabase.from("certifications").delete().eq("company_id", cid),
        supabase.from("equipment").delete().eq("company_id", cid),
        supabase.from("crm_opportunities").delete().eq("company_id", cid),
        supabase.from("bids").delete().eq("company_id", cid),
        supabase.from("notifications").delete().eq("company_id", cid),
        supabase.from("audit_logs").delete().eq("company_id", cid),
      ]);
      // Delete projects, properties, units, leases, maintenance (which depend on projects/properties)
      await supabase.from("property_units").delete().eq("company_id", cid);
      await supabase.from("leases").delete().eq("company_id", cid);
      await supabase.from("maintenance_requests").delete().eq("company_id", cid);
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
      return {
        company_id: companyId,
        property_id: unit.property_id,
        unit_id: unit.id,
        tenant_name: tenantNames[i % tenantNames.length],
        tenant_email: `tenant${i + 1}@example.com`,
        tenant_phone: `(512) 555-${3000 + i}`,
        lease_start: startDate.toISOString().slice(0, 10),
        lease_end: endDate.toISOString().slice(0, 10),
        monthly_rent: rent,
        security_deposit: rent * 2,
        status: "active",
        auto_renew: Math.random() > 0.5,
      };
    });

    const { data: leasesData } = await supabase.from("leases").insert(leaseInserts).select("id");

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

    const maintInserts = maintDescriptions.map((desc, i) => ({
      company_id: companyId,
      property_id: i < 6 ? domainId : bartonId,
      title: desc,
      description: `${desc}. Tenant reported the issue on ${new Date(2026, 0, 15 + i).toLocaleDateString()}.`,
      category: maintCategories[i % maintCategories.length],
      priority: i < 2 ? "emergency" : i < 5 ? "high" : "medium",
      status: maintStatuses[i % maintStatuses.length],
      requested_by: userIds.field_worker,
      assigned_to: i % 3 === 0 ? userIds.superintendent : userIds.field_worker,
      estimated_cost: 150 + Math.floor(Math.random() * 800),
      actual_cost: i % 2 === 0 ? 200 + Math.floor(Math.random() * 600) : null,
      scheduled_date: new Date(2026, 1, 1 + i * 2).toISOString().slice(0, 10),
      completed_at: maintStatuses[i % maintStatuses.length] === "completed" ? new Date(2026, 1, 5 + i).toISOString() : null,
    }));

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

    for (let monthBack = 7; monthBack >= 0; monthBack--) {
      const invDate = new Date(2025, 6 + (7 - monthBack), 1);
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

    for (let monthBack = 7; monthBack >= 0; monthBack--) {
      const invDate = new Date(2025, 6 + (7 - monthBack), 15);
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
    // 30. SUBSCRIPTION EVENTS (for Super Admin dashboard)
    // ============================================================
    await supabase.from("subscription_events").insert([
      { company_id: companyId, event_type: "created", plan_to: "starter", amount: 0, created_at: "2025-05-01T10:00:00Z" },
      { company_id: companyId, event_type: "upgraded", plan_from: "starter", plan_to: "professional", amount: 299, created_at: "2025-06-15T14:00:00Z" },
      { company_id: companyId, event_type: "renewed", plan_from: "professional", plan_to: "professional", amount: 299, created_at: "2025-07-15T00:00:00Z" },
      { company_id: companyId, event_type: "renewed", plan_from: "professional", plan_to: "professional", amount: 299, created_at: "2025-08-15T00:00:00Z" },
      { company_id: companyId, event_type: "renewed", plan_from: "professional", plan_to: "professional", amount: 299, created_at: "2025-09-15T00:00:00Z" },
    ]);

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
      accounts: TEST_USERS.map((u) => ({
        email: u.email,
        password: DEFAULT_PASSWORD,
        role: u.role,
        name: u.full_name,
      })),
      super_admin_note: "The owner account (owner@demo.com) has been granted platform admin access. Use it to access /super-admin.",
      stats: {
        users: TEST_USERS.length,
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
