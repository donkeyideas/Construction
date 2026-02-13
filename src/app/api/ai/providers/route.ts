import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getAIProviders,
  createAIProvider,
  maskApiKey,
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
  "deepseek",
];

// ---------------------------------------------------------------------------
// GET /api/ai/providers - List all providers for the company
// ---------------------------------------------------------------------------

export async function GET() {
  try {
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

    const providers = await getAIProviders(supabase, userCtx.companyId);

    // Mask API keys before returning to client
    const masked = providers.map((p) => ({
      id: p.id,
      provider_name: p.provider_name,
      api_key_masked: maskApiKey(p.api_key_encrypted),
      model_id: p.model_id,
      is_active: p.is_active,
      use_for_chat: p.use_for_chat,
      use_for_documents: p.use_for_documents,
      use_for_predictions: p.use_for_predictions,
      is_default: p.is_default,
      monthly_budget_limit: p.monthly_budget_limit,
      current_month_usage: p.current_month_usage,
      created_at: p.created_at,
    }));

    return NextResponse.json(masked);
  } catch (err) {
    console.error("GET /api/ai/providers error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/ai/providers - Create a new AI provider
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();

    // Validate provider_name
    if (!body.provider_name || !VALID_PROVIDERS.includes(body.provider_name)) {
      return NextResponse.json(
        {
          error:
            "Invalid provider_name. Must be one of: " +
            VALID_PROVIDERS.join(", "),
        },
        { status: 400 }
      );
    }

    // Validate api_key
    if (!body.api_key || typeof body.api_key !== "string" || !body.api_key.trim()) {
      return NextResponse.json(
        { error: "API key is required." },
        { status: 400 }
      );
    }

    // Validate model_id
    if (!body.model_id || typeof body.model_id !== "string" || !body.model_id.trim()) {
      return NextResponse.json(
        { error: "Model ID is required." },
        { status: 400 }
      );
    }

    const { provider, error } = await createAIProvider(
      supabase,
      userCtx.companyId,
      {
        provider_name: body.provider_name,
        api_key: body.api_key.trim(),
        model_id: body.model_id.trim(),
        is_active: body.is_active ?? true,
        use_for_chat: body.use_for_chat ?? false,
        use_for_documents: body.use_for_documents ?? false,
        use_for_predictions: body.use_for_predictions ?? false,
        is_default: body.is_default ?? false,
        monthly_budget_limit: body.monthly_budget_limit ?? null,
      }
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(
      { id: provider?.id, success: true },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/ai/providers error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
