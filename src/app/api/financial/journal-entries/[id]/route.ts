import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getJournalEntryById, postJournalEntry, voidJournalEntry } from "@/lib/queries/financial";
import { checkSubscriptionAccess } from "@/lib/guards/subscription-guard";
import { assertPeriodOpen } from "@/lib/guards/period-lock-guard";
import { logAuditEvent, extractRequestMeta } from "@/lib/utils/audit-logger";

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
    const meta = extractRequestMeta(request);

    // Fetch entry for period lock + separation of duties checks
    const entry = await getJournalEntryById(supabase, id);
    if (!entry) {
      return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
    }

    if (action === "post") {
      // Period lock check
      try {
        await assertPeriodOpen(supabase, userCompany.companyId, entry.entry_date);
      } catch (lockErr: unknown) {
        const err = lockErr as { status?: number; message?: string };
        return NextResponse.json({ error: err.message }, { status: err.status || 409 });
      }

      // Separation of duties: creator cannot post their own entry
      const { data: company } = await supabase
        .from("companies")
        .select("enforce_separation_of_duties")
        .eq("id", userCompany.companyId)
        .single();

      if (company?.enforce_separation_of_duties) {
        const raw = entry as unknown as Record<string, unknown>;
        if (raw.created_by === userCompany.userId) {
          return NextResponse.json(
            { error: "Separation of duties: the creator of a journal entry cannot also post it." },
            { status: 403 }
          );
        }
      }

      const success = await postJournalEntry(supabase, id, userCompany.userId);
      if (!success) {
        return NextResponse.json({ error: "Failed to post entry. It may already be posted." }, { status: 400 });
      }

      // Set approved_by and approved_at
      await supabase
        .from("journal_entries")
        .update({ approved_by: userCompany.userId, approved_at: new Date().toISOString() })
        .eq("id", id);

      logAuditEvent({
        supabase,
        companyId: userCompany.companyId,
        userId: userCompany.userId,
        action: "post",
        entityType: "journal_entry",
        entityId: id,
        details: { entry_number: entry.entry_number },
        ipAddress: meta.ipAddress,
      });

      return NextResponse.json({ success: true });
    }

    if (action === "void") {
      // Period lock check
      try {
        await assertPeriodOpen(supabase, userCompany.companyId, entry.entry_date);
      } catch (lockErr: unknown) {
        const err = lockErr as { status?: number; message?: string };
        return NextResponse.json({ error: err.message }, { status: err.status || 409 });
      }

      const success = await voidJournalEntry(supabase, id);
      if (!success) {
        return NextResponse.json({ error: "Failed to void entry" }, { status: 400 });
      }

      // Set voided_by and voided_at
      await supabase
        .from("journal_entries")
        .update({ voided_by: userCompany.userId, voided_at: new Date().toISOString() })
        .eq("id", id);

      logAuditEvent({
        supabase,
        companyId: userCompany.companyId,
        userId: userCompany.userId,
        action: "void",
        entityType: "journal_entry",
        entityId: id,
        details: { entry_number: entry.entry_number },
        ipAddress: meta.ipAddress,
      });

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

    // Hard deletes are not allowed for audit compliance.
    // Use PATCH with action=void instead.
    return NextResponse.json(
      { error: "Hard deletion of journal entries is not allowed. Use PATCH with action='void' to void the entry." },
      { status: 405 }
    );
  } catch (error) {
    console.error("DELETE /api/financial/journal-entries/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
