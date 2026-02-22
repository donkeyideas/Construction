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
      query,
      ai_engine,
      mention_type,
      url_cited,
      position,
      snippet_text,
      tracked_date,
      notes,
    } = body;

    if (!query || !ai_engine) {
      return NextResponse.json(
        { error: "Query and AI engine are required." },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("aeo_tracking").insert({
      query,
      ai_engine,
      mention_type: mention_type ?? "mention",
      url_cited: url_cited ?? null,
      position: position ?? null,
      snippet_text: snippet_text ?? null,
      tracked_date:
        tracked_date ?? new Date().toISOString().split("T")[0],
      notes: notes ?? null,
    });

    if (error) {
      return NextResponse.json(
        { error: "Failed to add AEO entry." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "AEO entry added." }, { status: 201 });
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
      .from("aeo_tracking")
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
