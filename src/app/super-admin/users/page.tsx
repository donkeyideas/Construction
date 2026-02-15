import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin, getAllUsers } from "@/lib/queries/super-admin";
import UsersClient from "./UsersClient";

export const metadata = {
  title: "Users - Super Admin - Buildwrk",
};

export default async function SuperAdminUsersPage() {
  const supabase = await createClient();

  const isAdmin = await isPlatformAdmin(supabase);
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const users = await getAllUsers(supabase);

  return <UsersClient users={users} />;
}
