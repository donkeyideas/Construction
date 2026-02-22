import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getTickets,
  createTicket,
  type TicketStatus,
  type TicketPriority,
} from "@/lib/queries/tickets";
import { createNotifications } from "@/lib/utils/notifications";

// ---------------------------------------------------------------------------
// GET /api/tickets — List tickets for the current user's company
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
    const status = searchParams.get("status") as TicketStatus | null;
    const priority = searchParams.get("priority") as TicketPriority | null;
    const assigned_to = searchParams.get("assigned_to");
    const search = searchParams.get("search");

    const tickets = await getTickets(supabase, userCtx.companyId, {
      status: status ?? undefined,
      priority: priority ?? undefined,
      assigned_to: assigned_to ?? undefined,
      search: search ?? undefined,
    });

    return NextResponse.json(tickets);
  } catch (err) {
    console.error("GET /api/tickets error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/tickets — Create a new ticket
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
        { error: "Ticket title is required." },
        { status: 400 }
      );
    }

    const { ticket, error } = await createTicket(
      supabase,
      userCtx.companyId,
      userCtx.userId,
      {
        title: body.title.trim(),
        description: body.description?.trim() || undefined,
        priority: body.priority || undefined,
        category: body.category || undefined,
        assigned_to: body.assigned_to || undefined,
        tags: body.tags || undefined,
        entity_type: body.entity_type || undefined,
        entity_id: body.entity_id || undefined,
        metadata: body.metadata || undefined,
      }
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    try {
      await createNotifications(supabase, {
        companyId: userCtx.companyId,
        actorUserId: userCtx.userId,
        title: `New Ticket: ${body.title.trim()}`,
        message: body.description?.trim() ? body.description.trim().slice(0, 200) : undefined,
        notificationType: body.priority === "urgent" || body.priority === "high" ? "alert" : "info",
        entityType: "ticket",
        entityId: ticket?.id,
      });
    } catch (e) { console.warn("Notification failed:", e); }

    return NextResponse.json(ticket, { status: 201 });
  } catch (err) {
    console.error("POST /api/tickets error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
