"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

const TYPE_COLORS: Record<string, string> = {
  employee: "#3b82f6",
  subcontractor: "#f59e0b",
  vendor: "#22c55e",
  client: "#8b5cf6",
  tenant: "#6b7280",
};

const TYPE_LABELS: Record<string, string> = {
  employee: "Employee",
  subcontractor: "Subcontractor",
  vendor: "Vendor",
  client: "Client",
  tenant: "Tenant",
};

interface Props {
  data: { type: string; count: number }[];
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { type: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: "0.78rem",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      <div style={{ fontWeight: 600, color: "var(--text)" }}>
        {TYPE_LABELS[item.payload.type] ?? item.payload.type}
      </div>
      <div style={{ color: "var(--muted)" }}>{item.value} people</div>
    </div>
  );
}

export default function PeopleTypeChart({ data }: Props) {
  if (!data.length) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: "0.85rem" }}>
        No contacts
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="type"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell key={entry.type} fill={TYPE_COLORS[entry.type] ?? "#6b7280"} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "0.72rem" }}
          formatter={(value: string) => TYPE_LABELS[value] ?? value}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
