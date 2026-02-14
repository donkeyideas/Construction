import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// GET /api/ai/conversations — List conversations for the current user
export async function GET() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id, title, created_at, updated_at")
    .eq("company_id", userCompany.companyId)
    .eq("user_id", userCompany.userId)
    .order("updated_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("List conversations error:", error);
    return NextResponse.json({ error: "Failed to list conversations" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// POST /api/ai/conversations — Create a new conversation
export async function POST(req: Request) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { title, messages } = (await req.json()) as {
    title: string;
    messages: unknown[];
  };

  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({
      company_id: userCompany.companyId,
      user_id: userCompany.userId,
      title: title || "New Conversation",
      messages: messages ?? [],
    })
    .select("id, title, created_at, updated_at")
    .single();

  if (error) {
    console.error("Create conversation error:", error);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }

  return NextResponse.json(data);
}
