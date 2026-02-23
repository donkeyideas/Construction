import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * GET /api/super-admin/inbox/count
 * Returns { newCount: number } — the number of contact_submissions with status='new'.
 * Lightweight endpoint for the topbar/sidebar badge.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ newCount: 0 });
    }

    const admin = createAdminClient();
    const { count } = await admin
      .from("contact_submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");

    return NextResponse.json({ newCount: count ?? 0 });
  } catch {
    return NextResponse.json({ newCount: 0 });
  }
}
