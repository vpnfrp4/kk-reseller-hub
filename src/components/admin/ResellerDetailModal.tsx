import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User, Wallet, ShoppingCart, Calendar, TrendingUp, Plus, Minus,
  ShieldCheck, Ban, Crown, Bell, Globe, Monitor, CreditCard, Clock,
  Send, AlertTriangle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface ResellerDetailModalProps {
  reseller: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tierColors: Record<string, string> = {
  bronze: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  silver: "bg-gray-400/15 text-gray-300 border-gray-400/20",
  gold: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  platinum: "bg-purple-400/15 text-purple-300 border-purple-400/20",
};

const statusStyles: Record<string, { bg: string; icon: typeof ShieldCheck }> = {
  active: { bg: "bg-success/10 text-success", icon: ShieldCheck },
  suspended: { bg: "bg-warning/10 text-warning", icon: AlertTriangle },
  blocked: { bg: "bg-destructive/10 text-destructive", icon: Ban },
};

export default function ResellerDetailModal({ reseller, open, onOpenChange }: ResellerDetailModalProps) {
  const queryClient = useQueryClient();
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustType, setAdjustType] = useState<"add" | "deduct">("add");
  const [adjusting, setAdjusting] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [sendingNotif, setSendingNotif] = useState(false);
  const [creditLimit, setCreditLimit] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const { data: orders } = useQuery({
    queryKey: ["admin-reseller-orders", reseller?.user_id],
    enabled: open && !!reseller?.user_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", reseller.user_id)
        .order("created_at", { ascending: false })
        .limit(50);
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
        .limit(50);
      return data || [];
    },
  });

  const { data: loginHistory } = useQuery({
    queryKey: ["admin-reseller-logins", reseller?.user_id],
    enabled: open && !!reseller?.user_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("login_history")
        .select("*")
        .eq("user_id", reseller.user_id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const { data: tiers } = useQuery({
    queryKey: ["reseller-tiers"],
    queryFn: async () => {
      const { data } = await supabase.from("reseller_tiers").select("*").order("sort_order");
      return data || [];
    },
  });

  if (!reseller) return null;

  const currentStatus = reseller.status || "active";
  const currentTier = reseller.tier || "bronze";
  const isVerified = reseller.is_verified || false;
  const currentCreditLimit = reseller.credit_limit || 0;
  const debt = currentCreditLimit > 0 && reseller.balance < 0 ? Math.abs(reseller.balance) : 0;

  const updateProfile = async (updates: Record<string, any>) => {
    setUpdatingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", reseller.user_id);
    setUpdatingProfile(false);
    if (error) {
      toast.error("Failed to update");
      return false;
    }
    Object.assign(reseller, updates);
    queryClient.invalidateQueries({ queryKey: ["admin-resellers"] });
    return true;
  };

  const handleStatusToggle = async (newStatus: string) => {
    const ok = await updateProfile({ status: newStatus });
    if (ok) toast.success(`Reseller ${newStatus}`);
  };

  const handleVerifyToggle = async (verified: boolean) => {
    const ok = await updateProfile({ is_verified: verified });
    if (ok) toast.success(verified ? "Reseller verified" : "Verification removed");
  };

  const handleTierChange = async (tier: string) => {
    const ok = await updateProfile({ tier });
    if (ok) toast.success(`Tier updated to ${tier}`);
  };

  const handleCreditLimitUpdate = async () => {
    const limit = Math.round(Number(creditLimit));
    if (isNaN(limit) || limit < 0) { toast.error("Invalid amount"); return; }
    const ok = await updateProfile({ credit_limit: limit });
    if (ok) { toast.success(`Credit limit set to ${limit.toLocaleString()} MMK`); setCreditLimit(""); }
  };

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) { toast.error("Title and message required"); return; }
    setSendingNotif(true);
    const { error } = await supabase.from("notifications").insert({
      user_id: reseller.user_id,
      title: notifTitle.trim(),
      body: notifBody.trim(),
      type: "info",
      link: null,
    });
    setSendingNotif(false);
    if (error) { toast.error("Failed to send"); return; }
    toast.success("Notification sent");
    setNotifTitle("");
    setNotifBody("");
  };

  const handleAdjustBalance = async () => {
    const amount = Math.round(Number(adjustAmount));
    if (!amount || amount <= 0) { toast.error("Enter a valid positive amount"); return; }
    if (!adjustReason.trim()) { toast.error("Please provide a reason"); return; }
    if (adjustReason.trim().length > 200) { toast.error("Reason must be under 200 characters"); return; }
    if (adjustType === "deduct" && amount > reseller.balance && currentCreditLimit === 0) {
      toast.error("Deduction exceeds current balance");
      return;
    }

    setAdjusting(true);
    const newBalance = adjustType === "add" ? reseller.balance + amount : reseller.balance - amount;

    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("user_id", reseller.user_id);

    if (profileErr) { setAdjusting(false); toast.error("Failed to update balance"); return; }

    await supabase.from("wallet_transactions").insert({
      user_id: reseller.user_id,
      type: adjustType === "add" ? "topup" : "purchase",
      amount,
      status: "approved",
      description: `Admin ${adjustType === "add" ? "credit" : "debit"}: ${adjustReason.trim()}`,
      method: "admin_adjustment",
    });

    setAdjusting(false);
    setAdjustAmount("");
    setAdjustReason("");
    toast.success(`Balance ${adjustType === "add" ? "increased" : "decreased"} by ${amount.toLocaleString()} MMK`);
    reseller.balance = newBalance;
    queryClient.invalidateQueries({ queryKey: ["admin-resellers"] });
    queryClient.invalidateQueries({ queryKey: ["admin-reseller-transactions", reseller.user_id] });
  };

  const statusBadgeFn = (status: string) => {
    const styles: Record<string, string> = {
      delivered: "bg-success/10 text-success",
      completed: "bg-success/10 text-success",
      pending: "bg-warning/10 text-warning",
      pending_review: "bg-warning/10 text-warning",
      api_pending: "bg-sky-500/10 text-sky-400",
      cancelled: "bg-destructive/10 text-destructive",
      rejected: "bg-destructive/10 text-destructive",
      approved: "bg-success/10 text-success",
    };
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${styles[status] || "bg-muted text-muted-foreground"}`}>
        {status}
      </span>
    );
  };

  const tierObj = tiers?.find((t: any) => t.name.toLowerCase() === currentTier);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Reseller Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* ═══ Profile Overview Card ═══ */}
          <div className="bg-muted/20 rounded-xl border border-border p-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary shrink-0 overflow-hidden">
                {reseller.avatar_url ? (
                  <img src={reseller.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (reseller.name || "?")[0].toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-lg font-semibold text-foreground">{reseller.name || "—"}</p>
                  {isVerified && (
                    <Badge variant="outline" className="text-[10px] border-sky-500/30 bg-sky-500/10 text-sky-400 gap-1">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </Badge>
                  )}
                  <Badge variant="outline" className={`text-[10px] capitalize border ${tierColors[currentTier] || tierColors.bronze}`}>
                    <Crown className="w-3 h-3 mr-1" /> {currentTier}
                  </Badge>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${(statusStyles[currentStatus] || statusStyles.active).bg}`}>
                    {currentStatus}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{reseller.email}</p>
                {reseller.last_active_at && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Last active: {new Date(reseller.last_active_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {[
                { label: "Balance", value: `${reseller.balance.toLocaleString()} MMK`, icon: Wallet, color: "text-emerald-400" },
                { label: "Total Spent", value: `${reseller.total_spent.toLocaleString()} MMK`, icon: TrendingUp, color: "text-sky-400" },
                { label: "Orders", value: reseller.total_orders, icon: ShoppingCart, color: "text-amber-400" },
                { label: "Joined", value: new Date(reseller.created_at).toLocaleDateString(), icon: Calendar, color: "text-muted-foreground" },
              ].map((s) => (
                <div key={s.label} className="bg-background/50 rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                    <span className="text-[10px] text-muted-foreground">{s.label}</span>
                  </div>
                  <p className="text-sm font-mono font-semibold text-foreground">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Credit / Debt Info */}
            {currentCreditLimit > 0 && (
              <div className="mt-3 flex items-center gap-4 text-xs">
                <span className="text-muted-foreground">Credit Limit: <span className="font-mono font-semibold text-foreground">{currentCreditLimit.toLocaleString()} MMK</span></span>
                {debt > 0 && (
                  <span className="text-destructive font-medium">Owes: <span className="font-mono">{debt.toLocaleString()} MMK</span></span>
                )}
                {tierObj && tierObj.discount_percent > 0 && (
                  <span className="text-muted-foreground">Tier Discount: <span className="font-semibold text-primary">{tierObj.discount_percent}%</span></span>
                )}
              </div>
            )}
          </div>

          {/* ═══ Admin Controls ═══ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status Control */}
            <div className="bg-muted/20 rounded-lg border border-border p-3 space-y-2">
              <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5 text-muted-foreground" /> Account Status
              </p>
              <Select value={currentStatus} onValueChange={handleStatusToggle} disabled={updatingProfile}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Verified Toggle */}
            <div className="bg-muted/20 rounded-lg border border-border p-3 space-y-2">
              <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> Verified Badge
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{isVerified ? "Trusted reseller" : "Not verified"}</span>
                <Switch checked={isVerified} onCheckedChange={handleVerifyToggle} disabled={updatingProfile} />
              </div>
            </div>

            {/* Tier Assignment */}
            <div className="bg-muted/20 rounded-lg border border-border p-3 space-y-2">
              <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400" /> Reseller Tier
              </p>
              <Select value={currentTier} onValueChange={handleTierChange} disabled={updatingProfile}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(tiers || []).map((t: any) => (
                    <SelectItem key={t.id} value={t.name.toLowerCase()}>
                      {t.name} ({t.discount_percent}% discount)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Credit Limit */}
            <div className="bg-muted/20 rounded-lg border border-border p-3 space-y-2">
              <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> Credit Limit
              </p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder={currentCreditLimit.toString()}
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="h-8 text-xs flex-1 bg-muted/30"
                  min={0}
                />
                <Button size="sm" className="h-8 text-xs" onClick={handleCreditLimitUpdate} disabled={updatingProfile}>
                  Set
                </Button>
              </div>
            </div>
          </div>

          {/* ═══ Tabs: Activity, Wallet, Notifications, Logins ═══ */}
          <Tabs defaultValue="orders" className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-9">
              <TabsTrigger value="orders" className="text-xs">Orders</TabsTrigger>
              <TabsTrigger value="wallet" className="text-xs">Wallet</TabsTrigger>
              <TabsTrigger value="notify" className="text-xs">Notify</TabsTrigger>
              <TabsTrigger value="logins" className="text-xs">Logins</TabsTrigger>
            </TabsList>

            {/* Orders Tab */}
            <TabsContent value="orders" className="mt-3">
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                {(!orders || orders.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No orders</p>
                ) : orders.map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{o.product_name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{o.order_code}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-mono font-semibold text-foreground">{o.price.toLocaleString()}</p>
                      <div className="flex items-center gap-1.5 justify-end">
                        {statusBadgeFn(o.status)}
                        <span className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Wallet Tab */}
            <TabsContent value="wallet" className="mt-3 space-y-4">
              {/* Balance Adjustment */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <Wallet className="w-3.5 h-3.5 text-muted-foreground" /> Adjust Balance
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant={adjustType === "add" ? "default" : "outline"} className="h-7 text-xs gap-1" onClick={() => setAdjustType("add")}>
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                  <Button size="sm" variant={adjustType === "deduct" ? "destructive" : "outline"} className="h-7 text-xs gap-1" onClick={() => setAdjustType("deduct")}>
                    <Minus className="w-3 h-3" /> Deduct
                  </Button>
                </div>
                <Input type="number" placeholder="Amount (MMK)" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} className="bg-muted/30 border-border h-8 text-xs" min={1} />
                <Textarea placeholder="Reason…" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} className="bg-muted/30 border-border resize-none h-14 text-xs" maxLength={200} />
                <Button size="sm" className="w-full h-8 text-xs" disabled={adjusting || !adjustAmount || !adjustReason.trim()} onClick={handleAdjustBalance}>
                  {adjusting ? "Updating..." : `${adjustType === "add" ? "Add" : "Deduct"} ${adjustAmount ? Number(adjustAmount).toLocaleString() : "0"} MMK`}
                </Button>
              </div>

              {/* Transaction History */}
              <div className="border-t border-border pt-3">
                <p className="text-xs font-medium text-foreground mb-2">Transaction History ({transactions?.length || 0})</p>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {(!transactions || transactions.length === 0) ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No transactions</p>
                  ) : transactions.map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">{tx.description}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(tx.created_at).toLocaleString()} · {tx.type}{tx.method ? ` · ${tx.method}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className={`text-xs font-mono font-semibold ${tx.type === "topup" ? "text-success" : "text-foreground"}`}>
                          {tx.type === "topup" ? "+" : "-"}{Math.abs(tx.amount).toLocaleString()}
                        </p>
                        {statusBadgeFn(tx.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Notify Tab */}
            <TabsContent value="notify" className="mt-3 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Send className="w-3.5 h-3.5 text-muted-foreground" /> Send Direct Notification
              </div>
              <Input placeholder="Notification title" value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} className="bg-muted/30 h-8 text-xs" maxLength={100} />
              <Textarea placeholder="Message body…" value={notifBody} onChange={(e) => setNotifBody(e.target.value)} className="bg-muted/30 resize-none h-20 text-xs" maxLength={500} />
              <Button size="sm" className="w-full h-8 text-xs gap-1.5" disabled={sendingNotif || !notifTitle.trim() || !notifBody.trim()} onClick={handleSendNotification}>
                <Bell className="w-3.5 h-3.5" />
                {sendingNotif ? "Sending..." : "Send Notification"}
              </Button>
            </TabsContent>

            {/* Logins Tab */}
            <TabsContent value="logins" className="mt-3">
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                {(!loginHistory || loginHistory.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No login history recorded</p>
                ) : loginHistory.map((l: any) => (
                  <div key={l.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                    <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-foreground">{l.ip_address || "Unknown IP"}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{l.user_agent || "Unknown device"}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(l.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
