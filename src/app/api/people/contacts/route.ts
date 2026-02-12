import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import {
  getContacts,
  createContact,
  type ContactType,
} from "@/lib/queries/people";

// ---------------------------------------------------------------------------
// GET /api/people/contacts - List contacts
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as ContactType | null;
    const search = searchParams.get("search") ?? undefined;

    const contacts = await getContacts(supabase, userCtx.companyId, {
      type: type ?? undefined,
      search,
    });

    return NextResponse.json(contacts);
  } catch (err) {
    console.error("GET /api/people/contacts error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/people/contacts - Create a new contact
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (
      !body.first_name ||
      typeof body.first_name !== "string" ||
      !body.first_name.trim()
    ) {
      return NextResponse.json(
        { error: "First name is required." },
        { status: 400 }
      );
    }

    if (
      !body.last_name ||
      typeof body.last_name !== "string" ||
      !body.last_name.trim()
    ) {
      return NextResponse.json(
        { error: "Last name is required." },
        { status: 400 }
      );
    }

    const validTypes: ContactType[] = [
      "employee",
      "subcontractor",
      "vendor",
      "client",
      "tenant",
    ];
    const contactType = (body.contact_type || "employee") as ContactType;
    if (!validTypes.includes(contactType)) {
      return NextResponse.json(
        { error: "Invalid contact type." },
        { status: 400 }
      );
    }

    const { contact, error } = await createContact(
      supabase,
      userCtx.companyId,
      {
        contact_type: contactType,
        first_name: body.first_name.trim(),
        last_name: body.last_name.trim(),
        email: body.email || null,
        phone: body.phone || null,
        company_name: body.company_name || null,
        job_title: body.job_title || null,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        zip: body.zip || null,
        notes: body.notes || null,
        is_active: body.is_active ?? true,
        user_id: body.user_id || null,
      }
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(contact, { status: 201 });
  } catch (err) {
    console.error("POST /api/people/contacts error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
