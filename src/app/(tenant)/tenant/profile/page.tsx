import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantProfile } from "@/lib/queries/tenant-portal";
import ProfileClient from "./ProfileClient";

export const metadata = { title: "My Profile - Buildwrk" };

export default async function TenantProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login/tenant");
  }

  const profile = await getTenantProfile(supabase, user.id);

  if (!profile) {
    redirect("/login/tenant");
  }

  return <ProfileClient profile={profile} />;
}
