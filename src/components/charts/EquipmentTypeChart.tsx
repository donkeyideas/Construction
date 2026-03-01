"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const TYPE_LABELS: Record<string, string> = {
  excavator: "Excavator",
  loader: "Loader",
  crane: "Crane",
  truck: "Truck",
  generator: "Generator",
  compressor: "Compressor",
  scaffold: "Scaffold",
  tools: "Tools",
  other: "Other",
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
      <div style={{ color: "var(--muted)" }}>{item.value} units</div>
    </div>
  );
}

export default function EquipmentTypeChart({ data }: Props) {
  if (!data.length) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: "0.85rem" }}>
        No equipment data
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: TYPE_LABELS[d.type] ?? d.type,
  }));

  // Horizontal bar layout: type names on Y-axis, counts on X-axis.
  const dynamicHeight = Math.max(220, chartData.length * 36 + 40);

  return (
    <ResponsiveContainer width="100%" height={dynamicHeight}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
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
          tick={{ fontSize: 10, fill: "var(--muted)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={80}
          tick={{ fontSize: 10, fill: "var(--muted)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="count"
          name="Count"
          fill="#3b82f6"
          radius={[0, 4, 4, 0]}
          maxBarSize={24}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
