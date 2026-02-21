import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

interface RouteContext {
  params: Promise<{ id: string; announcementId: string }>;
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id, announcementId } = await context.params;
    const supabase = await createClient();
    const ctx = await getCurrentUserCompany(supabase);

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the property belongs to the user's company
    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("id", id)
      .eq("company_id", ctx.companyId)
      .single();

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Verify the announcement belongs to this property
    const { data: announcement } = await supabase
      .from("tenant_announcements")
      .select("id")
      .eq("id", announcementId)
      .eq("property_id", id)
      .eq("company_id", ctx.companyId)
      .single();

    if (!announcement) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("tenant_announcements")
      .delete()
      .eq("id", announcementId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
