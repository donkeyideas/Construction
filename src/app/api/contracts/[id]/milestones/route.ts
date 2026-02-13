import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getContractById,
  getContractMilestones,
  createMilestone,
} from "@/lib/queries/contracts";

// ---------------------------------------------------------------------------
// GET /api/contracts/[id]/milestones — List milestones for a contract
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

    // Verify the contract exists and belongs to the company
    const contract = await getContractById(supabase, id);
    if (!contract || contract.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    const milestones = await getContractMilestones(supabase, id);

    return NextResponse.json(milestones);
  } catch (err) {
    console.error("GET /api/contracts/[id]/milestones error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/contracts/[id]/milestones — Create a milestone for a contract
// ---------------------------------------------------------------------------

export async function POST(
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

    // Verify the contract exists and belongs to the company
    const contract = await getContractById(supabase, id);
    if (!contract || contract.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "Milestone title is required." },
        { status: 400 }
      );
    }

    const { milestone, error } = await createMilestone(
      supabase,
      userCtx.companyId,
      id,
      {
        title: body.title.trim(),
        description: body.description?.trim() || undefined,
        due_date: body.due_date || undefined,
        amount: body.amount ? Number(body.amount) : undefined,
        sort_order: body.sort_order ? Number(body.sort_order) : undefined,
      }
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(milestone, { status: 201 });
  } catch (err) {
    console.error("POST /api/contracts/[id]/milestones error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
