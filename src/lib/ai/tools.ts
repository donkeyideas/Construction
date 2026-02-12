import { tool as aiTool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

// Wrapper to bypass Zod v4/v3 type compatibility issue with AI SDK
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tool = aiTool as any;

// ---------------------------------------------------------------------------
// AI Function-Calling Tools for the Chat Interface
// ---------------------------------------------------------------------------
// Each tool queries Supabase with the company's data, scoped by companyId.
// These are passed to generateText / streamText via the `tools` option.
// ---------------------------------------------------------------------------

export function createAITools(supabase: SupabaseClient, companyId: string) {
  return {
    // -----------------------------------------------------------------
    // queryProjects - Search and filter projects
    // -----------------------------------------------------------------
    queryProjects: tool({
      description:
        "Search and filter construction projects. Returns project name, status, budget, completion percentage, client, and dates.",
      parameters: z.object({
        search: z
          .string()
          .optional()
          .describe("Search term to match against project name or code"),
        status: z
          .enum([
            "pre_construction",
            "active",
            "on_hold",
            "completed",
            "closed",
          ])
          .optional()
          .describe("Filter by project status"),
        limit: z
          .number()
          .optional()
          .default(10)
          .describe("Maximum number of results to return"),
      }),
      execute: async ({ search, status, limit }: { search?: string; status?: string; limit?: number }) => {
        let query = supabase
          .from("projects")
          .select(
            "id, name, code, status, client_name, contract_amount, estimated_cost, actual_cost, completion_pct, start_date, estimated_end_date"
          )
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(limit ?? 10);

        if (status) {
          query = query.eq("status", status);
        }

        if (search) {
          const term = `%${search}%`;
          query = query.or(`name.ilike.${term},code.ilike.${term}`);
        }

        const { data, error } = await query;

        if (error) {
          return { error: error.message, results: [] };
        }

        return { results: data ?? [] };
      },
    }),

    // -----------------------------------------------------------------
    // queryFinancials - Get financial summaries
    // -----------------------------------------------------------------
    queryFinancials: tool({
      description:
        "Get financial summaries including accounts receivable, accounts payable, invoice totals, and budget information. Can be filtered by project.",
      parameters: z.object({
        projectId: z
          .string()
          .optional()
          .describe("Filter financials to a specific project ID"),
        invoiceType: z
          .enum(["payable", "receivable"])
          .optional()
          .describe("Filter by invoice type"),
        invoiceStatus: z
          .string()
          .optional()
          .describe("Filter by invoice status (draft, sent, paid, overdue)"),
        limit: z
          .number()
          .optional()
          .default(20)
          .describe("Maximum number of invoice results"),
      }),
      execute: async ({ projectId, invoiceType, invoiceStatus, limit }: { projectId?: string; invoiceType?: string; invoiceStatus?: string; limit?: number }) => {
        // Fetch invoices
        let invoiceQuery = supabase
          .from("invoices")
          .select(
            "id, invoice_number, invoice_type, vendor_name, client_name, total_amount, amount_paid, balance_due, status, due_date"
          )
          .eq("company_id", companyId)
          .order("due_date", { ascending: false })
          .limit(limit ?? 20);

        if (projectId) {
          invoiceQuery = invoiceQuery.eq("project_id", projectId);
        }
        if (invoiceType) {
          invoiceQuery = invoiceQuery.eq("invoice_type", invoiceType);
        }
        if (invoiceStatus) {
          invoiceQuery = invoiceQuery.eq("status", invoiceStatus);
        }

        const { data: invoices, error: invErr } = await invoiceQuery;

        if (invErr) {
          return { error: invErr.message, invoices: [], summary: null };
        }

        const rows = invoices ?? [];

        // Calculate summary
        const totalAR = rows
          .filter((i) => i.invoice_type === "receivable")
          .reduce((sum: number, i) => sum + (i.balance_due ?? 0), 0);

        const totalAP = rows
          .filter((i) => i.invoice_type === "payable")
          .reduce((sum: number, i) => sum + (i.balance_due ?? 0), 0);

        return {
          invoices: rows,
          summary: {
            total_accounts_receivable: totalAR,
            total_accounts_payable: totalAP,
            invoice_count: rows.length,
          },
        };
      },
    }),

    // -----------------------------------------------------------------
    // queryOverdueItems - Find overdue invoices, expiring certs, etc.
    // -----------------------------------------------------------------
    queryOverdueItems: tool({
      description:
        "Find overdue items across the system: overdue invoices, expiring certifications, late project tasks. Returns categorized results.",
      parameters: z.object({
        category: z
          .enum(["invoices", "certifications", "tasks", "all"])
          .optional()
          .default("all")
          .describe("Category of overdue items to query"),
        limit: z
          .number()
          .optional()
          .default(20)
          .describe("Maximum results per category"),
      }),
      execute: async ({ category, limit }: { category?: string; limit?: number }) => {
        const now = new Date().toISOString();
        const results: Record<string, unknown[]> = {};

        // Overdue invoices
        if (category === "all" || category === "invoices") {
          const { data: overdueInvoices } = await supabase
            .from("invoices")
            .select(
              "id, invoice_number, invoice_type, vendor_name, client_name, total_amount, balance_due, due_date, status"
            )
            .eq("company_id", companyId)
            .lt("due_date", now)
            .in("status", ["sent", "draft", "submitted"])
            .gt("balance_due", 0)
            .order("due_date", { ascending: true })
            .limit(limit ?? 20);

          results.overdue_invoices = overdueInvoices ?? [];
        }

        // Expiring certifications
        if (category === "all" || category === "certifications") {
          const thirtyDaysFromNow = new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString();

          const { data: expiringCerts } = await supabase
            .from("certifications")
            .select(
              "id, cert_type, cert_number, holder_name, expiration_date, status"
            )
            .eq("company_id", companyId)
            .lt("expiration_date", thirtyDaysFromNow)
            .order("expiration_date", { ascending: true })
            .limit(limit ?? 20);

          results.expiring_certifications = expiringCerts ?? [];
        }

        // Overdue tasks
        if (category === "all" || category === "tasks") {
          const { data: overdueTasks } = await supabase
            .from("project_tasks")
            .select(
              "id, name, status, priority, end_date, project_id, completion_pct"
            )
            .eq("company_id", companyId)
            .lt("end_date", now)
            .neq("status", "completed")
            .order("end_date", { ascending: true })
            .limit(limit ?? 20);

          results.overdue_tasks = overdueTasks ?? [];
        }

        return results;
      },
    }),

    // -----------------------------------------------------------------
    // queryDocuments - Search documents
    // -----------------------------------------------------------------
    queryDocuments: tool({
      description:
        "Search the document library by name, category, project, or tags. Returns document metadata.",
      parameters: z.object({
        search: z
          .string()
          .optional()
          .describe("Search term for document name"),
        category: z
          .enum(["plan", "spec", "contract", "photo", "report", "correspondence"])
          .optional()
          .describe("Document category filter"),
        projectId: z
          .string()
          .optional()
          .describe("Filter documents by project ID"),
        limit: z
          .number()
          .optional()
          .default(15)
          .describe("Maximum number of results"),
      }),
      execute: async ({ search, category, projectId, limit }: { search?: string; category?: string; projectId?: string; limit?: number }) => {
        let query = supabase
          .from("documents")
          .select(
            "id, name, file_type, file_size, category, folder_path, tags, created_at, project_id"
          )
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(limit ?? 15);

        if (search) {
          const term = `%${search}%`;
          query = query.ilike("name", term);
        }
        if (category) {
          query = query.eq("category", category);
        }
        if (projectId) {
          query = query.eq("project_id", projectId);
        }

        const { data, error } = await query;

        if (error) {
          return { error: error.message, results: [] };
        }

        return { results: data ?? [] };
      },
    }),

    // -----------------------------------------------------------------
    // queryProperties - Search properties and units
    // -----------------------------------------------------------------
    queryProperties: tool({
      description:
        "Search properties in the portfolio. Returns property details including occupancy, financials, and unit counts.",
      parameters: z.object({
        search: z
          .string()
          .optional()
          .describe("Search term for property name or address"),
        propertyType: z
          .enum(["residential", "commercial", "industrial", "mixed_use"])
          .optional()
          .describe("Property type filter"),
        limit: z
          .number()
          .optional()
          .default(10)
          .describe("Maximum number of results"),
      }),
      execute: async ({ search, propertyType, limit }: { search?: string; propertyType?: string; limit?: number }) => {
        let query = supabase
          .from("properties")
          .select(
            "id, name, property_type, address_line1, city, state, zip, total_units, occupied_units, occupancy_rate, monthly_revenue, monthly_expenses, noi, current_value"
          )
          .eq("company_id", companyId)
          .order("name", { ascending: true })
          .limit(limit ?? 10);

        if (search) {
          const term = `%${search}%`;
          query = query.or(
            `name.ilike.${term},address_line1.ilike.${term},city.ilike.${term}`
          );
        }
        if (propertyType) {
          query = query.eq("property_type", propertyType);
        }

        const { data, error } = await query;

        if (error) {
          return { error: error.message, results: [] };
        }

        return { results: data ?? [] };
      },
    }),
  };
}
