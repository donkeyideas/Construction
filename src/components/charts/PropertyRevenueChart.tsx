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
  residential: "#22c55e",
  commercial: "#3b82f6",
  industrial: "#f59e0b",
  mixed_use: "#8b5cf6",
  other: "#6b7280",
};

const TYPE_LABELS: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  industrial: "Industrial",
  mixed_use: "Mixed Use",
  other: "Other",
};

interface Props {
  data: { type: string; revenue: number }[];
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
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
      <div style={{ color: "var(--muted)" }}>
        {formatCurrency(item.value)}/mo
      </div>
    </div>
  );
}

export default function PropertyRevenueChart({ data }: Props) {
  const filtered = data.filter((d) => d.revenue > 0);
  if (!filtered.length) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: "0.85rem" }}>
        No revenue data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={filtered}
          dataKey="revenue"
          nameKey="type"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
        >
          {filtered.map((entry) => (
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
