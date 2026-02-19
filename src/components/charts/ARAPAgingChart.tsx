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
import type { AgingBucket } from "@/lib/queries/dashboard";

function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
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
  const ar = payload.find((p) => p.dataKey === "ar")?.value ?? 0;
  const ap = payload.find((p) => p.dataKey === "ap")?.value ?? 0;

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
        {label} Days
      </div>
      <div style={{ color: "#3b82f6" }}>
        Receivable: {formatTooltipValue(ar)}
      </div>
      <div style={{ color: "#f97316" }}>
        Payable: {formatTooltipValue(ap)}
      </div>
    </div>
  );
}

export default function ARAPAgingChart({ data }: { data: AgingBucket[] }) {
  const hasData = data.some((b) => b.ar > 0 || b.ap > 0);

  if (!hasData) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: "0.85rem" }}>
        No outstanding invoices
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: 5, bottom: 0 }}
        barGap={4}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          opacity={0.4}
          vertical={false}
        />
        <XAxis
          dataKey="bucket"
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatCompact}
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "0.75rem", paddingTop: 8 }}
        />
        <Bar
          dataKey="ar"
          name="Receivable (AR)"
          fill="#3b82f6"
          radius={[3, 3, 0, 0]}
          maxBarSize={32}
        />
        <Bar
          dataKey="ap"
          name="Payable (AP)"
          fill="#f97316"
          radius={[3, 3, 0, 0]}
          maxBarSize={32}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
