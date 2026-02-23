import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getJournalEntryById, postJournalEntry, voidJournalEntry } from "@/lib/queries/financial";
import { checkSubscriptionAccess } from "@/lib/guards/subscription-guard";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entry = await getJournalEntryById(supabase, id);

    if (!entry) {
      return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("GET /api/financial/journal-entries/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subBlock = await checkSubscriptionAccess(userCompany.companyId, "PATCH");
    if (subBlock) return subBlock;

    const body = await request.json();
    const action = body.action;

    if (action === "post") {
      const success = await postJournalEntry(supabase, id, userCompany.userId);
      if (!success) {
        return NextResponse.json({ error: "Failed to post entry. It may already be posted." }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "void") {
      const success = await voidJournalEntry(supabase, id);
      if (!success) {
        return NextResponse.json({ error: "Failed to void entry" }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action. Use 'post' or 'void'" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/financial/journal-entries/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userCompany = await getCurrentUserCompany(supabase);

    if (!userCompany) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subBlock2 = await checkSubscriptionAccess(userCompany.companyId, "DELETE");
    if (subBlock2) return subBlock2;

    const entry = await getJournalEntryById(supabase, id);
    if (!entry) {
      return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
    }

    if (entry.status === "posted") {
      return NextResponse.json(
        { error: "Cannot delete a posted journal entry. Void it first." },
        { status: 400 }
      );
    }

    // Delete line items first, then the entry
    await supabase
      .from("journal_entry_lines")
      .delete()
      .eq("journal_entry_id", id);

    const { error: deleteError } = await supabase
      .from("journal_entries")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Delete journal entry error:", deleteError);
      return NextResponse.json({ error: "Failed to delete journal entry" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/financial/journal-entries/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
