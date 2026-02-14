import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getProviderForTask } from "@/lib/ai/provider-router";
import { getReportPrompt } from "@/lib/ai/report-prompts";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { reportType, sectionId, data, companyName, propertyName } = body;

    if (!reportType || !sectionId) {
      return NextResponse.json(
        { error: "reportType and sectionId are required" },
        { status: 400 }
      );
    }

    // Get AI provider configured for documents
    const provider = await getProviderForTask(
      supabase,
      userCompany.companyId,
      "documents"
    );

    if (!provider) {
      return NextResponse.json(
        {
          error:
            "No AI provider configured for document generation. Configure one in Admin > AI Providers.",
        },
        { status: 400 }
      );
    }

    // Build prompt data from the report data
    const promptData = buildPromptData(
      reportType,
      sectionId,
      data,
      companyName,
      propertyName
    );

    const systemPrompt = getReportPrompt(reportType, sectionId, promptData);

    if (!systemPrompt) {
      return NextResponse.json(
        { error: `No prompt template for ${reportType}/${sectionId}` },
        { status: 400 }
      );
    }

    const result = await generateText({
      model: provider.model,
      system: systemPrompt,
      prompt: "Generate the section content based on the data provided.",
      maxOutputTokens: 1000,
      temperature: 0.7,
    });

    // Log usage
    try {
      await supabase.from("ai_usage_log").insert({
        company_id: userCompany.companyId,
        provider_config_id: provider.config.id,
        user_id: userCompany.userId,
        input_tokens: result.usage?.inputTokens ?? 0,
        output_tokens: result.usage?.outputTokens ?? 0,
        total_tokens:
          (result.usage?.inputTokens ?? 0) +
          (result.usage?.outputTokens ?? 0),
        context: `report_${reportType}_${sectionId}`,
      });
    } catch {
      // Non-critical — don't fail the response
    }

    return NextResponse.json({ narrative: result.text });
  } catch (error) {
    console.error("Narrative generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate narrative" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Build prompt data from report data
// ---------------------------------------------------------------------------

function buildPromptData(
  reportType: string,
  sectionId: string,
  data: Record<string, unknown>,
  companyName: string,
  propertyName: string
): Record<string, unknown> {
  // Market Feasibility
  if (reportType === "market_feasibility") {
    const properties = (data.properties as Record<string, unknown>[]) ?? [];
    const p = properties[0] ?? {};
    const unitMix = (data.unitMix as Record<string, unknown>[]) ?? [];
    const leases = (data.leases as Record<string, unknown>[]) ?? [];
    const comps = (data.portfolioComps as Record<string, unknown>[]) ?? [];
    const fin = (data.financialSummary as Record<string, unknown>) ?? {};

    const totalUnits = (p.total_units as number) ?? 0;
    const occupiedUnits = (p.occupied_units as number) ?? 0;
    const monthlyRevenue = (p.monthly_revenue as number) ?? 0;
    const monthlyExpenses = (p.monthly_expenses as number) ?? 0;
    const noi = (p.noi as number) ?? 0;
    const currentValue = (p.current_value as number) ?? 0;
    const occupancyRate = (p.occupancy_rate as number) ?? 0;
    const capRate = currentValue > 0 ? ((noi * 12) / currentValue) * 100 : 0;

    const base: Record<string, unknown> = {
      companyName,
      propertyName: propertyName || p.name,
      location: [p.address, p.city, p.state, p.zip].filter(Boolean).join(", "),
      address: p.address,
      city: p.city,
      state: p.state,
      zip: p.zip,
      propertyType: p.property_type,
      totalUnits,
      occupiedUnits,
      occupancyRate: occupancyRate.toFixed(1),
      vacancyRate: (100 - occupancyRate).toFixed(1),
      monthlyRevenue: monthlyRevenue.toLocaleString(),
      monthlyExpenses: monthlyExpenses.toLocaleString(),
      noi: noi.toLocaleString(),
      annualNOI: (noi * 12).toLocaleString(),
      currentValue: currentValue.toLocaleString(),
      capRate: capRate.toFixed(2),
      totalRevenue: ((fin.totalRevenue as number) ?? 0).toLocaleString(),
      totalExpenses: ((fin.totalExpenses as number) ?? 0).toLocaleString(),
      netIncome: ((fin.netIncome as number) ?? 0).toLocaleString(),
      activeLeases: leases.filter(
        (l) => (l.status as string) === "active"
      ).length,
      avgRevenuePerUnit:
        totalUnits > 0
          ? Math.round(monthlyRevenue / totalUnits).toLocaleString()
          : "0",
      unitMixSummary: unitMix
        .map(
          (u) =>
            `${u.unit_type}: ${u.count} units, avg rent $${u.avg_market_rent}`
        )
        .join("; "),
      compsSummary: comps
        .slice(0, 5)
        .map(
          (c) =>
            `- ${c.name}: ${c.total_units} units, ${((c.occupancy_rate as number) ?? 0).toFixed(1)}% occ, NOI $${((c.noi as number) ?? 0).toLocaleString()}/mo`
        )
        .join("\n"),
    };

    return base;
  }

  // Offering Memorandum
  if (reportType === "offering_memorandum") {
    const properties = (data.properties as Record<string, unknown>[]) ?? [];
    const p = properties[0] ?? {};
    const cashFlowMonths =
      (data.cashFlowMonths as Record<string, unknown>[]) ?? [];
    const fin = (data.financialSummary as Record<string, unknown>) ?? {};

    const noi = (p.noi as number) ?? 0;
    const currentValue = (p.current_value as number) ?? 0;
    const capRate = currentValue > 0 ? ((noi * 12) / currentValue) * 100 : 0;

    const totalCashIn = cashFlowMonths.reduce(
      (s, m) => s + ((m.cashIn as number) ?? 0),
      0
    );
    const totalCashOut = cashFlowMonths.reduce(
      (s, m) => s + ((m.cashOut as number) ?? 0),
      0
    );

    return {
      companyName,
      propertyName: propertyName || p.name,
      location: [p.address, p.city, p.state, p.zip].filter(Boolean).join(", "),
      address: [p.address, p.city, p.state, p.zip].filter(Boolean).join(", "),
      propertyType: p.property_type,
      yearBuilt: p.year_built ?? "N/A",
      totalSqft: ((p.total_sqft as number) ?? 0).toLocaleString(),
      totalUnits: p.total_units,
      occupancyRate: ((p.occupancy_rate as number) ?? 0).toFixed(1),
      noi: noi.toLocaleString(),
      annualNOI: (noi * 12).toLocaleString(),
      currentValue: currentValue.toLocaleString(),
      capRate: capRate.toFixed(2),
      cashFlowSummary: cashFlowMonths
        .slice(-6)
        .map(
          (m) =>
            `${m.month}: In $${((m.cashIn as number) ?? 0).toLocaleString()}, Out $${((m.cashOut as number) ?? 0).toLocaleString()}`
        )
        .join("\n"),
      totalCashIn: totalCashIn.toLocaleString(),
      totalCashOut: totalCashOut.toLocaleString(),
      netCashFlow: (totalCashIn - totalCashOut).toLocaleString(),
    };
  }

  // Basis of Design
  if (reportType === "basis_of_design") {
    const projects = (data.projects as Record<string, unknown>[]) ?? [];
    const p = projects[0] ?? {};
    const submittals = (data.submittals as Record<string, unknown>[]) ?? [];
    const equipment = (data.equipment as Record<string, unknown>[]) ?? [];

    return {
      companyName,
      projectName: p.name,
      projectType: p.project_type ?? "General Construction",
      clientName: p.client_name ?? "N/A",
      contractAmount: ((p.contract_amount as number) ?? 0).toLocaleString(),
      status: p.status,
      completionPct: ((p.completion_pct as number) ?? 0).toFixed(1),
      submittalCount: submittals.length,
      specSections: [
        ...new Set(
          submittals
            .map((s) => s.spec_section as string)
            .filter(Boolean)
        ),
      ].join(", ") || "N/A",
      submittalsSummary: submittals
        .slice(0, 10)
        .map(
          (s) =>
            `- ${s.title}: Section ${s.spec_section ?? "N/A"}, Status: ${s.status}`
        )
        .join("\n"),
      equipmentSummary: equipment
        .slice(0, 10)
        .map(
          (e) =>
            `- ${e.name}: ${e.equipment_type}, ${e.make ?? ""} ${e.model ?? ""}`
        )
        .join("\n"),
    };
  }

  return { companyName, propertyName };
}
