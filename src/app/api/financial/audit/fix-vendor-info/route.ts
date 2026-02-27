import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

export async function POST() {
  try {
    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId } = userCtx;
    let fixed = 0;

    // Fix payable invoices missing vendor_name
    const { data: payables } = await supabase
      .from("invoices")
      .select("id")
      .eq("company_id", companyId)
      .eq("invoice_type", "payable")
      .or("vendor_name.is.null,vendor_name.eq.");

    if (payables && payables.length > 0) {
      const ids = payables.map((p) => p.id);
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        const { error } = await supabase
          .from("invoices")
          .update({ vendor_name: "Unknown Vendor" })
          .in("id", batch);
        if (!error) fixed += batch.length;
      }
    }

    // Fix receivable invoices missing client_name
    const { data: receivables } = await supabase
      .from("invoices")
      .select("id")
      .eq("company_id", companyId)
      .eq("invoice_type", "receivable")
      .or("client_name.is.null,client_name.eq.");

    if (receivables && receivables.length > 0) {
      const ids = receivables.map((r) => r.id);
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        const { error } = await supabase
          .from("invoices")
          .update({ client_name: "Unknown Client" })
          .in("id", batch);
        if (!error) fixed += batch.length;
      }
    }

    return NextResponse.json({ message: `Updated ${fixed} invoices with missing names`, fixed });
  } catch (err) {
    console.error("fix-vendor-info error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
