import { validatePromoCode } from "@/lib/queries/promo-codes";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { valid: false, error: "Code is required." },
        { status: 400 }
      );
    }

    const promo = await validatePromoCode(code);

    if (!promo) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({
      valid: true,
      plan: promo.plan_granted,
      duration_days: promo.duration_days,
    });
  } catch {
    return NextResponse.json(
      { valid: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
