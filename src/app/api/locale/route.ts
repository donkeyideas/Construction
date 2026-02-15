import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { locale } = await request.json();

  if (locale !== "en" && locale !== "es") {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const response = NextResponse.json({ locale });
  response.cookies.set("locale", locale, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax",
  });

  return response;
}
