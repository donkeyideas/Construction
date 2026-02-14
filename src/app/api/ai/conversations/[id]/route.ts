import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// GET /api/ai/conversations/[id] — Get a single conversation
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data, error } = await supabase
    .from("ai_conversations")
    .select("*")
    .eq("id", id)
    .eq("company_id", userCompany.companyId)
    .eq("user_id", userCompany.userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

// PUT /api/ai/conversations/[id] — Update a conversation
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json()) as {
    title?: string;
    messages?: unknown[];
  };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) updates.title = body.title;
  if (body.messages !== undefined) updates.messages = body.messages;

  const { error } = await supabase
    .from("ai_conversations")
    .update(updates)
    .eq("id", id)
    .eq("company_id", userCompany.companyId)
    .eq("user_id", userCompany.userId);

  if (error) {
    console.error("Update conversation error:", error);
    return NextResponse.json({ error: "Failed to update conversation" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/ai/conversations/[id] — Delete a conversation
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", id)
    .eq("company_id", userCompany.companyId)
    .eq("user_id", userCompany.userId);

  if (error) {
    console.error("Delete conversation error:", error);
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
