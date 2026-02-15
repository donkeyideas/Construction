import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import {
  getSupportTickets,
  updateTicketStatus,
} from "@/lib/queries/support-tickets";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const category = searchParams.get("category") || undefined;

    const tickets = await getSupportTickets({ status, priority, category });

    return NextResponse.json({ tickets });
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
    const { id, status, assigned_to } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Ticket ID is required." },
        { status: 400 }
      );
    }

    if (!status && assigned_to === undefined) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 }
      );
    }

    const validStatuses = [
      "open",
      "in_progress",
      "waiting",
      "resolved",
      "closed",
    ];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value." },
        { status: 400 }
      );
    }

    const result = await updateTicketStatus(id, status, assigned_to);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update ticket." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Ticket updated." });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
