import {
  BookOpen,
  Landmark,
  Building2,
  Users,
  Truck,
  Layers,
  ListChecks,
  BarChart3,
  ShieldCheck,
  Briefcase,
  FolderOpen,
  Calendar,
  FileText,
  ClipboardList,
  HardHat,
  Clock,
  Wrench,
  Receipt,
} from "lucide-react";
import type { ImportColumn } from "@/lib/utils/csv-parser";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EntityDef {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  columns: ImportColumn[];
  sampleData?: Record<string, string>[];
  dependencies?: string;
  requiresProject?: boolean;
}

export interface PhaseDef {
  number: number;
  title: string;
  description: string;
  entities: EntityDef[];
}

// ---------------------------------------------------------------------------
// All 28 entities across 9 phases, matching DEPENDENCY_ORDER in xlsx-parser.ts
// ---------------------------------------------------------------------------

export const IMPORT_PHASES: PhaseDef[] = [
  // ── Phase 1: Financial Foundation ──────────────────────────────────────
  {
    number: 1,
    title: "Financial Foundation",
    description: "Chart of accounts and bank accounts must be imported first",
    entities: [
      {
        key: "chart_of_accounts",
        label: "Chart of Accounts",
        icon: BookOpen,
        color: "var(--color-blue)",
        columns: [
          { key: "account_number", label: "Account Number", required: true },
          { key: "name", label: "Account Name", required: true },
          { key: "account_type", label: "Account Type", required: true },
          { key: "sub_type", label: "Sub Type", required: false },
          { key: "description", label: "Description", required: false },
        ],
        sampleData: [
          { account_number: "1000", name: "Cash", account_type: "asset", sub_type: "current_asset", description: "Operating cash" },
        ],
      },
      {
        key: "bank_accounts",
        label: "Bank Accounts",
        icon: Landmark,
        color: "var(--color-green)",
        columns: [
          { key: "name", label: "Account Name", required: true },
          { key: "bank_name", label: "Bank Name", required: true },
          { key: "account_type", label: "Account Type", required: false },
          { key: "account_number_last4", label: "Last 4 (Account)", required: false },
          { key: "routing_number_last4", label: "Last 4 (Routing)", required: false },
          { key: "current_balance", label: "Current Balance", required: false, type: "number" as const },
        ],
        sampleData: [
          { name: "Operating Account", bank_name: "Chase", account_type: "checking", current_balance: "250000" },
        ],
      },
    ],
  },

  // ── Phase 2: Master Data ───────────────────────────────────────────────
  {
    number: 2,
    title: "Master Data",
    description: "Properties, projects, contacts, vendors, and equipment",
    entities: [
      {
        key: "properties",
        label: "Properties",
        icon: Building2,
        color: "var(--color-blue)",
        columns: [
          { key: "name", label: "Property Name", required: true },
          { key: "property_type", label: "Type", required: false },
          { key: "address_line1", label: "Address", required: false },
          { key: "city", label: "City", required: false },
          { key: "state", label: "State", required: false },
          { key: "zip", label: "ZIP", required: false },
          { key: "year_built", label: "Year Built", required: false, type: "number" as const },
          { key: "total_sqft", label: "Total Sq Ft", required: false, type: "number" as const },
          { key: "total_units", label: "Total Units", required: false, type: "number" as const },
          { key: "purchase_price", label: "Purchase Price ($)", required: false, type: "number" as const },
          { key: "current_value", label: "Current Value ($)", required: false, type: "number" as const },
        ],
      },
      {
        key: "projects",
        label: "Projects",
        icon: Building2,
        color: "var(--color-amber)",
        columns: [
          { key: "name", label: "Project Name", required: true },
          { key: "code", label: "Project Code", required: false },
          { key: "status", label: "Status", required: false },
          { key: "project_type", label: "Project Type", required: false },
          { key: "address", label: "Address", required: false },
          { key: "city", label: "City", required: false },
          { key: "state", label: "State", required: false },
          { key: "zip", label: "ZIP", required: false },
          { key: "client_name", label: "Client Name", required: false },
          { key: "client_email", label: "Client Email", required: false },
          { key: "client_phone", label: "Client Phone", required: false },
          { key: "budget", label: "Budget ($)", required: false, type: "number" as const },
          { key: "estimated_cost", label: "Estimated Cost ($)", required: false, type: "number" as const },
          { key: "start_date", label: "Start Date", required: false, type: "date" as const },
          { key: "end_date", label: "End Date", required: false, type: "date" as const },
          { key: "description", label: "Description", required: false },
          { key: "completion_pct", label: "Completion %", required: false, type: "number" as const },
        ],
        sampleData: [
          { name: "Downtown Office Tower", code: "DOT-2025", status: "active", project_type: "commercial", budget: "5000000" },
        ],
      },
      {
        key: "contacts",
        label: "Contacts",
        icon: Users,
        color: "var(--color-blue)",
        columns: [
          { key: "first_name", label: "First Name", required: true },
          { key: "last_name", label: "Last Name", required: true },
          { key: "contact_type", label: "Type", required: false },
          { key: "email", label: "Email", required: false, type: "email" as const },
          { key: "phone", label: "Phone", required: false },
          { key: "company_name", label: "Company", required: false },
          { key: "job_title", label: "Job Title", required: false },
        ],
      },
      {
        key: "vendors",
        label: "Vendors",
        icon: Users,
        color: "var(--color-purple, #7c3aed)",
        columns: [
          { key: "company_name", label: "Company Name", required: true },
          { key: "first_name", label: "Contact First Name", required: false },
          { key: "last_name", label: "Contact Last Name", required: false },
          { key: "email", label: "Email", required: false, type: "email" as const },
          { key: "phone", label: "Phone", required: false },
          { key: "job_title", label: "Job Title", required: false },
        ],
      },
      {
        key: "equipment",
        label: "Equipment",
        icon: Truck,
        color: "var(--color-amber)",
        columns: [
          { key: "name", label: "Name", required: true },
          { key: "equipment_type", label: "Type", required: true },
          { key: "make", label: "Make", required: false },
          { key: "model", label: "Model", required: false },
          { key: "serial_number", label: "Serial Number", required: false },
          { key: "purchase_cost", label: "Purchase Cost", required: false, type: "number" as const },
          { key: "hourly_rate", label: "Hourly Rate", required: false, type: "number" as const },
          { key: "purchase_date", label: "Purchase Date", required: false, type: "date" as const },
        ],
      },
    ],
  },

  // ── Phase 3: Project Structure ─────────────────────────────────────────
  {
    number: 3,
    title: "Project Structure",
    description: "Phases, tasks, and budget lines for your projects",
    entities: [
      {
        key: "phases",
        label: "Phases",
        icon: Layers,
        color: "var(--color-green)",
        dependencies: "Requires: Projects",
        requiresProject: true,
        columns: [
          { key: "name", label: "Phase Name", required: true },
          { key: "color", label: "Color (hex)", required: false },
          { key: "start_date", label: "Start Date", required: false, type: "date" as const },
          { key: "end_date", label: "End Date", required: false, type: "date" as const },
          { key: "project_name", label: "Project Name", required: false },
        ],
      },
      {
        key: "tasks",
        label: "Tasks",
        icon: ListChecks,
        color: "var(--color-blue)",
        dependencies: "Requires: Projects, Phases",
        requiresProject: true,
        columns: [
          { key: "name", label: "Task Name", required: true },
          { key: "phase_name", label: "Phase Name", required: false },
          { key: "priority", label: "Priority", required: false },
          { key: "start_date", label: "Start Date", required: false, type: "date" as const },
          { key: "end_date", label: "End Date", required: false, type: "date" as const },
          { key: "completion_pct", label: "Completion %", required: false, type: "number" as const },
          { key: "is_milestone", label: "Milestone (true/false)", required: false },
          { key: "is_critical_path", label: "Critical Path (true/false)", required: false },
          { key: "project_name", label: "Project Name", required: false },
        ],
      },
      {
        key: "project_budget_lines",
        label: "Budget Lines",
        icon: BarChart3,
        color: "var(--color-green)",
        dependencies: "Requires: Projects",
        requiresProject: true,
        columns: [
          { key: "csi_code", label: "CSI Code", required: true },
          { key: "description", label: "Description", required: true },
          { key: "budgeted_amount", label: "Budgeted Amount", required: false, type: "number" as const },
          { key: "committed_amount", label: "Committed Amount", required: false, type: "number" as const },
          { key: "actual_amount", label: "Actual Amount", required: false, type: "number" as const },
        ],
      },
    ],
  },

  // ── Phase 4: CRM & Sales ───────────────────────────────────────────────
  {
    number: 4,
    title: "CRM & Sales",
    description: "Certifications, opportunities, bids, and contracts",
    entities: [
      {
        key: "certifications",
        label: "Certifications",
        icon: ShieldCheck,
        color: "var(--color-blue)",
        dependencies: "Requires: Contacts",
        columns: [
          { key: "cert_name", label: "Certification Name", required: true },
          { key: "cert_type", label: "Type", required: false },
          { key: "issuing_authority", label: "Issuing Authority", required: false },
          { key: "cert_number", label: "Cert Number", required: false },
          { key: "issued_date", label: "Issued Date", required: false, type: "date" as const },
          { key: "expiry_date", label: "Expiry Date", required: false, type: "date" as const },
          { key: "contact_name", label: "Contact Name", required: false },
        ],
      },
      {
        key: "opportunities",
        label: "Opportunities",
        icon: Briefcase,
        color: "var(--color-amber)",
        columns: [
          { key: "name", label: "Name", required: true },
          { key: "client_name", label: "Client Name", required: false },
          { key: "stage", label: "Stage", required: false },
          { key: "estimated_value", label: "Estimated Value ($)", required: false, type: "number" as const },
          { key: "probability_pct", label: "Probability %", required: false, type: "number" as const },
          { key: "expected_close_date", label: "Expected Close Date", required: false, type: "date" as const },
          { key: "source", label: "Source", required: false },
        ],
      },
      {
        key: "bids",
        label: "Bids",
        icon: FolderOpen,
        color: "var(--color-green)",
        columns: [
          { key: "project_name", label: "Project Name", required: true },
          { key: "client_name", label: "Client Name", required: false },
          { key: "bid_amount", label: "Bid Amount ($)", required: false, type: "number" as const },
          { key: "due_date", label: "Due Date", required: false, type: "date" as const },
          { key: "bid_type", label: "Bid Type", required: false },
          { key: "notes", label: "Notes", required: false },
        ],
      },
      {
        key: "contracts",
        label: "Contracts",
        icon: Briefcase,
        color: "var(--color-blue)",
        dependencies: "Requires: Projects (optional)",
        columns: [
          { key: "title", label: "Title", required: true },
          { key: "contract_type", label: "Type", required: false },
          { key: "party_name", label: "Party Name", required: false },
          { key: "party_email", label: "Party Email", required: false, type: "email" as const },
          { key: "contract_amount", label: "Amount ($)", required: false, type: "number" as const },
          { key: "start_date", label: "Start Date", required: false, type: "date" as const },
          { key: "end_date", label: "End Date", required: false, type: "date" as const },
          { key: "payment_terms", label: "Payment Terms", required: false },
        ],
      },
    ],
  },

  // ── Phase 5: Field Operations ──────────────────────────────────────────
  {
    number: 5,
    title: "Field Operations",
    description: "Daily logs, RFIs, change orders, and submittals",
    entities: [
      {
        key: "daily_logs",
        label: "Daily Logs",
        icon: Calendar,
        color: "var(--color-blue)",
        dependencies: "Requires: Projects",
        requiresProject: true,
        columns: [
          { key: "log_date", label: "Log Date", required: true, type: "date" as const },
          { key: "weather_conditions", label: "Weather", required: false },
          { key: "temperature", label: "Temperature (F)", required: false, type: "number" as const },
          { key: "work_performed", label: "Work Performed", required: false },
          { key: "safety_incidents", label: "Safety Incidents", required: false },
          { key: "delays", label: "Delays", required: false },
          { key: "project_name", label: "Project Name", required: false },
        ],
      },
      {
        key: "rfis",
        label: "RFIs",
        icon: FileText,
        color: "var(--color-amber)",
        dependencies: "Requires: Projects",
        requiresProject: true,
        columns: [
          { key: "subject", label: "Subject", required: true },
          { key: "question", label: "Question", required: true },
          { key: "priority", label: "Priority", required: false },
          { key: "due_date", label: "Due Date", required: false, type: "date" as const },
          { key: "project_name", label: "Project Name", required: false },
        ],
      },
      {
        key: "change_orders",
        label: "Change Orders",
        icon: ClipboardList,
        color: "var(--color-amber)",
        dependencies: "Requires: Projects",
        requiresProject: true,
        columns: [
          { key: "title", label: "Title", required: true },
          { key: "description", label: "Description", required: false },
          { key: "reason", label: "Reason", required: false },
          { key: "amount", label: "Amount ($)", required: false, type: "number" as const },
          { key: "schedule_impact_days", label: "Schedule Impact (days)", required: false, type: "number" as const },
          { key: "project_name", label: "Project Name", required: false },
        ],
      },
      {
        key: "submittals",
        label: "Submittals",
        icon: FileText,
        color: "var(--color-blue)",
        dependencies: "Requires: Projects",
        requiresProject: true,
        columns: [
          { key: "title", label: "Title", required: true },
          { key: "project_name", label: "Project Name", required: false },
          { key: "spec_section", label: "Spec Section", required: false },
          { key: "due_date", label: "Due Date", required: false, type: "date" as const },
        ],
      },
    ],
  },

  // ── Phase 6: Safety ────────────────────────────────────────────────────
  {
    number: 6,
    title: "Safety",
    description: "Incidents, inspections, and toolbox talks",
    entities: [
      {
        key: "safety_incidents",
        label: "Safety Incidents",
        icon: ShieldCheck,
        color: "var(--color-red)",
        dependencies: "Requires: Projects (optional)",
        requiresProject: true,
        columns: [
          { key: "title", label: "Title", required: true },
          { key: "description", label: "Description", required: false },
          { key: "incident_type", label: "Incident Type", required: false },
          { key: "severity", label: "Severity", required: false },
          { key: "incident_date", label: "Incident Date", required: false, type: "date" as const },
          { key: "location", label: "Location", required: false },
          { key: "osha_recordable", label: "OSHA Recordable", required: false },
          { key: "project_name", label: "Project Name", required: false },
        ],
      },
      {
        key: "safety_inspections",
        label: "Safety Inspections",
        icon: HardHat,
        color: "var(--color-amber)",
        dependencies: "Requires: Projects (optional)",
        requiresProject: true,
        columns: [
          { key: "inspection_type", label: "Inspection Type", required: true },
          { key: "inspection_date", label: "Inspection Date", required: false, type: "date" as const },
          { key: "score", label: "Score", required: false, type: "number" as const },
          { key: "findings", label: "Findings", required: false },
          { key: "corrective_actions", label: "Corrective Actions", required: false },
          { key: "status", label: "Status", required: false },
          { key: "project_name", label: "Project Name", required: false },
        ],
      },
      {
        key: "toolbox_talks",
        label: "Toolbox Talks",
        icon: HardHat,
        color: "var(--color-green)",
        dependencies: "Requires: Projects (optional)",
        requiresProject: true,
        columns: [
          { key: "title", label: "Title", required: true },
          { key: "description", label: "Description", required: false },
          { key: "topic", label: "Topic", required: false },
          { key: "scheduled_date", label: "Scheduled Date", required: false, type: "date" as const },
          { key: "attendees_count", label: "Attendees Count", required: false, type: "number" as const },
          { key: "notes", label: "Notes", required: false },
          { key: "project_name", label: "Project Name", required: false },
        ],
      },
    ],
  },

  // ── Phase 7: Labor & Equipment ─────────────────────────────────────────
  {
    number: 7,
    title: "Labor & Equipment",
    description: "Time entries, equipment assignments, and maintenance",
    entities: [
      {
        key: "time_entries",
        label: "Time Entries",
        icon: Clock,
        color: "var(--color-blue)",
        dependencies: "Requires: Projects",
        requiresProject: true,
        columns: [
          { key: "entry_date", label: "Date", required: true, type: "date" as const },
          { key: "hours", label: "Hours", required: true, type: "number" as const },
          { key: "overtime_hours", label: "Overtime Hours", required: false, type: "number" as const },
          { key: "description", label: "Description", required: false },
          { key: "cost_code", label: "Cost Code", required: false },
        ],
      },
      {
        key: "equipment_assignments",
        label: "Equipment Assignments",
        icon: Truck,
        color: "var(--color-amber)",
        dependencies: "Requires: Equipment, Projects",
        requiresProject: true,
        columns: [
          { key: "equipment_name", label: "Equipment Name", required: true },
          { key: "project_name", label: "Project Name", required: false },
          { key: "assigned_to", label: "Assigned To", required: false },
          { key: "assigned_date", label: "Assigned Date", required: true, type: "date" as const },
          { key: "return_date", label: "Return Date", required: false, type: "date" as const },
          { key: "notes", label: "Notes", required: false },
          { key: "status", label: "Status", required: false },
        ],
      },
      {
        key: "equipment_maintenance",
        label: "Equipment Maintenance",
        icon: Wrench,
        color: "var(--color-blue)",
        dependencies: "Requires: Equipment",
        columns: [
          { key: "equipment_name", label: "Equipment Name", required: true },
          { key: "title", label: "Title", required: true },
          { key: "maintenance_type", label: "Type", required: false },
          { key: "description", label: "Description", required: false },
          { key: "maintenance_date", label: "Date", required: false, type: "date" as const },
          { key: "cost", label: "Cost ($)", required: false, type: "number" as const },
          { key: "performed_by", label: "Performed By", required: false },
          { key: "vendor_name", label: "Vendor", required: false },
          { key: "next_due_date", label: "Next Due Date", required: false, type: "date" as const },
        ],
      },
    ],
  },

  // ── Phase 8: Financial Records ─────────────────────────────────────────
  {
    number: 8,
    title: "Financial Records",
    description: "Invoices and journal entries (import after all other data)",
    entities: [
      {
        key: "invoices",
        label: "Invoices",
        icon: Receipt,
        color: "var(--color-green)",
        dependencies: "Requires: Chart of Accounts, Projects (optional)",
        columns: [
          { key: "invoice_type", label: "Type (payable/receivable)", required: false },
          { key: "amount", label: "Amount ($)", required: true, type: "number" as const },
          { key: "tax_amount", label: "Tax Amount ($)", required: false, type: "number" as const },
          { key: "due_date", label: "Due Date", required: false, type: "date" as const },
          { key: "description", label: "Description", required: false },
          { key: "status", label: "Status", required: false },
          { key: "vendor_name", label: "Vendor Name", required: false },
          { key: "client_name", label: "Client Name", required: false },
          { key: "project_name", label: "Project Name", required: false },
        ],
      },
      {
        key: "journal_entries",
        label: "Journal Entries",
        icon: BookOpen,
        color: "var(--color-green)",
        dependencies: "Requires: Chart of Accounts",
        columns: [
          { key: "entry_number", label: "Entry Number", required: true },
          { key: "entry_date", label: "Entry Date (YYYY-MM-DD)", required: true },
          { key: "description", label: "Description", required: true },
          { key: "reference", label: "Reference", required: false },
          { key: "account_number", label: "Account Number", required: true },
          { key: "debit", label: "Debit", required: false, type: "number" as const },
          { key: "credit", label: "Credit", required: false, type: "number" as const },
          { key: "line_description", label: "Line Description", required: false },
        ],
      },
    ],
  },

  // ── Phase 9: Property Management ───────────────────────────────────────
  {
    number: 9,
    title: "Property Management",
    description: "Leases and property maintenance requests",
    entities: [
      {
        key: "leases",
        label: "Leases",
        icon: FileText,
        color: "var(--color-green)",
        dependencies: "Requires: Properties",
        columns: [
          { key: "tenant_name", label: "Tenant Name", required: true },
          { key: "property_name", label: "Property Name", required: false },
          { key: "tenant_email", label: "Tenant Email", required: false, type: "email" as const },
          { key: "tenant_phone", label: "Tenant Phone", required: false },
          { key: "monthly_rent", label: "Monthly Rent ($)", required: false, type: "number" as const },
          { key: "security_deposit", label: "Security Deposit ($)", required: false, type: "number" as const },
          { key: "lease_start", label: "Lease Start", required: false, type: "date" as const },
          { key: "lease_end", label: "Lease End", required: false, type: "date" as const },
        ],
      },
      {
        key: "maintenance",
        label: "Property Maintenance",
        icon: Wrench,
        color: "var(--color-amber)",
        dependencies: "Requires: Properties",
        columns: [
          { key: "title", label: "Title", required: true },
          { key: "property_name", label: "Property Name", required: false },
          { key: "description", label: "Description", required: false },
          { key: "priority", label: "Priority", required: false },
          { key: "category", label: "Category", required: false },
          { key: "scheduled_date", label: "Scheduled Date", required: false, type: "date" as const },
          { key: "estimated_cost", label: "Estimated Cost ($)", required: false, type: "number" as const },
        ],
      },
    ],
  },
];
