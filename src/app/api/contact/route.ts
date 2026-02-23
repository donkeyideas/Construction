import { NextRequest, NextResponse } from "next/server";
import { createContactSubmission } from "@/lib/queries/contact-submissions";

// ---------------------------------------------------------------------------
// POST /api/contact — Public form submission (no auth required)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Honeypot check — hidden field "website" should be empty
    if (body.website) {
      // Silently accept to not tip off bots
      return NextResponse.json({ success: true });
    }

    // Validate type
    if (!body.type || !["contact", "custom_plan"].includes(body.type)) {
      return NextResponse.json(
        { error: "Invalid submission type" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!body.email || typeof body.email !== "string" || !body.email.trim()) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email.trim())) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (!body.message || typeof body.message !== "string" || !body.message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const { submission, error } = await createContactSubmission({
      type: body.type,
      name: body.name.trim(),
      email: body.email.trim(),
      phone: body.phone?.trim() || null,
      company_name: body.company_name?.trim() || null,
      company_size: body.company_size || null,
      modules_interested: body.modules_interested || [],
      budget_range: body.budget_range || null,
      subject: body.subject?.trim() || null,
      message: body.message.trim(),
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: submission?.id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/contact error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
