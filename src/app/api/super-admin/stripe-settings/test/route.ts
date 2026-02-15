import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { getStripeInstance } from "@/lib/stripe/config";
import { NextResponse } from "next/server";

/**
 * POST: Test the current Stripe connection by listing customers.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const stripe = await getStripeInstance();

    if (!stripe) {
      return NextResponse.json(
        {
          success: false,
          error: "No Stripe secret key configured for the current mode.",
        },
        { status: 200 }
      );
    }

    // Try listing customers to verify connectivity
    await stripe.customers.list({ limit: 1 });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error occurred.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 200 }
    );
  }
}
