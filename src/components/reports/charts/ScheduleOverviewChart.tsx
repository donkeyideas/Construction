"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ScheduleItem {
  name: string;
  start: number;
  duration: number;
  completion_pct: number;
  is_milestone: boolean;
  is_critical_path: boolean;
}

interface ScheduleOverviewChartProps {
  data: ScheduleItem[];
  color?: string;
}

export function ScheduleOverviewChart({
  data,
  color = "#2D2D3D",
}: ScheduleOverviewChartProps) {
  if (!data.length) return null;

  return (
    <div className="report-chart-container">
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
          <XAxis type="number" fontSize={12} hide />
          <YAxis dataKey="name" type="category" fontSize={11} width={160} />
          <Tooltip
            formatter={(value, name) => [
              name === "duration" ? `${Number(value)} days` : `${value}`,
              name === "duration" ? "Duration" : "Offset",
            ]}
          />
          <Bar dataKey="start" stackId="a" fill="transparent" barSize={20} />
          <Bar dataKey="duration" stackId="a" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.is_critical_path
                    ? "#ef4444"
                    : entry.is_milestone
                      ? "#C9A84C"
                      : color
                }
                opacity={0.4 + entry.completion_pct * 0.006}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
