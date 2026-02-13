import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getTicketById,
  getTicketComments,
  updateTicket,
  addTicketComment,
} from "@/lib/queries/tickets";

// ---------------------------------------------------------------------------
// GET /api/tickets/[id] — Get ticket detail with comments
// ---------------------------------------------------------------------------

export async function GET(
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

    const ticket = await getTicketById(supabase, id);

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Verify the ticket belongs to the user's company
    if (ticket.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    const comments = await getTicketComments(supabase, id);

    return NextResponse.json({ ticket, comments });
  } catch (err) {
    console.error("GET /api/tickets/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/tickets/[id] — Update ticket (status, priority, assignee, etc.)
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

    // Verify the ticket exists and belongs to the company
    const existing = await getTicketById(supabase, id);
    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Handle status transitions with timestamps
    const updateData: Record<string, unknown> = { ...body };

    if (body.status === "resolved" && existing.status !== "resolved") {
      updateData.resolved_by = userCtx.userId;
      updateData.resolved_at = new Date().toISOString();
    }

    if (body.status === "closed" && existing.status !== "closed") {
      updateData.closed_at = new Date().toISOString();
    }

    // If re-opening, clear resolution data
    if (
      (body.status === "open" || body.status === "in_progress") &&
      (existing.status === "resolved" || existing.status === "closed")
    ) {
      updateData.resolved_by = null;
      updateData.resolved_at = null;
      updateData.closed_at = null;
    }

    const { ticket, error } = await updateTicket(supabase, id, updateData);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(ticket);
  } catch (err) {
    console.error("PATCH /api/tickets/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/tickets/[id] — Delete a ticket
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

    // Verify the ticket exists and belongs to the company
    const existing = await getTicketById(supabase, id);
    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("tickets")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/tickets/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/tickets/[id] — Add comment to ticket
// ---------------------------------------------------------------------------

export async function POST(
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

    // Verify the ticket exists and belongs to the company
    const existing = await getTicketById(supabase, id);
    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    if (!body.body || typeof body.body !== "string" || !body.body.trim()) {
      return NextResponse.json(
        { error: "Comment body is required." },
        { status: 400 }
      );
    }

    const { comment, error } = await addTicketComment(
      supabase,
      userCtx.companyId,
      userCtx.userId,
      id,
      body.body.trim()
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    console.error("POST /api/tickets/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
