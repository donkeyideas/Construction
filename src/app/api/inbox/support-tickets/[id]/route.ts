import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getUserTicketWithMessages,
  addUserTicketMessage,
} from "@/lib/queries/inbox";

// ---------------------------------------------------------------------------
// GET /api/inbox/support-tickets/[id] — Return ticket detail with messages
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const ticket = await getUserTicketWithMessages(supabase, id, userCtx.userId);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ ticket });
  } catch (err) {
    console.error("GET /api/inbox/support-tickets/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/inbox/support-tickets/[id] — Add a message to a ticket
// Body: { message }
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    if (!body.message || typeof body.message !== "string" || !body.message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const result = await addUserTicketMessage(
      supabase,
      id,
      userCtx.userId,
      body.message.trim()
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to add message" },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Message added." }, { status: 201 });
  } catch (err) {
    console.error("POST /api/inbox/support-tickets/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
