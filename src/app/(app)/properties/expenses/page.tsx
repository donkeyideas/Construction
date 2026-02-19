import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import ExpensesClient from "./ExpensesClient";

export const metadata = { title: "Property Expenses - Buildwrk" };

export default async function PropertyExpensesPage() {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    return (
      <div className="fin-empty">
        <div className="fin-empty-title">No Company Found</div>
        <div className="fin-empty-desc">
          Please complete registration to access property expenses.
        </div>
      </div>
    );
  }

  const { companyId } = userCompany;

  const [expensesResult, propertiesResult] = await Promise.all([
    supabase
      .from("property_expenses")
      .select("*, properties(name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("properties")
      .select("id, name")
      .eq("company_id", companyId)
      .order("name"),
  ]);

  const expenses = expensesResult.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties = (propertiesResult.data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
  }));

  return <ExpensesClient expenses={expenses} properties={properties} />;
}
