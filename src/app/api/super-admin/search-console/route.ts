import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { NextResponse } from "next/server";
import { google } from "googleapis";

const SITE_URL = "sc-domain:construction-gamma-six.vercel.app";

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

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });

    const searchconsole = google.searchconsole({ version: "v1", auth });

    // Calculate date range for last 28 days
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // GSC data has ~2 day lag
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 28);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    const dateStart = formatDate(startDate);
    const dateEnd = formatDate(endDate);

    // Run all queries in parallel
    const [totalsResponse, queriesResponse, pagesResponse, dailyResponse] =
      await Promise.all([
        // 1. Overall totals
        searchconsole.searchanalytics.query({
          siteUrl: SITE_URL,
          requestBody: {
            startDate: dateStart,
            endDate: dateEnd,
            dimensions: [],
            rowLimit: 1,
          },
        }),

        // 2. Top queries
        searchconsole.searchanalytics.query({
          siteUrl: SITE_URL,
          requestBody: {
            startDate: dateStart,
            endDate: dateEnd,
            dimensions: ["query"],
            rowLimit: 20,
          },
        }),

        // 3. Top pages
        searchconsole.searchanalytics.query({
          siteUrl: SITE_URL,
          requestBody: {
            startDate: dateStart,
            endDate: dateEnd,
            dimensions: ["page"],
            rowLimit: 20,
          },
        }),

        // 4. Daily performance
        searchconsole.searchanalytics.query({
          siteUrl: SITE_URL,
          requestBody: {
            startDate: dateStart,
            endDate: dateEnd,
            dimensions: ["date"],
          },
        }),
      ]);

    // Parse totals (flatten for client)
    const totalsRow = totalsResponse.data?.rows?.[0];
    const totalClicks = totalsRow?.clicks ?? 0;
    const impressions = totalsRow?.impressions ?? 0;
    const avgCtr = totalsRow?.ctr ?? 0;
    const avgPosition = totalsRow?.position ?? 0;

    // Parse top queries
    const topQueries = (queriesResponse.data?.rows ?? []).map((row) => ({
      query: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }));

    // Parse top pages
    const topPages = (pagesResponse.data?.rows ?? []).map((row) => ({
      page: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }));

    // Parse daily data
    const daily = (dailyResponse.data?.rows ?? []).map((row) => ({
      date: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }));

    return NextResponse.json({
      configured: true,
      totalClicks,
      impressions,
      avgCtr,
      avgPosition,
      topQueries,
      topPages,
      daily,
    });
  } catch (err) {
    console.error("Search Console API error:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json(
      { error: `Google Search Console API error: ${message}` },
      { status: 500 }
    );
  }
}
