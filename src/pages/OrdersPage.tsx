import Breadcrumb from "@/components/Breadcrumb";
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
import { DataCard, Money, ResponsiveTable } from "@/components/shared";
import type { Column } from "@/components/shared";
import { t } from "@/lib/i18n";
import MmLabel, { MmStatus, MmInline } from "@/components/shared/MmLabel";

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
      toast.error("ထုတ်ယူမည့် မှာယူမှုမရှိပါ");
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
    toast.success("ဒေတာထုတ်ယူမှု အောင်မြင်ပါသည်");
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(0);
  };

  const hasFilters = search || status !== "all" || dateFrom || dateTo;

  const columns: Column<any>[] = [
    {
      key: "id",
      label: t.orders.orderId.mm,
      hideOnMobile: true,
      render: (row) => <span className="font-mono text-muted-foreground">{row.id.slice(0, 8)}</span>,
    },
    {
      key: "product_name",
      label: t.orders.product.mm,
      priority: true,
    },
    {
      key: "credentials",
      label: t.orders.credentials.mm,
      render: (row) => (
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono text-muted-foreground bg-primary/5 border border-primary/10 px-2.5 py-1 rounded-md truncate max-w-[200px]">
            {row.credentials}
          </code>
          <button
            onClick={(e) => { e.stopPropagation(); copyCredentials(row.id, row.credentials); }}
            className="text-muted-foreground hover:text-primary transition-colors duration-200"
          >
            {copiedId === row.id ? (
              <CheckCircle2 className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      ),
    },
    {
      key: "price",
      label: t.orders.price.mm,
      align: "right" as const,
      render: (row) => <Money amount={row.price} className="gold-text" />,
    },
    {
      key: "created_at",
      label: t.orders.date.mm,
      hideOnMobile: true,
      render: (row) => <span className="text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</span>,
    },
    {
      key: "status",
      label: t.status.delivered.en === "Delivered" ? "Status" : "Status",
      align: "center" as const,
      render: (row) => <MmStatus status={row.status} />,
    },
  ];

  const paginationFooter = totalCount > PAGE_SIZE ? (
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground">
        {t.products.showing.mm} {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} / {totalCount}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {Array.from({ length: totalPages }, (_, i) => (
          <Button key={i} variant={i === page ? "default" : "ghost"} size="icon" className="h-8 w-8 text-xs" onClick={() => setPage(i)}>
            {i + 1}
          </Button>
        ))}
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  ) : undefined;

  return (
    <div className="space-y-section">
      <Breadcrumb items={[
        { label: t.nav.dashboard.mm, path: "/dashboard" },
        { label: t.nav.orders.mm },
      ]} />

      <div className="animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h1 text-foreground">
              <MmLabel mm={t.orders.title.mm} en={t.orders.title.en} />
            </h1>
            <p className="text-caption text-muted-foreground">{t.orders.subtitle.mm}</p>
          </div>
          <Button onClick={exportCSV} size="sm" className="gap-2 btn-glass">
            <Download className="w-4 h-4 text-primary" />
            <MmInline mm={t.orders.exportCsv.mm} en={t.orders.exportCsv.en} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <DataCard className="animate-fade-in" noPadding>
        <div className="p-card flex flex-wrap gap-default items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="text-caption font-medium text-muted-foreground mb-1.5 block">{t.orders.search.mm}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t.orders.productName.mm}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9 h-9"
              />
            </div>
          </div>

          <div className="min-w-[140px]">
            <label className="text-caption font-medium text-muted-foreground mb-1.5 block">Status</label>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.products.all.mm}</SelectItem>
                <SelectItem value="delivered">{t.status.delivered.mm}</SelectItem>
                <SelectItem value="pending">{t.status.pending.mm}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[140px]">
            <label className="text-caption font-medium text-muted-foreground mb-1.5 block">{t.orders.from.mm}</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {dateFrom ? format(dateFrom, "PP") : t.orders.startDate.mm}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setPage(0); }} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <div className="min-w-[140px]">
            <label className="text-caption font-medium text-muted-foreground mb-1.5 block">{t.orders.to.mm}</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {dateTo ? format(dateTo, "PP") : t.orders.endDate.mm}
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
              {t.orders.clear.mm}
            </Button>
          )}
        </div>
      </DataCard>

      {/* Orders Table */}
      <DataCard noPadding className="animate-fade-in" footer={paginationFooter}>
        <ResponsiveTable
          columns={columns}
          data={orders || []}
          keyExtractor={(row) => row.id}
          emptyMessage={hasFilters ? t.orders.noMatch.mm : t.orders.noOrders.mm}
        />
      </DataCard>
    </div>
  );
}
