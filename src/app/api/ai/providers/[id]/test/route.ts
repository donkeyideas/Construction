import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getAIProviderById } from "@/lib/queries/ai";
import { decrypt } from "@/lib/ai/encryption";
import { generateText } from "ai";
import { getLanguageModel } from "@/lib/ai/provider-router";
import type { ProviderName } from "@/lib/ai/provider-router";

// ---------------------------------------------------------------------------
// POST /api/ai/providers/[id]/test - Test connection to an AI provider
// ---------------------------------------------------------------------------

export async function POST(
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

    // Fetch the provider config
    const provider = await getAIProviderById(supabase, id);

    if (!provider || provider.company_id !== userCtx.companyId) {
      return NextResponse.json(
        { error: "Provider not found." },
        { status: 404 }
      );
    }

    // Decrypt the API key
    let decryptedKey: string;
    try {
      decryptedKey = decrypt(provider.api_key);
    } catch {
      return NextResponse.json(
        { error: "Failed to decrypt API key. The encryption key may have changed." },
        { status: 500 }
      );
    }

    // Build a minimal language model and attempt a tiny generation
    try {
      const model = getLanguageModel({
        id: provider.id,
        provider_name: provider.provider_name as ProviderName,
        api_key: decryptedKey,
        model_id: provider.model_id,
        is_active: provider.is_active,
        use_for_chat: provider.use_for_chat,
        use_for_documents: provider.use_for_documents,
        use_for_predictions: provider.use_for_predictions,
        is_default: provider.is_default,
        monthly_budget_limit: provider.monthly_budget_limit,
        current_month_usage: provider.current_month_usage,
      });

      // Send a minimal prompt to verify the key and model work
      const result = await generateText({
        model,
        prompt: "Respond with exactly one word: OK",
        maxOutputTokens: 5,
      });

      if (result.text) {
        return NextResponse.json({
          success: true,
          response: result.text.trim(),
        });
      }

      return NextResponse.json({
        success: true,
        response: "Connection established.",
      });
    } catch (aiError: unknown) {
      const errorMessage =
        aiError instanceof Error ? aiError.message : "Unknown error";
      return NextResponse.json(
        {
          success: false,
          error: `Provider test failed: ${errorMessage}`,
        },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("POST /api/ai/providers/[id]/test error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
