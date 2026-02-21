import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVendorProjectDetail } from "@/lib/queries/vendor-portal";
import ProjectDetailClient from "./ProjectDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Project ${id.substring(0, 8)} - Buildwrk` };
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login/vendor");

  const admin = createAdminClient();
  const project = await getVendorProjectDetail(admin, user.id, id);

  if (!project) notFound();

  return <ProjectDetailClient project={project} />;
}
