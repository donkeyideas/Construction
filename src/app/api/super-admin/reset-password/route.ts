import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id is required." },
        { status: 400 }
      );
    }

    // Get the user's email from their profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("email")
      .eq("id", user_id)
      .single();

    if (!profile?.email) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    // Use admin client to generate a password reset link
    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: profile.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://construction-gamma-six.vercel.app"}/login`,
      },
    });

    if (error) {
      console.error("Reset password error:", error);
      return NextResponse.json(
        { error: "Failed to generate reset link." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Password reset email sent to ${profile.email}`,
    });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
