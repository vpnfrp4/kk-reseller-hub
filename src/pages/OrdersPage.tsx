import { useNavigate } from "react-router-dom";
import ProductIcon from "@/components/products/ProductIcon";
import { sanitizeName } from "@/lib/sanitize-name";
import Breadcrumb from "@/components/Breadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy, CheckCircle2, Download, ChevronLeft, ChevronRight, Search,
  CalendarIcon, X, Package, Clock, CheckCircle, XCircle, ChevronDown,
  ExternalLink, ArrowRight, Filter, Loader2,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { PAGED_QUERY_OPTIONS } from "@/lib/query-options";
import { sanitizeSearchKeyword } from "@/lib/validators";
import { format } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { playNotificationSound } from "@/lib/notification-sound";
import { motion, AnimatePresence } from "framer-motion";

import { useAuth } from "@/contexts/AuthContext";
import { Money } from "@/components/shared";
import PullToRefresh from "@/components/shared/PullToRefresh";
import { Skeleton } from "@/components/ui/skeleton";
import { t, useT } from "@/lib/i18n";
import MmLabel, { MmStatus, MmInline } from "@/components/shared/MmLabel";

const PAGE_SIZE = 20;

/* ── Product Type Badge ── */
function ProductTypeBadge({ type }: { type: string | null }) {
  const map: Record<string, { label: string; style: string }> = {
    digital: { label: "Instant", style: "bg-primary/10 text-primary border border-primary/20" },
    imei: { label: "IMEI", style: "bg-warning/10 text-warning border border-warning/20" },
    manual: { label: "Manual", style: "bg-ice/10 text-ice border border-ice/20" },
    api: { label: "API", style: "bg-success/10 text-success border border-success/20" },
  };
  const s = map[type || "digital"] || map.digital;
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${s.style}`}>
      {s.label}
    </span>
  );
}

/* ── Status Badge ── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    processing: { label: "Processing", className: "bg-primary/10 text-primary border-primary/20" },
    pending: { label: "Pending", className: "bg-warning/10 text-warning border-warning/20" },
    pending_creation: { label: "Preparing", className: "bg-warning/10 text-warning border-warning/20" },
    pending_review: { label: "Review", className: "bg-ice/10 text-ice border-ice/20" },
    delivered: { label: "Completed", className: "bg-success/10 text-success border-success/20" },
    completed: { label: "Completed", className: "bg-success/10 text-success border-success/20" },
    rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive border-destructive/20" },
    cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/20" },
    api_pending: { label: "API Pending", className: "bg-ice/10 text-ice border-ice/20" },
  };
  const config = map[status] || { label: status, className: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={cn("text-[11px] px-2.5 py-1 rounded-full font-semibold border inline-flex items-center gap-1.5", config.className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", 
        status === "processing" || status === "pending" || status === "pending_creation" || status === "pending_review" || status === "api_pending" ? "animate-pulse" : "",
        status === "processing" ? "bg-primary" : "",
        status === "pending" || status === "pending_creation" ? "bg-warning" : "",
        status === "delivered" || status === "completed" ? "bg-success" : "",
        status === "rejected" || status === "cancelled" ? "bg-destructive" : "",
        status === "pending_review" || status === "api_pending" ? "bg-ice" : "",
      )} />
      {config.label}
    </span>
  );
}

/* ── Order Timeline ── */
function OrderTimeline({ order }: { order: any }) {
  const steps = [
    { label: "Order Placed", date: order.created_at, done: true },
    { label: "Processing", date: null, done: ["processing", "completed", "delivered"].includes(order.status) },
    { label: "Completed", date: order.completed_at, done: ["completed", "delivered"].includes(order.status) },
  ];
  if (order.status === "rejected" || order.status === "cancelled") {
    steps[2] = { label: order.status === "rejected" ? "Rejected" : "Cancelled", date: order.completed_at, done: true };
  }

  return (
    <div className="flex items-center gap-0 w-full">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={cn(
              "w-3 h-3 rounded-full border-2 transition-all",
              step.done
                ? i === steps.length - 1 && (order.status === "rejected" || order.status === "cancelled")
                  ? "bg-destructive border-destructive"
                  : "bg-success border-success"
                : "bg-muted border-border"
            )} />
            <span className={cn("text-[10px] font-medium whitespace-nowrap", step.done ? "text-foreground" : "text-muted-foreground")}>
              {step.label}
            </span>
            {step.date && (
              <span className="text-[9px] text-muted-foreground">
                {format(new Date(step.date), "MMM dd, HH:mm")}
              </span>
            )}
          </div>
          {i < steps.length - 1 && (
            <div className={cn("h-0.5 flex-1 mx-1 rounded-full transition-all", step.done ? "bg-success" : "bg-border")} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Expanded Row Detail ── */
function ExpandedOrderDetail({ order }: { order: any }) {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="overflow-hidden"
    >
      <div className="px-5 py-4 bg-muted/30 border-t border-border/20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-start gap-3">
            <ProductIcon
              imageUrl={order.products?.image_url}
              name={order.product_name}
              category={order.products?.category || order.product_type || "General"}
              size="lg"
            />
            <div className="space-y-1.5 min-w-0">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Service Details</span>
              <p className="text-sm font-medium text-foreground">{sanitizeName(order.product_name)}</p>
              <p className="text-xs text-muted-foreground font-mono">{order.order_code || order.id.slice(0, 8)}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Processing</span>
            <p className="text-sm text-foreground">
              {order.product_type === "digital" || order.product_type === "api" ? "Instant" : "1-7 Business Days"}
            </p>
            <p className="text-xs text-muted-foreground capitalize">{order.fulfillment_mode || "standard"} fulfillment</p>
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Result</span>
            {order.result ? (
              <p className="text-sm text-success font-medium">{order.result}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Awaiting result</p>
            )}
            {order.admin_notes && (
              <p className="text-xs text-muted-foreground mt-1">{order.admin_notes}</p>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="pt-3 border-t border-border/20">
          <OrderTimeline order={order} />
        </div>

        <div className="flex justify-end mt-4">
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-xs hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all"
            onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/orders/${order.id}`); }}
          >
            Full Details
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Stat Mini Card ── */
function MiniStat({ label, value, icon: Icon, color, accent }: { label: string; value: number; icon: any; color: string; accent?: boolean }) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-[var(--radius-card)] border bg-card/90 backdrop-blur-sm p-4 flex items-center gap-3 transition-all duration-300",
      "hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5",
      accent ? "border-primary/25 bg-gradient-to-br from-primary/8 to-transparent" : "border-border/50",
    )}>
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0")}
        style={{ background: `hsl(var(--${color}) / 0.1)` }}>
        <Icon className={cn("w-[18px] h-[18px]", `text-${color}`)} strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-2xl font-bold font-mono tabular-nums text-foreground">{value.toLocaleString()}</p>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const hasAutoHighlighted = useRef(false);

  // Realtime
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
                  setHighlightedIds((prev) => { const next = new Set(prev); next.delete(orderId); return next; });
                }, 3000);
              }
            }
          }
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          queryClient.invalidateQueries({ queryKey: ["orders-count"] });
          queryClient.invalidateQueries({ queryKey: ["orders-stats"] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [productType, setProductType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const l = useT();

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(0); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

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

  // Count
  const { data: countData } = useQuery({
    queryKey: ["orders-count", user?.id, ...filterKey],
    queryFn: async () => {
      let q = supabase.from("orders").select("*", { count: "exact", head: true });
      q = buildQuery(q);
      const { count } = await q;
      return count || 0;
    },
    enabled: !!user,
  });

  // Stats
  const { data: stats } = useQuery({
    queryKey: ["orders-stats", user?.id],
    queryFn: async () => {
      if (!user) return { total: 0, processing: 0, completed: 0, rejected: 0 };
      const { data } = await supabase.from("orders").select("status").eq("user_id", user.id);
      if (!data) return { total: 0, processing: 0, completed: 0, rejected: 0 };
      return {
        total: data.length,
        processing: data.filter(o => ["processing", "pending", "pending_creation", "pending_review", "api_pending"].includes(o.status)).length,
        completed: data.filter(o => ["completed", "delivered"].includes(o.status)).length,
        rejected: data.filter(o => ["rejected", "cancelled"].includes(o.status)).length,
      };
    },
    enabled: !!user,
  });

  const totalCount = countData || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders", user?.id, page, ...filterKey],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase.from("orders").select("*, products:product_id(image_url, category)").order("created_at", { ascending: false });
      q = buildQuery(q);
      q = q.range(from, to);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Auto-highlight the newest order when redirected from a successful purchase
  useEffect(() => {
    if (hasAutoHighlighted.current || !orders || orders.length === 0) return;
    const isNewRedirect = searchParams.get("new") === "1";
    // Also highlight if the top order was created within the last 10 seconds
    const topOrder = orders[0];
    const isRecent = topOrder && (Date.now() - new Date(topOrder.created_at).getTime()) < 10000;
    if (isNewRedirect || isRecent) {
      hasAutoHighlighted.current = true;
      const id = topOrder.id;
      setHighlightedIds(new Set([id]));
      setExpandedId(id);
      // Remove highlight param from URL
      if (isNewRedirect) {
        searchParams.delete("new");
        setSearchParams(searchParams, { replace: true });
      }
      setTimeout(() => {
        setHighlightedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      }, 4000);
    }
  }, [orders, searchParams, setSearchParams]);

  const copyCredentials = (id: string, creds: string) => {
    navigator.clipboard.writeText(creds);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportCSV = async () => {
    let q = supabase.from("orders").select("*, products:product_id(image_url, category)").order("created_at", { ascending: false });
    q = buildQuery(q);
    const { data: allOrders } = await q;
    if (!allOrders || allOrders.length === 0) {
      toast.error(l(t.orders.noExportData));
      return;
    }
    const headers = ["Order Code", "Product", "Type", "Credentials", "Price (MMK)", "Date", "Status"];
    const rows = allOrders.map((o: any) => [
      o.order_code || o.id, o.product_name, o.product_type || "digital",
      `"${(o.credentials || "").replace(/"/g, '""')}"`, o.price,
      new Date(o.created_at).toLocaleDateString(), o.status,
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
    setSearchInput(""); setSearch(""); setStatus("all"); setProductType("all");
    setDateFrom(undefined); setDateTo(undefined); setPage(0);
  };

  const hasFilters = search || searchInput || status !== "all" || productType !== "all" || dateFrom || dateTo;

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  /* ── Credentials cell ── */
  const renderCredentials = (row: any) => {
    const pType = row.product_type || "digital";
    if (pType === "imei" && row.imei_number) {
      return (
        <code className="text-xs font-mono text-warning bg-warning/5 border border-warning/10 px-2.5 py-1 rounded-lg truncate max-w-[200px]">
          IMEI: {row.imei_number}
        </code>
      );
    }
    if ((pType === "manual" || pType === "api") && (!row.credentials || row.credentials === "Pending manual fulfillment")) {
      return <span className="text-xs text-muted-foreground italic">Pending</span>;
    }
    if (!row.credentials) return <span className="text-xs text-muted-foreground italic">—</span>;
    return (
      <div className="flex items-center gap-2">
        <code className="text-xs font-mono text-primary bg-primary/5 border border-primary/10 px-2.5 py-1 rounded-lg truncate max-w-[180px]">
          {row.credentials}
        </code>
        <button
          onClick={(e) => { e.stopPropagation(); copyCredentials(row.id, row.credentials); }}
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          {copiedId === row.id ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  };

  return (
    <PullToRefresh onRefresh={async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["orders-count"] }),
        queryClient.invalidateQueries({ queryKey: ["orders-stats"] }),
      ]);
    }}>
      <div className="space-y-5">
        <Breadcrumb items={[
          { label: l(t.nav.dashboard), path: "/dashboard" },
          { label: l(t.nav.orders) },
        ]} />

        {/* ═══ PAGE HEADER ═══ */}
        <div className="cd-page-head cd-reveal">
          <div>
            <h1>Order History</h1>
            <p>View and manage all your previous service orders.</p>
          </div>
          <div className="cd-page-head-actions">
            <Button onClick={exportCSV} variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 transition-all">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* ═══ STAT CARDS ═══ */}
        <div className="cd-kpi-grid cd-reveal">
          <MiniStat label="Total Orders" value={stats?.total || 0} icon={Package} color="primary" accent />
          <MiniStat label="Processing" value={stats?.processing || 0} icon={Clock} color="warning" />
          <MiniStat label="Completed" value={stats?.completed || 0} icon={CheckCircle} color="success" />
          <MiniStat label="Rejected" value={stats?.rejected || 0} icon={XCircle} color="destructive" />
        </div>

        {/* ═══ FILTERS ═══ */}
        <div className="glass-card animate-fade-in" style={{ animationDelay: "100ms" }}>
          <div className="p-4 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by service name or order ID..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 h-9 bg-muted/20 border-border/40 rounded-[var(--radius-input)]"
                />
              </div>
            </div>

            <div className="min-w-[130px]">
              <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Status</label>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
                <SelectTrigger className="h-9 bg-muted/20 border-border/40 rounded-[var(--radius-input)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="pending_review">Review</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[120px]">
              <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">Type</label>
              <Select value={productType} onValueChange={(v) => { setProductType(v); setPage(0); }}>
                <SelectTrigger className="h-9 bg-muted/20 border-border/40 rounded-[var(--radius-input)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="digital">Instant</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="imei">IMEI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[130px]">
              <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">From</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-9 w-full justify-start text-left font-normal bg-muted/20 border-border/40 rounded-[var(--radius-input)]", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {dateFrom ? format(dateFrom, "PP") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setPage(0); }} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            <div className="min-w-[130px]">
              <label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">To</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-9 w-full justify-start text-left font-normal bg-muted/20 border-border/40 rounded-[var(--radius-input)]", !dateTo && "text-muted-foreground")}>
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
              <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-muted-foreground hover:text-destructive" onClick={clearFilters}>
                <X className="w-4 h-4" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* ═══ ORDERS TABLE (Desktop) ═══ */}
        <div className="hidden md:block glass-card animate-fade-in overflow-hidden" style={{ animationDelay: "150ms" }}>
          {ordersLoading ? (
            <div className="p-5 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : !orders || orders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{hasFilters ? "No orders match your filters" : "No orders yet"}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/20">
                  {["Order ID", "Service", "Date", "Amount", "Status"].map((h) => (
                    <th key={h} className={cn(
                      "text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3.5 text-left",
                      h === "Amount" && "text-right",
                      h === "Status" && "text-center",
                    )}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((row: any, idx: number) => (
                  <motion.tr
                    key={row.id}
                    initial={false}
                    className="contents"
                  >
                    <tr
                      className={cn(
                        "border-b border-border/10 transition-all duration-300 group cursor-pointer",
                        "hover:bg-muted/30",
                        highlightedIds.has(row.id) && "animate-[highlight-flash_2s_ease-out] bg-primary/8 ring-1 ring-inset ring-primary/25",
                        expandedId === row.id && "bg-muted/20",
                      )}
                      style={{ animationDelay: `${idx * 30}ms` }}
                      onClick={() => toggleExpand(row.id)}
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs text-muted-foreground">{row.order_code || row.id.slice(0, 8)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <ProductIcon
                            imageUrl={row.products?.image_url}
                            name={row.product_name}
                            category={row.products?.category || row.product_type || "General"}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-foreground block truncate max-w-[280px]">{sanitizeName(row.product_name)}</span>
                            <span className="text-[10px] text-muted-foreground">{row.product_type === "imei" ? "IMEI" : row.product_type === "api" ? "API" : row.product_type === "manual" ? "Manual" : "Instant"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-muted-foreground">{format(new Date(row.created_at), "MMM dd, yyyy")}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Money amount={row.price} className="text-sm font-semibold text-foreground" />
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                    <AnimatePresence>
                      {expandedId === row.id && (
                        <tr>
                          <td colSpan={5} className="p-0">
                            <ExpandedOrderDetail order={row} />
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {totalCount > PAGE_SIZE && (
            <div className="border-t border-border/20 px-5 py-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                  return (
                    <Button key={pageNum} variant={pageNum === page ? "default" : "ghost"} size="icon" className="h-8 w-8 text-xs" onClick={() => setPage(pageNum)}>
                      {pageNum + 1}
                    </Button>
                  );
                })}
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ═══ MOBILE CARDS ═══ */}
        <div className="md:hidden space-y-3 animate-fade-in" style={{ animationDelay: "150ms" }}>
          {ordersLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            ))
          ) : !orders || orders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground glass-card">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{hasFilters ? "No orders match your filters" : "No orders yet"}</p>
            </div>
          ) : (
            orders.map((row: any) => (
              <div
                key={row.id}
                className={cn(
                  "glass-card overflow-hidden transition-all duration-300",
                  highlightedIds.has(row.id) && "animate-[highlight-flash_2s_ease-out] ring-1 ring-primary/30 bg-primary/5",
                )}
              >
                <div
                  className="p-4 cursor-pointer active:scale-[0.99] transition-transform"
                  onClick={() => toggleExpand(row.id)}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <ProductIcon
                        imageUrl={row.products?.image_url}
                        name={row.product_name}
                        category={row.products?.category || row.product_type || "General"}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground line-clamp-1">{sanitizeName(row.product_name)}</p>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{row.order_code || row.id.slice(0, 8)}</p>
                      </div>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>

                  {/* Details row */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <ProductTypeBadge type={row.product_type} />
                      <span className="text-[11px] text-muted-foreground">{format(new Date(row.created_at), "MMM dd, yyyy")}</span>
                    </div>
                    <Money amount={row.price} className="text-sm font-bold text-foreground" />
                  </div>

                  {/* Action row */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/20">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/orders/${row.id}`); }}
                      className="text-xs font-medium text-primary flex items-center gap-1.5 hover:underline"
                    >
                      View Details
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <ChevronDown className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform duration-200",
                      expandedId === row.id && "rotate-180"
                    )} />
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {expandedId === row.id && (
                    <ExpandedOrderDetail order={row} />
                  )}
                </AnimatePresence>
              </div>
            ))
          )}

          {/* Mobile pagination */}
          {totalCount > PAGE_SIZE && (
            <div className="flex items-center justify-between glass-card p-3">
              <p className="text-xs text-muted-foreground">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} / {totalCount}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs text-muted-foreground px-2">{page + 1} / {totalPages}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}
