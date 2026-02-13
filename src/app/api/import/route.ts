import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// ---------------------------------------------------------------------------
// POST /api/import — Generic bulk import endpoint
// Body: { entity: string, rows: Record<string, string>[] }
// ---------------------------------------------------------------------------

const ALLOWED_ENTITIES = [
  "contacts",
  "equipment",
  "project_budget_lines",
  "chart_of_accounts",
] as const;

type AllowedEntity = (typeof ALLOWED_ENTITIES)[number];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const entity = body.entity as string;
    const rows = body.rows as Record<string, string>[];

    if (!entity || !ALLOWED_ENTITIES.includes(entity as AllowedEntity)) {
      return NextResponse.json(
        { error: `Invalid entity. Allowed: ${ALLOWED_ENTITIES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No rows to import" },
        { status: 400 }
      );
    }

    const { companyId, userId } = userCtx;
    let successCount = 0;
    const errors: string[] = [];

    // Process based on entity type
    switch (entity as AllowedEntity) {
      case "contacts": {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const { error } = await supabase.from("contacts").insert({
            company_id: companyId,
            contact_type: r.contact_type || "subcontractor",
            first_name: r.first_name || "",
            last_name: r.last_name || "",
            company_name: r.company_name || "",
            job_title: r.job_title || "",
            email: r.email || "",
            phone: r.phone || "",
          });
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        }
        break;
      }

      case "equipment": {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const { error } = await supabase.from("equipment").insert({
            company_id: companyId,
            name: r.name || "",
            equipment_type: r.equipment_type || "",
            make: r.make || "",
            model: r.model || "",
            serial_number: r.serial_number || "",
            status: r.status || "available",
            purchase_cost: parseFloat(r.purchase_cost) || 0,
            hourly_rate: parseFloat(r.hourly_rate) || 0,
            purchase_date: r.purchase_date || null,
          });
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        }
        break;
      }

      case "project_budget_lines": {
        const projectId = body.project_id as string;
        if (!projectId) {
          return NextResponse.json(
            { error: "project_id is required for budget line import" },
            { status: 400 }
          );
        }
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const { error } = await supabase
            .from("project_budget_lines")
            .insert({
              company_id: companyId,
              project_id: projectId,
              csi_code: r.csi_code || "",
              description: r.description || "",
              budgeted_amount: parseFloat(r.budgeted_amount) || 0,
              committed_amount: parseFloat(r.committed_amount) || 0,
              actual_amount: parseFloat(r.actual_amount) || 0,
            });
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        }
        break;
      }

      case "chart_of_accounts": {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const { error } = await supabase.from("chart_of_accounts").insert({
            company_id: companyId,
            account_number: r.account_number || "",
            name: r.name || "",
            account_type: r.account_type || "expense",
            sub_type: r.sub_type || null,
            description: r.description || null,
            is_active: true,
          });
          if (error) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            successCount++;
          }
        }
        break;
      }
    }

    return NextResponse.json({
      success: successCount,
      errors,
      total: rows.length,
    });
  } catch (err) {
    console.error("POST /api/import error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
