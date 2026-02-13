import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getNotifications, markNotificationRead } from "@/lib/queries/inbox";

// ---------------------------------------------------------------------------
// GET /api/inbox/notifications — Return notifications for current user
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await getNotifications(
      supabase,
      userCtx.companyId,
      userCtx.userId
    );

    return NextResponse.json(notifications);
  } catch (err) {
    console.error("GET /api/inbox/notifications error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/inbox/notifications — Mark notification as read
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId } = body;

    if (!notificationId || typeof notificationId !== "string") {
      return NextResponse.json(
        { error: "notificationId is required" },
        { status: 400 }
      );
    }

    const { error } = await markNotificationRead(supabase, notificationId);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/inbox/notifications error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
