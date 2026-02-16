"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

const CAT_COLORS: Record<string, string> = {
  plan: "#3b82f6",
  spec: "#f59e0b",
  contract: "#22c55e",
  photo: "#8b5cf6",
  report: "#ef4444",
  correspondence: "#6b7280",
};

const CAT_LABELS: Record<string, string> = {
  plan: "Plans",
  spec: "Specifications",
  contract: "Contracts",
  photo: "Photos",
  report: "Reports",
  correspondence: "Correspondence",
};

interface Props {
  data: { category: string; count: number }[];
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { category: string } }>;
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
        {CAT_LABELS[item.payload.category] ?? item.payload.category}
      </div>
      <div style={{ color: "var(--muted)" }}>
        {item.value} document{item.value !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

export default function DocCategoryChart({ data }: Props) {
  if (!data.length) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: "0.85rem" }}>
        No documents
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="category"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell
              key={entry.category}
              fill={CAT_COLORS[entry.category] ?? "#6b7280"}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "0.72rem" }}
          formatter={(value: string) => CAT_LABELS[value] ?? value}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
