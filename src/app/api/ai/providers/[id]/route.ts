import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getAIProviderById,
  updateAIProvider,
  deleteAIProvider,
} from "@/lib/queries/ai";

// ---------------------------------------------------------------------------
// Valid provider names
// ---------------------------------------------------------------------------

const VALID_PROVIDERS = [
  "openai",
  "anthropic",
  "google",
  "groq",
  "mistral",
  "cohere",
  "xai",
  "bedrock",
];

// ---------------------------------------------------------------------------
// PATCH /api/ai/providers/[id] - Update a provider
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (userCtx.role !== "owner" && userCtx.role !== "admin") {
      return NextResponse.json(
        { error: "Insufficient permissions." },
        { status: 403 }
      );
    }

    // Verify the provider belongs to this company
    const existing = await getAIProviderById(supabase, id);

    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Provider not found." },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate provider_name if provided
    if (body.provider_name && !VALID_PROVIDERS.includes(body.provider_name)) {
      return NextResponse.json(
        {
          error:
            "Invalid provider_name. Must be one of: " +
            VALID_PROVIDERS.join(", "),
        },
        { status: 400 }
      );
    }

    // Validate model_id if provided
    if (
      body.model_id !== undefined &&
      (typeof body.model_id !== "string" || !body.model_id.trim())
    ) {
      return NextResponse.json(
        { error: "Model ID cannot be empty." },
        { status: 400 }
      );
    }

    const { provider, error } = await updateAIProvider(supabase, id, {
      provider_name: body.provider_name,
      api_key: body.api_key?.trim() || undefined,
      model_id: body.model_id?.trim(),
      is_active: body.is_active,
      use_for_chat: body.use_for_chat,
      use_for_documents: body.use_for_documents,
      use_for_predictions: body.use_for_predictions,
      is_default: body.is_default,
      monthly_budget_limit: body.monthly_budget_limit,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ id: provider?.id, success: true });
  } catch (err) {
    console.error("PATCH /api/ai/providers/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/ai/providers/[id] - Remove a provider
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (userCtx.role !== "owner" && userCtx.role !== "admin") {
      return NextResponse.json(
        { error: "Insufficient permissions." },
        { status: 403 }
      );
    }

    // Verify the provider belongs to this company
    const existing = await getAIProviderById(supabase, id);

    if (!existing || existing.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Provider not found." },
        { status: 404 }
      );
    }

    const { error } = await deleteAIProvider(supabase, id);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/ai/providers/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
