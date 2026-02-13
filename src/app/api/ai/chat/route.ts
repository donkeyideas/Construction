import { streamText, tool as aiTool, convertToModelMessages, type UIMessage } from "ai";
import { z } from "zod";

// Wrapper to bypass Zod v4/v3 type compatibility issue with AI SDK
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tool = aiTool as any;
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProviderForTask } from "@/lib/ai/provider-router";

// ---------------------------------------------------------------------------
// POST /api/ai/chat - Streaming chat endpoint with function calling
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages, companyId } = (await req.json()) as {
    messages: UIMessage[];
    companyId: string;
  };

  // Verify the user actually belongs to the company they claim
  if (companyId !== userCompany.companyId) {
    return new Response("Forbidden", { status: 403 });
  }

  // Get the AI provider configured for chat
  const providerResult = await getProviderForTask(supabase, companyId, "chat");

  if (!providerResult) {
    return new Response(
      JSON.stringify({ error: "No AI provider configured for chat" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { model } = providerResult;

  // System prompt scoped to the company context
  const systemPrompt = `You are an AI assistant for ConstructionERP, a construction and real estate management platform.
You help users with project management, financial analysis, property management, and operational questions.
You have access to tools that can query the company's real data. Use them when users ask about specific projects, finances, properties, or operational metrics.
Be concise, professional, and data-driven in your responses. Format numbers as currency where appropriate.
When presenting data from tools, organize it clearly -- use bullet points or numbered lists for multiple items.
If a query returns no results, say so plainly rather than speculating.
The company name is: ${userCompany.companyName}
The user's role is: ${userCompany.role}`;

  // Convert UI messages to model messages for the AI SDK
  const modelMessages = await convertToModelMessages(messages);

  // Stream the response with tool definitions
  let result;
  try {
  result = streamText({
    model,
    system: systemPrompt,
    messages: modelMessages,
    tools: {
      queryProjects: tool({
        description:
          "Search and retrieve project data including status, budget, and schedule information",
        parameters: z.object({
          status: z
            .string()
            .optional()
            .describe(
              "Filter by project status: planning, pre_construction, active, on_hold, completed, closed"
            ),
          search: z
            .string()
            .optional()
            .describe("Search projects by name or code"),
        }),
        execute: async ({ status, search }: { status?: string; search?: string }) => {
          let query = supabase
            .from("projects")
            .select(
              "id, name, code, status, contract_amount, estimated_cost, actual_cost, completion_pct, start_date, end_date"
            )
            .eq("company_id", companyId)
            .order("updated_at", { ascending: false })
            .limit(10);

          if (status) query = query.eq("status", status);
          if (search) query = query.ilike("name", `%${search}%`);

          const { data, error } = await query;
          if (error) {
            console.error("queryProjects error:", error);
            return { error: "Failed to query projects" };
          }
          return data ?? [];
        },
      }),

      queryFinancials: tool({
        description:
          "Get financial summary including invoices, payments, and budget data",
        parameters: z.object({
          type: z
            .string()
            .optional()
            .describe(
              "Filter: 'overdue_invoices', 'recent_payments', 'budget_summary'"
            ),
        }),
        execute: async ({ type }: { type?: string }) => {
          if (type === "overdue_invoices") {
            const { data, error } = await supabase
              .from("invoices")
              .select(
                "id, invoice_number, vendor_name, total_amount, balance_due, due_date, status"
              )
              .eq("company_id", companyId)
              .eq("status", "overdue")
              .order("due_date", { ascending: true })
              .limit(10);

            if (error) {
              console.error("queryFinancials overdue error:", error);
              return { error: "Failed to query overdue invoices" };
            }
            return data ?? [];
          }

          if (type === "recent_payments") {
            const { data, error } = await supabase
              .from("invoices")
              .select(
                "id, invoice_number, vendor_name, total_amount, paid_date, status"
              )
              .eq("company_id", companyId)
              .eq("status", "paid")
              .order("paid_date", { ascending: false })
              .limit(10);

            if (error) {
              console.error("queryFinancials payments error:", error);
              return { error: "Failed to query recent payments" };
            }
            return data ?? [];
          }

          // Default: general financial summary
          const { data: invoices, error } = await supabase
            .from("invoices")
            .select("status, total_amount, balance_due")
            .eq("company_id", companyId);

          if (error) {
            console.error("queryFinancials summary error:", error);
            return { error: "Failed to query financial summary" };
          }

          const rows = invoices ?? [];
          const summary = {
            totalInvoices: rows.length,
            totalAmount: rows.reduce(
              (s, i) => s + Number(i.total_amount ?? 0),
              0
            ),
            totalOutstanding: rows.reduce(
              (s, i) => s + Number(i.balance_due ?? 0),
              0
            ),
            overdueCount: rows.filter((i) => i.status === "overdue").length,
            paidCount: rows.filter((i) => i.status === "paid").length,
            draftCount: rows.filter((i) => i.status === "draft").length,
          };
          return summary;
        },
      }),

      queryProperties: tool({
        description: "Search properties and get portfolio information",
        parameters: z.object({
          search: z
            .string()
            .optional()
            .describe("Search properties by name or address"),
        }),
        execute: async ({ search }: { search?: string }) => {
          let query = supabase
            .from("properties")
            .select(
              "id, name, property_type, address_line1, city, state, total_units, occupied_units, status"
            )
            .eq("company_id", companyId)
            .order("name", { ascending: true })
            .limit(10);

          if (search) query = query.ilike("name", `%${search}%`);

          const { data, error } = await query;
          if (error) {
            console.error("queryProperties error:", error);
            return { error: "Failed to query properties" };
          }
          return data ?? [];
        },
      }),

      queryMaintenanceRequests: tool({
        description: "Get open maintenance requests across properties",
        parameters: z.object({
          priority: z
            .string()
            .optional()
            .describe(
              "Filter by priority: low, medium, high, emergency"
            ),
        }),
        execute: async ({ priority }: { priority?: string }) => {
          let query = supabase
            .from("maintenance_requests")
            .select(
              "id, title, priority, status, property_id, unit_id, created_at"
            )
            .eq("company_id", companyId)
            .in("status", ["open", "in_progress"])
            .order("created_at", { ascending: false })
            .limit(10);

          if (priority) query = query.eq("priority", priority);

          const { data, error } = await query;
          if (error) {
            console.error("queryMaintenanceRequests error:", error);
            return { error: "Failed to query maintenance requests" };
          }
          return data ?? [];
        },
      }),
    },
  });
  } catch (err: unknown) {
    console.error("AI chat streamText error:", err);
    const msg = err instanceof Error ? err.message : "Unknown AI provider error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  return result.toUIMessageStreamResponse();
}
