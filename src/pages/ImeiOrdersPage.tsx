import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import PageContainer from "@/components/shared/PageContainer";
import Money from "@/components/shared/Money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Smartphone,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; class: string; icon: React.ElementType }> = {
  pending: { label: "Pending", class: "badge-pending", icon: Clock },
  processing: { label: "Processing", class: "badge-expiring", icon: Loader2 },
  completed: { label: "Completed", class: "badge-delivered", icon: CheckCircle2 },
  rejected: { label: "Rejected", class: "badge-cancelled", icon: XCircle },
};

export default function ImeiOrdersPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["imei-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("imei_orders")
        .select("*, imei_services(service_name, brand, carrier, country, processing_time)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filtered = orders.filter((o: any) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        o.imei_number?.toLowerCase().includes(q) ||
        o.imei_services?.service_name?.toLowerCase().includes(q) ||
        o.id?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <PageContainer>
      <div>
        <h1 className="text-xl font-bold tracking-tight">IMEI Orders</h1>
        <p className="text-sm text-muted-foreground">Track your IMEI unlock requests</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by IMEI, service, or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" asChild>
          <Link to="/imei-marketplace">
            <Smartphone className="w-4 h-4 mr-1" /> Browse Services
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          {orders.length === 0 ? (
            <>
              <Smartphone className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p>No IMEI orders yet.</p>
              <Button className="mt-4" asChild>
                <Link to="/imei-marketplace">Browse IMEI Services</Link>
              </Button>
            </>
          ) : (
            "No orders match your filters."
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order: any) => {
            const svc = order.imei_services;
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const StatusIcon = cfg.icon;

            return (
              <div key={order.id} className="glass-card p-4 sm:p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">
                      {svc?.service_name || "Unknown Service"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {svc?.brand} · {svc?.carrier} · {svc?.country}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.class}`}>
                    <StatusIcon className={`w-3 h-3 ${order.status === "processing" ? "animate-spin" : ""}`} />
                    {cfg.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">IMEI</span>
                    <p className="font-mono font-semibold text-foreground mt-0.5 text-xs">
                      {order.imei_number}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Price</span>
                    <div className="mt-0.5">
                      <Money amount={order.price} className="font-semibold" />
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Est. Time</span>
                    <p className="text-foreground mt-0.5 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {svc?.processing_time || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Date</span>
                    <p className="text-foreground mt-0.5 text-xs">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Result section for completed orders */}
                {order.status === "completed" && order.result && (
                  <div className="border-t border-border pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                        Unlock Result
                      </span>
                      <button
                        onClick={() => handleCopy(order.result, order.id)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        {copiedId === order.id ? (
                          <><Check className="w-3 h-3" /> Copied</>
                        ) : (
                          <><Copy className="w-3 h-3" /> Copy</>
                        )}
                      </button>
                    </div>
                    <div className="mt-1.5 p-3 rounded-lg bg-secondary border border-border font-mono text-xs text-foreground break-all">
                      {order.result}
                    </div>
                  </div>
                )}

                {/* Admin notes */}
                {order.admin_notes && (
                  <div className="border-t border-border pt-3">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Notes</span>
                    <p className="text-sm text-foreground mt-0.5">{order.admin_notes}</p>
                  </div>
                )}

                {/* Order ID */}
                <div className="text-[10px] text-muted-foreground font-mono">
                  ID: {order.id.substring(0, 8)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
