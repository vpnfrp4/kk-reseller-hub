import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KeyRound, Wallet, ShoppingCart, User, Calendar, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface OrderDetailModalProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OrderDetailModal({ order, open, onOpenChange }: OrderDetailModalProps) {
  const [copied, setCopied] = useState(false);

  const { data: transactions } = useQuery({
    queryKey: ["admin-user-transactions", order?.user_id],
    enabled: open && !!order?.user_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", order.user_id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const { data: credential } = useQuery({
    queryKey: ["admin-order-credential", order?.credential_id],
    enabled: open && !!order?.credential_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_credentials")
        .select("*")
        .eq("id", order.credential_id)
        .single();
      return data;
    },
  });

  if (!order) return null;

  const copyCredentials = () => {
    navigator.clipboard.writeText(order.credentials || credential?.credentials || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          <DialogTitle className="text-foreground">Order Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShoppingCart className="w-4 h-4" />
              <span className="font-medium text-foreground">Order Info</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Order ID</p>
                <p className="font-mono text-foreground text-xs">{order.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <div className="mt-0.5">{statusBadge(order.status)}</div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Product</p>
                <p className="font-medium text-foreground">{order.product_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Price</p>
                <p className="font-mono font-semibold text-foreground">{order.price.toLocaleString()} MMK</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Date</p>
                <p className="text-foreground">{new Date(order.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="font-medium text-foreground">Customer</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Name</p>
                <p className="text-foreground">{order.profile?.name || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="text-foreground">{order.profile?.email || "Unknown"}</p>
              </div>
            </div>
          </div>

          {/* Credentials */}
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <KeyRound className="w-4 h-4" />
              <span className="font-medium text-foreground">Credentials</span>
            </div>
            <div className="relative">
              <pre className="bg-muted/50 rounded-lg p-3 text-sm font-mono text-foreground whitespace-pre-wrap break-all border border-border">
                {order.credentials || credential?.credentials || "N/A"}
              </pre>
              {(order.credentials || credential?.credentials) && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={copyCredentials}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              )}
            </div>
            {credential && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Credential ID</p>
                  <p className="font-mono text-xs text-foreground">{credential.id.slice(0, 12)}…</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Sold At</p>
                  <p className="text-foreground text-xs">{credential.sold_at ? new Date(credential.sold_at).toLocaleString() : "—"}</p>
                </div>
              </div>
            )}
          </div>

          {/* Transaction History */}
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="w-4 h-4" />
              <span className="font-medium text-foreground">User Transaction History</span>
              <span className="text-xs text-muted-foreground ml-auto">Last 20</span>
            </div>
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
              {(!transactions || transactions.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-4">No transactions</p>
              ) : (
                transactions.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(tx.created_at).toLocaleString()} · {tx.type}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className={`text-sm font-mono font-semibold ${tx.type === "topup" ? "text-success" : "text-foreground"}`}>
                        {tx.type === "topup" ? "+" : "-"}{Math.abs(tx.amount).toLocaleString()}
                      </p>
                      {statusBadge(tx.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
