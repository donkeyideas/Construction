import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getMessages,
  getMessageThread,
  sendMessage,
  markMessageRead,
  archiveMessage,
} from "@/lib/queries/inbox";

// ---------------------------------------------------------------------------
// GET /api/inbox/messages — Return messages for current user
// Query param: ?thread=messageId for thread view
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get("thread");

    if (threadId) {
      const thread = await getMessageThread(supabase, threadId);
      return NextResponse.json(thread);
    }

    const messages = await getMessages(
      supabase,
      userCtx.companyId,
      userCtx.userId
    );

    return NextResponse.json(messages);
  } catch (err) {
    console.error("GET /api/inbox/messages error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/inbox/messages — Send a new message
// Body: { recipient_id, subject?, body, parent_message_id? }
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.recipient_id || typeof body.recipient_id !== "string") {
      return NextResponse.json(
        { error: "recipient_id is required" },
        { status: 400 }
      );
    }

    if (!body.body || typeof body.body !== "string" || !body.body.trim()) {
      return NextResponse.json(
        { error: "Message body is required" },
        { status: 400 }
      );
    }

    const { message, error } = await sendMessage(supabase, {
      company_id: userCtx.companyId,
      sender_id: userCtx.userId,
      recipient_id: body.recipient_id,
      subject: body.subject,
      body: body.body.trim(),
      parent_message_id: body.parent_message_id,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error("POST /api/inbox/messages error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/inbox/messages — Mark message as read or archive
// Body: { messageId, action: "read" | "archive" }
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { messageId, action } = body;

    if (!messageId || typeof messageId !== "string") {
      return NextResponse.json(
        { error: "messageId is required" },
        { status: 400 }
      );
    }

    if (action === "archive") {
      const { error } = await archiveMessage(supabase, messageId);
      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    // Default action: mark as read
    const { error } = await markMessageRead(supabase, messageId);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/inbox/messages error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
