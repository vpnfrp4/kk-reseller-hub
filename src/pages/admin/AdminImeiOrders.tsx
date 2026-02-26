import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Money from "@/components/shared/Money";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Eye,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  pending: { label: "Pending", class: "badge-pending" },
  processing: { label: "Processing", class: "badge-expiring" },
  completed: { label: "Completed", class: "badge-delivered" },
  rejected: { label: "Rejected", class: "badge-cancelled" },
};

export default function AdminImeiOrders() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Detail modal
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [resultText, setResultText] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-imei-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("imei_orders")
        .select("*, imei_services(service_name, brand, carrier, country, processing_time), profiles:user_id(name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Auto-open from query param
  const orderParam = searchParams.get("order");
  if (orderParam && orders.length > 0 && !selectedOrder) {
    const found = orders.find((o: any) => o.id === orderParam);
    if (found) {
      setSelectedOrder(found);
      setResultText(found.result || "");
      setAdminNotes(found.admin_notes || "");
    }
  }

  const filtered = orders.filter((o: any) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        o.imei_number?.toLowerCase().includes(q) ||
        o.imei_services?.service_name?.toLowerCase().includes(q) ||
        o.id?.toLowerCase().includes(q) ||
        o.profiles?.name?.toLowerCase().includes(q) ||
        o.profiles?.email?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, result, admin_notes }: { id: string; status: string; result?: string; admin_notes?: string }) => {
      const payload: any = { status };
      if (result !== undefined) payload.result = result;
      if (admin_notes !== undefined) payload.admin_notes = admin_notes;
      if (status === "completed") payload.completed_at = new Date().toISOString();
      const { error } = await supabase.from("imei_orders").update(payload).eq("id", id);
      if (error) throw error;

      // Notify user
      const order = orders.find((o: any) => o.id === id);
      if (order) {
        await supabase.from("notifications").insert({
          user_id: order.user_id,
          title: status === "completed" ? "IMEI Order Completed" : status === "rejected" ? "IMEI Order Rejected" : "IMEI Order Updated",
          body: `Your ${order.imei_services?.service_name || "IMEI"} order (IMEI: ${order.imei_number}) has been ${status}.${result ? " Result: " + result : ""}`,
          type: status === "completed" ? "success" : status === "rejected" ? "error" : "info",
          link: "/dashboard/imei-orders",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-imei-orders"] });
      toast.success("Order updated");
      setSelectedOrder(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openDetail = (order: any) => {
    setSelectedOrder(order);
    setResultText(order.result || "");
    setAdminNotes(order.admin_notes || "");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">IMEI Order Management</h1>
        <p className="text-sm text-muted-foreground">
          {orders.filter((o: any) => o.status === "pending").length} pending · {orders.length} total
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search IMEI, service, user..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">No IMEI orders found.</div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>IMEI</th>
                  <th>Service</th>
                  <th>User</th>
                  <th>Status</th>
                  <th className="text-right">Price</th>
                  <th>Date</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order: any) => {
                  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  return (
                    <tr key={order.id}>
                      <td className="p-default text-xs font-mono text-muted-foreground">{order.id.substring(0, 8)}</td>
                      <td className="p-default text-sm font-mono font-semibold">{order.imei_number}</td>
                      <td className="p-default text-sm">
                        <div>
                          <span className="text-foreground">{order.imei_services?.service_name}</span>
                          <span className="block text-xs text-muted-foreground">{order.imei_services?.brand}</span>
                        </div>
                      </td>
                      <td className="p-default text-sm">
                        <div>
                          <span className="text-foreground">{order.profiles?.name || "—"}</span>
                          <span className="block text-xs text-muted-foreground">{order.profiles?.email}</span>
                        </div>
                      </td>
                      <td className="p-default">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.class}`}>{cfg.label}</span>
                      </td>
                      <td className="p-default text-right"><Money amount={order.price} className="font-semibold" /></td>
                      <td className="p-default text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="p-default text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(order)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {order.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => updateMutation.mutate({ id: order.id, status: "processing" })}
                            >
                              Start
                            </Button>
                          )}
                          {(order.status === "pending" || order.status === "processing") && (
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => openDetail(order)}
                            >
                              Complete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {filtered.map((order: any) => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              return (
                <div
                  key={order.id}
                  className="glass-card p-4 space-y-2 cursor-pointer active:scale-[0.99]"
                  onClick={() => openDetail(order)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{order.imei_services?.service_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{order.imei_number}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.class}`}>{cfg.label}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{order.profiles?.name || order.profiles?.email}</span>
                    <Money amount={order.price} className="font-semibold text-sm" />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Order Detail / Complete Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              IMEI Order Detail
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="glass-card p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-mono text-xs">{selectedOrder.id.substring(0, 12)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-semibold">{selectedOrder.imei_services?.service_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Brand</span>
                  <span>{selectedOrder.imei_services?.brand}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IMEI</span>
                  <span className="font-mono font-semibold">{selectedOrder.imei_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User</span>
                  <span>{selectedOrder.profiles?.name || selectedOrder.profiles?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <Money amount={selectedOrder.price} className="font-semibold" />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${(STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.pending).class}`}>
                    {(STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.pending).label}
                  </span>
                </div>
              </div>

              {(selectedOrder.status === "pending" || selectedOrder.status === "processing") && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Unlock Result / Code</Label>
                    <Input
                      value={resultText}
                      onChange={(e) => setResultText(e.target.value)}
                      placeholder="Enter unlock code or result"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Admin Notes (optional)</Label>
                    <Input
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Internal notes"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      className="flex-1"
                      disabled={updateMutation.isPending}
                      onClick={() => updateMutation.mutate({
                        id: selectedOrder.id,
                        status: "rejected",
                        admin_notes: adminNotes,
                      })}
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={updateMutation.isPending || !resultText.trim()}
                      onClick={() => updateMutation.mutate({
                        id: selectedOrder.id,
                        status: "completed",
                        result: resultText,
                        admin_notes: adminNotes,
                      })}
                    >
                      {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                      Complete
                    </Button>
                  </div>
                </>
              )}

              {selectedOrder.status === "completed" && selectedOrder.result && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-primary">Result</Label>
                  <div className="p-3 rounded-lg bg-secondary border border-border font-mono text-sm break-all">
                    {selectedOrder.result}
                  </div>
                </div>
              )}

              {selectedOrder.admin_notes && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Notes</Label>
                  <p className="text-sm text-muted-foreground">{selectedOrder.admin_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
