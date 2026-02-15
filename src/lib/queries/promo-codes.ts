import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  duration_days: number;
  max_uses: number | null;
  current_uses: number;
  plan_granted: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  created_by: string | null;
}

export interface PromoCodeRedemption {
  id: string;
  promo_code_id: string;
  company_id: string;
  user_id: string;
  redeemed_at: string;
  access_expires_at: string;
}

/**
 * Fetch all promo codes ordered by created_at desc (for super-admin).
 */
export async function getPromoCodes(
  supabase: SupabaseClient
): Promise<PromoCode[]> {
  const { data, error } = await supabase
    .from("promo_codes")
    .select(
      "id, code, description, duration_days, max_uses, current_uses, plan_granted, is_active, expires_at, created_at, created_by"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getPromoCodes error:", error);
    return [];
  }

  return (data ?? []) as PromoCode[];
}

/**
 * Validate a promo code. Uses admin client to bypass RLS.
 * Checks: exists, is_active, not expired, current_uses < max_uses (or max_uses is null).
 * Returns the promo code record or null.
 */
export async function validatePromoCode(
  code: string
): Promise<PromoCode | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("promo_codes")
    .select(
      "id, code, description, duration_days, max_uses, current_uses, plan_granted, is_active, expires_at, created_at, created_by"
    )
    .eq("code", code.toUpperCase().trim())
    .single();

  if (error || !data) return null;

  const promo = data as PromoCode;

  // Must be active
  if (!promo.is_active) return null;

  // Must not be expired
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) return null;

  // Must not have exceeded max uses (null means unlimited)
  if (promo.max_uses !== null && promo.current_uses >= promo.max_uses)
    return null;

  return promo;
}

/**
 * Redeem a promo code. Uses admin client to bypass RLS.
 * Increments current_uses, inserts redemption record, updates company subscription.
 */
export async function redeemPromoCode(
  codeId: string,
  companyId: string,
  userId: string,
  durationDays: number,
  planGranted: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  // Increment current_uses
  const { error: updateError } = await admin.rpc("increment_promo_uses", {
    code_id: codeId,
  });

  // Fallback: if RPC doesn't exist, do manual increment
  if (updateError) {
    const { data: current } = await admin
      .from("promo_codes")
      .select("current_uses")
      .eq("id", codeId)
      .single();

    if (!current) {
      return { success: false, error: "Promo code not found." };
    }

    const { error: manualUpdateError } = await admin
      .from("promo_codes")
      .update({ current_uses: (current.current_uses ?? 0) + 1 })
      .eq("id", codeId);

    if (manualUpdateError) {
      return { success: false, error: "Failed to update promo code usage." };
    }
  }

  // Insert redemption record
  const accessExpiresAt = new Date();
  accessExpiresAt.setDate(accessExpiresAt.getDate() + durationDays);

  const { error: redemptionError } = await admin
    .from("promo_code_redemptions")
    .insert({
      promo_code_id: codeId,
      company_id: companyId,
      user_id: userId,
      access_expires_at: accessExpiresAt.toISOString(),
    });

  if (redemptionError) {
    console.error("redeemPromoCode redemption insert error:", redemptionError);
    return { success: false, error: "Failed to record redemption." };
  }

  // Update company subscription_plan and trial_ends_at
  const { error: companyError } = await admin
    .from("companies")
    .update({
      subscription_plan: planGranted,
      trial_ends_at: accessExpiresAt.toISOString(),
    })
    .eq("id", companyId);

  if (companyError) {
    console.error("redeemPromoCode company update error:", companyError);
    return { success: false, error: "Failed to update company subscription." };
  }

  return { success: true };
}
