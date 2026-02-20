import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getFinancialOverview } from "@/lib/queries/financial";
import PredictionsClient from "./PredictionsClient";

export const metadata = { title: "AI Predictions - Buildwrk" };

export default async function PredictionsPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);
  if (!userCompany) redirect("/register");

  const { companyId } = userCompany;

  // Fetch prediction data in parallel
  const [projectsRes, incidentsRes, severeIncidentsRes, inspectionsRes, certsRes, equipmentRes, financialOverview] =
    await Promise.all([
      // Active projects with budget/cost/completion data
      supabase
        .from("projects")
        .select(
          "id, name, code, status, contract_amount, estimated_cost, actual_cost, completion_pct, start_date, end_date"
        )
        .eq("company_id", companyId)
        .in("status", ["active", "in_progress"]),

      // Safety: total incidents
      supabase
        .from("safety_incidents")
        .select("id, severity, incident_date")
        .eq("company_id", companyId),

      // Safety: severe incidents only
      supabase
        .from("safety_incidents")
        .select("id")
        .eq("company_id", companyId)
        .in("severity", ["critical", "severe", "high"]),

      // Safety: inspection scores
      supabase
        .from("safety_inspections")
        .select("score")
        .eq("company_id", companyId),

      // Safety: certifications expiring within 60 days
      supabase
        .from("certifications")
        .select("id, person_name, certification_name, expiry_date")
        .eq("company_id", companyId)
        .lte("expiry_date", new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
        .gte("expiry_date", new Date().toISOString().slice(0, 10)),

      // Equipment with maintenance data
      supabase
        .from("equipment")
        .select("id, name, status, purchase_date, next_maintenance_date")
        .eq("company_id", companyId),

      // Financial overview (AR, AP, cash)
      getFinancialOverview(supabase, companyId),
    ]);

  // Process project data
  const projects = (projectsRes.data ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    code: (p.code ?? "") as string,
    status: p.status as string,
    contract_amount: Number(p.contract_amount) || 0,
    estimated_cost: Number(p.estimated_cost) || 0,
    actual_cost: Number(p.actual_cost) || 0,
    completion_pct: Number(p.completion_pct) || 0,
    start_date: (p.start_date ?? null) as string | null,
    end_date: (p.end_date ?? null) as string | null,
  }));

  // Process safety data
  const incidents = incidentsRes.data ?? [];
  const incidentCount = incidents.length;
  const severeIncidentCount = (severeIncidentsRes.data ?? []).length;

  const inspections = inspectionsRes.data ?? [];
  const avgInspectionScore =
    inspections.length > 0
      ? inspections.reduce((sum, i) => sum + (Number(i.score) || 0), 0) / inspections.length
      : 100; // default to perfect if no inspections

  const expiringCerts = (certsRes.data ?? []).length;

  // Days since last incident
  let daysSinceLastIncident = 365;
  if (incidents.length > 0) {
    const sortedDates = incidents
      .map((i) => new Date(i.incident_date).getTime())
      .filter((t) => !isNaN(t))
      .sort((a, b) => b - a);
    if (sortedDates.length > 0) {
      daysSinceLastIncident = Math.floor(
        (Date.now() - sortedDates[0]) / (1000 * 60 * 60 * 24)
      );
    }
  }

  const safetyData = {
    incidentCount,
    severeIncidentCount,
    avgInspectionScore,
    certGapCount: expiringCerts,
    daysSinceLastIncident,
    projectCount: projects.length,
  };

  // Process equipment data
  const equipment = (equipmentRes.data ?? []).map((e) => ({
    id: e.id as string,
    name: e.name as string,
    status: (e.status ?? "active") as string,
    purchase_date: (e.purchase_date ?? null) as string | null,
    next_maintenance_date: (e.next_maintenance_date ?? null) as string | null,
  }));

  return (
    <PredictionsClient
      projects={projects}
      safetyData={safetyData}
      equipment={equipment}
      financialOverview={{
        totalAR: financialOverview.totalAR,
        totalAP: financialOverview.totalAP,
        cashPosition: financialOverview.cashPosition,
        revenueThisMonth: financialOverview.revenueThisMonth,
        expensesThisMonth: financialOverview.expensesThisMonth,
      }}
    />
  );
}
