import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import {
  DollarSign, TrendingUp, ArrowDownRight, FileSpreadsheet,
  Calendar, Filter, ShoppingCart, Wallet, Download,
} from "lucide-react";
import { PageContainer } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { exportToCsv } from "@/lib/csv-export";
import { cn } from "@/lib/utils";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
};

const presets = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All time", days: 0 },
];

export default function AdminReports() {
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [preset, setPreset] = useState("30");
  const [statusFilter, setStatusFilter] = useState("all");

  const handlePreset = (days: string) => {
    setPreset(days);
    const d = Number(days);
    if (d === 0) {
      setDateFrom(new Date(2020, 0, 1));
    } else {
      setDateFrom(subDays(new Date(), d));
    }
    setDateTo(new Date());
  };

  // Fetch orders
  const { data: allOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["admin-report-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_code, product_name, price, provider_cost, profit_amount, created_at, status, product_type, fulfillment_mode, user_id")
        .order("created_at", { ascending: false })
        .limit(1000);
      return (data || []) as any[];
    },
  });

  // Fetch transactions
  const { data: allTransactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["admin-report-transactions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wallet_transactions")
        .select("id, user_id, type, amount, status, description, method, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      return (data || []) as any[];
    },
  });

  // Filter by date range
  const orders = useMemo(() => {
    return allOrders.filter((o: any) => {
      const d = new Date(o.created_at);
      const inRange = isWithinInterval(d, { start: startOfDay(dateFrom), end: endOfDay(dateTo) });
      if (!inRange) return false;
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      return true;
    });
  }, [allOrders, dateFrom, dateTo, statusFilter]);

  const transactions = useMemo(() => {
    return allTransactions.filter((t: any) => {
      const d = new Date(t.created_at);
      return isWithinInterval(d, { start: startOfDay(dateFrom), end: endOfDay(dateTo) });
    });
  }, [allTransactions, dateFrom, dateTo]);

  // Revenue KPIs
  const kpis = useMemo(() => {
    const totalRevenue = orders.reduce((s: number, o: any) => s + Number(o.price || 0), 0);
    const totalCost = orders.reduce((s: number, o: any) => s + Number(o.provider_cost || 0), 0);
    const totalProfit = orders.reduce((s: number, o: any) => s + Number(o.profit_amount || 0), 0);
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    const topups = transactions.filter((t: any) => t.type === "topup" && t.status === "approved");
    const totalTopups = topups.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

    return { totalRevenue, totalCost, totalProfit, margin, avgOrderValue, totalTopups, orderCount: orders.length };
  }, [orders, transactions]);

  // Revenue trend chart
  const revenueTrend = useMemo(() => {
    const dayCount = Math.max(1, Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)));
    const bucketCount = Math.min(dayCount, 60);
    const bucketSize = Math.ceil(dayCount / bucketCount);

    const buckets: { label: string; revenue: number; cost: number; profit: number }[] = [];
    for (let i = 0; i < bucketCount; i++) {
      const start = new Date(dateFrom.getTime() + i * bucketSize * 86400000);
      const end = new Date(start.getTime() + bucketSize * 86400000);
      const label = bucketSize <= 1 ? format(start, "MMM dd") : `${format(start, "MMM dd")}`;
      const bucket = { label, revenue: 0, cost: 0, profit: 0 };

      orders.forEach((o: any) => {
        const d = new Date(o.created_at);
        if (d >= start && d < end) {
          bucket.revenue += Number(o.price || 0);
          bucket.cost += Number(o.provider_cost || 0);
          bucket.profit += Number(o.profit_amount || 0);
        }
      });
      buckets.push(bucket);
    }
    return buckets;
  }, [orders, dateFrom, dateTo]);

  // Transaction summary by type
  const txSummary = useMemo(() => {
    const map: Record<string, { count: number; total: number; approved: number }> = {};
    transactions.forEach((t: any) => {
      if (!map[t.type]) map[t.type] = { count: 0, total: 0, approved: 0 };
      map[t.type].count++;
      map[t.type].total += Number(t.amount || 0);
      if (t.status === "approved") map[t.type].approved += Number(t.amount || 0);
    });
    return Object.entries(map).map(([type, data]) => ({ type, ...data }));
  }, [transactions]);

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach((o: any) => {
      map[o.status] = (map[o.status] || 0) + 1;
    });
    return Object.entries(map).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
  }, [orders]);

  // CSV exports
  const exportRevenueReport = () => {
    exportToCsv("revenue-report", orders, [
      { key: "order_code", label: "Order Code" },
      { key: "product_name", label: "Product" },
      { key: "price", label: "Revenue (MMK)" },
      { key: "provider_cost", label: "Cost (MMK)" },
      { key: "profit_amount", label: "Profit (MMK)" },
      { key: "status", label: "Status" },
      { key: "product_type", label: "Type" },
      { key: "created_at", label: "Date" },
    ]);
  };

  const exportTransactionReport = () => {
    exportToCsv("transaction-report", transactions, [
      { key: "id", label: "Transaction ID" },
      { key: "type", label: "Type" },
      { key: "amount", label: "Amount (MMK)" },
      { key: "status", label: "Status" },
      { key: "method", label: "Method" },
      { key: "description", label: "Description" },
      { key: "created_at", label: "Date" },
    ]);
  };

  const isLoading = ordersLoading || txLoading;

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Financial Reports</h1>
            <p className="text-[11px] text-muted-foreground uppercase tracking-[0.1em] mt-1">
              Revenue, transactions & downloadable reports
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={exportRevenueReport} disabled={orders.length === 0}>
              <Download className="w-3.5 h-3.5" />
              Revenue CSV
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={exportTransactionReport} disabled={transactions.length === 0}>
              <Download className="w-3.5 h-3.5" />
              Transactions CSV
            </Button>
          </div>
        </div>

        {/* Date Range Controls */}
        <div className="flex flex-wrap items-center gap-3 animate-fade-in [animation-delay:0.05s]">
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg p-1">
            {presets.map((p) => (
              <button
                key={p.days}
                onClick={() => handlePreset(String(p.days))}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150",
                  preset === String(p.days)
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(dateFrom, "MMM dd, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={dateFrom}
                  onSelect={(d) => { if (d) { setDateFrom(d); setPreset(""); } }}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(dateTo, "MMM dd, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={dateTo}
                  onSelect={(d) => { if (d) { setDateTo(d); setPreset(""); } }}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in [animation-delay:0.1s]">
          {[
            { label: "Revenue", value: kpis.totalRevenue, icon: DollarSign, color: "primary" },
            { label: "Provider Cost", value: kpis.totalCost, icon: ArrowDownRight, color: "destructive" },
            { label: "Net Profit", value: kpis.totalProfit, icon: TrendingUp, color: "chart-2" },
            { label: "Top-ups Received", value: kpis.totalTopups, icon: Wallet, color: "chart-3" },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-card border border-border rounded-[var(--radius-card)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-${kpi.color}/10")}
                  style={{ background: `hsl(var(--${kpi.color}) / 0.1)` }}
                >
                  <kpi.icon className="w-4 h-4" style={{ color: `hsl(var(--${kpi.color}))` }} strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">
                  {kpi.label}
                </span>
              </div>
              <p className="text-xl font-bold font-mono tabular-nums text-foreground">
                {isLoading ? "—" : kpi.value.toLocaleString()}
                <span className="text-[10px] font-semibold text-muted-foreground ml-1">MMK</span>
              </p>
            </div>
          ))}
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-4 animate-fade-in [animation-delay:0.12s]">
          <div className="bg-card border border-border rounded-[var(--radius-card)] p-4 text-center">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Orders</p>
            <p className="text-2xl font-bold font-mono text-foreground mt-1">{kpis.orderCount}</p>
          </div>
          <div className="bg-card border border-border rounded-[var(--radius-card)] p-4 text-center">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Avg Order</p>
            <p className="text-2xl font-bold font-mono text-foreground mt-1">
              {Math.round(kpis.avgOrderValue).toLocaleString()}
            </p>
          </div>
          <div className="bg-card border border-border rounded-[var(--radius-card)] p-4 text-center">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Margin</p>
            <p className="text-2xl font-bold font-mono text-foreground mt-1">{kpis.margin.toFixed(1)}%</p>
          </div>
        </div>

        {/* Tabs: Charts & Tables */}
        <Tabs defaultValue="revenue" className="animate-fade-in [animation-delay:0.15s]">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="revenue" className="text-xs gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Revenue Trend
            </TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs gap-1.5">
              <Wallet className="w-3.5 h-3.5" /> Transactions
            </TabsTrigger>
            <TabsTrigger value="breakdown" className="text-xs gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5" /> Status
            </TabsTrigger>
          </TabsList>

          {/* Revenue Trend */}
          <TabsContent value="revenue">
            <div className="bg-card border border-border rounded-[var(--radius-card)] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Revenue vs Cost vs Profit</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                    {format(dateFrom, "MMM dd, yyyy")} — {format(dateTo, "MMM dd, yyyy")}
                  </p>
                </div>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false} axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false} axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value.toLocaleString()} MMK`]} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} name="Revenue" />
                    <Area type="monotone" dataKey="cost" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.08)" strokeWidth={1.5} name="Cost" />
                    <Area type="monotone" dataKey="profit" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2) / 0.12)" strokeWidth={2} name="Profit" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          {/* Transaction Summary */}
          <TabsContent value="transactions">
            <div className="bg-card border border-border rounded-[var(--radius-card)] overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Transaction Summary by Type</h3>
                <span className="text-[10px] text-muted-foreground">{transactions.length} total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                      <th className="text-right p-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Count</th>
                      <th className="text-right p-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total (MMK)</th>
                      <th className="text-right p-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Approved (MMK)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txSummary.length === 0 ? (
                      <tr><td colSpan={4} className="p-8 text-center text-muted-foreground text-xs">No transactions in range</td></tr>
                    ) : txSummary.map((row) => (
                      <tr key={row.type} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <span className="capitalize font-medium text-xs text-foreground">{row.type}</span>
                        </td>
                        <td className="p-3 text-right font-mono tabular-nums text-xs text-muted-foreground">{row.count}</td>
                        <td className="p-3 text-right font-mono tabular-nums text-xs text-foreground">{row.total.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono tabular-nums text-xs text-primary font-semibold">{row.approved.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Status Breakdown */}
          <TabsContent value="breakdown">
            <div className="bg-card border border-border rounded-[var(--radius-card)] overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Order Status Breakdown</h3>
              </div>
              <div className="p-4 space-y-3">
                {statusBreakdown.map((row) => {
                  const pct = kpis.orderCount > 0 ? (row.count / kpis.orderCount) * 100 : 0;
                  return (
                    <div key={row.status} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-foreground capitalize w-28 truncate">{row.status.replace(/_/g, " ")}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono tabular-nums text-muted-foreground w-16 text-right">
                        {row.count} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                  );
                })}
                {statusBreakdown.length === 0 && (
                  <p className="text-center text-muted-foreground text-xs py-6">No orders in range</p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}
