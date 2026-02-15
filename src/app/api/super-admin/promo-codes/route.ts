import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("promo_codes")
      .select(
        "id, code, description, duration_days, max_uses, current_uses, plan_granted, is_active, expires_at, created_at, created_by"
      )
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch promo codes." },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { code, description, duration_days, max_uses, plan_granted, expires_at } =
      body;

    if (!code || !duration_days || !plan_granted) {
      return NextResponse.json(
        { error: "Code, duration_days, and plan_granted are required." },
        { status: 400 }
      );
    }

    const validPlans = ["starter", "professional", "enterprise"];
    if (!validPlans.includes(plan_granted)) {
      return NextResponse.json(
        { error: "Invalid plan_granted. Must be starter, professional, or enterprise." },
        { status: 400 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("promo_codes").insert({
      code: code.toUpperCase().trim(),
      description: description || null,
      duration_days,
      max_uses: max_uses || null,
      current_uses: 0,
      plan_granted,
      is_active: true,
      expires_at: expires_at || null,
      created_by: user?.id,
    });

    if (error) {
      // Check for unique constraint violation
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A promo code with this code already exists." },
          { status: 409 }
        );
      }
      console.error("Create promo code error:", error);
      return NextResponse.json(
        { error: "Failed to create promo code." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Promo code created." },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
