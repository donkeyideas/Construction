import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getContracts,
  createContract,
  type ContractStatus,
  type ContractType,
} from "@/lib/queries/contracts";
import { createNotifications } from "@/lib/utils/notifications";
import { checkSubscriptionAccess } from "@/lib/guards/subscription-guard";
import {
  buildCompanyAccountMap,
  generateContractJournalEntry,
} from "@/lib/utils/invoice-accounting";
import { ensureRequiredAccounts } from "@/lib/utils/backfill-journal-entries";

// ---------------------------------------------------------------------------
// GET /api/contracts — List contracts for the current user's company
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
    const status = searchParams.get("status") as ContractStatus | null;
    const contract_type = searchParams.get("contract_type") as ContractType | null;
    const search = searchParams.get("search");

    const contracts = await getContracts(supabase, userCtx.companyId, {
      status: status ?? undefined,
      contract_type: contract_type ?? undefined,
      search: search ?? undefined,
    });

    return NextResponse.json(contracts);
  } catch (err) {
    console.error("GET /api/contracts error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/contracts — Create a new contract
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

    const subBlock = await checkSubscriptionAccess(userCtx.companyId, "POST");
    if (subBlock) return subBlock;

    const body = await request.json();

    // Validate required fields
    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "Contract title is required." },
        { status: 400 }
      );
    }

    const { contract, error } = await createContract(
      supabase,
      userCtx.companyId,
      userCtx.userId,
      {
        title: body.title.trim(),
        description: body.description?.trim() || undefined,
        contract_type: body.contract_type || undefined,
        party_name: body.party_name?.trim() || undefined,
        party_email: body.party_email?.trim() || undefined,
        contract_amount: body.contract_amount ? Number(body.contract_amount) : undefined,
        retention_pct: body.retention_pct ? Number(body.retention_pct) : undefined,
        start_date: body.start_date || undefined,
        end_date: body.end_date || undefined,
        payment_terms: body.payment_terms || undefined,
        scope_of_work: body.scope_of_work?.trim() || undefined,
        insurance_required: body.insurance_required ?? false,
        bond_required: body.bond_required ?? false,
        project_id: body.project_id || undefined,
      }
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    try {
      await createNotifications(supabase, {
        companyId: userCtx.companyId,
        actorUserId: userCtx.userId,
        title: `New Contract: ${body.title.trim()}`,
        message: `A new contract "${body.title.trim()}" has been created.${body.party_name ? ` Party: ${body.party_name}.` : ""}`,
        notificationType: "info",
        entityType: "contract",
        entityId: contract?.id,
      });
    } catch (e) { console.warn("Notification failed:", e); }

    // Auto-generate contract JE (WIP accounting) — non-blocking
    if (contract && body.contract_amount && Number(body.contract_amount) > 0) {
      try {
        await ensureRequiredAccounts(supabase, userCtx.companyId);
        const accountMap = await buildCompanyAccountMap(supabase, userCtx.companyId);
        await generateContractJournalEntry(supabase, userCtx.companyId, userCtx.userId, {
          id: contract.id,
          contract_number: contract.contract_number ?? "",
          title: body.title.trim(),
          contract_amount: Number(body.contract_amount),
          start_date: body.start_date || new Date().toISOString().split("T")[0],
          project_id: body.project_id || undefined,
        }, accountMap);
      } catch (jeErr) {
        console.warn("Contract JE generation failed (non-blocking):", jeErr);
      }
    }

    return NextResponse.json(contract, { status: 201 });
  } catch (err) {
    console.error("POST /api/contracts error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
