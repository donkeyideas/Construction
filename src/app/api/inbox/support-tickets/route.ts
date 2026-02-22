import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getUserSupportTickets,
  createUserSupportTicket,
} from "@/lib/queries/inbox";

// ---------------------------------------------------------------------------
// GET /api/inbox/support-tickets — Return support tickets for current user
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tickets = await getUserSupportTickets(supabase, userCtx.userId);
    return NextResponse.json({ tickets });
  } catch (err) {
    console.error("GET /api/inbox/support-tickets error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/inbox/support-tickets — Create a new support ticket
// Body: { subject, description, category?, priority? }
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.subject || typeof body.subject !== "string" || !body.subject.trim()) {
      return NextResponse.json(
        { error: "Subject is required" },
        { status: 400 }
      );
    }

    if (!body.description || typeof body.description !== "string" || !body.description.trim()) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    const { ticket, error } = await createUserSupportTicket(supabase, {
      user_id: userCtx.userId,
      company_id: userCtx.companyId,
      subject: body.subject.trim(),
      description: body.description.trim(),
      category: body.category || "general",
      priority: body.priority || "medium",
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err) {
    console.error("POST /api/inbox/support-tickets error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
