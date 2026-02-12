import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Plus, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserCompany } from "@/lib/queries/user";
import { getBids, type Bid, type BidStatus } from "@/lib/queries/crm";
import { formatCurrency, formatPercent } from "@/lib/utils/format";

export const metadata = {
  title: "Bid Management - ConstructionERP",
};

const STATUS_LABELS: Record<BidStatus, string> = {
  in_progress: "In Progress",
  submitted: "Submitted",
  won: "Won",
  lost: "Lost",
  no_bid: "No Bid",
};

export default async function BidManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const supabase = await createClient();
  const userCompany = await getCurrentUserCompany(supabase);

  if (!userCompany) {
    redirect("/register");
  }

  const params = await searchParams;
  const { companyId } = userCompany;

  const statusFilter = params.status as BidStatus | undefined;
  const searchFilter = params.search;

  const bids = await getBids(supabase, companyId, {
    status: statusFilter,
    search: searchFilter,
  });

  // Determine which bids are due soon (within 7 days)
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  function isDueSoon(bid: Bid): boolean {
    if (!bid.due_date) return false;
    const dueDate = new Date(bid.due_date);
    return dueDate >= now && dueDate <= sevenDaysFromNow;
  }

  const isEmpty = bids.length === 0;

  // Count bids due soon for the banner
  const dueSoonCount = bids.filter(isDueSoon).length;

  return (
    <div>
      {/* Header */}
      <div className="crm-header">
        <div>
          <h2>Bid Management</h2>
          <p className="crm-header-sub">
            Track bids from preparation through award.
          </p>
        </div>
        <div className="crm-header-actions">
          <Link href="/crm" className="ui-btn ui-btn-md ui-btn-secondary">
            Pipeline
          </Link>
          <Link
            href="/crm/bids/new"
            className="ui-btn ui-btn-md ui-btn-primary"
          >
            <Plus size={16} />
            New Bid
          </Link>
        </div>
      </div>

      {/* Due Soon Alert */}
      {dueSoonCount > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 18px",
            background: "var(--color-amber-light)",
            border: "1px solid var(--color-amber)",
            borderRadius: 10,
            marginBottom: 20,
            fontSize: "0.85rem",
            fontWeight: 500,
          }}
        >
          <AlertTriangle size={18} style={{ color: "var(--color-amber)" }} />
          <span>
            <strong>{dueSoonCount}</strong> bid{dueSoonCount !== 1 ? "s" : ""}{" "}
            due within the next 7 days.
          </span>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="people-tab-bar">
        <Link
          href="/crm/bids"
          className={`people-tab ${!statusFilter ? "active" : ""}`}
        >
          All
        </Link>
        <Link
          href="/crm/bids?status=in_progress"
          className={`people-tab ${statusFilter === "in_progress" ? "active" : ""}`}
        >
          In Progress
        </Link>
        <Link
          href="/crm/bids?status=submitted"
          className={`people-tab ${statusFilter === "submitted" ? "active" : ""}`}
        >
          Submitted
        </Link>
        <Link
          href="/crm/bids?status=won"
          className={`people-tab ${statusFilter === "won" ? "active" : ""}`}
        >
          Won
        </Link>
        <Link
          href="/crm/bids?status=lost"
          className={`people-tab ${statusFilter === "lost" ? "active" : ""}`}
        >
          Lost
        </Link>
      </div>

      {/* Bids Table */}
      {isEmpty ? (
        <div className="card" style={{ textAlign: "center", padding: "64px 24px" }}>
          <div style={{ marginBottom: 16, color: "var(--border)" }}>
            <FileText size={48} />
          </div>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1.15rem",
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            No bids found
          </div>
          <p
            style={{
              color: "var(--muted)",
              fontSize: "0.85rem",
              maxWidth: 400,
              margin: "0 auto 20px",
              lineHeight: 1.5,
            }}
          >
            {statusFilter
              ? `No bids with status "${STATUS_LABELS[statusFilter]}". Try a different filter.`
              : "Create your first bid to start tracking proposals and win rates."}
          </p>
          {!statusFilter && (
            <Link
              href="/crm/bids/new"
              className="ui-btn ui-btn-md ui-btn-primary"
            >
              <Plus size={16} />
              Create Bid
            </Link>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="bid-table">
              <thead>
                <tr>
                  <th>Bid #</th>
                  <th>Project Name</th>
                  <th>Client</th>
                  <th style={{ textAlign: "right" }}>Bid Amount</th>
                  <th style={{ textAlign: "right" }}>Est. Cost</th>
                  <th style={{ textAlign: "right" }}>Margin</th>
                  <th>Status</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((bid) => {
                  const dueSoon = isDueSoon(bid);
                  const marginClass = getMarginClass(bid.margin_pct);

                  return (
                    <tr
                      key={bid.id}
                      className={dueSoon ? "bid-due-soon" : ""}
                    >
                      <td style={{ fontWeight: 600, fontSize: "0.82rem" }}>
                        {bid.bid_number}
                      </td>
                      <td>{bid.project_name}</td>
                      <td style={{ color: "var(--muted)" }}>
                        {bid.client_name || "--"}
                      </td>
                      <td className="amount-col">
                        {bid.bid_amount != null
                          ? formatCurrency(bid.bid_amount)
                          : "--"}
                      </td>
                      <td className="amount-col" style={{ color: "var(--muted)" }}>
                        {bid.estimated_cost != null
                          ? formatCurrency(bid.estimated_cost)
                          : "--"}
                      </td>
                      <td className={`margin-col ${marginClass}`}>
                        {bid.margin_pct != null
                          ? formatPercent(bid.margin_pct)
                          : "--"}
                      </td>
                      <td>
                        <span
                          className={`bid-status bid-status-${bid.status}`}
                        >
                          {STATUS_LABELS[bid.status]}
                        </span>
                      </td>
                      <td>
                        {bid.due_date ? (
                          <span
                            style={{
                              color: dueSoon
                                ? "var(--color-amber)"
                                : "var(--text)",
                              fontWeight: dueSoon ? 600 : 400,
                            }}
                          >
                            {new Date(bid.due_date).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function getMarginClass(marginPct: number | null): string {
  if (marginPct == null) return "";
  if (marginPct >= 15) return "margin-positive";
  if (marginPct >= 5) return "margin-low";
  return "margin-negative";
}
