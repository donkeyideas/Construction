import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getCmsPageBySlug,
  updateCmsPage,
  deleteCmsPage,
  togglePagePublish,
} from "@/lib/queries/content";

// ---------------------------------------------------------------------------
// GET /api/admin/content/[slug] - Get single CMS page
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const page = await getCmsPageBySlug(supabase, userCtx.companyId, slug);

    if (!page) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(page);
  } catch (err) {
    console.error("GET /api/admin/content/[slug] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/content/[slug] - Update a CMS page
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify the page exists and belongs to the company
    const existing = await getCmsPageBySlug(supabase, userCtx.companyId, slug);
    if (!existing) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // If only toggling publish status
    if (
      Object.keys(body).length === 1 &&
      typeof body.is_published === "boolean"
    ) {
      const { page, error } = await togglePagePublish(
        supabase,
        existing.id,
        body.is_published
      );

      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }

      return NextResponse.json(page);
    }

    // Validate slug if being changed
    if (body.slug && body.slug !== slug) {
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
    }

    // Build update payload
    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.meta_title !== undefined) updateData.meta_title = body.meta_title;
    if (body.meta_description !== undefined)
      updateData.meta_description = body.meta_description;
    if (body.is_published !== undefined)
      updateData.is_published = body.is_published;

    const { page, error } = await updateCmsPage(
      supabase,
      existing.id,
      userCtx.userId,
      updateData
    );

    if (error) {
      if (error.includes("duplicate key") || error.includes("unique")) {
        return NextResponse.json(
          { error: "A page with this slug already exists." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(page);
  } catch (err) {
    console.error("PATCH /api/admin/content/[slug] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/admin/content/[slug] - Delete a CMS page
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify the page exists and belongs to the company
    const existing = await getCmsPageBySlug(supabase, userCtx.companyId, slug);
    if (!existing) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 }
      );
    }

    const { error } = await deleteCmsPage(supabase, existing.id);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/content/[slug] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
