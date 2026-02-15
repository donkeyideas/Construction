import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/queries/super-admin";
import { getAuditLogs, getAuditLogStats } from "@/lib/queries/audit-logs";
import AuditLogsClient from "./AuditLogsClient";

export const metadata = { title: "Audit Logs - Super Admin - Buildwrk" };

export default async function AuditLogsPage() {
  const supabase = await createClient();
  const isAdmin = await isPlatformAdmin(supabase);
  if (!isAdmin) redirect("/dashboard");

  const [logs, stats] = await Promise.all([
    getAuditLogs({}),
    getAuditLogStats(),
  ]);

  return <AuditLogsClient logs={logs} stats={stats} />;
}
