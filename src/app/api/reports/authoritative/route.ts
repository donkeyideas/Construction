import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getMarketFeasibilityData,
  getOfferingMemorandumData,
  getBasisOfDesignData,
} from "@/lib/queries/authoritative-reports";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // ------ Fetch data for report ------
    if (action === "fetch_data") {
      const { reportType, propertyIds, projectIds } = body;

      if (reportType === "market_feasibility") {
        if (!propertyIds?.length) {
          return NextResponse.json(
            { error: "At least one property must be selected" },
            { status: 400 }
          );
        }
        const data = await getMarketFeasibilityData(
          supabase,
          userCompany.companyId,
          propertyIds
        );
        return NextResponse.json(data);
      }

      if (reportType === "offering_memorandum") {
        if (!propertyIds?.length) {
          return NextResponse.json(
            { error: "At least one property must be selected" },
            { status: 400 }
          );
        }
        const data = await getOfferingMemorandumData(
          supabase,
          userCompany.companyId,
          propertyIds
        );
        return NextResponse.json(data);
      }

      if (reportType === "basis_of_design") {
        if (!projectIds?.length) {
          return NextResponse.json(
            { error: "At least one project must be selected" },
            { status: 400 }
          );
        }
        const data = await getBasisOfDesignData(
          supabase,
          userCompany.companyId,
          projectIds
        );
        return NextResponse.json(data);
      }

      return NextResponse.json(
        { error: "Invalid report type" },
        { status: 400 }
      );
    }

    // ------ Save report ------
    if (action === "save") {
      const {
        reportType,
        title,
        propertyIds,
        projectIds,
        sectionConfig,
        sectionsData,
        watermark,
        reportId,
      } = body;

      if (reportId) {
        // Update existing
        const { error } = await supabase
          .from("authoritative_reports")
          .update({
            title,
            section_config: sectionConfig,
            sections_data: sectionsData,
            watermark: watermark || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", reportId)
          .eq("company_id", userCompany.companyId);

        if (error) {
          console.error("Update report error:", error);
          return NextResponse.json(
            { error: "Failed to update report" },
            { status: 500 }
          );
        }

        return NextResponse.json({ id: reportId });
      }

      // Create new
      const { data: inserted, error } = await supabase
        .from("authoritative_reports")
        .insert({
          company_id: userCompany.companyId,
          report_type: reportType,
          title,
          property_ids: propertyIds ?? [],
          project_id: projectIds?.[0] ?? null,
          section_config: sectionConfig,
          sections_data: sectionsData,
          watermark: watermark || null,
          created_by: userCompany.userId,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Save report error:", error);
        return NextResponse.json(
          { error: "Failed to save report" },
          { status: 500 }
        );
      }

      return NextResponse.json({ id: inserted.id });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Authoritative reports API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
