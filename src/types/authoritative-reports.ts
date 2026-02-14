/* =========================================================
   Authoritative Reports – Type Definitions
   ========================================================= */

// ---------------------------------------------------------------------------
// Report types & section definitions
// ---------------------------------------------------------------------------

export type ReportType =
  | "market_feasibility"
  | "offering_memorandum"
  | "basis_of_design";

export type ReportStatus = "draft" | "finalized";

export type WatermarkType = "draft" | "confidential" | null;

export interface SectionConfig {
  id: string;
  label: string;
  enabled: boolean;
  sortOrder: number;
  aiGenerated: boolean;
}

// ---------------------------------------------------------------------------
// Saved report (matches DB row)
// ---------------------------------------------------------------------------

export interface AuthoritativeReport {
  id: string;
  company_id: string;
  report_type: ReportType;
  title: string;
  status: ReportStatus;
  project_id: string | null;
  property_ids: string[];
  section_config: SectionConfig[];
  sections_data: Record<string, SectionData>;
  watermark: WatermarkType;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SectionData {
  narrative?: string;
  tableData?: Record<string, unknown>[];
  tableColumns?: { key: string; label: string; format?: "currency" | "percent" | "number" | "text" }[];
  chartType?: string;
  chartData?: Record<string, unknown>[];
  kpis?: { label: string; value: string; icon?: string; color?: string }[];
}

// ---------------------------------------------------------------------------
// Default sections per report type
// ---------------------------------------------------------------------------

export const MARKET_FEASIBILITY_SECTIONS: SectionConfig[] = [
  { id: "cover",               label: "Cover Page",            enabled: true,  sortOrder: 0,  aiGenerated: false },
  { id: "executive_summary",   label: "Executive Summary",     enabled: true,  sortOrder: 1,  aiGenerated: true  },
  { id: "property_overview",   label: "Property Overview",     enabled: true,  sortOrder: 2,  aiGenerated: false },
  { id: "location_analysis",   label: "Location Analysis",     enabled: true,  sortOrder: 3,  aiGenerated: true  },
  { id: "unit_mix",            label: "Unit Mix Analysis",     enabled: true,  sortOrder: 4,  aiGenerated: false },
  { id: "occupancy",           label: "Occupancy & Absorption",enabled: true,  sortOrder: 5,  aiGenerated: true  },
  { id: "rental_rates",        label: "Rental Rate Analysis",  enabled: true,  sortOrder: 6,  aiGenerated: true  },
  { id: "financial_proforma",  label: "Financial Pro Forma",   enabled: true,  sortOrder: 7,  aiGenerated: true  },
  { id: "competitive_analysis",label: "Competitive Analysis",  enabled: true,  sortOrder: 8,  aiGenerated: true  },
  { id: "sensitivity",         label: "Sensitivity Analysis",  enabled: true,  sortOrder: 9,  aiGenerated: false },
  { id: "risk_factors",        label: "Risk Factors",          enabled: true,  sortOrder: 10, aiGenerated: true  },
];

export const OFFERING_MEMORANDUM_SECTIONS: SectionConfig[] = [
  { id: "cover",               label: "Cover Page",             enabled: true,  sortOrder: 0,  aiGenerated: false },
  { id: "executive_summary",   label: "Executive Summary",      enabled: true,  sortOrder: 1,  aiGenerated: true  },
  { id: "investment_highlights",label: "Investment Highlights",  enabled: true,  sortOrder: 2,  aiGenerated: true  },
  { id: "property_description", label: "Property Description",  enabled: true,  sortOrder: 3,  aiGenerated: true  },
  { id: "unit_mix_rent_roll",  label: "Unit Mix & Rent Roll",   enabled: true,  sortOrder: 4,  aiGenerated: false },
  { id: "financial_performance",label: "Financial Performance",  enabled: true,  sortOrder: 5,  aiGenerated: false },
  { id: "cash_flow",           label: "Cash Flow Projections",  enabled: true,  sortOrder: 6,  aiGenerated: true  },
  { id: "market_overview",     label: "Market Overview",        enabled: true,  sortOrder: 7,  aiGenerated: true  },
  { id: "sensitivity",         label: "Sensitivity Analysis",   enabled: true,  sortOrder: 8,  aiGenerated: false },
  { id: "vendor_contracts",    label: "Vendor & Contracts",     enabled: true,  sortOrder: 9,  aiGenerated: false },
];

export const BASIS_OF_DESIGN_SECTIONS: SectionConfig[] = [
  { id: "cover",               label: "Cover Page",             enabled: true,  sortOrder: 0,  aiGenerated: false },
  { id: "project_summary",     label: "Project Summary",        enabled: true,  sortOrder: 1,  aiGenerated: false },
  { id: "design_intent",       label: "Design Intent",          enabled: true,  sortOrder: 2,  aiGenerated: true  },
  { id: "performance_reqs",    label: "Performance Requirements",enabled: true, sortOrder: 3,  aiGenerated: true  },
  { id: "systems_equipment",   label: "Systems & Equipment",    enabled: true,  sortOrder: 4,  aiGenerated: true  },
  { id: "materials",           label: "Materials & Specifications",enabled: true,sortOrder: 5,  aiGenerated: false },
  { id: "schedule",            label: "Schedule & Milestones",  enabled: true,  sortOrder: 6,  aiGenerated: false },
  { id: "budget_summary",      label: "Budget Summary",         enabled: true,  sortOrder: 7,  aiGenerated: false },
  { id: "change_orders",       label: "Change Order Log",       enabled: true,  sortOrder: 8,  aiGenerated: false },
  { id: "quality_safety",      label: "Quality & Safety",       enabled: true,  sortOrder: 9,  aiGenerated: false },
];

// ---------------------------------------------------------------------------
// Data interfaces for each report type
// ---------------------------------------------------------------------------

export interface PropertySummary {
  id: string;
  name: string;
  property_type: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  year_built: number | null;
  total_sqft: number | null;
  total_units: number;
  occupied_units: number;
  occupancy_rate: number;
  purchase_price: number | null;
  current_value: number | null;
  monthly_revenue: number;
  monthly_expenses: number;
  noi: number;
}

export interface UnitMixItem {
  unit_type: string;
  count: number;
  avg_sqft: number;
  avg_market_rent: number;
  total_market_rent: number;
  occupied: number;
  vacant: number;
}

export interface LeaseItem {
  id: string;
  unit_number: string;
  tenant_name: string;
  monthly_rent: number;
  lease_start: string;
  lease_end: string;
  status: string;
}

export interface MarketFeasibilityData {
  properties: PropertySummary[];
  unitMix: UnitMixItem[];
  leases: LeaseItem[];
  portfolioComps: PropertySummary[];
  financialSummary: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    totalAR: number;
    totalAP: number;
  };
  generatedAt: string;
}

