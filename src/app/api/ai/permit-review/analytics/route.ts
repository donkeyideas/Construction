import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

export async function GET(req: Request) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);
  if (!userCompany) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const jurisdiction = url.searchParams.get("jurisdiction");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  let query = supabase
    .from("permit_reviews")
    .select(
      "id, overall_status, overall_confidence, sections, jurisdiction, building_type, processing_time_ms, created_at"
    )
    .eq("company_id", userCompany.companyId)
    .order("created_at", { ascending: true });

  if (jurisdiction) query = query.eq("jurisdiction", jurisdiction);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo);

  const { data: reviews } = await query;

  if (!reviews || reviews.length === 0) {
    return NextResponse.json({ stats: null, charts: null });
  }

  const totalReviews = reviews.length;
  const avgConfidence =
    reviews.reduce((s, r) => s + Number(r.overall_confidence || 0), 0) /
    totalReviews;
  const avgTime =
    reviews.reduce((s, r) => s + (r.processing_time_ms || 0), 0) /
    totalReviews;

  // Status distribution
  const statusCounts = { likely_compliant: 0, needs_review: 0, issues_found: 0 };
  for (const r of reviews) {
    const key = r.overall_status as keyof typeof statusCounts;
    if (key in statusCounts) statusCounts[key]++;
  }

  // Section flag rates
  const sectionStats: Record<
    string,
    { total: number; pass: number; flag: number; fail: number }
  > = {};
  for (const r of reviews) {
    const sections = (r.sections || []) as Array<{
      name: string;
      status: string;
    }>;
    for (const s of sections) {
      if (!sectionStats[s.name])
        sectionStats[s.name] = { total: 0, pass: 0, flag: 0, fail: 0 };
      sectionStats[s.name].total++;
      const st = s.status as "pass" | "flag" | "fail";
      if (st in sectionStats[s.name]) sectionStats[s.name][st]++;
    }
  }

  // Most flagged section
  let mostFlagged = "";
  let maxFlagRate = 0;
  for (const [name, stats] of Object.entries(sectionStats)) {
    const flagRate = (stats.flag + stats.fail) / stats.total;
    if (flagRate > maxFlagRate) {
      maxFlagRate = flagRate;
      mostFlagged = name;
    }
  }

  // Reviews over time by month
  const monthlyData: Record<string, number> = {};
  for (const r of reviews) {
    const month = r.created_at.substring(0, 7);
    monthlyData[month] = (monthlyData[month] || 0) + 1;
  }

  const sectionBarData = Object.entries(sectionStats).map(([name, stats]) => ({
    name,
    flagRate: Math.round(((stats.flag + stats.fail) / stats.total) * 100),
    passRate: Math.round((stats.pass / stats.total) * 100),
    total: stats.total,
  }));

  return NextResponse.json({
    stats: {
      totalReviews,
      avgConfidence: Math.round(avgConfidence * 10) / 10,
      avgTimeSeconds: Math.round(avgTime / 100) / 10,
      mostFlaggedSection: mostFlagged,
      mostFlaggedRate: Math.round(maxFlagRate * 100),
    },
    charts: {
      statusDistribution: [
        { name: "Likely Compliant", value: statusCounts.likely_compliant, color: "#16a34a" },
        { name: "Needs Review", value: statusCounts.needs_review, color: "#d97706" },
        { name: "Issues Found", value: statusCounts.issues_found, color: "#dc2626" },
      ],
      reviewsOverTime: Object.entries(monthlyData).map(([month, count]) => ({
        month,
        count,
      })),
      sectionFlagRates: sectionBarData,
    },
  });
}
