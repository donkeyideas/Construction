import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { validatePromoCode, redeemPromoCode } from "@/lib/queries/promo-codes";
import { logAuditEvent } from "@/lib/utils/audit-logger";
import { checkRateLimit } from "@/lib/utils/rate-limiter";

interface RegisterBody {
  email: string;
  password: string;
  full_name: string;
  company_name: string;
  company_slug: string;
  industry_type?: string;
  phone?: string | null;
  promo_code?: string | null;
  company_size?: string | null;
  website?: string | null;
  selected_modules?: string[] | null;
  subscription_plan?: string | null;
  accepted_terms?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function cleanupRegistration(supabase: any, userId?: string, companyId?: string) {
  if (companyId) {
    try { await supabase.from("companies").delete().eq("id", companyId); }
    catch (e) { console.error("Cleanup: failed to delete company", companyId, e); }
  }
  if (userId) {
    try { await supabase.from("user_profiles").delete().eq("id", userId); }
    catch (e) { console.error("Cleanup: failed to delete profile", userId, e); }
    try { await supabase.auth.admin.deleteUser(userId); }
    catch (e) { console.error("Cleanup: failed to delete auth user", userId, e); }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 registration attempts per IP per hour
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { allowed, retryAfterMs } = checkRateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
      );
    }

    // Check if company registration is enabled
    const checkAdmin = createAdminClient();
    const { data: regSetting } = await checkAdmin
      .from("platform_settings")
      .select("value")
      .eq("key", "company_registration_enabled")
      .single();

    if (regSetting?.value === "false") {
      return NextResponse.json(
        { error: "Registration is currently closed. Please contact the platform administrator." },
        { status: 403 }
      );
    }

    const body: RegisterBody = await request.json();

    const { email, password, full_name, company_name, company_slug, industry_type, phone } = body;

    // Validate required fields
    if (!email || !password || !full_name || !company_name || !company_slug) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, full_name, company_name, company_slug" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    if (company_slug.length < 2 || !slugRegex.test(company_slug)) {
      return NextResponse.json(
        { error: "Company slug must be at least 2 characters and contain only lowercase letters, numbers, and hyphens." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if company slug is already taken
    const { data: existingCompany } = await supabase
      .from("companies")
      .select("id")
      .eq("slug", company_slug)
      .single();

    if (existingCompany) {
      return NextResponse.json(
        { error: "This company URL slug is already taken. Please choose a different one." },
        { status: 409 }
      );
    }

    // Step 1: Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    });

    if (authError) {
      // Handle duplicate email
      if (authError.message?.includes("already been registered") || authError.message?.includes("already exists")) {
        return NextResponse.json(
          { error: "An account with this email already exists." },
          { status: 409 }
        );
      }
      console.error("Registration auth error:", authError.message);
      return NextResponse.json(
        { error: "Registration failed. Please check your information and try again." },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    // Step 2: Create user_profile record
    const { error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        id: userId,
        full_name,
        email,
        phone: phone || null,
      });

    if (profileError) {
      await cleanupRegistration(supabase, userId);
      return NextResponse.json(
        { error: "Failed to create user profile. Please try again." },
        { status: 500 }
      );
    }

    // Update accepted_terms_at if user accepted terms
    if (body.accepted_terms) {
      await supabase
        .from("user_profiles")
        .update({ accepted_terms_at: new Date().toISOString() })
        .eq("id", userId);
    }

    // Step 3: Create company record (14-day free trial)
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: company_name,
        slug: company_slug,
        industry_type: industry_type || null,
        created_by: userId,
        company_size: body.company_size || null,
        website: body.website || null,
        selected_modules: body.selected_modules || [],
        subscription_plan: body.subscription_plan || "starter",
        subscription_status: "trialing",
        trial_ends_at: trialEndsAt,
      })
      .select("id")
      .single();

    if (companyError) {
      await cleanupRegistration(supabase, userId);
      return NextResponse.json(
        { error: "Failed to create company. Please try again." },
        { status: 500 }
      );
    }

    const companyId = companyData.id;

    // Step 4: Create company_member record (owner role)
    const { error: memberError } = await supabase
      .from("company_members")
      .insert({
        company_id: companyId,
        user_id: userId,
        role: "owner",
      });

    if (memberError) {
      await cleanupRegistration(supabase, userId, companyId);
      return NextResponse.json(
        { error: "Failed to set up company membership. Please try again." },
        { status: 500 }
      );
    }

    // Chart of accounts is NOT auto-seeded. Users can load defaults from
    // the Chart of Accounts page or import their own via CSV.

    // Step 5: If promo code provided, validate & redeem
    if (body.promo_code) {
      const promo = await validatePromoCode(body.promo_code);
      if (promo) {
        await redeemPromoCode(
          promo.id,
          companyId,
          userId,
          promo.duration_days,
          promo.plan_granted
        );
      }
    }

    // Record subscription event for revenue tracking
    supabase
      .from("subscription_events")
      .insert({
        company_id: companyId,
        event_type: "created",
        plan_from: null,
        plan_to: body.subscription_plan || "starter",
        amount: 0,
        stripe_event_id: `register_${companyId}_${Date.now()}`,
      })
      .then(() => {});

    logAuditEvent({
      supabase,
      companyId,
      userId,
      action: "company_registered",
      entityType: "company",
      entityId: companyId,
      details: { company_name, email },
    });

    return NextResponse.json(
      {
        message: "Registration successful.",
        user_id: userId,
        company_id: companyId,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during registration." },
      { status: 500 }
    );
  }
}
