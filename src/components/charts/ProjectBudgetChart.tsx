"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

interface Props {
  data: { name: string; estimated: number; actual: number }[];
  height?: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: "0.78rem",
        lineHeight: 1.7,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--text)" }}>
        {label}
      </div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey === "estimated" ? "Budget" : "Actual"}:{" "}
          {formatCompact(p.value)}
        </div>
      ))}
    </div>
  );
}

// Dynamic Y-axis width: longer names need more space, capped at 160px
function yAxisWidth(data: { name: string }[]): number {
  const longest = Math.max(...data.map((d) => d.name.length));
  return Math.min(Math.max(longest * 6, 80), 160);
}

export default function ProjectBudgetChart({ data, height = 240 }: Props) {
  if (!data.length) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: "0.85rem" }}>
        No budget data
      </div>
    );
  }

  // Horizontal bar layout: project names on Y-axis, values on X-axis.
  // Eliminates all label rotation/overlap issues regardless of name length.
  const dynamicHeight = Math.max(height, data.length * 56 + 60);
  const labelWidth = yAxisWidth(data);

  return (
    <ResponsiveContainer width="100%" height={dynamicHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 10, right: 40, left: 0, bottom: 10 }}
        barGap={3}
        barCategoryGap="30%"
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          opacity={0.4}
          horizontal={false}
        />
        <XAxis
          type="number"
          tickFormatter={formatCompact}
          tick={{ fontSize: 10, fill: "var(--muted)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={labelWidth}
          tick={{ fontSize: 10, fill: "var(--muted)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 22) + "\u2026" : v}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "0.75rem", paddingTop: 8 }}
        />
        <Bar
          dataKey="estimated"
          name="Budget"
          fill="#3b82f6"
          radius={[0, 3, 3, 0]}
          maxBarSize={20}
        />
        <Bar
          dataKey="actual"
          name="Actual"
          fill="#22c55e"
          radius={[0, 3, 3, 0]}
          maxBarSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
