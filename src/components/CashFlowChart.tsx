"use client";

import { useTranslations } from "next-intl";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import type { CashFlowItem } from "@/lib/queries/dashboard";

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
  const t = useTranslations("common");
  if (!active || !payload?.length) return null;

  const cashIn = payload.find((p) => p.dataKey === "cashIn")?.value ?? 0;
  const cashOut = payload.find((p) => p.dataKey === "cashOut")?.value ?? 0;
  const net = payload.find((p) => p.dataKey === "net")?.value ?? cashIn - cashOut;

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
        {t("cashFlow.cashIn")}: {formatTooltipValue(cashIn)}
      </div>
      <div style={{ color: "#ef4444" }}>
        {t("cashFlow.cashOut")}: {formatTooltipValue(cashOut)}
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
        {t("cashFlow.net")}: {net >= 0 ? "+" : ""}
        {formatTooltipValue(net)}
      </div>
    </div>
  );
}

export default function CashFlowChart({ data }: { data: CashFlowItem[] }) {
  const t = useTranslations("common");
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
      >
        <defs>
          <linearGradient id="gradCashIn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradCashOut" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.02} />
          </linearGradient>
        </defs>
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
        <Area
          dataKey="cashIn"
          name={t("cashFlow.cashIn")}
          type="monotone"
          stroke="#22c55e"
          strokeWidth={2}
          fill="url(#gradCashIn)"
          dot={{ r: 3, fill: "#22c55e", strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "#22c55e", strokeWidth: 0 }}
        />
        <Area
          dataKey="cashOut"
          name={t("cashFlow.cashOut")}
          type="monotone"
          stroke="#ef4444"
          strokeWidth={2}
          fill="url(#gradCashOut)"
          dot={{ r: 3, fill: "#ef4444", strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "#ef4444", strokeWidth: 0 }}
        />
        <Area
          dataKey="net"
          name={t("cashFlow.netFlow")}
          type="monotone"
          stroke="#60a5fa"
          strokeWidth={2}
          strokeDasharray="5 3"
          fill="url(#gradNet)"
          dot={{ r: 3, fill: "#60a5fa", strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "#60a5fa", strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
