import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getContractById,
  updateContract,
} from "@/lib/queries/contracts";
import { checkSubscriptionAccess } from "@/lib/guards/subscription-guard";
import {
  buildCompanyAccountMap,
  generateContractJournalEntry,
} from "@/lib/utils/invoice-accounting";
import { ensureRequiredAccounts } from "@/lib/utils/backfill-journal-entries";

// ---------------------------------------------------------------------------
// GET /api/contracts/[id] — Get contract detail
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

    const contract = await getContractById(supabase, id);

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    // Verify the contract belongs to the user's company
    if (contract.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(contract);
  } catch (err) {
    console.error("GET /api/contracts/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/contracts/[id] — Update contract
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

    const subBlock = await checkSubscriptionAccess(userCtx.companyId, "PATCH");
    if (subBlock) return subBlock;

    // Verify the contract exists and belongs to the company
    const existing = await getContractById(supabase, id);
    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const { contract, error } = await updateContract(supabase, id, body);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    // Auto-generate contract JE if contract_amount > 0 (idempotent — won't duplicate)
    const contractAmount = Number(contract?.contract_amount ?? body.contract_amount ?? 0);
    if (contract && contractAmount > 0) {
      try {
        await ensureRequiredAccounts(supabase, userCtx.companyId);
        const accountMap = await buildCompanyAccountMap(supabase, userCtx.companyId);
        await generateContractJournalEntry(supabase, userCtx.companyId, userCtx.userId, {
          id: contract.id,
          contract_number: contract.contract_number ?? "",
          title: contract.title ?? "Contract",
          contract_amount: contractAmount,
          start_date: contract.start_date ?? new Date().toISOString().split("T")[0],
          project_id: contract.project_id || undefined,
        }, accountMap);
      } catch (jeErr) {
        console.warn("Contract JE generation failed (non-blocking):", jeErr);
      }
    }

    return NextResponse.json(contract);
  } catch (err) {
    console.error("PATCH /api/contracts/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/contracts/[id] — Delete a contract
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

    const subBlock2 = await checkSubscriptionAccess(userCtx.companyId, "DELETE");
    if (subBlock2) return subBlock2;

    // Verify the contract exists and belongs to the company
    const existing = await getContractById(supabase, id);
    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("contracts")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/contracts/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
