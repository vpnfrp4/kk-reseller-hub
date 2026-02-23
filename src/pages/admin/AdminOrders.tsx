import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Filter, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const STATUS_OPTIONS = ["all", "delivered", "pending", "cancelled"] as const;
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

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

  const filtered = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o: any) => {
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        o.product_name.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.profile?.name?.toLowerCase().includes(q) ||
        o.profile?.email?.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  // Reset to page 1 when filters change
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  if (safePage !== page) setPage(safePage);

  const paginatedOrders = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);
    setUpdatingId(null);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Order status updated to ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      delivered: "bg-success/10 text-success",
      pending: "bg-warning/10 text-warning",
      cancelled: "bg-destructive/10 text-destructive",
    };
    return (
      <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${styles[status] || "bg-muted text-muted-foreground"}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Order Management</h1>
        <p className="text-muted-foreground text-sm">Search, filter, and manage all orders</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by product, order ID, or user..."
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
                {s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: "0.15s" }}>
        <ShoppingCart className="w-4 h-4" />
        <span>{filtered.length} order{filtered.length !== 1 ? "s" : ""} found</span>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Order ID</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Product</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">User</th>
                <th className="text-right text-xs font-medium text-muted-foreground p-4">Price</th>
                <th className="text-center text-xs font-medium text-muted-foreground p-4">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Date</th>
                <th className="text-center text-xs font-medium text-muted-foreground p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                    No orders found
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((o: any) => (
                  <tr key={o.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-4 text-xs font-mono text-muted-foreground">{o.id.slice(0, 8)}…</td>
                    <td className="p-4 text-sm font-medium text-foreground">{o.product_name}</td>
                    <td className="p-4">
                      <p className="text-sm text-foreground">{o.profile?.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{o.profile?.email || "Unknown"}</p>
                    </td>
                    <td className="p-4 text-sm font-mono text-right text-foreground">
                      {o.price.toLocaleString()} MMK
                    </td>
                    <td className="p-4 text-center">{statusBadge(o.status)}</td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-center">
                      <Select
                        value={o.status}
                        onValueChange={(val) => handleStatusChange(o.id, val)}
                        disabled={updatingId === o.id}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs bg-card border-border mx-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
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
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}