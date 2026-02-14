"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface CostVarianceChartProps {
  data: { category: string; budgeted: number; actual: number }[];
  primaryColor?: string;
  accentColor?: string;
}

export function CostVarianceChart({
  data,
  primaryColor = "#2D2D3D",
  accentColor = "#4A90D9",
}: CostVarianceChartProps) {
  if (!data.length) return null;

  const fmt = (v: number) => {
    if (Math.abs(v) >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(0)}K`;
    return `$${v}`;
  };

  return (
    <div className="report-chart-container">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="category" fontSize={11} angle={-30} textAnchor="end" height={60} />
          <YAxis fontSize={12} tickFormatter={fmt} />
          <Tooltip
            formatter={(value: number | string | undefined, name: string | undefined) => [
              `$${Number(value ?? 0).toLocaleString()}`,
              name ?? "",
            ]}
          />
          <Legend />
          <Bar
            dataKey="budgeted"
            name="Budgeted"
            fill={primaryColor}
            radius={[4, 4, 0, 0]}
            barSize={24}
          />
          <Bar
            dataKey="actual"
            name="Actual"
            fill={accentColor}
            radius={[4, 4, 0, 0]}
            barSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
