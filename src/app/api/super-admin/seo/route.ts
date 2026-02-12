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
    const { keyword, search_volume, difficulty, intent, target_url } = body;

    if (!keyword) {
      return NextResponse.json(
        { error: "Keyword is required." },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("seo_keywords").insert({
      keyword,
      search_volume: search_volume ?? null,
      difficulty: difficulty ?? null,
      intent: intent ?? null,
      target_url: target_url ?? null,
    });

    if (error) {
      return NextResponse.json(
        { error: "Failed to add keyword." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Keyword added." }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
