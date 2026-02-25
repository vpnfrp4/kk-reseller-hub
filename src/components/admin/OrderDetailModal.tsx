import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KeyRound, Wallet, ShoppingCart, User, Calendar, Copy, Check, Zap, Clock, Smartphone, UserIcon, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

interface OrderDetailModalProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdated?: () => void;
}

export default function OrderDetailModal({ order, open, onOpenChange, onStatusUpdated }: OrderDetailModalProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [credentialsInput, setCredentialsInput] = useState("");

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

  const FULFILLMENT_MODE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
    instant: { label: "Instant Stock Delivery", icon: Zap, color: "bg-success/10 text-success" },
    custom_username: { label: "Custom Username", icon: UserIcon, color: "bg-primary/10 text-primary" },
    imei: { label: "IMEI Required", icon: Smartphone, color: "bg-primary/10 text-primary" },
    manual: { label: "Manual Processing", icon: Clock, color: "bg-warning/10 text-warning" },
  };

  const fulfillmentMode = order.fulfillment_mode || "instant";
  const modeInfo = FULFILLMENT_MODE_LABELS[fulfillmentMode] || FULFILLMENT_MODE_LABELS.instant;
  const ModeIcon = modeInfo.icon;
  const customFieldsData: Record<string, string> | null = order.custom_fields_data && typeof order.custom_fields_data === "object"
    ? order.custom_fields_data
    : null;

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      delivered: "bg-success/10 text-success",
      pending: "bg-warning/10 text-warning",
      pending_creation: "bg-primary/10 text-primary",
      pending_review: "bg-warning/10 text-warning",
      cancelled: "bg-destructive/10 text-destructive",
      approved: "bg-success/10 text-success",
      rejected: "bg-destructive/10 text-destructive",
    };
    return (
      <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${styles[status] || "bg-muted text-muted-foreground"}`}>
        {status.replace("_", " ")}
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

          {/* Fulfillment Info */}
          {(fulfillmentMode !== "instant" || customFieldsData) && (
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ModeIcon className="w-4 h-4" />
                <span className="font-medium text-foreground">Fulfillment</span>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1.5 ${modeInfo.color}`}>
                    <ModeIcon className="w-3 h-3" />
                    {modeInfo.label}
                  </span>
                </div>
                {customFieldsData && Object.keys(customFieldsData).length > 0 && (
                  <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-2">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Customer Input</p>
                    {Object.entries(customFieldsData).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{key}</span>
                        <span className="font-medium text-foreground font-mono">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

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

          {/* ═══ FULFILL ACTION ═══ */}
          {(order.status === "pending_creation" || order.status === "pending_review") && (
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-medium text-foreground">Fulfill Order</span>
              </div>

              {/* Optional credentials input for manual fulfillment */}
              {(!order.credentials || order.credentials === "") && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Credentials (optional — paste account details to deliver)</p>
                  <Input
                    value={credentialsInput}
                    onChange={(e) => setCredentialsInput(e.target.value)}
                    placeholder="e.g. username:password or account details"
                    className="bg-muted/50 border-border text-sm font-mono"
                  />
                </div>
              )}

              <Button
                className="w-full gap-2"
                disabled={updating}
                onClick={async () => {
                  setUpdating(true);
                  try {
                    const updatePayload: any = { status: "delivered" };
                    if (credentialsInput.trim()) {
                      updatePayload.credentials = credentialsInput.trim();
                    }
                    const { error } = await supabase
                      .from("orders")
                      .update(updatePayload)
                      .eq("id", order.id);
                    if (error) throw error;

                    // Notify the reseller
                    const deliveredCreds = credentialsInput.trim() || order.credentials;
                    await supabase.from("notifications").insert({
                      user_id: order.user_id,
                      title: "✅ Order Delivered",
                      body: `Your order for ${order.product_name} has been fulfilled.${deliveredCreds ? " Check your order for credentials." : ""}`,
                      type: "order",
                      link: "/orders",
                    });

                    toast.success("Order marked as delivered");
                    queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
                    onStatusUpdated?.();
                    onOpenChange(false);
                  } catch (err: any) {
                    toast.error(err.message || "Failed to update order");
                  } finally {
                    setUpdating(false);
                  }
                }}
              >
                {updating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Mark as Delivered
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
