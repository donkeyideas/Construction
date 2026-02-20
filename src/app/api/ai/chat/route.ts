import {
  streamText,
  jsonSchema,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProviderForTask } from "@/lib/ai/provider-router";
import { logAIUsage } from "@/lib/queries/ai";

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

  const { model, config: providerConfig } = providerResult;

  const today = new Date().toISOString().slice(0, 10);

  // Rich system prompt with formatting + analysis instructions
  const systemPrompt = `You are the AI assistant for Buildwrk, a comprehensive construction and real estate management platform. You serve as an expert analyst for **${userCompany.companyName}**.

Today's date: ${today}
User role: ${userCompany.role}

## YOUR CAPABILITIES
You have real-time access to the company's data through tools. You MUST call the appropriate tool(s) BEFORE answering any data question. Never guess or say "I'll check" without actually calling a tool.

## AVAILABLE TOOLS
- **queryProjects** — Project data: status, budget, schedule, completion %, cost variance
- **queryFinancials** — Invoices, payments, AR/AP aging, financial summary
- **queryProperties** — Property portfolio: occupancy, revenue, NOI, units
- **queryMaintenanceRequests** — Open maintenance with priority breakdown
- **querySafetyData** — Safety incidents and toolbox talks
- **queryLeases** — Lease data with expiration tracking
- **queryEquipment** — Equipment inventory, utilization, maintenance schedules
- **queryWorkforce** — Team members, roles, and certifications

## RESPONSE FORMAT
Structure every data response with clear sections. Use markdown formatting:

1. **Summary Statement** — Start with a 1-2 sentence executive summary
2. **Key Metrics** — Present the most important numbers in a clear format. Use tables for multi-row data.
3. **Analysis** — Explain what the data means. Identify trends, risks, or opportunities.
4. **Recommendations** — Provide 2-3 actionable next steps based on the data. Use a numbered list.

### Formatting Rules
- Format all dollar amounts as currency ($1,234,567)
- Format percentages to 1 decimal (85.3%)
- Use **bold** for key metrics and important callouts
- Use tables (markdown) for structured multi-row comparisons
- Use bullet points for lists of items
- Use > blockquotes for important warnings or alerts
- When showing budget variance, always indicate if over or under budget
- For dates, use readable format (Jan 15, 2026)

### Analysis Style
- Be analytical, not just descriptive. Don't just list data—interpret it.
- Flag risks proactively: over-budget projects, overdue invoices, expiring leases, low occupancy
- Compare metrics to benchmarks when relevant (e.g., occupancy > 90% is healthy)
- Quantify impact: "This represents a $45,000 cost overrun (12% over budget)"
- When multiple tools are relevant, call them all to give a comprehensive answer

## IMPORTANT
- Always call tools to get real data. Never fabricate numbers.
- If a query returns empty results, say so clearly and suggest what the user could do.
- Be concise but thorough. Skip pleasantries and get to insights.
- You work for a construction and real estate company — use industry-appropriate language.`;

  // Convert UI messages to model messages for the AI SDK
  const modelMessages = await convertToModelMessages(messages);

  // Stream the response with tool definitions
  let result;
  try {
    result = streamText({
      model,
      system: systemPrompt,
      messages: modelMessages,
      stopWhen: stepCountIs(5),
      toolChoice: "auto",
      tools: {
        // ---------------------------------------------------------------
        // Projects
        // ---------------------------------------------------------------
        queryProjects: {
          description:
            "Search and retrieve project data including status, budget, schedule, completion, and cost variance",
          inputSchema: jsonSchema<{ status?: string; search?: string }>({
            type: "object",
            properties: {
              status: {
                type: "string",
                description:
                  "Filter by project status: planning, pre_construction, active, on_hold, completed, closed",
              },
              search: {
                type: "string",
                description: "Search projects by name or code",
              },
            },
          }),
          execute: async ({
            status,
            search,
          }: {
            status?: string;
            search?: string;
          }) => {
            let query = supabase
              .from("projects")
              .select(
                "id, name, code, status, project_type, contract_amount, estimated_cost, actual_cost, completion_pct, start_date, estimated_end_date, actual_end_date, client_name, city, state"
              )
              .eq("company_id", companyId)
              .order("updated_at", { ascending: false })
              .limit(20);

            if (status) query = query.eq("status", status);
            if (search) query = query.ilike("name", `%${search}%`);

            const { data, error } = await query;
            if (error) {
              console.error("queryProjects error:", error);
              return { error: "Failed to query projects" };
            }

            const projects = data ?? [];
            // Compute summary stats
            const totalContract = projects.reduce(
              (s, p) => s + Number(p.contract_amount ?? 0),
              0
            );
            const totalEstimated = projects.reduce(
              (s, p) => s + Number(p.estimated_cost ?? 0),
              0
            );
            const totalActual = projects.reduce(
              (s, p) => s + Number(p.actual_cost ?? 0),
              0
            );
            const avgCompletion =
              projects.length > 0
                ? projects.reduce(
                    (s, p) => s + Number(p.completion_pct ?? 0),
                    0
                  ) / projects.length
                : 0;
            const overBudgetCount = projects.filter(
              (p) => Number(p.actual_cost ?? 0) > Number(p.estimated_cost ?? 0)
            ).length;

            return {
              projects,
              summary: {
                count: projects.length,
                totalContractValue: totalContract,
                totalEstimatedCost: totalEstimated,
                totalActualCost: totalActual,
                totalVariance: totalEstimated - totalActual,
                averageCompletion: Math.round(avgCompletion * 10) / 10,
                overBudgetCount,
              },
            };
          },
        },

        // ---------------------------------------------------------------
        // Financials
        // ---------------------------------------------------------------
        queryFinancials: {
          description:
            "Get financial data including invoices, payments, AR/AP aging, and budget summaries",
          inputSchema: jsonSchema<{ type?: string }>({
            type: "object",
            properties: {
              type: {
                type: "string",
                description:
                  "Filter: 'overdue_invoices', 'recent_payments', 'receivables', 'payables', or omit for full summary",
              },
            },
          }),
          execute: async ({ type }: { type?: string }) => {
            if (type === "overdue_invoices") {
              const { data, error } = await supabase
                .from("invoices")
                .select(
                  "id, invoice_number, client_name, vendor_name, total_amount, balance_due, due_date, status, invoice_type"
                )
                .eq("company_id", companyId)
                .eq("status", "overdue")
                .order("due_date", { ascending: true })
                .limit(20);

              if (error)
                return { error: "Failed to query overdue invoices" };

              const invoices = data ?? [];
              const totalOverdue = invoices.reduce(
                (s, i) => s + Number(i.balance_due ?? 0),
                0
              );
              return {
                invoices,
                summary: {
                  count: invoices.length,
                  totalOverdueAmount: totalOverdue,
                },
              };
            }

            if (type === "recent_payments") {
              const { data, error } = await supabase
                .from("invoices")
                .select(
                  "id, invoice_number, client_name, vendor_name, total_amount, paid_date, status, invoice_type"
                )
                .eq("company_id", companyId)
                .eq("status", "paid")
                .order("paid_date", { ascending: false })
                .limit(20);

              if (error)
                return { error: "Failed to query recent payments" };
              return { invoices: data ?? [], count: (data ?? []).length };
            }

            if (type === "receivables") {
              const { data, error } = await supabase
                .from("invoices")
                .select(
                  "id, invoice_number, client_name, total_amount, balance_due, due_date, status"
                )
                .eq("company_id", companyId)
                .eq("invoice_type", "receivable")
                .in("status", ["sent", "overdue", "partial"])
                .order("due_date", { ascending: true })
                .limit(20);

              if (error)
                return { error: "Failed to query receivables" };

              const rows = data ?? [];
              const totalAR = rows.reduce(
                (s, i) => s + Number(i.balance_due ?? 0),
                0
              );
              return {
                invoices: rows,
                summary: { count: rows.length, totalOutstanding: totalAR },
              };
            }

            if (type === "payables") {
              const { data, error } = await supabase
                .from("invoices")
                .select(
                  "id, invoice_number, vendor_name, total_amount, balance_due, due_date, status"
                )
                .eq("company_id", companyId)
                .eq("invoice_type", "payable")
                .in("status", ["sent", "overdue", "partial"])
                .order("due_date", { ascending: true })
                .limit(20);

              if (error) return { error: "Failed to query payables" };

              const rows = data ?? [];
              const totalAP = rows.reduce(
                (s, i) => s + Number(i.balance_due ?? 0),
                0
              );
              return {
                invoices: rows,
                summary: { count: rows.length, totalOutstanding: totalAP },
              };
            }

            // Default: comprehensive financial summary
            const { data: invoices, error } = await supabase
              .from("invoices")
              .select(
                "status, total_amount, balance_due, invoice_type"
              )
              .eq("company_id", companyId);

            if (error)
              return { error: "Failed to query financial summary" };

            const rows = invoices ?? [];
            const receivables = rows.filter(
              (i) => i.invoice_type === "receivable"
            );
            const payables = rows.filter(
              (i) => i.invoice_type === "payable"
            );

            const arOutstanding = receivables
              .filter((i) => ["sent", "overdue", "partial"].includes(i.status))
              .reduce((s, i) => s + Number(i.balance_due ?? 0), 0);
            const apOutstanding = payables
              .filter((i) => ["sent", "overdue", "partial"].includes(i.status))
              .reduce((s, i) => s + Number(i.balance_due ?? 0), 0);

            return {
              summary: {
                totalInvoices: rows.length,
                totalAmount: rows.reduce(
                  (s, i) => s + Number(i.total_amount ?? 0),
                  0
                ),
                totalOutstanding: rows.reduce(
                  (s, i) => s + Number(i.balance_due ?? 0),
                  0
                ),
                accountsReceivable: arOutstanding,
                accountsPayable: apOutstanding,
                netPosition: arOutstanding - apOutstanding,
                overdueCount: rows.filter((i) => i.status === "overdue")
                  .length,
                paidCount: rows.filter((i) => i.status === "paid").length,
                draftCount: rows.filter((i) => i.status === "draft").length,
                sentCount: rows.filter((i) => i.status === "sent").length,
              },
            };
          },
        },

        // ---------------------------------------------------------------
        // Properties
        // ---------------------------------------------------------------
        queryProperties: {
          description:
            "Search properties and get portfolio information including occupancy, revenue, and NOI",
          inputSchema: jsonSchema<{
            search?: string;
            property_type?: string;
          }>({
            type: "object",
            properties: {
              search: {
                type: "string",
                description: "Search properties by name or address",
              },
              property_type: {
                type: "string",
                description:
                  "Filter by type: residential, commercial, industrial, mixed_use",
              },
            },
          }),
          execute: async ({
            search,
            property_type,
          }: {
            search?: string;
            property_type?: string;
          }) => {
            let query = supabase
              .from("properties")
              .select(
                "id, name, property_type, address_line1, city, state, total_units, occupied_units, occupancy_rate, monthly_revenue, monthly_expenses, noi, current_value, status"
              )
              .eq("company_id", companyId)
              .order("name", { ascending: true })
              .limit(20);

            if (search) query = query.ilike("name", `%${search}%`);
            if (property_type)
              query = query.eq("property_type", property_type);

            const { data, error } = await query;
            if (error)
              return { error: "Failed to query properties" };

            const properties = data ?? [];
            const totalUnits = properties.reduce(
              (s, p) => s + Number(p.total_units ?? 0),
              0
            );
            const totalOccupied = properties.reduce(
              (s, p) => s + Number(p.occupied_units ?? 0),
              0
            );
            const totalRevenue = properties.reduce(
              (s, p) => s + Number(p.monthly_revenue ?? 0),
              0
            );
            const totalNOI = properties.reduce(
              (s, p) => s + Number(p.noi ?? 0),
              0
            );
            const totalValue = properties.reduce(
              (s, p) => s + Number(p.current_value ?? 0),
              0
            );

            return {
              properties,
              summary: {
                count: properties.length,
                totalUnits,
                totalOccupied,
                avgOccupancy:
                  totalUnits > 0
                    ? Math.round((totalOccupied / totalUnits) * 1000) / 10
                    : 0,
                totalMonthlyRevenue: totalRevenue,
                totalMonthlyNOI: totalNOI,
                totalPortfolioValue: totalValue,
              },
            };
          },
        },

        // ---------------------------------------------------------------
        // Maintenance Requests
        // ---------------------------------------------------------------
        queryMaintenanceRequests: {
          description:
            "Get maintenance requests across properties with priority and status breakdown",
          inputSchema: jsonSchema<{
            priority?: string;
            status?: string;
          }>({
            type: "object",
            properties: {
              priority: {
                type: "string",
                description:
                  "Filter by priority: low, medium, high, emergency",
              },
              status: {
                type: "string",
                description:
                  "Filter by status: open, in_progress, completed, cancelled",
              },
            },
          }),
          execute: async ({
            priority,
            status,
          }: {
            priority?: string;
            status?: string;
          }) => {
            let query = supabase
              .from("maintenance_requests")
              .select(
                "id, title, priority, status, property_id, unit_id, created_at, description"
              )
              .eq("company_id", companyId)
              .order("created_at", { ascending: false })
              .limit(20);

            if (priority) query = query.eq("priority", priority);
            if (status) {
              query = query.eq("status", status);
            } else {
              query = query.in("status", ["open", "in_progress"]);
            }

            const { data, error } = await query;
            if (error)
              return { error: "Failed to query maintenance requests" };

            const requests = data ?? [];
            const byPriority = {
              emergency: requests.filter((r) => r.priority === "emergency")
                .length,
              high: requests.filter((r) => r.priority === "high").length,
              medium: requests.filter((r) => r.priority === "medium").length,
              low: requests.filter((r) => r.priority === "low").length,
            };

            return {
              requests,
              summary: {
                total: requests.length,
                byPriority,
                urgentCount: byPriority.emergency + byPriority.high,
              },
            };
          },
        },

        // ---------------------------------------------------------------
        // Safety Data
        // ---------------------------------------------------------------
        querySafetyData: {
          description:
            "Get safety incidents, toolbox talks, and safety compliance data",
          inputSchema: jsonSchema<{
            type?: string;
            severity?: string;
          }>({
            type: "object",
            properties: {
              type: {
                type: "string",
                description:
                  "Data type: 'incidents', 'toolbox_talks', or omit for combined summary",
              },
              severity: {
                type: "string",
                description:
                  "Filter incidents by severity: low, medium, high, critical",
              },
            },
          }),
          execute: async ({
            type,
            severity,
          }: {
            type?: string;
            severity?: string;
          }) => {
            if (type === "toolbox_talks") {
              const { data, error } = await supabase
                .from("toolbox_talks")
                .select(
                  "id, talk_number, title, topic, conducted_date, duration_minutes, attendee_count, status"
                )
                .eq("company_id", companyId)
                .order("conducted_date", { ascending: false })
                .limit(20);

              if (error) return { error: "Failed to query toolbox talks" };
              return {
                talks: data ?? [],
                count: (data ?? []).length,
              };
            }

            // Incidents (or default combined)
            let incidentQuery = supabase
              .from("safety_incidents")
              .select(
                "id, incident_number, title, incident_type, severity, status, incident_date, location, osha_recordable, days_away, days_restricted"
              )
              .eq("company_id", companyId)
              .order("incident_date", { ascending: false })
              .limit(20);

            if (severity)
              incidentQuery = incidentQuery.eq("severity", severity);

            const { data: incidents, error: incError } =
              await incidentQuery;
            if (incError) return { error: "Failed to query safety incidents" };

            const incidentRows = incidents ?? [];
            const bySeverity = {
              critical: incidentRows.filter((i) => i.severity === "critical")
                .length,
              high: incidentRows.filter((i) => i.severity === "high").length,
              medium: incidentRows.filter((i) => i.severity === "medium")
                .length,
              low: incidentRows.filter((i) => i.severity === "low").length,
            };
            const oshaRecordable = incidentRows.filter(
              (i) => i.osha_recordable
            ).length;
            const openIncidents = incidentRows.filter(
              (i) => i.status !== "closed"
            ).length;

            const result: Record<string, unknown> = {
              incidents: incidentRows,
              summary: {
                totalIncidents: incidentRows.length,
                bySeverity,
                oshaRecordable,
                openIncidents,
              },
            };

            // If combined summary, also fetch recent toolbox talks count
            if (!type || type === "incidents") {
              const { count } = await supabase
                .from("toolbox_talks")
                .select("id", { count: "exact", head: true })
                .eq("company_id", companyId);

              (result.summary as Record<string, unknown>).totalToolboxTalks =
                count ?? 0;
            }

            return result;
          },
        },

        // ---------------------------------------------------------------
        // Leases
        // ---------------------------------------------------------------
        queryLeases: {
          description:
            "Get lease data including tenant info, rent amounts, and expiration tracking",
          inputSchema: jsonSchema<{
            status?: string;
            expiring_within_days?: number;
          }>({
            type: "object",
            properties: {
              status: {
                type: "string",
                description:
                  "Filter by lease status: active, expired, terminated, pending",
              },
              expiring_within_days: {
                type: "number",
                description:
                  "Find leases expiring within N days from today (e.g., 30, 60, 90)",
              },
            },
          }),
          execute: async ({
            status,
            expiring_within_days,
          }: {
            status?: string;
            expiring_within_days?: number;
          }) => {
            let query = supabase
              .from("leases")
              .select(
                "id, tenant_name, tenant_email, lease_start, lease_end, monthly_rent, security_deposit, status, auto_renew, property_id, unit_id"
              )
              .eq("company_id", companyId)
              .order("lease_end", { ascending: true })
              .limit(20);

            if (status) query = query.eq("status", status);
            if (expiring_within_days) {
              const futureDate = new Date();
              futureDate.setDate(
                futureDate.getDate() + expiring_within_days
              );
              query = query
                .eq("status", "active")
                .lte("lease_end", futureDate.toISOString().slice(0, 10))
                .gte("lease_end", today);
            }

            const { data, error } = await query;
            if (error) return { error: "Failed to query leases" };

            const leases = data ?? [];
            const totalRent = leases.reduce(
              (s, l) => s + Number(l.monthly_rent ?? 0),
              0
            );

            return {
              leases,
              summary: {
                count: leases.length,
                totalMonthlyRent: totalRent,
                activeCount: leases.filter((l) => l.status === "active")
                  .length,
                autoRenewCount: leases.filter((l) => l.auto_renew).length,
              },
            };
          },
        },

        // ---------------------------------------------------------------
        // Equipment
        // ---------------------------------------------------------------
        queryEquipment: {
          description:
            "Get equipment inventory, status, utilization, and maintenance schedules",
          inputSchema: jsonSchema<{
            status?: string;
            search?: string;
          }>({
            type: "object",
            properties: {
              status: {
                type: "string",
                description:
                  "Filter by status: available, in_use, maintenance, retired",
              },
              search: {
                type: "string",
                description: "Search equipment by name, make, or model",
              },
            },
          }),
          execute: async ({
            status,
            search,
          }: {
            status?: string;
            search?: string;
          }) => {
            let query = supabase
              .from("equipment")
              .select(
                "id, name, equipment_type, make, model, serial_number, status, purchase_date, purchase_cost, hourly_rate, total_hours, last_maintenance_date, next_maintenance_date, current_project_id"
              )
              .eq("company_id", companyId)
              .order("name", { ascending: true })
              .limit(20);

            if (status) query = query.eq("status", status);
            if (search) query = query.ilike("name", `%${search}%`);

            const { data, error } = await query;
            if (error) return { error: "Failed to query equipment" };

            const equipment = data ?? [];
            const totalValue = equipment.reduce(
              (s, e) => s + Number(e.purchase_cost ?? 0),
              0
            );
            const needsMaintenance = equipment.filter(
              (e) =>
                e.next_maintenance_date &&
                e.next_maintenance_date <= today
            ).length;

            return {
              equipment,
              summary: {
                count: equipment.length,
                totalAssetValue: totalValue,
                available: equipment.filter((e) => e.status === "available")
                  .length,
                inUse: equipment.filter((e) => e.status === "in_use").length,
                inMaintenance: equipment.filter(
                  (e) => e.status === "maintenance"
                ).length,
                maintenanceOverdue: needsMaintenance,
              },
            };
          },
        },

        // ---------------------------------------------------------------
        // Workforce
        // ---------------------------------------------------------------
        queryWorkforce: {
          description:
            "Get team member data, roles, active status, and certification information",
          inputSchema: jsonSchema<{
            role?: string;
            include_certifications?: boolean;
          }>({
            type: "object",
            properties: {
              role: {
                type: "string",
                description:
                  "Filter by role: owner, admin, project_manager, accountant, field_worker, viewer",
              },
              include_certifications: {
                type: "boolean",
                description:
                  "Set true to also return certification/license data",
              },
            },
          }),
          execute: async ({
            role,
            include_certifications,
          }: {
            role?: string;
            include_certifications?: boolean;
          }) => {
            let query = supabase
              .from("company_members")
              .select(
                "id, role, is_active, joined_at, user_id, user_profiles(full_name, email)"
              )
              .eq("company_id", companyId)
              .order("joined_at", { ascending: false });

            if (role) query = query.eq("role", role);

            const { data, error } = await query;
            if (error) return { error: "Failed to query workforce" };

            const members = data ?? [];
            const activeMembers = members.filter((m) => m.is_active);
            const byRole: Record<string, number> = {};
            for (const m of activeMembers) {
              byRole[m.role] = (byRole[m.role] ?? 0) + 1;
            }

            const result: Record<string, unknown> = {
              members: members.map((m) => {
                const profile = m.user_profiles as unknown as
                  | { full_name?: string; email?: string }
                  | { full_name?: string; email?: string }[]
                  | null;
                const p = Array.isArray(profile) ? profile[0] : profile;
                return {
                  id: m.id,
                  user_id: m.user_id,
                  name: p?.full_name ?? "Unknown",
                  email: p?.email ?? "",
                  role: m.role,
                  is_active: m.is_active,
                  joined_at: m.joined_at,
                };
              }),
              summary: {
                totalMembers: members.length,
                activeMembers: activeMembers.length,
                inactiveMembers: members.length - activeMembers.length,
                byRole,
              },
            };

            if (include_certifications) {
              const { data: certs, error: certError } = await supabase
                .from("certifications")
                .select(
                  "id, cert_type, cert_name, issuing_authority, expiry_date, status, contact_id"
                )
                .eq("company_id", companyId)
                .order("expiry_date", { ascending: true })
                .limit(50);

              if (!certError && certs) {
                const expiringSoon = certs.filter((c) => {
                  if (!c.expiry_date) return false;
                  const daysUntil = Math.floor(
                    (new Date(c.expiry_date).getTime() - Date.now()) /
                      86400000
                  );
                  return daysUntil >= 0 && daysUntil <= 90;
                });
                const expired = certs.filter((c) => {
                  if (!c.expiry_date) return false;
                  return new Date(c.expiry_date) < new Date();
                });

                result.certifications = {
                  items: certs,
                  total: certs.length,
                  expiringSoon: expiringSoon.length,
                  expired: expired.length,
                };
              }
            }

            return result;
          },
        },
      },
    });
  } catch (err: unknown) {
    console.error("AI chat streamText error:", err);
    const msg =
      err instanceof Error ? err.message : "Unknown AI provider error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fire-and-forget: log usage after stream completes
  Promise.resolve(result.usage).then(async (usage) => {
    const inputTokens = usage.inputTokens ?? 0;
    const outputTokens = usage.outputTokens ?? 0;
    // Rough cost estimate per 1K tokens
    const rates: Record<string, { input: number; output: number }> = {
      openai: { input: 0.005, output: 0.015 },
      anthropic: { input: 0.003, output: 0.015 },
      google: { input: 0.00025, output: 0.0005 },
      groq: { input: 0.0005, output: 0.0005 },
      mistral: { input: 0.001, output: 0.003 },
      cohere: { input: 0.001, output: 0.002 },
      xai: { input: 0.005, output: 0.015 },
      deepseek: { input: 0.001, output: 0.002 },
    };
    const r = rates[providerConfig.provider_name] ?? { input: 0.005, output: 0.015 };
    const estimatedCost = (inputTokens * r.input + outputTokens * r.output) / 1000;

    await logAIUsage(supabase, {
      company_id: companyId,
      provider_name: providerConfig.provider_name,
      user_id: userCompany.userId,
      task_type: "chat",
      model_id: providerConfig.model_id,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost: Math.round(estimatedCost * 10000) / 10000,
    });
  }).catch((err) => {
    console.error("Failed to log AI chat usage:", err);
  });

  return result.toUIMessageStreamResponse();
}
