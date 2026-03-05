import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import PermitReviewClient from "./PermitReviewClient";

export const metadata = { title: "AI Permit Review - Buildwrk" };

export default async function PermitReviewPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);
  if (!userCompany) redirect("/register");

  const { companyId } = userCompany;

  // Fetch providers, projects, and past reviews in parallel
  const [providersRes, projectsRes, reviewsRes] = await Promise.all([
    supabase
      .from("ai_provider_configs")
      .select("id, provider_name, model_id, is_active, task_type")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("provider_name"),
    supabase
      .from("projects")
      .select("id, name, code")
      .eq("company_id", companyId)
      .order("name"),
    supabase
      .from("permit_reviews")
      .select("id, title, overall_status, overall_confidence, building_type, jurisdiction, processing_time_ms, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const providers = (providersRes.data ?? []).map((p) => ({
    id: p.id as string,
    provider_name: p.provider_name as string,
    model_id: (p.model_id ?? "") as string,
    task_type: (p.task_type ?? "chat") as string,
  }));

  const hasProvider = providers.length > 0;

  const projects = (projectsRes.data ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    code: (p.code ?? "") as string,
  }));

  const pastReviews = (reviewsRes.data ?? []).map((r) => ({
    id: r.id as string,
    title: (r.title ?? "Untitled") as string,
    overall_status: (r.overall_status ?? "needs_review") as string,
    overall_confidence: Number(r.overall_confidence) || 0,
    building_type: r.building_type as string | null,
    jurisdiction: r.jurisdiction as string | null,
    processing_time_ms: r.processing_time_ms as number | null,
    created_at: r.created_at as string,
  }));

  return (
    <PermitReviewClient
      companyId={companyId}
      hasProvider={hasProvider}
      providers={providers}
      projects={projects}
      pastReviews={pastReviews}
    />
  );
}
