import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_profiles")
    .select("preferences")
    .eq("id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data?.preferences || {});
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Get existing preferences and merge
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("preferences")
    .eq("id", user.id)
    .single();

  const merged = { ...(existing?.preferences || {}), ...body };

  const { error } = await supabase
    .from("user_profiles")
    .update({ preferences: merged })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(merged);
}
