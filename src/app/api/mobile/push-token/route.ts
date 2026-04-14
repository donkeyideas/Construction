import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { token, platform } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Get user's company
    const { data: membership } = await supabase
      .from("company_members")
      .select("company_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "No company found" }, { status: 400 });
    }

    // Upsert token (ignore conflict on user_id + token)
    const { error } = await supabase
      .from("push_tokens")
      .upsert(
        {
          user_id: user.id,
          company_id: membership.company_id,
          token,
          platform: platform || null,
        },
        { onConflict: "user_id,token" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    await supabase
      .from("push_tokens")
      .delete()
      .eq("user_id", user.id)
      .eq("token", token);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
