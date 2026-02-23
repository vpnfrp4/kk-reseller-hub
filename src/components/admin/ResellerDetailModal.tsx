import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, Wallet, ShoppingCart, Calendar, TrendingUp } from "lucide-react";

interface ResellerDetailModalProps {
  reseller: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ResellerDetailModal({ reseller, open, onOpenChange }: ResellerDetailModalProps) {
  const { data: orders } = useQuery({
    queryKey: ["admin-reseller-orders", reseller?.user_id],
    enabled: open && !!reseller?.user_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", reseller.user_id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const { data: transactions } = useQuery({
    queryKey: ["admin-reseller-transactions", reseller?.user_id],
    enabled: open && !!reseller?.user_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", reseller.user_id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  if (!reseller) return null;

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      delivered: "bg-success/10 text-success",
      pending: "bg-warning/10 text-warning",
      cancelled: "bg-destructive/10 text-destructive",
      approved: "bg-success/10 text-success",
      rejected: "bg-destructive/10 text-destructive",
    };
    return (
      <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${styles[status] || "bg-muted text-muted-foreground"}`}>
        {status}
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Reseller Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
              {(reseller.name || "?")[0].toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{reseller.name || "—"}</p>
              <p className="text-sm text-muted-foreground">{reseller.email}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Balance", value: `${reseller.balance.toLocaleString()} MMK`, icon: Wallet },
              { label: "Spent", value: `${reseller.total_spent.toLocaleString()} MMK`, icon: TrendingUp },
              { label: "Orders", value: reseller.total_orders, icon: ShoppingCart },
              { label: "Joined", value: new Date(reseller.created_at).toLocaleDateString(), icon: Calendar },
            ].map((s) => (
              <div key={s.label} className="bg-muted/30 rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-sm font-mono font-semibold text-foreground">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Orders */}
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center gap-2 text-sm">
              <ShoppingCart className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-foreground">Recent Orders</span>
              <span className="text-xs text-muted-foreground ml-auto">{orders?.length || 0}</span>
            </div>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {(!orders || orders.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-4">No orders</p>
              ) : orders.map((o: any) => (
                <div key={o.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{o.product_name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{o.credentials}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-mono font-semibold text-foreground">{o.price.toLocaleString()}</p>
                    <div className="flex items-center gap-1.5 justify-end">
                      {statusBadge(o.status)}
                      <span className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transactions */}
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center gap-2 text-sm">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-foreground">Transaction History</span>
              <span className="text-xs text-muted-foreground ml-auto">{transactions?.length || 0}</span>
            </div>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {(!transactions || transactions.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-4">No transactions</p>
              ) : transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString()} · {tx.type}
                      {tx.method ? ` · ${tx.method}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className={`text-sm font-mono font-semibold ${tx.type === "topup" ? "text-success" : "text-foreground"}`}>
                      {tx.type === "topup" ? "+" : "-"}{Math.abs(tx.amount).toLocaleString()}
                    </p>
                    {statusBadge(tx.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
