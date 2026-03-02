import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Filter, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { playNotificationSound } from "@/lib/notification-sound";
import SoundToggle from "@/components/shared/SoundToggle";
import OrderDetailModal from "@/components/admin/OrderDetailModal";
import ConfirmModal from "@/components/shared/ConfirmModal";
import { DataCard, Money } from "@/components/shared";

const STATUS_OPTIONS = ["all", "delivered", "pending", "pending_creation", "pending_review", "processing", "completed", "rejected", "cancelled"] as const;
const TYPE_OPTIONS = ["all", "digital", "imei", "manual", "api"] as const;
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const TYPE_BADGE_STYLES: Record<string, string> = {
  digital: "bg-primary/10 text-primary",
  imei: "bg-warning/10 text-warning",
  manual: "bg-accent/20 text-accent-foreground",
  api: "bg-success/10 text-success",
};

function productTypeBadge(type: string | null) {
  const t = type || "digital";
  return (
    <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${TYPE_BADGE_STYLES[t] || "bg-muted text-muted-foreground"}`}>
      {t.toUpperCase()}
    </span>
  );
}

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<any>(null);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-all-orders"],
    queryFn: async () => {
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (!ordersData || ordersData.length === 0) return [];

      const userIds = [...new Set(ordersData.map((o) => o.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", userIds);

      const profileMap: Record<string, { name: string; email: string }> = {};
      (profiles || []).forEach((p) => {
        profileMap[p.user_id] = { name: p.name, email: p.email };
      });

      return ordersData.map((o) => ({
        ...o,
        profile: profileMap[o.user_id] || null,
      }));
    },
  });

  // Realtime: auto-refresh when any order changes
  useEffect(() => {
    const channel = supabase
      .channel("admin-orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
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
          queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Auto-open order detail from ?order= query param
  useEffect(() => {
    const orderId = searchParams.get("order");
    if (orderId && orders && orders.length > 0) {
      const target = orders.find((o: any) => o.id === orderId);
      if (target) {
        setDetailOrder(target);
        setSearchParams({}, { replace: true });
      }
    }
  }, [orders, searchParams, setSearchParams]);

  const filtered = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o: any) => {
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      const matchesType = typeFilter === "all" || (o.product_type || "digital") === typeFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        o.product_name.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        (o.order_code && o.order_code.toLowerCase().includes(q)) ||
        o.profile?.name?.toLowerCase().includes(q) ||
        o.profile?.email?.toLowerCase().includes(q) ||
        (o.imei_number && o.imei_number.toLowerCase().includes(q));
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [orders, search, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  if (safePage !== page) setPage(safePage);

  const paginatedOrders = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const { data, error } = await supabase.functions.invoke("update-order-status", {
        body: { order_id: orderId, status: newStatus },
      });
      if (error) throw new Error(error.message);
      if (data && !data.success) throw new Error(data.error || "Update failed");
      toast.success(`Order status updated to ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    const ids = Array.from(selectedIds);
    let failCount = 0;
    for (const id of ids) {
      try {
        const { data, error } = await supabase.functions.invoke("update-order-status", {
          body: { order_id: id, status: newStatus },
        });
        if (error || (data && !data.success)) failCount++;
      } catch {
        failCount++;
      }
    }
    setBulkUpdating(false);

    if (failCount > 0) {
      toast.error(`${failCount} of ${ids.length} order(s) failed to update`);
    } else {
      toast.success(`${ids.length} order(s) updated to ${newStatus}`);
    }
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pageIds = paginatedOrders.map((o: any) => o.id);
    const allSelected = pageIds.every((id: string) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id: string) => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const pageIds = paginatedOrders.map((o: any) => o.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id: string) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id: string) => selectedIds.has(id));

  const statusBadge = (status: string) => {
    const badgeClass: Record<string, string> = {
      delivered: "badge-delivered",
      pending: "badge-pending",
      cancelled: "badge-cancelled",
      processing: "bg-warning/10 text-warning",
      completed: "bg-success/10 text-success",
      rejected: "bg-destructive/10 text-destructive",
    };
    return (
      <span className={`text-[11px] px-2.5 py-1 rounded-full ${badgeClass[status] || "bg-muted text-muted-foreground"}`}>
        {status.replace("_", " ")}
      </span>
    );
  };

  const paginationFooter = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Rows per page:</span>
        <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
          <SelectTrigger className="w-[70px] h-8 text-xs bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {filtered.length === 0 ? "0" : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)}`} of {filtered.length}
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-section">
      <div className="animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h1 text-foreground">Order Management</h1>
            <p className="text-caption text-muted-foreground">Search, filter, and manage all orders</p>
          </div>
          <SoundToggle />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-default animate-fade-in">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by product, order ID, user, or IMEI..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 bg-card border-border"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px] bg-card border-border">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "All Statuses" : s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[140px] bg-card border-border">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((t) => (
              <SelectItem key={t} value={t}>
                {t === "all" ? "All Types" : t.charAt(0).toUpperCase() + t.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in">
        <ShoppingCart className="w-4 h-4" />
        <span>{filtered.length} order{filtered.length !== 1 ? "s" : ""} found</span>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <DataCard className="animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-sm text-foreground font-medium">{selectedIds.size} selected</span>
            <div className="flex gap-2 ml-auto flex-wrap">
              {["delivered", "pending", "processing", "completed", "rejected", "cancelled"].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant="outline"
                  className="text-xs h-8"
                  disabled={bulkUpdating}
                  onClick={() => setBulkConfirm(s)}
                >
                  Mark {s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
              <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          </div>
        </DataCard>
      )}

      {/* Table */}
      <DataCard noPadding className="animate-fade-in" footer={paginationFooter}>
        <div className="overflow-x-auto">
          <table className="premium-table">
            <thead>
              <tr>
                <th className="w-10 pl-4">
                  <Checkbox
                    checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th>Order Code</th>
                <th>Product</th>
                <th>Type</th>
                <th>User</th>
                <th className="text-right">Price</th>
                <th className="text-center">Status</th>
                <th>Date</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-sm text-muted-foreground">
                    No orders found
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((o: any) => (
                  <tr
                    key={o.id}
                    className={`transition-colors duration-700 ${
                      highlightedIds.has(o.id)
                        ? "bg-primary/15 ring-1 ring-inset ring-primary/30"
                        : selectedIds.has(o.id)
                          ? "bg-primary/5"
                          : ""
                    }`}
                  >
                    <td className="p-default w-10 pl-4">
                      <Checkbox
                        checked={selectedIds.has(o.id)}
                        onCheckedChange={() => toggleSelect(o.id)}
                      />
                    </td>
                    <td className="p-default text-xs font-mono text-muted-foreground cursor-pointer hover:text-primary" onClick={() => setDetailOrder(o)}>{o.order_code || o.id.slice(0, 8)}</td>
                    <td className="p-default">
                      <p className="text-sm font-medium text-foreground">{o.product_name}</p>
                      {o.imei_number && (
                        <p className="text-[11px] font-mono text-muted-foreground mt-0.5">IMEI: {o.imei_number}</p>
                      )}
                    </td>
                    <td className="p-default">{productTypeBadge(o.product_type)}</td>
                    <td className="p-default">
                      <p className="text-sm text-foreground">{o.profile?.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{o.profile?.email || "Unknown"}</p>
                    </td>
                    <td className="p-default text-right">
                      <Money amount={o.price} />
                    </td>
                    <td className="p-default text-center">{statusBadge(o.status)}</td>
                    <td className="p-default text-sm text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-default text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs px-2"
                          onClick={() => setDetailOrder(o)}
                        >
                          View
                        </Button>
                        <Select
                          value={o.status}
                          onValueChange={(val) => handleStatusChange(o.id, val)}
                          disabled={updatingId === o.id}
                        >
                          <SelectTrigger className="w-[110px] h-8 text-xs bg-card border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataCard>

      <OrderDetailModal
        order={detailOrder}
        open={!!detailOrder}
        onOpenChange={(open) => { if (!open) setDetailOrder(null); }}
        onStatusUpdated={() => queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] })}
      />

      <ConfirmModal
        open={!!bulkConfirm}
        onOpenChange={(open) => { if (!open) setBulkConfirm(null); }}
        title="Confirm Bulk Status Change"
        description={`Are you sure you want to mark ${selectedIds.size} order(s) as "${bulkConfirm}"? This action cannot be undone.`}
        confirmLabel={bulkUpdating ? "Updating…" : `Update ${selectedIds.size} Order(s)`}
        onConfirm={() => {
          if (bulkConfirm) {
            handleBulkStatusChange(bulkConfirm).then(() => setBulkConfirm(null));
          }
        }}
        destructive={bulkConfirm === "rejected" || bulkConfirm === "cancelled"}
        loading={bulkUpdating}
      />
    </div>
  );
}
