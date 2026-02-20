import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import ProfileClient from "./ProfileClient";

export const metadata = { title: "My Profile - Buildwrk" };

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

interface ContactInfo {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
}

export default async function EmployeeProfilePage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);
  if (!userCtx) {
    redirect("/login");
  }

  // Fetch user profile and contact info in parallel
  const [profileRes, contactRes] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("id, full_name, email, phone, avatar_url")
      .eq("id", userCtx.userId)
      .single(),
    supabase
      .from("contacts")
      .select("id, name, email, phone, job_title")
      .eq("user_id", userCtx.userId)
      .eq("company_id", userCtx.companyId)
      .maybeSingle(),
  ]);

  const profile: UserProfile = profileRes.data ?? {
    id: userCtx.userId,
    full_name: null,
    email: "",
    phone: null,
    avatar_url: null,
  };

  const contact: ContactInfo | null = contactRes.data ?? null;

  return (
    <ProfileClient
      profile={profile}
      contact={contact}
      companyName={userCtx.companyName}
      role={userCtx.role}
    />
  );
}
