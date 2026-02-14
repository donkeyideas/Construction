import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, category, priority } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Get tenant's active lease to determine company, property, unit
    const { data: lease } = await supabase
      .from("leases")
      .select("company_id, property_id, unit_id")
      .eq("tenant_user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();

    if (!lease) {
      return NextResponse.json(
        { error: "No active lease found for your account" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("maintenance_requests")
      .insert({
        company_id: lease.company_id,
        property_id: lease.property_id,
        unit_id: lease.unit_id,
        title: title.trim(),
        description: description?.trim() || null,
        category: category || "general",
        priority: priority || "medium",
        status: "submitted",
        requested_by: user.id,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating maintenance request:", error);
      return NextResponse.json(
        { error: "Failed to create request" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch (err) {
    console.error("Maintenance request error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, description, category, priority } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      );
    }

    // Only allow editing own requests
    const { data: existing } = await supabase
      .from("maintenance_requests")
      .select("id, requested_by, status")
      .eq("id", id)
      .single();

    if (!existing || existing.requested_by !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing.status === "completed" || existing.status === "closed") {
      return NextResponse.json(
        { error: "Cannot edit a completed or closed request" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined)
      updates.description = description?.trim() || null;
    if (category !== undefined) updates.category = category;
    if (priority !== undefined) updates.priority = priority;

    const { error } = await supabase
      .from("maintenance_requests")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("Error updating maintenance request:", error);
      return NextResponse.json(
        { error: "Failed to update request" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Maintenance update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
