import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

// GA4 Property ID for the platform
const GA4_PROPERTY_ID = "524843538";

export async function GET() {
  try {
    const supabase = await createClient();
    const isAdmin = await isPlatformAdmin(supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Read service account credentials from platform_settings
    const { data: setting } = await supabase
      .from("platform_settings")
      .select("value, is_encrypted")
      .eq("key", "google_service_account_json")
      .single();

    if (!setting || !setting.value) {
      return NextResponse.json({ configured: false });
    }

    let credentials: { client_email: string; private_key: string };
    try {
      credentials = JSON.parse(setting.value);
    } catch {
      return NextResponse.json(
        { error: "Invalid service account JSON in platform_settings." },
        { status: 500 }
      );
    }

    const analyticsClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
    });

    const property = `properties/${GA4_PROPERTY_ID}`;

    // Calculate date range for last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    const dateRange = {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
    };

    // Run all reports in parallel
    const [overviewReport, topPagesReport, trafficSourcesReport, dailyReport] =
      await Promise.all([
        // 1. Overview metrics
        analyticsClient.runReport({
          property,
          dateRanges: [dateRange],
          metrics: [
            { name: "screenPageViews" },
            { name: "sessions" },
            { name: "totalUsers" },
            { name: "averageSessionDuration" },
          ],
        }),

        // 2. Top pages
        analyticsClient.runReport({
          property,
          dateRanges: [dateRange],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }],
          orderBys: [
            {
              metric: { metricName: "screenPageViews" },
              desc: true,
            },
          ],
          limit: 20,
        }),

        // 3. Traffic sources
        analyticsClient.runReport({
          property,
          dateRanges: [dateRange],
          dimensions: [{ name: "sessionDefaultChannelGroup" }],
          metrics: [{ name: "sessions" }],
          orderBys: [
            {
              metric: { metricName: "sessions" },
              desc: true,
            },
          ],
        }),

        // 4. Daily breakdown
        analyticsClient.runReport({
          property,
          dateRanges: [dateRange],
          dimensions: [{ name: "date" }],
          metrics: [
            { name: "screenPageViews" },
            { name: "sessions" },
          ],
          orderBys: [
            {
              dimension: { dimensionName: "date" },
              desc: false,
            },
          ],
        }),
      ]);

    // Parse overview metrics
    const overviewRow = overviewReport[0]?.rows?.[0];
    const overview = {
      pageViews: Number(overviewRow?.metricValues?.[0]?.value ?? 0),
      sessions: Number(overviewRow?.metricValues?.[1]?.value ?? 0),
      totalUsers: Number(overviewRow?.metricValues?.[2]?.value ?? 0),
      avgSessionDuration: Number(overviewRow?.metricValues?.[3]?.value ?? 0),
    };

    // Parse top pages
    const topPages = (topPagesReport[0]?.rows ?? []).map((row) => ({
      path: row.dimensionValues?.[0]?.value ?? "",
      pageViews: Number(row.metricValues?.[0]?.value ?? 0),
    }));

    // Parse traffic sources
    const trafficSources = (trafficSourcesReport[0]?.rows ?? []).map((row) => ({
      channel: row.dimensionValues?.[0]?.value ?? "",
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
    }));

    // Parse daily data
    const daily = (dailyReport[0]?.rows ?? []).map((row) => ({
      date: row.dimensionValues?.[0]?.value ?? "",
      pageViews: Number(row.metricValues?.[0]?.value ?? 0),
      sessions: Number(row.metricValues?.[1]?.value ?? 0),
    }));

    return NextResponse.json({
      configured: true,
      overview,
      topPages,
      trafficSources,
      daily,
    });
  } catch (err) {
    console.error("GA4 Analytics API error:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json(
      { error: `Google Analytics API error: ${message}` },
      { status: 500 }
    );
  }
}
