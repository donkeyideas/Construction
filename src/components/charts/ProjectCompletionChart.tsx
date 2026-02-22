"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

function getBarColor(pct: number): string {
  if (pct >= 80) return "#22c55e";
  if (pct >= 50) return "#f59e0b";
  return "#ef4444";
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
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
      <div style={{ color: getBarColor(payload[0].value) }}>
        Completion: {payload[0].value.toFixed(0)}%
      </div>
    </div>
  );
}

interface Props {
  data: { name: string; completion_pct: number }[];
}

export default function ProjectCompletionChart({ data }: Props) {
  if (!data.length) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: "0.85rem" }}>
        No project data
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: d.name.length > 22 ? d.name.slice(0, 20) + "..." : d.name,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
        barGap={2}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          opacity={0.4}
          horizontal={false}
        />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--muted)" }}
          axisLine={false}
          tickLine={false}
          width={100}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="completion_pct"
          name="Completion"
          radius={[0, 4, 4, 0]}
          maxBarSize={20}
        >
          {chartData.map((entry, idx) => (
            <Cell key={idx} fill={getBarColor(entry.completion_pct)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
