import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const {
      test_name,
      page_url,
      variant_a_name,
      variant_b_name,
      metric_name,
      start_date,
    } = body;

    if (!test_name) {
      return NextResponse.json(
        { error: "Test name is required." },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("cro_ab_tests").insert({
      test_name,
      page_url: page_url ?? null,
      variant_a_name: variant_a_name ?? "Control",
      variant_b_name: variant_b_name ?? "Variant B",
      metric_name: metric_name ?? "Conversion Rate",
      start_date:
        start_date ?? new Date().toISOString().split("T")[0],
    });

    if (error) {
      return NextResponse.json(
        { error: "Failed to create test." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "A/B test created." },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "ID required." }, { status: 400 });
    }

    const { error } = await supabase
      .from("cro_ab_tests")
      .update(updates)
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to update." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Updated." });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required." }, { status: 400 });
    }

    const { error } = await supabase
      .from("cro_ab_tests")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Deleted." });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
