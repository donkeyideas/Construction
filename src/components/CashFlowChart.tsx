"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { CashFlowItem } from "@/lib/queries/dashboard";

function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatTooltipValue(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
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

  const cashIn = payload.find((p) => p.dataKey === "cashIn")?.value ?? 0;
  const cashOut = payload.find((p) => p.dataKey === "cashOut")?.value ?? 0;
  const net = cashIn - cashOut;

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
      <div style={{ color: "#22c55e" }}>
        Cash In: {formatTooltipValue(cashIn)}
      </div>
      <div style={{ color: "#ef4444" }}>
        Cash Out: {formatTooltipValue(cashOut)}
      </div>
      <div
        style={{
          color: net >= 0 ? "#22c55e" : "#ef4444",
          fontWeight: 600,
          borderTop: "1px solid var(--border)",
          paddingTop: 4,
          marginTop: 4,
        }}
      >
        Net: {net >= 0 ? "+" : ""}
        {formatTooltipValue(net)}
      </div>
    </div>
  );
}

export default function CashFlowChart({ data }: { data: CashFlowItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart
        data={data}
        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        barGap={2}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          opacity={0.4}
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatCompact}
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          axisLine={false}
          tickLine={false}
          width={55}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "0.75rem", paddingTop: 8 }}
        />
        <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
        <Bar
          dataKey="cashIn"
          name="Cash In"
          fill="#22c55e"
          radius={[3, 3, 0, 0]}
          maxBarSize={32}
        />
        <Bar
          dataKey="cashOut"
          name="Cash Out"
          fill="#ef4444"
          radius={[3, 3, 0, 0]}
          maxBarSize={32}
        />
        <Line
          dataKey="net"
          name="Net Flow"
          type="monotone"
          stroke="#60a5fa"
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={{ r: 3, fill: "#60a5fa", strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "#60a5fa", strokeWidth: 0 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
