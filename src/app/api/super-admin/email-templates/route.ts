import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { getEmailTemplates, createEmailTemplate } from "@/lib/queries/email-templates";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const templates = await getEmailTemplates();
    return NextResponse.json({ templates });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { name, subject, body: templateBody, variables, category, is_active } = body;

    if (!name || !subject || !templateBody) {
      return NextResponse.json(
        { error: "Name, subject, and body are required." },
        { status: 400 }
      );
    }

    const validCategories = ["system", "billing", "notification", "marketing", "onboarding"];
    if (category && !validCategories.includes(category)) {
      return NextResponse.json(
        { error: "Invalid category." },
        { status: 400 }
      );
    }

    const result = await createEmailTemplate({
      name,
      subject,
      body: templateBody,
      variables: variables || [],
      category: category || "notification",
      is_active: is_active !== false,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create template." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Template created.", id: result.id },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
