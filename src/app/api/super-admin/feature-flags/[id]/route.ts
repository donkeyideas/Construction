import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { updateFeatureFlag, deleteFeatureFlag } from "@/lib/queries/feature-flags";

// ---------------------------------------------------------------------------
// PATCH /api/super-admin/feature-flags/[id] - Update a feature flag
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: {
      is_enabled?: boolean;
      description?: string;
      plan_requirements?: string[];
    } = {};

    if (typeof body.is_enabled === "boolean") {
      updateData.is_enabled = body.is_enabled;
    }

    if (typeof body.description === "string") {
      updateData.description = body.description;
    }

    if (Array.isArray(body.plan_requirements)) {
      const validPlans = ["starter", "professional", "enterprise"];
      for (const plan of body.plan_requirements) {
        if (!validPlans.includes(plan)) {
          return NextResponse.json(
            { error: `Invalid plan: ${plan}. Must be starter, professional, or enterprise.` },
            { status: 400 }
          );
        }
      }
      updateData.plan_requirements = body.plan_requirements;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 }
      );
    }

    const { error } = await updateFeatureFlag(id, updateData);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/super-admin/feature-flags/[id] - Delete a feature flag
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { error } = await deleteFeatureFlag(id);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
