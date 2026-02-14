"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface OccupancyTrendChartProps {
  data: { month: string; occupancy: number }[];
  color?: string;
}

export function OccupancyTrendChart({
  data,
  color = "#1B2A4A",
}: OccupancyTrendChartProps) {
  if (!data.length) return null;

  return (
    <div className="report-chart-container">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="occupancyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="month" fontSize={12} />
          <YAxis
            fontSize={12}
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            formatter={(value: number | string | undefined) => [`${Number(value ?? 0).toFixed(1)}%`, "Occupancy"]}
          />
          <Area
            type="monotone"
            dataKey="occupancy"
            stroke={color}
            strokeWidth={2}
            fill="url(#occupancyGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
