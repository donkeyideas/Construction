"use client";

import { useState } from "react";

interface Contact {
  id: string;
  contact_type: string;
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  phone: string;
  job_title: string;
}

interface VendorContract {
  id: string;
  contract_number: string;
  title: string;
  contract_type: string;
  amount: number;
  status: string;
  start_date: string;
  end_date: string;
  contacts?: { first_name: string; last_name: string; company_name: string };
}

export default function VendorsClient({
  contacts,
  contracts,
}: {
  contacts: Contact[];
  contracts: VendorContract[];
}) {
  const [tab, setTab] = useState<"directory" | "contracts">("directory");

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Vendors &amp; Subcontractors</h1>
          <p className="page-subtitle">
            {contacts.length} vendor{contacts.length !== 1 ? "s" : ""} &middot;{" "}
            {contracts.length} contract{contracts.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <button
          className={`tab-btn ${tab === "directory" ? "tab-btn-active" : ""}`}
          onClick={() => setTab("directory")}
        >
          Directory ({contacts.length})
        </button>
        <button
          className={`tab-btn ${tab === "contracts" ? "tab-btn-active" : ""}`}
          onClick={() => setTab("contracts")}
        >
          Contracts ({contracts.length})
        </button>
      </div>

      {tab === "directory" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1rem",
          }}
        >
          {contacts.length === 0 ? (
            <p
              style={{
                color: "var(--text-secondary)",
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: "2rem",
              }}
            >
              No vendors found
            </p>
          ) : (
            contacts.map((v) => (
              <div
                key={v.id}
                className="card"
                style={{
                  padding: "1.25rem",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  background: "var(--card-bg)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1rem" }}>
                      {v.company_name || `${v.first_name} ${v.last_name}`}
                    </h3>
                    <p
                      style={{
                        margin: "0.25rem 0 0",
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {v.first_name} {v.last_name}
                      {v.job_title ? ` · ${v.job_title}` : ""}
                    </p>
                  </div>
                  <span
                    className={`status-badge status-${v.contact_type}`}
                    style={{ textTransform: "capitalize", fontSize: "0.75rem" }}
                  >
                    {v.contact_type}
                  </span>
                </div>
                <div
                  style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}
                >
                  {v.email && <div>{v.email}</div>}
                  {v.phone && <div>{v.phone}</div>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "contracts" && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Title</th>
                <th>Vendor</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Start</th>
                <th>End</th>
              </tr>
            </thead>
            <tbody>
              {contracts.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      padding: "2rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    No contracts found
                  </td>
                </tr>
              ) : (
                contracts.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.contract_number}</td>
                    <td>{c.title}</td>
                    <td>{c.contacts?.company_name ?? "—"}</td>
                    <td style={{ textTransform: "capitalize" }}>
                      {c.contract_type?.replace(/_/g, " ")}
                    </td>
                    <td>{fmt(c.amount)}</td>
                    <td>
                      <span className={`status-badge status-${c.status}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      {c.start_date
                        ? new Date(c.start_date).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      {c.end_date
                        ? new Date(c.end_date).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
