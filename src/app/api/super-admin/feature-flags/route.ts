import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { getFeatureFlags, createFeatureFlag } from "@/lib/queries/feature-flags";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await getFeatureFlags();

    return NextResponse.json({ data });
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
    const { name, description, is_enabled, plan_requirements } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400 }
      );
    }

    const validPlans = ["starter", "professional", "enterprise"];
    if (plan_requirements && Array.isArray(plan_requirements)) {
      for (const plan of plan_requirements) {
        if (!validPlans.includes(plan)) {
          return NextResponse.json(
            { error: `Invalid plan: ${plan}. Must be starter, professional, or enterprise.` },
            { status: 400 }
          );
        }
      }
    }

    const { error } = await createFeatureFlag({
      name: name.trim(),
      description: description || undefined,
      is_enabled: is_enabled ?? false,
      plan_requirements: plan_requirements ?? [],
    });

    if (error) {
      const status = error.includes("already exists") ? 409 : 500;
      return NextResponse.json({ error }, { status });
    }

    return NextResponse.json(
      { message: "Feature flag created." },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
