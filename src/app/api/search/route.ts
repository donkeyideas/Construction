import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";

// GET /api/search?q=term&limit=20
// Global search across all major entities

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  href: string;
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim();
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || 20), 50);

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const supabase = await createClient();
    const userCtx = await getCurrentUserCompany(supabase);

    if (!userCtx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cid = userCtx.companyId;
    const pattern = `%${q}%`;

    // Search all entities in parallel
    const [
      projects,
      contacts,
      invoices,
      rfis,
      changeOrders,
      submittals,
      documents,
      properties,
      equipment,
      contracts,
      opportunities,
      bids,
      incidents,
      tickets,
    ] = await Promise.all([
      // Projects
      supabase
        .from("projects")
        .select("id, name, code, client_name")
        .eq("company_id", cid)
        .or(`name.ilike.${pattern},code.ilike.${pattern},client_name.ilike.${pattern}`)
        .limit(5),

      // Contacts
      supabase
        .from("contacts")
        .select("id, first_name, last_name, company_name, email")
        .eq("company_id", cid)
        .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},company_name.ilike.${pattern},email.ilike.${pattern}`)
        .limit(5),

      // Invoices
      supabase
        .from("invoices")
        .select("id, invoice_number, vendor_name, client_name")
        .eq("company_id", cid)
        .or(`invoice_number.ilike.${pattern},vendor_name.ilike.${pattern},client_name.ilike.${pattern}`)
        .limit(5),

      // RFIs
      supabase
        .from("rfis")
        .select("id, rfi_number, subject")
        .eq("company_id", cid)
        .or(`rfi_number.ilike.${pattern},subject.ilike.${pattern}`)
        .limit(5),

      // Change Orders
      supabase
        .from("change_orders")
        .select("id, co_number, title")
        .eq("company_id", cid)
        .or(`co_number.ilike.${pattern},title.ilike.${pattern}`)
        .limit(5),

      // Submittals
      supabase
        .from("submittals")
        .select("id, submittal_number, title")
        .eq("company_id", cid)
        .or(`submittal_number.ilike.${pattern},title.ilike.${pattern}`)
        .limit(5),

      // Documents
      supabase
        .from("documents")
        .select("id, name, file_type, category")
        .eq("company_id", cid)
        .ilike("name", pattern)
        .limit(5),

      // Properties
      supabase
        .from("properties")
        .select("id, name, property_type, city")
        .eq("company_id", cid)
        .or(`name.ilike.${pattern},city.ilike.${pattern}`)
        .limit(5),

      // Equipment
      supabase
        .from("equipment")
        .select("id, name, serial_number, make, model")
        .eq("company_id", cid)
        .or(`name.ilike.${pattern},serial_number.ilike.${pattern},make.ilike.${pattern},model.ilike.${pattern}`)
        .limit(5),

      // Contracts
      supabase
        .from("contracts")
        .select("id, contract_number, title, party_name")
        .eq("company_id", cid)
        .or(`contract_number.ilike.${pattern},title.ilike.${pattern},party_name.ilike.${pattern}`)
        .limit(5),

      // Opportunities
      supabase
        .from("opportunities")
        .select("id, name, client_name")
        .eq("company_id", cid)
        .or(`name.ilike.${pattern},client_name.ilike.${pattern}`)
        .limit(5),

      // Bids
      supabase
        .from("bids")
        .select("id, bid_number, project_name, client_name")
        .eq("company_id", cid)
        .or(`bid_number.ilike.${pattern},project_name.ilike.${pattern},client_name.ilike.${pattern}`)
        .limit(5),

      // Safety Incidents
      supabase
        .from("safety_incidents")
        .select("id, incident_number, title")
        .eq("company_id", cid)
        .or(`incident_number.ilike.${pattern},title.ilike.${pattern}`)
        .limit(5),

      // Tickets
      supabase
        .from("tickets")
        .select("id, ticket_number, title")
        .eq("company_id", cid)
        .or(`ticket_number.ilike.${pattern},title.ilike.${pattern}`)
        .limit(5),
    ]);

    const results: SearchResult[] = [];

    // Map each entity type to search results
    if (projects.data) {
      for (const p of projects.data) {
        results.push({
          id: p.id,
          type: "project",
          title: p.name,
          subtitle: p.code ? `${p.code}${p.client_name ? ` · ${p.client_name}` : ""}` : p.client_name,
          href: `/projects/${p.id}`,
        });
      }
    }

    if (contacts.data) {
      for (const c of contacts.data) {
        results.push({
          id: c.id,
          type: "contact",
          title: `${c.first_name} ${c.last_name}`,
          subtitle: c.company_name || c.email,
          href: "/people",
        });
      }
    }

    if (invoices.data) {
      for (const i of invoices.data) {
        results.push({
          id: i.id,
          type: "invoice",
          title: i.invoice_number || "Invoice",
          subtitle: i.vendor_name || i.client_name,
          href: `/financial/invoices/${i.id}`,
        });
      }
    }

    if (rfis.data) {
      for (const r of rfis.data) {
        results.push({
          id: r.id,
          type: "rfi",
          title: `${r.rfi_number} — ${r.subject}`,
          subtitle: null,
          href: "/projects/rfis",
        });
      }
    }

    if (changeOrders.data) {
      for (const co of changeOrders.data) {
        results.push({
          id: co.id,
          type: "change_order",
          title: `${co.co_number} — ${co.title}`,
          subtitle: null,
          href: "/projects/change-orders",
        });
      }
    }

    if (submittals.data) {
      for (const s of submittals.data) {
        results.push({
          id: s.id,
          type: "submittal",
          title: `${s.submittal_number} — ${s.title}`,
          subtitle: null,
          href: "/projects/submittals",
        });
      }
    }

    if (documents.data) {
      for (const d of documents.data) {
        results.push({
          id: d.id,
          type: "document",
          title: d.name,
          subtitle: d.category || d.file_type,
          href: "/documents",
        });
      }
    }

    if (properties.data) {
      for (const p of properties.data) {
        results.push({
          id: p.id,
          type: "property",
          title: p.name,
          subtitle: [p.property_type, p.city].filter(Boolean).join(" · "),
          href: `/properties/${p.id}`,
        });
      }
    }

    if (equipment.data) {
      for (const e of equipment.data) {
        results.push({
          id: e.id,
          type: "equipment",
          title: e.name,
          subtitle: [e.make, e.model, e.serial_number].filter(Boolean).join(" · "),
          href: "/equipment/inventory",
        });
      }
    }

    if (contracts.data) {
      for (const c of contracts.data) {
        results.push({
          id: c.id,
          type: "contract",
          title: c.title || c.contract_number,
          subtitle: c.party_name,
          href: "/contracts",
        });
      }
    }

    if (opportunities.data) {
      for (const o of opportunities.data) {
        results.push({
          id: o.id,
          type: "opportunity",
          title: o.name,
          subtitle: o.client_name,
          href: "/crm",
        });
      }
    }

    if (bids.data) {
      for (const b of bids.data) {
        results.push({
          id: b.id,
          type: "bid",
          title: `${b.bid_number} — ${b.project_name}`,
          subtitle: b.client_name,
          href: "/crm/bids",
        });
      }
    }

    if (incidents.data) {
      for (const i of incidents.data) {
        results.push({
          id: i.id,
          type: "incident",
          title: `${i.incident_number} — ${i.title}`,
          subtitle: null,
          href: "/safety/incidents",
        });
      }
    }

    if (tickets.data) {
      for (const t of tickets.data) {
        results.push({
          id: t.id,
          type: "ticket",
          title: `${t.ticket_number} — ${t.title}`,
          subtitle: null,
          href: "/tickets",
        });
      }
    }

    // Sort: exact matches first, then partial matches
    const lowerQ = q.toLowerCase();
    results.sort((a, b) => {
      const aExact = a.title.toLowerCase().startsWith(lowerQ) ? 0 : 1;
      const bExact = b.title.toLowerCase().startsWith(lowerQ) ? 0 : 1;
      return aExact - bExact;
    });

    return NextResponse.json({ results: results.slice(0, limit) });
  } catch (err) {
    console.error("GET /api/search error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
