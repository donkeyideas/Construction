"use client";

import { useState } from "react";

interface Rule {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  action_type: string;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
}

interface LogEntry {
  id: string;
  status: string;
  error_message: string | null;
  executed_at: string;
  automation_rules?: { name: string };
}

export default function AutomationClient({
  rules,
  logs,
}: {
  rules: Rule[];
  logs: LogEntry[];
}) {
  const [tab, setTab] = useState<"rules" | "logs">("rules");

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Automation</h1>
          <p className="page-subtitle">
            {rules.length} rule{rules.length !== 1 ? "s" : ""} configured
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <button
          className={`tab-btn ${tab === "rules" ? "tab-btn-active" : ""}`}
          onClick={() => setTab("rules")}
        >
          Rules ({rules.length})
        </button>
        <button
          className={`tab-btn ${tab === "logs" ? "tab-btn-active" : ""}`}
          onClick={() => setTab("logs")}
        >
          Activity Log ({logs.length})
        </button>
      </div>

      {tab === "rules" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "1rem",
          }}
        >
          {rules.length === 0 ? (
            <p
              style={{
                color: "var(--text-secondary)",
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: "2rem",
              }}
            >
              No automation rules configured yet
            </p>
          ) : (
            rules.map((r) => (
              <div
                key={r.id}
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
                    marginBottom: "0.5rem",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "1rem" }}>{r.name}</h3>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      padding: "2px 8px",
                      borderRadius: 12,
                      background: r.is_active ? "#dcfce7" : "#f3f4f6",
                      color: r.is_active ? "#16a34a" : "#6b7280",
                    }}
                  >
                    {r.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                {r.description && (
                  <p
                    style={{
                      margin: "0 0 0.75rem",
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {r.description}
                  </p>
                )}
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-secondary)",
                    display: "flex",
                    gap: "1rem",
                  }}
                >
                  <span>
                    Trigger:{" "}
                    <strong style={{ textTransform: "capitalize" }}>
                      {r.trigger_type?.replace(/_/g, " ")}
                    </strong>
                  </span>
                  <span>
                    Action:{" "}
                    <strong style={{ textTransform: "capitalize" }}>
                      {r.action_type?.replace(/_/g, " ")}
                    </strong>
                  </span>
                </div>
                {r.last_triggered_at && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Last triggered:{" "}
                    {new Date(r.last_triggered_at).toLocaleString()}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "logs" && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Rule</th>
                <th>Status</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      textAlign: "center",
                      padding: "2rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    No automation activity yet
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id}>
                    <td>{new Date(l.executed_at).toLocaleString()}</td>
                    <td>{l.automation_rules?.name ?? "—"}</td>
                    <td>
                      <span className={`status-badge status-${l.status}`}>
                        {l.status}
                      </span>
                    </td>
                    <td style={{ color: "#dc2626" }}>
                      {l.error_message ?? "—"}
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
