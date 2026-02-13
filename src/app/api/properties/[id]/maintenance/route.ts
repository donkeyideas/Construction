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

export async function PATCH(request: NextRequest, context: RouteContext) {
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

    if (!body.id) {
      return NextResponse.json(
        { error: "Maintenance request id is required." },
        { status: 400 }
      );
    }

    // Verify the maintenance request exists and belongs to this property/company
    const { data: existingRequest } = await supabase
      .from("maintenance_requests")
      .select("id")
      .eq("id", body.id)
      .eq("property_id", id)
      .eq("company_id", ctx.companyId)
      .single();

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Maintenance request not found" },
        { status: 404 }
      );
    }

    // Allow only specific updatable fields
    const allowedFields = [
      "title",
      "description",
      "category",
      "priority",
      "status",
      "assigned_to",
      "estimated_cost",
      "actual_cost",
      "scheduled_date",
      "completed_at",
      "notes",
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    // Auto-set completed_at when status is "completed"
    if (body.status === "completed" && !body.completed_at) {
      updates.completed_at = new Date().toISOString();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update." },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("maintenance_requests")
      .update(updates)
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
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

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("requestId");

    if (!requestId) {
      return NextResponse.json(
        { error: "requestId query parameter is required." },
        { status: 400 }
      );
    }

    // Verify the maintenance request exists and belongs to this property/company
    const { data: existingRequest } = await supabase
      .from("maintenance_requests")
      .select("id")
      .eq("id", requestId)
      .eq("property_id", id)
      .eq("company_id", ctx.companyId)
      .single();

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Maintenance request not found" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("maintenance_requests")
      .delete()
      .eq("id", requestId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
