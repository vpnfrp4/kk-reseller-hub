import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, DollarSign, Percent, BarChart3, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { PageContainer, Money } from "@/components/shared";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format, subDays } from "date-fns";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
};

export default function AdminProfitDashboard() {
  // Fetch orders with profit data
  const { data: orders = [] } = useQuery({
    queryKey: ["admin-profit-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, product_name, product_id, price, provider_cost, profit_amount, created_at, product_type, status")
        .order("created_at", { ascending: false })
        .limit(1000);
      return (data || []) as any[];
    },
  });

  // Fetch exchange rate
  const { data: exchangeRate } = useQuery({
    queryKey: ["usd-rate"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "usd_mmk_rate")
        .single();
      return Number((data?.value as any)?.rate) || 0;
    },
  });

  // Fetch margin config
  const { data: marginConfig } = useQuery({
    queryKey: ["margin-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "margin_config")
        .single();
      return (data?.value || { global_margin: 20, category_margins: {} }) as any;
    },
  });

  // Fetch API products for service-level breakdown
  const { data: apiProducts = [] } = useQuery({
    queryKey: ["admin-api-products-profit"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, api_rate, margin_percent, category, product_type, provider_id")
        .eq("product_type", "api")
        .order("name");
      return (data || []) as any[];
    },
  });

  // Calculate aggregate stats
  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((s: number, o: any) => s + Number(o.price || 0), 0);
    const totalCost = orders.reduce((s: number, o: any) => s + Number(o.provider_cost || 0), 0);
    const totalProfit = orders.reduce((s: number, o: any) => s + Number(o.profit_amount || 0), 0);
    const profitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    // 30-day profit trend
    const last30 = orders.filter((o: any) => new Date(o.created_at) >= subDays(new Date(), 30));
    const profit30 = last30.reduce((s: number, o: any) => s + Number(o.profit_amount || 0), 0);
    const revenue30 = last30.reduce((s: number, o: any) => s + Number(o.price || 0), 0);

    return { totalRevenue, totalCost, totalProfit, profitPercent, profit30, revenue30 };
  }, [orders]);

  // Service-level profit table
  const serviceBreakdown = useMemo(() => {
    if (!exchangeRate) return [];
    return apiProducts.map((p: any) => {
      const rate = p.api_rate || 0;
      const margin = p.margin_percent || marginConfig?.global_margin || 20;
      const costPer1000 = Math.ceil(rate * exchangeRate);
      const sellPer1000 = Math.ceil(costPer1000 * (1 + margin / 100));
      const profitPer1000 = sellPer1000 - costPer1000;
      const profitPct = costPer1000 > 0 ? (profitPer1000 / costPer1000) * 100 : 0;

      return {
        name: p.name,
        category: p.category,
        ratePer1000Usd: rate,
        costPer1000Mmk: costPer1000,
        sellPer1000Mmk: sellPer1000,
        profitPer1000Mmk: profitPer1000,
        profitPct,
        margin,
      };
    }).sort((a: any, b: any) => b.profitPer1000Mmk - a.profitPer1000Mmk);
  }, [apiProducts, exchangeRate, marginConfig]);

  // Daily profit chart
  const chartData = useMemo(() => {
    const days: Record<string, { date: string; revenue: number; cost: number; profit: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const key = format(subDays(new Date(), i), "MMM dd");
      days[key] = { date: key, revenue: 0, cost: 0, profit: 0 };
    }
    orders.forEach((o: any) => {
      const key = format(new Date(o.created_at), "MMM dd");
      if (key in days) {
        days[key].revenue += Number(o.price || 0);
        days[key].cost += Number(o.provider_cost || 0);
        days[key].profit += Number(o.profit_amount || 0);
      }
    });
    return Object.values(days);
  }, [orders]);

  return (
    <PageContainer>
      <div className="animate-fade-in space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-h1 gradient-text tracking-tight">Profit Analytics</h1>
          <p className="text-[11px] text-muted-foreground uppercase tracking-[0.1em] mt-1">
            Revenue, Cost & Margin Tracking
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Revenue", value: stats.totalRevenue, icon: DollarSign, color: "text-primary" },
            { label: "Provider Cost", value: stats.totalCost, icon: ArrowDownRight, color: "text-destructive" },
            { label: "Net Profit", value: stats.totalProfit, icon: TrendingUp, color: "text-chart-2" },
            { label: "Profit Margin", value: Math.round(stats.profitPercent), icon: Percent, color: "text-chart-3", isSuffix: true },
          ].map((kpi) => (
            <div key={kpi.label} className="stat-card">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-[var(--radius-btn)] flex items-center justify-center"
                  style={{ background: `hsl(var(--${kpi.color.replace("text-", "")}) / 0.1)` }}
                >
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">
                  {kpi.label}
                </span>
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
                {kpi.isSuffix
                  ? `${kpi.value}%`
                  : kpi.value.toLocaleString()
                }
                {!kpi.isSuffix && (
                  <span className="text-xs font-semibold text-muted-foreground ml-1">MMK</span>
                )}
              </p>
            </div>
          ))}
        </div>

        {/* 30-Day Profit Chart */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">30-Day Profit Trend</h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                Revenue vs Provider Cost
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold font-mono tabular-nums text-foreground">
                {stats.profit30.toLocaleString()}
                <span className="text-xs text-muted-foreground ml-1">MMK</span>
              </p>
              <p className="text-[10px] text-muted-foreground">30-day net profit</p>
            </div>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value.toLocaleString()} MMK`]} />
                <Bar dataKey="revenue" fill="hsl(var(--primary) / 0.6)" radius={[2, 2, 0, 0]} name="Revenue" />
                <Bar dataKey="cost" fill="hsl(var(--destructive) / 0.4)" radius={[2, 2, 0, 0]} name="Cost" />
                <Bar dataKey="profit" fill="hsl(var(--chart-2) / 0.7)" radius={[2, 2, 0, 0]} name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Service-Level Profit Table */}
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-border/30">
            <h2 className="text-sm font-semibold text-foreground">Service Profit Breakdown</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
              Per-1000 pricing analysis {exchangeRate ? `(Rate: ${exchangeRate.toLocaleString()} MMK/USD)` : ""}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/20">
                  <th className="text-left p-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Service</th>
                  <th className="text-right p-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Rate/1K (USD)</th>
                  <th className="text-right p-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cost/1K (MMK)</th>
                  <th className="text-right p-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Sell/1K (MMK)</th>
                  <th className="text-right p-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Profit/1K</th>
                  <th className="text-right p-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Margin</th>
                </tr>
              </thead>
              <tbody>
                {serviceBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground text-xs">
                      No API services configured
                    </td>
                  </tr>
                ) : (
                  serviceBreakdown.map((svc: any, i: number) => (
                    <tr key={i} className="border-b border-border/10 hover:bg-muted/5 transition-colors">
                      <td className="p-3">
                        <p className="font-medium text-foreground text-xs truncate max-w-[200px]">{svc.name}</p>
                        <p className="text-[10px] text-muted-foreground">{svc.category}</p>
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-xs text-muted-foreground">
                        ${svc.ratePer1000Usd.toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-xs text-foreground">
                        {svc.costPer1000Mmk.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-xs text-foreground">
                        {svc.sellPer1000Mmk.toLocaleString()}
                      </td>
                      <td className="p-3 text-right">
                        <span className={`font-mono tabular-nums text-xs font-semibold ${
                          svc.profitPer1000Mmk > 0 ? "text-chart-2" : "text-destructive"
                        }`}>
                          {svc.profitPer1000Mmk > 0 ? "+" : ""}{svc.profitPer1000Mmk.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          svc.profitPct >= 10 ? "text-chart-2" : svc.profitPct >= 5 ? "text-warning" : "text-destructive"
                        }`}>
                          {svc.profitPct >= 10 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {svc.profitPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Margin Config Display */}
        {marginConfig && (
          <div className="glass-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Margin Configuration</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-[var(--radius-card)] bg-muted/10 border border-border/20 p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Global Default</p>
                <p className="text-xl font-bold font-mono text-foreground mt-1">{marginConfig.global_margin}%</p>
              </div>
              {Object.entries(marginConfig.category_margins || {}).map(([cat, margin]: [string, any]) => (
                <div key={cat} className="rounded-[var(--radius-card)] bg-muted/10 border border-border/20 p-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{cat}</p>
                  <p className="text-xl font-bold font-mono text-foreground mt-1">{margin}%</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
