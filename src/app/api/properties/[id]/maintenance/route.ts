import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getMaintenanceRequests,
  createMaintenanceRequest,
} from "@/lib/queries/properties";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the property belongs to the user's company
    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("id", id)
      .eq("company_id", ctx.companyId)
      .single();

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Parse optional filters from query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const priority = searchParams.get("priority") ?? undefined;

    const requests = await getMaintenanceRequests(supabase, ctx.companyId, {
      propertyId: id,
      status,
      priority,
    });

    return NextResponse.json(requests);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the property belongs to the user's company
    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("id", id)
      .eq("company_id", ctx.companyId)
      .single();

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const body = await request.json();

    if (!body.title || !body.title.trim()) {
      return NextResponse.json(
        { error: "Title is required." },
        { status: 400 }
      );
    }

    const validCategories = [
      "plumbing",
      "electrical",
      "hvac",
      "appliance",
      "structural",
      "general",
    ];
    if (!body.category || !validCategories.includes(body.category)) {
      return NextResponse.json(
        { error: "Valid category is required." },
        { status: 400 }
      );
    }

    const validPriorities = ["low", "medium", "high", "emergency"];
    if (!body.priority || !validPriorities.includes(body.priority)) {
      return NextResponse.json(
        { error: "Valid priority is required." },
        { status: 400 }
      );
    }

    const maintenanceRequest = await createMaintenanceRequest(
      supabase,
      ctx.companyId,
      {
        property_id: id,
        unit_id: body.unit_id ?? null,
        title: body.title.trim(),
        description: body.description ?? null,
        category: body.category,
        priority: body.priority,
        requested_by: body.requested_by ?? ctx.userId,
        estimated_cost: body.estimated_cost ?? null,
        scheduled_date: body.scheduled_date ?? null,
      }
    );

    return NextResponse.json(maintenanceRequest, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
