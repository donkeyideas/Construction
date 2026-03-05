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
        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
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
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          dataKey="value"
          label={({ name, value }) => `${name}: ${value}`}
          labelLine={false}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Tooltip formatter={(value: any) => [value, "Reviews"]} />
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
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} />
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
