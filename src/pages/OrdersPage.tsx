import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Copy, CheckCircle2, Download, ChevronLeft, ChevronRight, Search, CalendarIcon, X } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PAGE_SIZE = 10;

export default function OrdersPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const buildQuery = (q: any) => {
    if (search.trim()) q = q.ilike("product_name", `%${search.trim()}%`);
    if (status !== "all") q = q.eq("status", status);
    if (dateFrom) q = q.gte("created_at", dateFrom.toISOString());
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      q = q.lte("created_at", end.toISOString());
    }
    return q;
  };

  const filterKey = [search, status, dateFrom?.toISOString(), dateTo?.toISOString()];

  const { data: countData } = useQuery({
    queryKey: ["orders-count", ...filterKey],
    queryFn: async () => {
      let q = supabase.from("orders").select("*", { count: "exact", head: true });
      q = buildQuery(q);
      const { count } = await q;
      return count || 0;
    },
  });

  const totalCount = countData || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const { data: orders } = useQuery({
    queryKey: ["orders", page, ...filterKey],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
      q = buildQuery(q);
      q = q.range(from, to);
      const { data } = await q;
      return data || [];
    },
  });

  const copyCredentials = (id: string, creds: string) => {
    navigator.clipboard.writeText(creds);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportCSV = async () => {
    let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
    q = buildQuery(q);
    const { data: allOrders } = await q;
    if (!allOrders || allOrders.length === 0) {
      toast.error("No orders to export");
      return;
    }
    const headers = ["Order ID", "Product", "Credentials", "Price (MMK)", "Date", "Status"];
    const rows = allOrders.map((o: any) => [
      o.id,
      o.product_name,
      `"${o.credentials.replace(/"/g, '""')}"`,
      o.price,
      new Date(o.created_at).toLocaleDateString(),
      o.status,
    ]);
    const csv = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Orders exported successfully");
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(0);
  };

  const hasFilters = search || status !== "all" || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Order History</h1>
            <p className="text-muted-foreground text-sm">View all your previous purchases</p>
          </div>
          <Button onClick={exportCSV} variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 animate-fade-in flex flex-wrap gap-3 items-end" style={{ animationDelay: "0.05s" }}>
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Product name..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9 h-9"
            />
          </div>
        </div>

        <div className="min-w-[140px]">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[140px]">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">From</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-9 w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="w-4 h-4 mr-2" />
                {dateFrom ? format(dateFrom, "PP") : "Start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setPage(0); }} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>

        <div className="min-w-[140px]">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">To</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-9 w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="w-4 h-4 mr-2" />
                {dateTo ? format(dateTo, "PP") : "End date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setPage(0); }} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground hover:text-destructive" onClick={clearFilters}>
            <X className="w-4 h-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Order ID</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Product</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Credentials</th>
                <th className="text-right text-xs font-medium text-muted-foreground p-4">Price</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Date</th>
                <th className="text-center text-xs font-medium text-muted-foreground p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {(!orders || orders.length === 0) ? (
                <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                  {hasFilters ? "No orders match your filters" : "No orders yet"}
                </td></tr>
              ) : orders.map((order: any) => (
                <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm font-mono text-muted-foreground">{order.id.slice(0, 8)}</td>
                  <td className="p-4 text-sm font-medium text-foreground">{order.product_name}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                        {order.credentials}
                      </code>
                      <button
                        onClick={() => copyCredentials(order.id, order.credentials)}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        {copiedId === order.id ? (
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-mono text-right text-foreground">{order.price.toLocaleString()} MMK</td>
                  <td className="p-4 text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className="p-4 text-center">
                    <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success">{order.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-border/50">
          {(!orders || orders.length === 0) ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {hasFilters ? "No orders match your filters" : "No orders yet"}
            </p>
          ) : orders.map((order: any) => (
            <div key={order.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{order.product_name}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">{order.status}</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded flex-1 truncate">
                  {order.credentials}
                </code>
                <button
                  onClick={() => copyCredentials(order.id, order.credentials)}
                  className="text-muted-foreground hover:text-primary"
                >
                  {copiedId === order.id ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{new Date(order.created_at).toLocaleDateString()}</span>
                <span className="font-mono">{order.price.toLocaleString()} MMK</span>
              </div>
            </div>
          ))}
        </div>

        {totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => (
                <Button
                  key={i}
                  variant={i === page ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8 text-xs"
                  onClick={() => setPage(i)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
