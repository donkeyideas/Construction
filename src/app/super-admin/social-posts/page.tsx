import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { getSocialPosts, getSocialPostStats } from "@/lib/queries/social-posts";
import SocialPostsClient from "./SocialPostsClient";

export const metadata = {
  title: "Social Posts - Super Admin - Buildwrk",
};

export default async function SuperAdminSocialPostsPage() {
  const supabase = await createClient();

  const isAdmin = await isPlatformAdmin(supabase);
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const [posts, stats] = await Promise.all([
    getSocialPosts(),
    getSocialPostStats(),
  ]);

  return <SocialPostsClient posts={posts} stats={stats} />;
}
