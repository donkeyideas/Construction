import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getCmsPages, createCmsPage } from "@/lib/queries/content";

// ---------------------------------------------------------------------------
// GET /api/admin/content - List all CMS pages
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const pages = await getCmsPages(supabase, userCtx.companyId);
    return NextResponse.json(pages);
  } catch (err) {
    console.error("GET /api/admin/content error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/content - Create a new CMS page
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "Page title is required." },
        { status: 400 }
      );
    }

    if (!body.slug || typeof body.slug !== "string" || !body.slug.trim()) {
      return NextResponse.json(
        { error: "Page slug is required." },
        { status: 400 }
      );
    }

    // Validate slug format (lowercase, alphanumeric, hyphens only)
    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugPattern.test(body.slug.trim())) {
      return NextResponse.json(
        {
          error:
            "Slug must contain only lowercase letters, numbers, and hyphens.",
        },
        { status: 400 }
      );
    }

    const { page, error } = await createCmsPage(
      supabase,
      userCtx.companyId,
      userCtx.userId,
      {
        title: body.title.trim(),
        slug: body.slug.trim(),
        content: body.content ?? {},
        meta_title: body.meta_title ?? undefined,
        meta_description: body.meta_description ?? undefined,
        is_published: body.is_published ?? false,
      }
    );

    if (error) {
      // Handle unique constraint violation for slug
      if (error.includes("duplicate key") || error.includes("unique")) {
        return NextResponse.json(
          { error: "A page with this slug already exists." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(page, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/content error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
