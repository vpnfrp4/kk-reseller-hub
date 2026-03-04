import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/contexts/CurrencyContext";

interface SpendingCategory {
  name: string;
  value: number;
  color: string;
}

interface SpendingDoughnutProps {
  data: SpendingCategory[] | undefined;
  isLoading?: boolean;
}

const COLORS = ["#22c55e", "#D4AF37", "#3b82f6", "#f97316", "#a855f7", "#ec4899"];

const CustomLabel = ({ cx, cy, total }: { cx: number; cy: number; total: number }) => (
  <>
    <text x={cx} y={cy - 8} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="20" fontWeight="800" fontFamily="monospace">
      {total.toLocaleString()}
    </text>
    <text x={cx} y={cy + 12} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="9" fontWeight="600" letterSpacing="0.1em">
      MMK TOTAL
    </text>
  </>
);

export default function SpendingDoughnut({ data, isLoading }: SpendingDoughnutProps) {
  const { formatAmount, currency } = useCurrency();
  if (isLoading || !data || data.length === 0) {
    return (
      <div className="w-full h-[240px] flex items-center justify-center">
        <div className="w-[200px] h-[200px] rounded-full bg-secondary/30 animate-gold-shimmer"
          style={{
            backgroundImage: "linear-gradient(90deg, transparent 0%, hsl(43 65% 52% / 0.04) 30%, hsl(43 65% 52% / 0.08) 50%, hsl(43 65% 52% / 0.04) 70%, transparent 100%)",
            backgroundSize: "200% 100%",
          }}
        />
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
            cornerRadius={4}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={entry.color || COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <text x="50%" y="40%" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="18" fontWeight="800" fontFamily="monospace">
            {formatAmount(total)}
          </text>
          <text x="50%" y="48%" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="9" fontWeight="600" letterSpacing="0.1em">
            TOTAL
          </text>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "10px",
              backdropFilter: "blur(12px)",
              fontSize: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}
            formatter={(value: number, name: string) => [formatAmount(value), name]}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