export interface OfferingMemorandumData {
  properties: PropertySummary[];
  unitMix: UnitMixItem[];
  leases: LeaseItem[];
  financialSummary: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    totalAR: number;
    totalAP: number;
  };
  cashFlowMonths: { month: string; cashIn: number; cashOut: number; net: number }[];
  contracts: {
    id: string;
    contract_number: string;
    contract_type: string;
    party_name: string;
    contract_amount: number;
    status: string;
  }[];
  generatedAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  code: string;
  status: string;
  project_type: string | null;
  address: string;
  city: string | null;
  state: string | null;
  client_name: string | null;
  contract_amount: number;
  estimated_cost: number;
  actual_cost: number;
  completion_pct: number;
  start_date: string | null;
  estimated_end_date: string | null;
  project_manager: string | null;
  superintendent: string | null;
}

export interface BudgetLineItem {
  id: string;
  csi_code: string;
  description: string;
  budgeted_amount: number;
  committed_amount: number;
  actual_amount: number;
  variance: number;
}

export interface ChangeOrderItem {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  status: string;
  schedule_impact_days: number | null;
  created_at: string;
}

export interface SubmittalItem {
  id: string;
  title: string;
  spec_section: string | null;
  status: string;
  submitted_date: string | null;
}

export interface EquipmentItem {
  id: string;
  name: string;
  equipment_type: string;
  make: string | null;
  model: string | null;
  serial_number: string | null;
  status: string;
}

export interface TaskItem {
  id: string;
  name: string;
  phase_name: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  completion_pct: number;
  is_milestone: boolean;
  is_critical_path: boolean;
}

export interface BasisOfDesignData {
  projects: ProjectSummary[];
  budgetLines: BudgetLineItem[];
  changeOrders: ChangeOrderItem[];
  submittals: SubmittalItem[];
  equipment: EquipmentItem[];
  tasks: TaskItem[];
  safetyInspections: {
    id: string;
    inspection_type: string;
    status: string;
    inspection_date: string;
    findings_count: number;
  }[];
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Color themes per report type
// ---------------------------------------------------------------------------

export const REPORT_THEMES = {
  market_feasibility: {
    name: "Navy & Gold",
    primary: "#1B2A4A",
    accent: "#C9A84C",
    light: "#F5F0E8",
    text: "#1B2A4A",
  },
  offering_memorandum: {
    name: "Teal & Silver",
    primary: "#0D3B3E",
    accent: "#A8B5B8",
    light: "#EDF2F3",
    text: "#0D3B3E",
  },
  basis_of_design: {
    name: "Charcoal & Blue",
    primary: "#2D2D3D",
    accent: "#4A90D9",
    light: "#EBF0F7",
    text: "#2D2D3D",
  },
} as const;

// ---------------------------------------------------------------------------
// Report labels
// ---------------------------------------------------------------------------

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  market_feasibility: "Market Feasibility Study",
  offering_memorandum: "Offering Memorandum",
  basis_of_design: "Basis of Design",
};
