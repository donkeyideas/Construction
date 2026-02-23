import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import {
  getContactSubmissions,
  updateContactSubmission,
} from "@/lib/queries/contact-submissions";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/super-admin/inbox — List contact submissions
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const type = searchParams.get("type") || undefined;

    const submissions = await getContactSubmissions({ status, type });

    return NextResponse.json({ submissions });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/super-admin/inbox — Update a submission's status/notes
// Body: { id, status?, admin_notes? }
// ---------------------------------------------------------------------------

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, admin_notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Submission ID is required." },
        { status: 400 }
      );
    }

    if (!status && admin_notes === undefined) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 }
      );
    }

    const validStatuses = ["new", "read", "replied", "archived"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value." },
        { status: 400 }
      );
    }

    const result = await updateContactSubmission(id, { status, admin_notes });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update submission." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Submission updated." });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
