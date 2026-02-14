"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RentCompChartProps {
  data: { unit_type: string; avg_market_rent: number }[];
  color?: string;
  accentColor?: string;
}

export function RentCompChart({
  data,
  color = "#1B2A4A",
  accentColor = "#C9A84C",
}: RentCompChartProps) {
  if (!data.length) return null;

  const formatted = data.map((d) => ({
    ...d,
    label: d.unit_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  }));

  return (
    <div className="report-chart-container">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={formatted} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
          <XAxis
            type="number"
            fontSize={12}
            tickFormatter={(v: number) =>
              `$${v.toLocaleString()}`
            }
          />
          <YAxis dataKey="label" type="category" fontSize={12} width={100} />
          <Tooltip
            formatter={(value: number | string | undefined) => [
              `$${Number(value ?? 0).toLocaleString()}`,
              "Avg Market Rent",
            ]}
          />
          <Bar
            dataKey="avg_market_rent"
            fill={color}
            radius={[0, 4, 4, 0]}
            barSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
