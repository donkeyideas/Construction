import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getBids, createBid, type BidStatus } from "@/lib/queries/crm";

// ---------------------------------------------------------------------------
// GET /api/crm/bids - List bids
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as BidStatus | null;
    const search = searchParams.get("search") ?? undefined;

    const bids = await getBids(supabase, userCtx.companyId, {
      status: status ?? undefined,
      search,
    });

    return NextResponse.json(bids);
  } catch (err) {
    console.error("GET /api/crm/bids error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/crm/bids - Create a new bid
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (
      !body.bid_number ||
      typeof body.bid_number !== "string" ||
      !body.bid_number.trim()
    ) {
      return NextResponse.json(
        { error: "Bid number is required." },
        { status: 400 }
      );
    }

    if (
      !body.project_name ||
      typeof body.project_name !== "string" ||
      !body.project_name.trim()
    ) {
      return NextResponse.json(
        { error: "Project name is required." },
        { status: 400 }
      );
    }

    const { bid, error } = await createBid(supabase, userCtx.companyId, {
      bid_number: body.bid_number.trim(),
      project_name: body.project_name.trim(),
      client_name: body.client_name || null,
      opportunity_id: body.opportunity_id || null,
      bid_date: body.bid_date || null,
      due_date: body.due_date || null,
      estimated_cost: body.estimated_cost ?? null,
      bid_amount: body.bid_amount ?? null,
      scope_description: body.scope_description || null,
      line_items: body.line_items || null,
      status: body.status || "in_progress",
      submitted_by: body.status === "submitted" ? userCtx.userId : null,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(bid, { status: 201 });
  } catch (err) {
    console.error("POST /api/crm/bids error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
