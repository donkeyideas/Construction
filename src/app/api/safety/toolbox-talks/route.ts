import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getToolboxTalks,
  createToolboxTalk,
  type ToolboxTalkStatus,
} from "@/lib/queries/safety";

// ---------------------------------------------------------------------------
// GET /api/safety/toolbox-talks — List toolbox talks for the current user's company
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as ToolboxTalkStatus | null;
    const topic = searchParams.get("topic");
    const search = searchParams.get("search");

    const talks = await getToolboxTalks(supabase, userCtx.companyId, {
      status: status ?? undefined,
      topic: topic ?? undefined,
      search: search ?? undefined,
    });

    return NextResponse.json(talks);
  } catch (err) {
    console.error("GET /api/safety/toolbox-talks error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/safety/toolbox-talks — Create a new toolbox talk
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "Toolbox talk title is required." },
        { status: 400 }
      );
    }

    const { talk, error } = await createToolboxTalk(
      supabase,
      userCtx.companyId,
      userCtx.userId,
      {
        title: body.title.trim(),
        description: body.description?.trim() || undefined,
        topic: body.topic?.trim() || undefined,
        scheduled_date: body.scheduled_date || undefined,
        project_id: body.project_id || undefined,
        attendees_count: body.attendees_count || undefined,
        attendees: body.attendees?.trim() || undefined,
        notes: body.notes?.trim() || undefined,
      }
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(talk, { status: 201 });
  } catch (err) {
    console.error("POST /api/safety/toolbox-talks error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
