"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface CashFlowProjectionChartProps {
  data: { month: string; cashIn: number; cashOut: number; net: number }[];
  primaryColor?: string;
  accentColor?: string;
}

export function CashFlowProjectionChart({
  data,
  primaryColor = "#1B2A4A",
  accentColor = "#C9A84C",
}: CashFlowProjectionChartProps) {
  if (!data.length) return null;

  const fmt = (v: number) => {
    if (Math.abs(v) >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(0)}K`;
    return `$${v}`;
  };

  return (
    <div className="report-chart-container">
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="month" fontSize={12} />
          <YAxis fontSize={12} tickFormatter={fmt} />
          <Tooltip
            formatter={(value: number | string | undefined, name: string | undefined) => [
              `$${Number(value ?? 0).toLocaleString()}`,
              name === "cashIn"
                ? "Cash In"
                : name === "cashOut"
                  ? "Cash Out"
                  : "Net",
            ]}
          />
          <Legend />
          <Bar dataKey="cashIn" name="Cash In" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={20} />
          <Bar dataKey="cashOut" name="Cash Out" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
          <Line
            type="monotone"
            dataKey="net"
            name="Net"
            stroke={accentColor}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
