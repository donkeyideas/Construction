"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface BudgetBreakdownChartProps {
  data: { name: string; value: number }[];
}

const COLORS = [
  "#1B2A4A",
  "#C9A84C",
  "#4A90D9",
  "#22c55e",
  "#ef4444",
  "#a855f7",
  "#f59e0b",
  "#06b6d4",
  "#ec4899",
  "#6366f1",
];

export function BudgetBreakdownChart({ data }: BudgetBreakdownChartProps) {
  if (!data.length) return null;

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="report-chart-container">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={2}
            label={({ name, value }) =>
              `${name}: ${((value / total) * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number | string | undefined) => [
              `$${Number(value ?? 0).toLocaleString()}`,
              "Amount",
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
