import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getCalendarEventsByMonth } from "@/lib/queries/calendar";
import CalendarClient from "./CalendarClient";

export const metadata = {
  title: "Calendar - Buildwrk",
};

export default async function CalendarPage() {
  const supabase = await createClient();
  const userCtx = await getCurrentUserCompany(supabase);

  if (!userCtx) {
    redirect("/register");
  }

  const now = new Date();
  const events = await getCalendarEventsByMonth(
    supabase,
    userCtx.companyId,
    now.getFullYear(),
    now.getMonth() + 1
  );

  return (
    <CalendarClient
      initialEvents={events}
      companyId={userCtx.companyId}
      initialYear={now.getFullYear()}
      initialMonth={now.getMonth() + 1}
    />
  );
}
