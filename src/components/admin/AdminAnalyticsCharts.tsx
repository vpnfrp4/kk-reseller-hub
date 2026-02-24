import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";
import { DollarSign, Users, ShoppingCart, TrendingUp } from "lucide-react";
import { StatCard, DataCard } from "@/components/shared";

function buildChartDays(rawData: any[], dateKey: string, valueKey: string) {
  const days: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    days[format(subDays(new Date(), i), "MMM dd")] = 0;
  }
  (rawData || []).forEach((row: any) => {
    const key = format(new Date(row[dateKey]), "MMM dd");
    if (key in days) days[key] += Number(row[valueKey]);
  });
  return Object.entries(days).map(([date, value]) => ({ date, value }));
}

function buildChartDaysCount(rawData: any[], dateKey: string) {
  const days: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    days[format(subDays(new Date(), i), "MMM dd")] = 0;
  }
  (rawData || []).forEach((row: any) => {
    const key = format(new Date(row[dateKey]), "MMM dd");
    if (key in days) days[key]++;
  });
  return Object.entries(days).map(([date, value]) => ({ date, value }));
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
};

const labelStyle = { color: "hsl(var(--muted-foreground))" };

export default function AdminAnalyticsCharts() {
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

  const { data: revenueRaw } = useQuery({
    queryKey: ["admin-revenue-chart"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("price, created_at")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true });
      return data || [];
    },
  });

  const { data: salesRaw } = useQuery({
    queryKey: ["admin-sales-chart"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true });
      return data || [];
    },
  });

  const { data: signupsRaw } = useQuery({
    queryKey: ["admin-signups-chart"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true });
      return data || [];
    },
  });

  const { data: summaryData } = useQuery({
    queryKey: ["admin-analytics-summary"],
    queryFn: async () => {
      const [totalRevenue, totalOrders, totalUsers, monthRevenue] = await Promise.all([
        supabase.from("orders").select("price").then(({ data }) =>
          (data || []).reduce((sum: number, o: any) => sum + Number(o.price), 0)
        ),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("price").gte("created_at", thirtyDaysAgo).then(({ data }) =>
          (data || []).reduce((sum: number, o: any) => sum + Number(o.price), 0)
        ),
      ]);
      return {
        totalRevenue,
        totalOrders: totalOrders.count || 0,
        totalUsers: totalUsers.count || 0,
        monthRevenue,
      };
    },
  });

  const revenueChart = useMemo(() => buildChartDays(revenueRaw || [], "created_at", "price"), [revenueRaw]);
  const salesChart = useMemo(() => buildChartDaysCount(salesRaw || [], "created_at"), [salesRaw]);
  const signupsChart = useMemo(() => buildChartDaysCount(signupsRaw || [], "created_at"), [signupsRaw]);

  const summaryCards = [
    { label: "Total Revenue", value: `${(summaryData?.totalRevenue || 0).toLocaleString()} MMK`, icon: DollarSign, color: "text-success" },
    { label: "Monthly Revenue", value: `${(summaryData?.monthRevenue || 0).toLocaleString()} MMK`, icon: TrendingUp, color: "text-primary" },
    { label: "Total Orders", value: summaryData?.totalOrders || 0, icon: ShoppingCart, color: "text-warning" },
    { label: "Total Users", value: summaryData?.totalUsers || 0, icon: Users, color: "text-primary" },
  ];

  return (
    <div className="space-y-section">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-default">
        {summaryCards.map((card, i) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            iconColor={card.color}
            animate
            delay={i * 0.08}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-default">
        {/* Revenue Chart */}
        <DataCard title="Revenue (Last 30 Days)" className="animate-fade-in [animation-delay:0.3s]">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toLocaleString()} MMK`, "Revenue"]} labelStyle={labelStyle} />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#adminRevGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DataCard>

        {/* Sales Chart */}
        <DataCard title="Sales Volume (Last 30 Days)" className="animate-fade-in [animation-delay:0.35s]">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesChart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, "Orders"]} labelStyle={labelStyle} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DataCard>

        {/* New Users Chart */}
        <DataCard title="New Users (Last 30 Days)" className="animate-fade-in [animation-delay:0.4s] lg:col-span-2">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={signupsChart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, "Signups"]} labelStyle={labelStyle} />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DataCard>
      </div>
    </div>
  );
}
