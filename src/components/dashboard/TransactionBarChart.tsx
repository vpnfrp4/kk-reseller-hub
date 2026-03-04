import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/contexts/CurrencyContext";

interface DailyTransaction {
  day: string;
  topups: number;
  purchases: number;
}

interface TransactionBarChartProps {
  data: DailyTransaction[] | undefined;
  isLoading?: boolean;
}

export default function TransactionBarChart({ data, isLoading }: TransactionBarChartProps) {
  const { formatAmount } = useCurrency();
  if (isLoading || !data) {
    return (
      <div className="w-full h-[240px] rounded-xl bg-secondary/30 overflow-hidden animate-gold-shimmer"
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
    <div className="w-full h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={4}>
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--secondary) / 0.3)", radius: 6 } as any}
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "10px",
              backdropFilter: "blur(12px)",
              fontSize: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}
            formatter={(value: number, name: string) => [formatAmount(value), name === "topups" ? "Top-ups" : "Purchases"]}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "11px", paddingBottom: "8px" }}
            formatter={(value) => value === "topups" ? "Top-ups" : "Purchases"}
          />
          <Bar dataKey="topups" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={24} />
          <Bar dataKey="purchases" fill="#D4AF37" radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
