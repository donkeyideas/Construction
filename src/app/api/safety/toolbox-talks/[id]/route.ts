import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getToolboxTalkById,
  updateToolboxTalk,
} from "@/lib/queries/safety";

// ---------------------------------------------------------------------------
// PATCH /api/safety/toolbox-talks/[id] — Update a toolbox talk
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify the talk exists and belongs to the company
    const existing = await getToolboxTalkById(supabase, id);
    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Toolbox talk not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const { talk, error } = await updateToolboxTalk(supabase, id, body);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(talk);
  } catch (err) {
    console.error("PATCH /api/safety/toolbox-talks/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/safety/toolbox-talks/[id] — Delete a toolbox talk
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify the talk exists and belongs to the company
    const existing = await getToolboxTalkById(supabase, id);
    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Toolbox talk not found" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("toolbox_talks")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/safety/toolbox-talks/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
