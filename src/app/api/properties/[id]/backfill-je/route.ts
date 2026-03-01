import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { generatePropertyPurchaseJournalEntry } from "@/lib/utils/invoice-accounting";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/properties/[id]/backfill-je
 * Retroactively generate the purchase journal entry for a property.
 * Safe to call multiple times — idempotent (won't create duplicate JEs).
 * Body: { financing_method?: "cash" | "mortgage" }  (default: "mortgage")
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify property belongs to the company
    const { data: property, error: propErr } = await supabase
      .from("properties")
      .select("id, name, purchase_price")
      .eq("id", id)
      .eq("company_id", ctx.companyId)
      .single();

    if (propErr || !property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const purchasePrice = Number(property.purchase_price) || 0;
    if (purchasePrice <= 0) {
      return NextResponse.json({ error: "Property has no purchase price — no JE needed." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const financingMethod: "cash" | "mortgage" =
      body.financing_method === "cash" ? "cash" : "mortgage";

    const result = await generatePropertyPurchaseJournalEntry(
      supabase,
      ctx.companyId,
      ctx.userId,
      { id: property.id, name: property.name, purchase_price: purchasePrice },
      financingMethod
    );

    if (!result) {
      return NextResponse.json(
        { error: "Could not generate journal entry — check Chart of Accounts setup." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, journalEntryId: result.journalEntryId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
