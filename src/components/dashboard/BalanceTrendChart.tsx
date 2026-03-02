import { useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface BalanceTrendChartProps {
  /** Array of { day: string, balance: number } for last 7 days */
  data: Array<{ day: string; balance: number }> | undefined;
  isLoading?: boolean;
}

export default function BalanceTrendChart({ data, isLoading }: BalanceTrendChartProps) {
  if (isLoading || !data) {
    return (
      <div className="w-full h-[180px] rounded-xl bg-secondary/30 overflow-hidden animate-gold-shimmer"
        style={{
          backgroundImage: "linear-gradient(90deg, transparent 0%, hsl(43 65% 52% / 0.04) 30%, hsl(43 65% 52% / 0.08) 50%, hsl(43 65% 52% / 0.04) 70%, transparent 100%)",
          backgroundSize: "200% 100%",
        }}
      >
        <Skeleton className="w-full h-full bg-transparent" />
      </div>
    );
  }

  return (
    <div className="w-full h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis hide domain={["dataMin - 5000", "dataMax + 5000"]} />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "10px",
              backdropFilter: "blur(12px)",
              fontSize: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}
            labelStyle={{ color: "hsl(var(--muted-foreground))", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}
            itemStyle={{ color: "#22c55e", fontWeight: 700, fontFamily: "monospace" }}
            formatter={(value: number) => [`${value.toLocaleString()} MMK`, "Balance"]}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#22c55e"
            strokeWidth={2.5}
            fill="url(#balanceGradient)"
            dot={false}
            activeDot={{ r: 4, fill: "#22c55e", stroke: "#0B0B0F", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
