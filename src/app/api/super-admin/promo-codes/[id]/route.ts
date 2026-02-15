import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (typeof body.is_active === "boolean") updateData.is_active = body.is_active;
    if (body.code) updateData.code = body.code.toUpperCase().trim();
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.duration_days) updateData.duration_days = body.duration_days;
    if (body.max_uses !== undefined) updateData.max_uses = body.max_uses || null;
    if (body.plan_granted) {
      const validPlans = ["starter", "professional", "enterprise"];
      if (!validPlans.includes(body.plan_granted)) {
        return NextResponse.json(
          { error: "Invalid plan_granted." },
          { status: 400 }
        );
      }
      updateData.plan_granted = body.plan_granted;
    }
    if (body.expires_at !== undefined) updateData.expires_at = body.expires_at || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("promo_codes")
      .update(updateData)
      .eq("id", id);

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A promo code with this code already exists." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Failed to update promo code." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Promo code updated." });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const { error } = await supabase
      .from("promo_codes")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete promo code." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Promo code deleted." });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
