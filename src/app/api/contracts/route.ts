import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getContracts,
  createContract,
  type ContractStatus,
  type ContractType,
} from "@/lib/queries/contracts";

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

    return NextResponse.json(contract, { status: 201 });
  } catch (err) {
    console.error("POST /api/contracts error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
