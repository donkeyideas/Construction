"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

// ---------------------------------------------------------------------------
// Section Flag Rate Bar Chart
// ---------------------------------------------------------------------------

interface SectionData {
  name: string;
  flagRate: number;
  passRate: number;
  total: number;
}

export function SectionFlagChart({ data }: { data: SectionData[] }) {
  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: "var(--text)" }} />
        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12, fill: "var(--text)" }} />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Tooltip
          formatter={(value: any, name: any) =>
            [`${value}%`, name === "flagRate" ? "Flag/Fail Rate" : "Pass Rate"]
          }
        />
        <Bar dataKey="passRate" name="Pass" fill="#16a34a" stackId="a" />
        <Bar dataKey="flagRate" name="Flag/Fail" fill="#d97706" stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Status Distribution Donut
// ---------------------------------------------------------------------------

interface StatusData {
  name: string;
  value: number;
  color: string;
}

export function StatusDonutChart({ data }: { data: StatusData[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={50}
          outerRadius={85}
          dataKey="value"
          label={false}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Tooltip formatter={(value: any) => [value, "Reviews"]} />
        <Legend
          verticalAlign="bottom"
          formatter={(value: string, entry: { color?: string }) => (
            <span style={{ color: entry.color, fontSize: "0.82rem", fontWeight: 600 }}>
              {value}: {data.find((d) => d.name === value)?.value ?? 0}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Reviews Over Time Line Chart
// ---------------------------------------------------------------------------

interface TimeData {
  month: string;
  count: number;
}

export function ReviewTrendChart({ data }: { data: TimeData[] }) {
  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ left: 0, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--text)" }} />
        <YAxis allowDecimals={false} tick={{ fill: "var(--text)" }} />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Tooltip formatter={(value: any) => [value, "Reviews"]} />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
