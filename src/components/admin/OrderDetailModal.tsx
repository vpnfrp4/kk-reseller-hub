import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KeyRound, Wallet, ShoppingCart, User, Calendar, Copy, Check, Zap, Clock, Smartphone, UserIcon, CheckCircle2, Loader2, FileText, StickyNote, Save, Sparkles, Eye, SendHorizonal, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OrderDetailModalProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdated?: () => void;
}

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

/* ─── Quick templates ─── */
const RESULT_TEMPLATES = [
  {
    label: "Login Info",
    icon: "🔑",
    text: "Username: \nPassword: ",
  },
  {
    label: "Success",
    icon: "✅",
    text: "Your order has been completed successfully.\nCredentials have been delivered.",
  },
  {
    label: "Instruction",
    icon: "📋",
    text: "Please follow these steps:\n1. \n2. \n3. ",
  },
  {
    label: "Invalid",
    icon: "❌",
    text: "The information provided is incorrect. Please contact support for assistance.",
  },
];

export default function OrderDetailModal({ order, open, onOpenChange, onStatusUpdated }: OrderDetailModalProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [copiedResult, setCopiedResult] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [credentialsInput, setCredentialsInput] = useState("");
  const [resultInput, setResultInput] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [notesInitialized, setNotesInitialized] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [showResultPreview, setShowResultPreview] = useState(false);
  const [savingResult, setSavingResult] = useState(false);

  // Initialize when order changes
  if (order && order.id !== notesInitialized) {
    setAdminNotes(order.admin_notes || "");
    setNotesInitialized(order.id);
    setResultInput("");
    setCredentialsInput("");
    setShowResultPreview(false);
  }

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

  const copyResult = () => {
    navigator.clipboard.writeText(order.result || "");
    setCopiedResult(true);
    setTimeout(() => setCopiedResult(false), 2000);
  };

  const saveAdminNotes = async () => {
    setSavingNotes(true);
    const { error } = await supabase
      .from("orders")
      .update({ admin_notes: adminNotes.trim() || null })
      .eq("id", order.id);
    setSavingNotes(false);
    if (error) {
      toast.error("Failed to save notes");
    } else {
      toast.success("Admin notes saved");
      queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
    }
  };

  const handleSaveResult = async () => {
    if (!resultInput.trim() && !credentialsInput.trim()) {
      toast.error("Please enter credentials or result text");
      return;
    }
    setSavingResult(true);
    try {
      const updatePayload: Record<string, unknown> = {};
      if (credentialsInput.trim()) {
        updatePayload.credentials = credentialsInput.trim();
      }
      if (resultInput.trim()) {
        updatePayload.result = resultInput.trim();
      }

      const { error } = await supabase
        .from("orders")
        .update(updatePayload)
        .eq("id", order.id);

      if (error) throw error;

      // Notify the customer
      await supabase.from("notifications").insert({
        user_id: order.user_id,
        title: "📦 New Result Available",
        body: `Your order for ${order.product_name} has been updated with new results. Check your order details.`,
        type: "order",
        link: `/dashboard/orders/${order.id}`,
      });

      toast.success("Result saved & customer notified");
      queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
      onStatusUpdated?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to save result");
    } finally {
      setSavingResult(false);
    }
  };

  const handleFulfillAndDeliver = async () => {
    setUpdating(true);
    try {
      const isImeiOrder = (order.product_type || "digital") === "imei";
      const newStatus = isImeiOrder ? "completed" : "delivered";
      const payload: Record<string, unknown> = {
        order_id: order.id,
        status: newStatus,
      };
      if (credentialsInput.trim()) {
        payload.credentials = credentialsInput.trim();
      }
      if (resultInput.trim()) {
        payload.result = resultInput.trim();
      }

      const { data, error } = await supabase.functions.invoke("update-order-status", {
        body: payload,
      });
      if (error) throw new Error(error.message);
      if (data && !data.success) throw new Error(data.error || "Update failed");

      toast.success(isImeiOrder ? "Order completed & customer notified" : "Order delivered & customer notified");
      queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
      onStatusUpdated?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update order");
    } finally {
      setUpdating(false);
    }
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

  const statusBadge = (status: string) => <StatusBadge status={status} />;
  const isImeiOrder = (order.product_type || "digital") === "imei";
  const isPending = ["pending_creation", "pending_review", "processing", "pending", "api_pending"].includes(order.status);
  const currentCredentials = order.credentials || credential?.credentials || "";
  const hasPendingPlaceholder = currentCredentials.includes("Pending") || currentCredentials === "" || currentCredentials === "N/A";

  // Preview lines for result
  const previewLines = useMemo(() => {
    const text = resultInput.trim();
    if (!text) return [];
    return text.split("\n").filter(Boolean);
  }, [resultInput]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            Order Details
            <span className="text-xs font-mono text-muted-foreground font-normal">{order.order_code}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* ═══ Order Info ═══ */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShoppingCart className="w-4 h-4" />
              <span className="font-medium text-foreground">Order Info</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Order Code</p>
                <p className="font-mono text-foreground text-xs">{order.order_code || order.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {statusBadge(order.status)}
                  {productTypeBadge(order.product_type)}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Product</p>
                <p className="font-medium text-foreground">{order.product_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Price</p>
                <p className="font-mono font-semibold text-foreground">{order.price.toLocaleString()} MMK</p>
              </div>
              {order.imei_number && (
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">IMEI Number</p>
                  <p className="font-mono text-foreground">{order.imei_number}</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Date</p>
                <p className="text-foreground">{new Date(order.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* ═══ Fulfillment Info ═══ */}
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

          {/* ═══ Customer Info ═══ */}
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

          {/* ═══ Current Credentials ═══ */}
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <KeyRound className="w-4 h-4" />
              <span className="font-medium text-foreground">Credentials</span>
            </div>
            <div className="relative">
              <pre className={cn(
                "rounded-lg p-3 text-sm font-mono whitespace-pre-wrap break-all border",
                hasPendingPlaceholder
                  ? "bg-warning/5 border-warning/20 text-warning"
                  : "bg-muted/50 border-border text-foreground"
              )}>
                {currentCredentials || "N/A"}
              </pre>
              {currentCredentials && !hasPendingPlaceholder && (
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

          {/* ═══ Existing Result ═══ */}
          {order.result && (
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span className="font-medium text-foreground">Current Result</span>
              </div>
              <div className="relative">
                <pre className="bg-success/5 rounded-lg p-3 text-sm font-mono text-foreground whitespace-pre-wrap break-all border border-success/20">
                  {order.result}
                </pre>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={copyResult}
                >
                  {copiedResult ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              MANUAL FULFILLMENT SUITE
             ═══════════════════════════════════════════════════════ */}
          <div className="space-y-4 border-t-2 border-primary/20 pt-5">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">Manual Result Editor</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium ml-auto">
                Fulfillment Suite
              </span>
            </div>

            {/* Quick Templates */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <LayoutTemplate className="w-3.5 h-3.5" />
                <span className="font-medium">Quick Templates</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {RESULT_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.label}
                    onClick={() => {
                      setResultInput((prev) => prev ? prev + "\n" + tmpl.text : tmpl.text);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs font-medium text-foreground transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>{tmpl.icon}</span>
                    <span>{tmpl.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Credentials Input */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Credentials (replaces current)</p>
              <Input
                value={credentialsInput}
                onChange={(e) => setCredentialsInput(e.target.value)}
                placeholder="e.g. email@example.com:password123 or account details"
                className="bg-muted/50 border-border text-sm font-mono"
              />
            </div>

            {/* Result Textarea */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Result / Instructions for Customer</p>
              <Textarea
                value={resultInput}
                onChange={(e) => setResultInput(e.target.value)}
                placeholder="Type the result, unlock code, instructions, or any info to deliver to customer..."
                className="bg-muted/50 border-border text-sm font-mono min-h-[100px] resize-y"
              />
            </div>

            {/* Live Preview */}
            {(resultInput.trim() || credentialsInput.trim()) && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowResultPreview(!showResultPreview)}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {showResultPreview ? "Hide Preview" : "Show Live Preview"}
                </button>

                {showResultPreview && (
                  <div className="rounded-xl border-2 border-dashed border-primary/20 bg-primary/[0.02] p-4 space-y-3 animate-fade-in">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-primary/60">
                      Customer View Preview
                    </p>

                    {credentialsInput.trim() && (
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Credentials</p>
                        <pre className="bg-card rounded-lg p-3 text-sm font-mono text-foreground whitespace-pre-wrap break-all border border-border">
                          {credentialsInput.trim()}
                        </pre>
                      </div>
                    )}

                    {resultInput.trim() && (
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Fulfillment Result</p>
                        <div className="bg-card rounded-lg p-3 border border-border space-y-1">
                          {previewLines.map((line, i) => {
                            const emoji = line.match(/^[\p{Emoji_Presentation}\p{Emoji}\u200d]+/u)?.[0] || "";
                            const text = emoji ? line.slice(emoji.length).trim() : line;
                            return (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                {emoji && <span className="text-base leading-5 shrink-0">{emoji}</span>}
                                <span className="font-mono text-foreground">{text || line}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              {/* Save without status change */}
              <Button
                variant="outline"
                className="flex-1 gap-2 text-sm"
                disabled={savingResult || (!resultInput.trim() && !credentialsInput.trim())}
                onClick={handleSaveResult}
              >
                {savingResult ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save & Update Credentials
              </Button>

              {/* Fulfill & change status */}
              {isPending && (
                <Button
                  className="flex-1 gap-2 text-sm"
                  disabled={updating}
                  onClick={handleFulfillAndDeliver}
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizonal className="w-4 h-4" />}
                  {isImeiOrder ? "Complete & Deliver" : "Fulfill & Deliver"}
                </Button>
              )}
            </div>
          </div>

          {/* ═══ Admin Notes ═══ */}
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <StickyNote className="w-4 h-4" />
              <span className="font-medium text-foreground">Admin Notes</span>
            </div>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add internal notes about this order..."
              className="bg-muted/50 border-border text-sm min-h-[60px]"
            />
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              disabled={savingNotes || adminNotes === (order.admin_notes || "")}
              onClick={saveAdminNotes}
            >
              {savingNotes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Notes
            </Button>
          </div>

          {/* ═══ Transaction History ═══ */}
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