import { useNavigate } from "react-router-dom";
import { sanitizeName } from "@/lib/sanitize-name";
import Breadcrumb from "@/components/Breadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, CheckCircle2, Download, ChevronLeft, ChevronRight, Search, CalendarIcon, X } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { playNotificationSound } from "@/lib/notification-sound";

import { useAuth } from "@/contexts/AuthContext";
import { DataCard, Money, ResponsiveTable } from "@/components/shared";
import PullToRefresh from "@/components/shared/PullToRefresh";
import { Skeleton } from "@/components/ui/skeleton";
import type { Column } from "@/components/shared";
import { t, useT } from "@/lib/i18n";
import MmLabel, { MmStatus, MmInline } from "@/components/shared/MmLabel";

const PAGE_SIZE = 20;

/* ── Product Type Badge ── */
function ProductTypeBadge({ type }: { type: string | null }) {
  const map: Record<string, { label: string; style: string }> = {
    digital: { label: "Digital", style: "bg-muted text-muted-foreground" },
    imei: { label: "IMEI", style: "bg-muted text-muted-foreground" },
    manual: { label: "Manual", style: "bg-muted text-muted-foreground" },
    api: { label: "API", style: "bg-success/10 text-success" },
  };
  const s = map[type || "digital"] || map.digital;
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${s.style}`}>
      {s.label}
    </span>
  );
}

export default function OrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  // Realtime: auto-refresh orders list when any order changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const newStatus = (payload.new as any)?.status;
            const oldStatus = (payload.old as any)?.status;
            const productName = (payload.new as any)?.product_name || "Order";
            const orderId = (payload.new as any)?.id;
            if (newStatus && newStatus !== oldStatus) {
              toast.info(`"${productName}" → ${newStatus.replace("_", " ")}`);
              playNotificationSound();
              if (orderId) {
                setHighlightedIds((prev) => new Set(prev).add(orderId));
                setTimeout(() => {
                  setHighlightedIds((prev) => {
                    const next = new Set(prev);
                    next.delete(orderId);
                    return next;
                  });
                }, 3000);
              }
            }
          }
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          queryClient.invalidateQueries({ queryKey: ["orders-count"] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [productType, setProductType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const l = useT();

  const buildQuery = (q: any) => {
    if (user) q = q.eq("user_id", user.id);
    if (search.trim()) q = q.ilike("product_name", `%${search.trim()}%`);
    if (status !== "all") q = q.eq("status", status);
    if (productType !== "all") q = q.eq("product_type", productType);
    if (dateFrom) q = q.gte("created_at", dateFrom.toISOString());
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      q = q.lte("created_at", end.toISOString());
    }
    return q;
  };

  const filterKey = [search, status, productType, dateFrom?.toISOString(), dateTo?.toISOString()];

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

  const { data: orders, isLoading: ordersLoading } = useQuery({
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
      toast.error(l(t.orders.noExportData));
      return;
    }
    const headers = ["Order Code", "Product", "Type", "Credentials", "Price (MMK)", "Date", "Status"];
    const rows = allOrders.map((o: any) => [
      o.order_code || o.id,
      o.product_name,
      o.product_type || "digital",
      `"${(o.credentials || "").replace(/"/g, '""')}"`,
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
    toast.success(l(t.orders.exportSuccess));
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setProductType("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(0);
  };

  const hasFilters = search || status !== "all" || productType !== "all" || dateFrom || dateTo;

  /* ── Credentials cell renderer ── */
  const renderCredentials = (row: any) => {
    const pType = row.product_type || "digital";
    // IMEI orders: show IMEI number
    if (pType === "imei" && row.imei_number) {
      return (
        <code className="text-xs font-mono text-warning bg-warning/5 border border-warning/10 px-2.5 py-1 rounded-[var(--radius-btn)] truncate max-w-[200px]">
          IMEI: {row.imei_number}
        </code>
      );
    }
    // Pending manual/api orders without credentials
    if ((pType === "manual" || pType === "api") && (!row.credentials || row.credentials === "Pending manual fulfillment")) {
      return (
        <span className="text-xs text-muted-foreground italic">Pending</span>
      );
    }
    // Standard credentials
    if (!row.credentials) return <span className="text-xs text-muted-foreground italic">—</span>;
    return (
      <div className="flex items-center gap-2">
        <code className="text-xs font-mono text-primary bg-primary/5 border border-primary/10 px-2.5 py-1 rounded-[var(--radius-btn)] truncate max-w-[200px]">
          {row.credentials}
        </code>
        <button
          onClick={(e) => { e.stopPropagation(); copyCredentials(row.id, row.credentials); }}
          className="text-muted-foreground hover:text-primary transition-colors duration-200"
        >
          {copiedId === row.id ? (
            <CheckCircle2 className="w-4 h-4 text-primary" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
    );
  };

  const columns: Column<any>[] = [
    {
      key: "order_code",
      label: l(t.orders.orderId),
      hideOnMobile: true,
      render: (row) => <span className="font-mono text-muted-foreground text-xs">{row.order_code || row.id.slice(0, 8)}</span>,
    },
    {
      key: "product_name",
      label: l(t.orders.product),
      priority: true,
      render: (row: any) => <span>{sanitizeName(row.product_name)}</span>,
    },
    {
      key: "product_type",
      label: "Type",
      hideOnMobile: true,
      render: (row) => <ProductTypeBadge type={row.product_type} />,
    },
    {
      key: "credentials",
      label: l(t.orders.credentials),
      render: renderCredentials,
    },
    {
      key: "price",
      label: l(t.orders.price),
      align: "right" as const,
      render: (row) => <Money amount={row.price} className="gold-text" />,
    },
    {
      key: "created_at",
      label: l(t.orders.date),
      hideOnMobile: true,
      render: (row) => <span className="text-muted-foreground text-xs">{new Date(row.created_at).toLocaleDateString()}</span>,
    },
    {
      key: "status",
      label: "Status",
      align: "center" as const,
      render: (row) => <MmStatus status={row.status} />,
    },
  ];

  const paginationFooter = totalCount > PAGE_SIZE ? (
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground">
        {l(t.products.showing)} {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} / {totalCount}
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
    <PullToRefresh onRefresh={async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["orders"] }), queryClient.invalidateQueries({ queryKey: ["orders-count"] })]); }}>
    <div className="space-y-[var(--space-section)]">
      <Breadcrumb items={[
        { label: l(t.nav.dashboard), path: "/dashboard" },
        { label: l(t.nav.orders) },
      ]} />

      <div className="animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-[var(--space-micro)]">
              <MmLabel mm={t.orders.title.mm} en={t.orders.title.en} />
            </p>
            <p className="text-[11px] text-muted-foreground">{l(t.orders.subtitle)}</p>
          </div>
          <Button onClick={exportCSV} size="sm" className="gap-2 btn-glass">
            <Download className="w-4 h-4 text-primary" />
            <MmInline mm={t.orders.exportCsv.mm} en={t.orders.exportCsv.en} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card animate-fade-in">
        <div className="p-[var(--space-default)] flex flex-wrap gap-[var(--space-compact)] items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">{l(t.orders.search)}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={l(t.orders.productName)}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9 h-9 bg-muted/20 border-border/40 rounded-[var(--radius-input)]"
              />
            </div>
          </div>

          <div className="min-w-[140px]">
            <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Status</label>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
              <SelectTrigger className="h-9 bg-muted/20 border-border/40 rounded-[var(--radius-input)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{l(t.products.all)}</SelectItem>
                <SelectItem value="delivered">{l(t.status.delivered)}</SelectItem>
                <SelectItem value="pending">{l(t.status.pending)}</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[130px]">
            <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Type</label>
            <Select value={productType} onValueChange={(v) => { setProductType(v); setPage(0); }}>
              <SelectTrigger className="h-9 bg-muted/20 border-border/40 rounded-[var(--radius-input)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{l(t.products.all)}</SelectItem>
                <SelectItem value="digital">Digital</SelectItem>
                <SelectItem value="imei">IMEI</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="api">API</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[140px]">
            <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">{l(t.orders.from)}</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 w-full justify-start text-left font-normal bg-muted/20 border-border/40 rounded-[var(--radius-input)]", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {dateFrom ? format(dateFrom, "PP") : l(t.orders.startDate)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setPage(0); }} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <div className="min-w-[140px]">
            <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">{l(t.orders.to)}</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 w-full justify-start text-left font-normal bg-muted/20 border-border/40 rounded-[var(--radius-input)]", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {dateTo ? format(dateTo, "PP") : l(t.orders.endDate)}
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
              {l(t.orders.clear)}
            </Button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass-card animate-fade-in overflow-hidden">
        {ordersLoading ? (
          <div className="p-5 space-y-4">
            {/* Header row skeleton */}
            <div className="flex items-center gap-4 pb-3 border-b border-border/20">
              {["w-16", "flex-1", "w-20", "w-24", "w-16", "w-20", "w-16"].map((w, i) => (
                <Skeleton key={i} className={`h-3 ${w}`} />
              ))}
            </div>
            {/* Row skeletons */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <ResponsiveTable
            columns={columns}
            data={orders || []}
            keyExtractor={(row) => row.id}
            emptyMessage={hasFilters ? l(t.orders.noMatch) : l(t.orders.noOrders)}
            onRowClick={(row) => navigate(`/dashboard/orders/${row.id}`)}
            rowClassName={(row) =>
              highlightedIds.has(row.id)
                ? "bg-primary/15 ring-1 ring-inset ring-primary/30"
                : ""
            }
          />
        )}
        {paginationFooter && (
          <div className="border-t border-border/20 p-[var(--space-default)]">
            {paginationFooter}
          </div>
        )}
      </div>
    </div>
    </PullToRefresh>
  );
}
